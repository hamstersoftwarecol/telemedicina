import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../../../../services/assistant_service.dart';

class PatientPortalView extends StatefulWidget {
  const PatientPortalView({Key? key}) : super(key: key);

  @override
  State<PatientPortalView> createState() => _PatientPortalViewState();
}

class _PatientPortalViewState extends State<PatientPortalView> {
  final TextEditingController _textController = TextEditingController();
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isListening = false;
  String _currentWords = "";

  @override
  void initState() {
    super.initState();
    _initSpeech();
  }

  void _initSpeech() async {
    try {
      await _speech.initialize(
        onStatus: (status) {
          if (status == 'done' || status == 'notListening') {
            setState(() => _isListening = false);
            if (_currentWords.isNotEmpty) {
              _textController.text = _currentWords;
              _sendMessage();
              _currentWords = "";
            }
          }
        },
        onError: (errorNotification) {
          print('Speech Error: $errorNotification');
          setState(() => _isListening = false);
        },
      );
    } catch (e) {
      print('Speech init error: $e');
    }
  }

  void _listen() async {
    if (!_isListening) {
      bool available = await _speech.initialize();
      if (available) {
        setState(() => _isListening = true);
        _speech.listen(
          onResult: (val) => setState(() {
            _currentWords = val.recognizedWords;
          }),
        );
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('El reconocimiento de voz no está disponible')),
          );
        }
      }
    } else {
      setState(() => _isListening = false);
      _speech.stop();
    }
  }

  void _sendMessage() {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    
    context.read<AssistantService>().sendMessage(text);
    _textController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 16),
                const Text(
                  'Atención Médica\nAl Alcance de tu Voz',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    height: 1.2,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Agenda tu cita en segundos hablando con nuestro asistente de Inteligencia Artificial. Consulta disponibilidad, gestiona pagos y conéctate con los mejores especialistas sin esperas.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF64748B),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildBadge(Icons.mic, '100% por Voz'),
                    const SizedBox(width: 8),
                    _buildBadge(Icons.calendar_today, 'Tiempo Real'),
                    const SizedBox(width: 8),
                    _buildBadge(Icons.smart_toy, 'IA Avanzada'),
                  ],
                ),
                const SizedBox(height: 48),
                // Contenedor del Micrófono y Chat
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.circle, color: _isListening ? Colors.red : Colors.green, size: 12),
                          const SizedBox(width: 8),
                          Text(
                            _isListening ? 'Escuchando...' : 'En línea - Toca el micrófono',
                            style: TextStyle(
                              color: _isListening ? Colors.red : Colors.green,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Consumer<AssistantService>(
                        builder: (context, assistant, child) {
                          if (_isListening && _currentWords.isNotEmpty) {
                            return Text(
                              _currentWords,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 16, color: Color(0xFF2563EB), fontStyle: FontStyle.italic),
                            );
                          }

                          if (assistant.messages.isEmpty) {
                            return const Text(
                              '¡Hola! Soy tu asistente médico virtual. Puedo ayudarte a ver los doctores disponibles, agendar una cita o validar un pago. Toca el micrófono y dime, ¿en qué te puedo ayudar hoy?',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 16, color: Color(0xFF334155)),
                            );
                          }
                          
                          // Mostrar el último mensaje del asistente
                          final lastAssistantMsg = assistant.messages.lastWhere(
                            (m) => m.role == 'assistant',
                            orElse: () => AssistantMessage(role: 'assistant', content: 'Pensando...'),
                          );
                          
                          return Text(
                            lastAssistantMsg.content,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 16, color: Color(0xFF334155)),
                          );
                        },
                      ),
                      const SizedBox(height: 32),
                      GestureDetector(
                        onTap: _listen,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          width: _isListening ? 100 : 80,
                          height: _isListening ? 100 : 80,
                          decoration: BoxDecoration(
                            color: _isListening ? Colors.red : const Color(0xFF2563EB),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: (_isListening ? Colors.red : const Color(0xFF2563EB)).withOpacity(0.3),
                                blurRadius: _isListening ? 30 : 20,
                                spreadRadius: _isListening ? 10 : 5,
                              ),
                            ],
                          ),
                          child: Icon(
                            _isListening ? Icons.mic : Icons.mic_none,
                            color: Colors.white,
                            size: _isListening ? 50 : 40,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _isListening ? 'Habla ahora...' : 'Toca para hablar',
                        style: TextStyle(
                          color: _isListening ? Colors.red : const Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Consumer<AssistantService>(
                        builder: (context, assistant, child) {
                          if (assistant.isLoading) {
                            return const CircularProgressIndicator();
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Colors.grey[200]!)),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: InputDecoration(
                      hintText: 'O escribe aquí...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: Colors.grey[100],
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  decoration: const BoxDecoration(
                    color: Color(0xFF2563EB),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white),
                    onPressed: _sendMessage,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBadge(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF2563EB)),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(
              fontSize: 10,
              color: Color(0xFF2563EB),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
