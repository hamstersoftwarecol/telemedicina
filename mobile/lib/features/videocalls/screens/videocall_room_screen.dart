import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:provider/provider.dart';
import 'package:telemedicina_mobile/services/api_service.dart';
import 'package:telemedicina_mobile/features/videocalls/services/webrtc_service.dart';
import 'package:permission_handler/permission_handler.dart';

class VideoCallRoomScreen extends StatefulWidget {
  final Map<String, dynamic> appointment;

  const VideoCallRoomScreen({super.key, required this.appointment});

  @override
  State<VideoCallRoomScreen> createState() => _VideoCallRoomScreenState();
}

class _VideoCallRoomScreenState extends State<VideoCallRoomScreen> {
  late WebRTCService _webRTCService;
  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();
  final RTCVideoRenderer _remoteRenderer = RTCVideoRenderer();
  
  bool _isMicMuted = false;
  bool _isVideoOff = false;
  bool _isConnected = false;
  String? _error;
  bool _permissionsGranted = false;

  @override
  void initState() {
    super.initState();
    _initRenderers();
  }

  Future<void> _initRenderers() async {
    await _localRenderer.initialize();
    await _remoteRenderer.initialize();
    
    // Request permissions
    final statuses = await [Permission.camera, Permission.microphone].request();
    if (statuses[Permission.camera]!.isGranted && statuses[Permission.microphone]!.isGranted) {
      setState(() => _permissionsGranted = true);
      _setupWebRTC();
    } else {
      setState(() => _error = 'Permisos de cámara y micrófono denegados');
    }
  }

  void _setupWebRTC() {
    final apiService = Provider.of<ApiService>(context, listen: false);
    _webRTCService = WebRTCService(apiService);
    
    _webRTCService.onLocalStream = (stream) {
      setState(() {
        _localRenderer.srcObject = stream;
      });
    };
    
    _webRTCService.onRemoteStream = (stream) {
      setState(() {
        _remoteRenderer.srcObject = stream;
      });
    };
    
    _webRTCService.onConnectionStateChange = (connected) {
      setState(() => _isConnected = connected);
    };
    
    _webRTCService.onError = (error) {
      setState(() => _error = error);
    };

    final consultationId = widget.appointment['id']?.toString() ?? 'unknown';
    _webRTCService.initWebRTC(consultationId);
  }

  @override
  void dispose() {
    _webRTCService.endCall();
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    super.dispose();
  }

  void _toggleMic() {
    setState(() {
      _isMicMuted = !_isMicMuted;
      _webRTCService.toggleMic(!_isMicMuted);
    });
  }

  void _toggleVideo() {
    setState(() {
      _isVideoOff = !_isVideoOff;
      _webRTCService.toggleCam(!_isVideoOff);
    });
  }

  void _endCall() {
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final patientName = widget.appointment['patient_name'] ?? 'Paciente';
    final docName = widget.appointment['doctor_name'] ?? 'Médico';
    final consultationId = widget.appointment['id']?.toString() ?? 'unknown';
    // Muestra la URL o simplemente el ID para la prueba.
    final shareUrl = 'https://[TU_DOMINIO_WEB]/sala/$consultationId';

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Remote Video
          if (_permissionsGranted && _isConnected)
            Positioned.fill(
              child: RTCVideoView(_remoteRenderer, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover),
            )
          else
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.person, size: 100, color: Colors.white54),
                  const SizedBox(height: 16),
                  Text(
                    _error ?? (_permissionsGranted ? 'Conectando con: $patientName...' : 'Solicitando permisos...'),
                    style: TextStyle(color: _error != null ? Colors.red : Colors.white, fontSize: 18),
                  ),
                  Text(
                    'Dr. $docName',
                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                  if (_isConnected)
                    const Padding(
                      padding: EdgeInsets.only(top: 10),
                      child: CircularProgressIndicator(),
                    ),
                  if (!_isConnected && _permissionsGranted)
                    Padding(
                      padding: const EdgeInsets.only(top: 24),
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.copy, color: Colors.white),
                        label: const Text('Copiar Enlace de Prueba', style: TextStyle(color: Colors.white)),
                        style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.white54)),
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: shareUrl));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Enlace copiado al portapapeles')),
                          );
                        },
                      ),
                    ),
                ],
              ),
            ),
          
          // Local Video (Self)
          if (_permissionsGranted)
            Positioned(
              right: 16,
              bottom: 100,
              child: Container(
                width: 100,
                height: 150,
                decoration: BoxDecoration(
                  color: Colors.grey[800],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: _isVideoOff
                      ? const Center(child: Icon(Icons.videocam_off, color: Colors.white))
                      : RTCVideoView(_localRenderer, mirror: true, objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover),
                ),
              ),
            ),

          // Controls
          Positioned(
            bottom: 30,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FloatingActionButton(
                  heroTag: 'mic',
                  backgroundColor: _isMicMuted ? Colors.red : Colors.white,
                  onPressed: _toggleMic,
                  child: Icon(
                    _isMicMuted ? Icons.mic_off : Icons.mic,
                    color: _isMicMuted ? Colors.white : Colors.black,
                  ),
                ),
                const SizedBox(width: 20),
                FloatingActionButton(
                  heroTag: 'end_call',
                  backgroundColor: Colors.red,
                  onPressed: _endCall,
                  child: const Icon(Icons.call_end, color: Colors.white),
                ),
                const SizedBox(width: 20),
                FloatingActionButton(
                  heroTag: 'video',
                  backgroundColor: _isVideoOff ? Colors.red : Colors.white,
                  onPressed: _toggleVideo,
                  child: Icon(
                    _isVideoOff ? Icons.videocam_off : Icons.videocam,
                    color: _isVideoOff ? Colors.white : Colors.black,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
