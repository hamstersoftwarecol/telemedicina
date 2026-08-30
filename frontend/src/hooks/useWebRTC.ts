import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface UseWebRTCProps {
  consultationId: string | null
  onCallEnded?: () => void
  onMessageReceived?: (msg: string) => void
}

/* ─── ICE Servers — STUN (P2P) + TURN (relay fallback) ─── */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  // Free public TURN relay — replace with your own for production
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

export function useWebRTC({ consultationId, onCallEnded, onMessageReceived }: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  // remoteStream stored in both state (to trigger re-render) and ref (for reliable access)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const pc = useRef<RTCPeerConnection | null>(null)
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null)
  const role = useRef<'caller' | 'callee' | 'full' | null>(null)
  const pollingInterval = useRef<number | null>(null)
  const addedCandidates = useRef<Set<string>>(new Set())
  const signalQueue = useRef<Promise<any>>(Promise.resolve())
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const onMessageReceivedRef = useRef(onMessageReceived)

  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived
  }, [onMessageReceived])

  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    channel.onmessage = (e) => {
      if (onMessageReceivedRef.current) onMessageReceivedRef.current(e.data)
    }
    channel.onopen = () => console.log('[WebRTC] DataChannel open')
    channel.onclose = () => console.log('[WebRTC] DataChannel closed')
    dataChannelRef.current = channel
  }, [])

  /* ─── Attach remote stream whenever ref or stream changes ─── */
  useEffect(() => {
    const video = remoteVideoRef.current
    const stream = remoteStreamRef.current
    if (video && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream
        video.play().catch(() => {/* autoplay policy — user interaction needed */})
      }
    }
  }, [remoteStream]) // triggers when remoteStream state changes

  /* ─── Signal helpers ─────────────────────────────────────── */
  const getSignal = useCallback((id: string) => {
    const isTest = id.startsWith('test-')
    const rid = isTest ? id.replace(/^test-/, '') : id
    return isTest
      ? () => api.get(`/videocalls/test/${rid}/signal`)
      : () => api.get(`/videocalls/${id}/signal`)
  }, [])

  const postSignal = useCallback((id: string) => {
    const isTest = id.startsWith('test-')
    const rid = isTest ? id.replace(/^test-/, '') : id
    
    return (body: object) => {
      const request = () => isTest
        ? api.post(`/videocalls/test/${rid}/signal`, body)
        : api.post(`/videocalls/${id}/signal`, body)

      signalQueue.current = signalQueue.current
        .then(request)
        .catch(err => {
          console.error('[WebRTC] Signal queue error', err)
        })
      return signalQueue.current
    }
  }, [])

  const postJoin = useCallback(async (id: string) => {
    const isTest = id.startsWith('test-')
    const rid = isTest ? id.replace(/^test-/, '') : id
    return isTest
      ? api.post(`/videocalls/test/${rid}/join`)
      : api.post(`/videocalls/${id}/join`)
  }, [])

  /* ─── Init WebRTC ────────────────────────────────────────── */
  const initWebRTC = useCallback(async () => {
    if (!consultationId) return

    const signalGet = getSignal(consultationId)
    const signalPost = postSignal(consultationId)

    console.log('[WebRTC] initWebRTC v1.1 - using Promise Queue')

    try {
      // 1. Get local media with graceful fallback
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
          setCamOn(false)
          setError('Cámara no disponible. Solo transmitirás audio.')
        } catch {
          stream = new MediaStream()
          setCamOn(false)
          setMicOn(false)
          setError('Sin acceso a cámara/micrófono. Recibirás la llamada pero no te verán.')
        }
      }

      setLocalStream(stream)
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) originalVideoTrackRef.current = videoTrack

      if (localVideoRef.current && stream.getTracks().length > 0) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch(() => {})
      }

      // 2. Create PeerConnection with STUN + TURN
      const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pc.current = peerConnection

      // Add local tracks to the connection
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))

      // 3. Handle incoming remote tracks — key fix: use ref + state
      peerConnection.ontrack = (event) => {
        const incomingStream = event.streams[0] ?? new MediaStream([event.track])
        remoteStreamRef.current = incomingStream
        setRemoteStream(incomingStream) // triggers useEffect to attach to <video>

        // Also try attaching immediately if ref is already mounted
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = incomingStream
          remoteVideoRef.current.play().catch(() => {})
        }
      }

      // 4. Track connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState
        console.log('[WebRTC] ICE state:', state)
        if (state === 'connected' || state === 'completed') {
          setConnected(true)
          setError(null)
        }
        if (state === 'failed') {
          setError('La conexión falló. Verifica tu red e intenta de nuevo.')
          setConnected(false)
        }
        if (state === 'disconnected') {
          setConnected(false)
        }
      }

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState
        console.log('[WebRTC] Connection state:', state)
        if (state === 'connected') setConnected(true)
        if (state === 'failed') setError('Conexión perdida. Por favor intenta de nuevo.')
      }

      // Handle incoming data channel
      peerConnection.ondatachannel = (event) => {
        setupDataChannel(event.channel)
      }

      // 5. Send local ICE candidates to signaling server
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate && role.current) {
          await signalPost({ candidate: event.candidate, role: role.current })
        }
      }

      // 6. Join the room to get assigned a role atomically
      try {
        const joinRes = await postJoin(consultationId)
        role.current = joinRes.data.role
        
        if (role.current === 'full') {
          setError('La sala está llena (máximo 2 participantes).')
          return
        }

        if (role.current === 'caller') {
          // Create data channel BEFORE creating offer
          const channel = peerConnection.createDataChannel('chat')
          setupDataChannel(channel)

          const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          await peerConnection.setLocalDescription(offer)
          await signalPost({ offer })
        }
      } catch (err) {
        console.error('[WebRTC] Join error', err)
        setError('Error al unirse a la sala.')
        return
      }

      // 7. Signaling polling loop (every 2s)
      pollingInterval.current = window.setInterval(async () => {
        try {
          const { data } = await signalGet()
          const state = data.data
          if (!state) return

          if (role.current === 'callee' && state.offer && peerConnection.signalingState === 'stable') {
            // Someone else created an offer → we are callee and received the offer
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(state.offer)
            )
            const answer = await peerConnection.createAnswer()
            await peerConnection.setLocalDescription(answer)
            await signalPost({ answer })
          } else if (
            role.current === 'caller' &&
            state.answer &&
            peerConnection.signalingState === 'have-local-offer'
          ) {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(state.answer)
            )
          }

          // Process queued remote ICE candidates
          const remoteCandidates =
            role.current === 'caller' ? state.calleeCandidates : state.callerCandidates

          if (remoteCandidates && peerConnection.remoteDescription) {
            for (const cand of remoteCandidates) {
              const key = JSON.stringify(cand)
              if (!addedCandidates.current.has(key)) {
                try {
                  await peerConnection.addIceCandidate(new RTCIceCandidate(cand))
                  addedCandidates.current.add(key)
                } catch (e) {
                  console.warn('[WebRTC] Failed to add candidate', e)
                }
              }
            }
          }
        } catch (err) {
          console.error('[WebRTC] Signaling poll error', err)
        }
      }, 2000)

    } catch (err) {
      console.error('[WebRTC] Init error', err)
      setError('No se pudo iniciar la videollamada.')
    }
  }, [consultationId, getSignal, postSignal])

  /* ─── Toggle controls ────────────────────────────────────── */
  const toggleMic = useCallback(() => {
    if (localStream) {
      const enabled = !micOn
      localStream.getAudioTracks().forEach(t => { t.enabled = enabled })
      setMicOn(enabled)
    }
  }, [localStream, micOn])

  const toggleCam = useCallback(() => {
    if (localStream) {
      const enabled = !camOn
      localStream.getVideoTracks().forEach(t => { t.enabled = enabled })
      setCamOn(enabled)
    }
  }, [localStream, camOn])

  /* ─── Screen Sharing ─────────────────────────────────────── */
  const toggleScreenShare = useCallback(async () => {
    if (!pc.current || !localStream) return

    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = displayStream.getVideoTracks()[0]

        const videoSender = pc.current.getSenders().find(s => s.track?.kind === 'video')
        if (videoSender && screenTrack) {
          // If not currently saving an original, save it
          if (!originalVideoTrackRef.current) originalVideoTrackRef.current = videoSender.track

          await videoSender.replaceTrack(screenTrack)
          setIsScreenSharing(true)

          const audioTrack = localStream.getAudioTracks()[0]
          const newLocalStream = new MediaStream([screenTrack])
          if (audioTrack) newLocalStream.addTrack(audioTrack)
          if (localVideoRef.current) localVideoRef.current.srcObject = newLocalStream

          // Handle 'Stop sharing' native browser button
          screenTrack.onended = async () => {
            if (originalVideoTrackRef.current && videoSender) {
              await videoSender.replaceTrack(originalVideoTrackRef.current)
              setIsScreenSharing(false)
              if (localVideoRef.current) localVideoRef.current.srcObject = localStream
            }
          }
        }
      } else {
        // Stop screen sharing manually
        const videoSender = pc.current.getSenders().find(s => s.track?.kind === 'video')
        if (videoSender && originalVideoTrackRef.current) {
          const currentScreenTrack = videoSender.track
          await videoSender.replaceTrack(originalVideoTrackRef.current)
          
          if (currentScreenTrack && currentScreenTrack !== originalVideoTrackRef.current) {
            currentScreenTrack.stop()
          }

          setIsScreenSharing(false)
          if (localVideoRef.current) localVideoRef.current.srcObject = localStream
        }
      }
    } catch (err) {
      console.error('[WebRTC] Screen sharing error', err)
      toast.error('No se pudo compartir la pantalla.')
    }
  }, [isScreenSharing, localStream])

  /* ─── Change Device ──────────────────────────────────────── */
  const changeDevice = useCallback(async (kind: 'audioinput' | 'videoinput', deviceId: string) => {
    if (!pc.current || !localStream) return

    try {
      const isVideo = kind === 'videoinput'
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        [isVideo ? 'video' : 'audio']: { deviceId: { exact: deviceId } }
      })
      const newTrack = isVideo ? newStream.getVideoTracks()[0] : newStream.getAudioTracks()[0]

      const sender = pc.current.getSenders().find(s => s.track?.kind === (isVideo ? 'video' : 'audio'))
      if (sender && newTrack) {
        sender.track?.stop()
        await sender.replaceTrack(newTrack)
        
        const updatedStream = new MediaStream()
        localStream.getTracks().forEach(t => {
          if (t.kind === newTrack.kind) {
             updatedStream.addTrack(newTrack)
          } else {
             updatedStream.addTrack(t)
          }
        })
        setLocalStream(updatedStream)
        
        // Restore enabled states
        newTrack.enabled = isVideo ? camOn : micOn

        // Update local video if it's the active stream
        // Don't update if we are screen sharing and replacing video
        if (localVideoRef.current && !(isVideo && isScreenSharing)) {
           localVideoRef.current.srcObject = updatedStream
        }
        
        // Update original track ref
        if (isVideo) {
          originalVideoTrackRef.current = newTrack
        }
      }
    } catch (err) {
      console.error('[WebRTC] Change device error', err)
      toast.error('Error al cambiar el dispositivo.')
    }
  }, [localStream, isScreenSharing, camOn, micOn])

  /* ─── Send Chat Message ──────────────────────────────────── */
  const sendMessage = useCallback((msg: string) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(msg)
      return true
    }
    return false
  }, [])

  /* ─── End call ───────────────────────────────────────────── */
  const endCall = useCallback(async () => {
    if (pollingInterval.current) clearInterval(pollingInterval.current)
    if (pc.current) { pc.current.close(); pc.current = null }
    if (dataChannelRef.current) { dataChannelRef.current.close(); dataChannelRef.current = null }
    if (localStream) localStream.getTracks().forEach(t => t.stop())
    remoteStreamRef.current = null

    setLocalStream(null)
    setRemoteStream(null)
    setConnected(false)
    setError(null)

    if (consultationId) {
      const isTest = consultationId.startsWith('test-')
      const rid = isTest ? consultationId.replace(/^test-/, '') : consultationId
      const url = isTest
        ? `/videocalls/test/${rid}/signal`
        : `/videocalls/${consultationId}/signal`
      await api.post(url, { clear: true }).catch(console.error)
    }

    onCallEnded?.()
  }, [consultationId, localStream, onCallEnded])

  /* ─── Lifecycle ──────────────────────────────────────────── */
  useEffect(() => {
    if (consultationId) {
      role.current = null
      addedCandidates.current = new Set()
      initWebRTC()
    }
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current)
      if (pc.current) { pc.current.close(); pc.current = null }
      if (localStream) localStream.getTracks().forEach(t => t.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId])

  return {
    localVideoRef,
    remoteVideoRef,
    micOn,
    camOn,
    isScreenSharing,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    changeDevice,
    sendMessage,
    endCall,
    error,
    connected,
    remoteStream,
  }
}
