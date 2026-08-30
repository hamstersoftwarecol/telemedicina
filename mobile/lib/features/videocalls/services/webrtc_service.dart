import 'dart:async';
import 'dart:convert';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:telemedicina_mobile/services/api_service.dart';

class WebRTCService {
  final ApiService apiService;
  
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  RTCDataChannel? _dataChannel;
  
  Timer? _pollingTimer;
  String? _consultationId;
  String? _role;
  final Set<String> _addedCandidates = {};
  
  // Callbacks
  Function(MediaStream stream)? onLocalStream;
  Function(MediaStream stream)? onRemoteStream;
  Function(bool connected)? onConnectionStateChange;
  Function(String message)? onChatMessage;
  Function(String error)? onError;

  WebRTCService(this.apiService);

  Future<void> initWebRTC(String consultationId) async {
    _consultationId = consultationId;
    _addedCandidates.clear();
    
    try {
      // 1. Get local media
      final Map<String, dynamic> mediaConstraints = {
        'audio': true,
        'video': {
          'facingMode': 'user',
        }
      };

      _localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      if (onLocalStream != null && _localStream != null) {
        onLocalStream!(_localStream!);
      }

      // 2. Create PeerConnection
      final Map<String, dynamic> configuration = {
        'iceServers': [
          {'urls': 'stun:stun.l.google.com:19302'},
          {'urls': 'stun:stun1.l.google.com:19302'},
        ]
      };

      _peerConnection = await createPeerConnection(configuration);

      // Add local stream tracks
      _localStream!.getTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
      });

      // Handle remote stream
      _peerConnection!.onAddStream = (MediaStream stream) {
        _remoteStream = stream;
        if (onRemoteStream != null) {
          onRemoteStream!(stream);
        }
      };

      // Also handle onTrack (newer API)
      _peerConnection!.onTrack = (RTCTrackEvent event) {
        if (event.streams.isNotEmpty) {
          _remoteStream = event.streams[0];
          if (onRemoteStream != null) {
            onRemoteStream!(_remoteStream!);
          }
        }
      };

      // ICE connection state
      _peerConnection!.onIceConnectionState = (RTCIceConnectionState state) {
        if (state == RTCIceConnectionState.RTCIceConnectionStateConnected ||
            state == RTCIceConnectionState.RTCIceConnectionStateCompleted) {
          onConnectionStateChange?.call(true);
        } else if (state == RTCIceConnectionState.RTCIceConnectionStateFailed ||
                   state == RTCIceConnectionState.RTCIceConnectionStateDisconnected) {
          onConnectionStateChange?.call(false);
        }
      };

      // Local ICE candidates
      _peerConnection!.onIceCandidate = (RTCIceCandidate candidate) async {
        if (_role != null) {
          await _postSignal({
            'candidate': candidate.toMap(),
            'role': _role,
          });
        }
      };

      // Data Channel for Chat
      _peerConnection!.onDataChannel = (RTCDataChannel channel) {
        _setupDataChannel(channel);
      };

      // 3. Join Room
      final joinRes = await apiService.post('/api/videocalls/$_consultationId/join', {});
      final joinJson = jsonDecode(joinRes.body);
      _role = joinJson['role'];

      if (_role == 'full') {
        onError?.call('La sala está llena (máximo 2 participantes).');
        return;
      }

      if (_role == 'caller') {
        // Caller creates data channel
        RTCDataChannelInit dataChannelDict = RTCDataChannelInit()..id = 1;
        _dataChannel = await _peerConnection!.createDataChannel('chat', dataChannelDict);
        _setupDataChannel(_dataChannel!);

        // Caller creates offer
        RTCSessionDescription offer = await _peerConnection!.createOffer();
        await _peerConnection!.setLocalDescription(offer);
        await _postSignal({'offer': offer.toMap()});
      }

      // 4. Start polling for signaling
      _startPolling();

    } catch (e) {
      onError?.call('No se pudo iniciar la videollamada: $e');
    }
  }

  void _setupDataChannel(RTCDataChannel channel) {
    _dataChannel = channel;
    _dataChannel!.onMessage = (RTCDataChannelMessage message) {
      if (!message.isBinary && onChatMessage != null) {
        onChatMessage!(message.text);
      }
    };
  }

  Future<void> _postSignal(Map<String, dynamic> body) async {
    try {
      await apiService.post('/api/videocalls/$_consultationId/signal', body);
    } catch (e) {
      print('Error posting signal: $e');
    }
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      try {
        final res = await apiService.get('/api/videocalls/$_consultationId/signal');
        if (res.statusCode != 200) return;
        final json = jsonDecode(res.body);
        final data = json['data'];
        if (data == null) return;

        final signalingState = await _peerConnection?.getSignalingState();

        if (_role == 'callee' && data['offer'] != null && signalingState == RTCSignalingState.RTCSignalingStateStable) {
          await _peerConnection!.setRemoteDescription(
            RTCSessionDescription(data['offer']['sdp'], data['offer']['type'])
          );
          
          RTCSessionDescription answer = await _peerConnection!.createAnswer();
          await _peerConnection!.setLocalDescription(answer);
          await _postSignal({'answer': answer.toMap()});
        } else if (_role == 'caller' && data['answer'] != null && signalingState == RTCSignalingState.RTCSignalingStateHaveLocalOffer) {
          await _peerConnection!.setRemoteDescription(
            RTCSessionDescription(data['answer']['sdp'], data['answer']['type'])
          );
        }

        // Process ICE Candidates
        final List<dynamic>? remoteCandidates = _role == 'caller' ? data['calleeCandidates'] : data['callerCandidates'];
        
        if (remoteCandidates != null) {
          final remoteDesc = await _peerConnection?.getRemoteDescription();
          if (remoteDesc != null) {
            for (var cand in remoteCandidates) {
              final key = jsonEncode(cand);
              if (!_addedCandidates.contains(key)) {
                try {
                  await _peerConnection!.addCandidate(RTCIceCandidate(
                    cand['candidate'],
                    cand['sdpMid'],
                    cand['sdpMLineIndex'],
                  ));
                  _addedCandidates.add(key);
                } catch (e) {
                  print('Error adding ice candidate: $e');
                }
              }
            }
          }
        }
      } catch (e) {
        print('Polling error: $e');
      }
    });
  }

  void toggleMic(bool enabled) {
    if (_localStream != null) {
      for (var track in _localStream!.getAudioTracks()) {
        track.enabled = enabled;
      }
    }
  }

  void toggleCam(bool enabled) {
    if (_localStream != null) {
      for (var track in _localStream!.getVideoTracks()) {
        track.enabled = enabled;
      }
    }
  }

  void sendMessage(String message) {
    if (_dataChannel != null && _dataChannel!.state == RTCDataChannelState.RTCDataChannelOpen) {
      _dataChannel!.send(RTCDataChannelMessage(message));
    }
  }

  Future<void> endCall() async {
    _pollingTimer?.cancel();
    
    if (_consultationId != null) {
      try {
        await apiService.post('/api/videocalls/$_consultationId/signal', {'clear': true});
      } catch (_) {}
    }
    
    await _localStream?.dispose();
    await _peerConnection?.close();
    _peerConnection = null;
    _localStream = null;
    _remoteStream = null;
  }
}
