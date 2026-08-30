import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'api_service.dart';

class AssistantMessage {
  final String role;
  final String content;

  AssistantMessage({required this.role, required this.content});

  factory AssistantMessage.fromJson(Map<String, dynamic> json) {
    String text = '';
    if (json['parts'] != null && (json['parts'] as List).isNotEmpty) {
      text = json['parts'][0]['text'] ?? '';
    } else {
      text = json['content'] ?? '';
    }
    
    String r = json['role'] ?? 'user';
    if (r == 'model') r = 'assistant';

    return AssistantMessage(
      role: r,
      content: text,
    );
  }

  Map<String, dynamic> toJson() => {
    'role': role == 'assistant' ? 'model' : role,
    'parts': [{'text': content}],
  };
}

class AssistantService extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final FlutterTts _flutterTts = FlutterTts();
  
  List<AssistantMessage> _messages = [];
  bool _isLoading = false;

  List<AssistantMessage> get messages => _messages;
  bool get isLoading => _isLoading;

  AssistantService() {
    _initTts();
  }

  void _initTts() async {
    await _flutterTts.setLanguage("es-ES");
    await _flutterTts.setSpeechRate(0.5);
    await _flutterTts.setVolume(1.0);
    await _flutterTts.setPitch(1.0);
  }

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    // Agregar mensaje del usuario localmente
    _messages.add(AssistantMessage(role: 'user', content: text));
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.post('/api/assistant/chat', {
        'message': text,
        'history': _messages.map((m) => m.toJson()).toList(),
      });

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final replyText = data['reply'] ?? 'Sin respuesta';
        
        // Update history from backend if provided (optional, but we just append the reply for now)
        _messages.add(AssistantMessage(
          role: 'assistant',
          content: replyText,
        ));
        
        // Speak the reply
        _flutterTts.speak(replyText);
      } else {
        const errorText = 'Lo siento, hubo un error de comunicación.';
        _messages.add(AssistantMessage(
          role: 'assistant',
          content: errorText,
        ));
        _flutterTts.speak(errorText);
      }
    } catch (e) {
      print('Assistant error: $e');
      const errorText = 'Hubo un error al conectar con el servidor.';
      _messages.add(AssistantMessage(
        role: 'assistant',
        content: errorText,
      ));
      _flutterTts.speak(errorText);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearHistory() {
    _messages.clear();
    notifyListeners();
  }
}
