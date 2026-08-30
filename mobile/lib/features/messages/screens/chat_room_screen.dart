import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../services/api_service.dart';

class ChatRoomScreen extends StatefulWidget {
  final Map<String, dynamic> conversation;

  const ChatRoomScreen({super.key, required this.conversation});

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final ApiService _apiService = ApiService();
  final _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = true;
  List<dynamic> _messages = [];

  @override
  void initState() {
    super.initState();
    _fetchMessages();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchMessages() async {
    final convId = widget.conversation['id'];
    try {
      final response = await _apiService.get('/api/messages/conversations/$convId/messages');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _messages = data['data'] ?? [];
            _isLoading = false;
          });
          _scrollToBottom();
        }
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;
    
    final content = _messageController.text.trim();
    _messageController.clear();
    
    final convId = widget.conversation['id'];
    try {
      final response = await _apiService.post('/api/messages/conversations/$convId/messages', {
        'content': content,
      });
      if (response.statusCode == 201) {
        _fetchMessages();
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al enviar')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      Future.delayed(const Duration(milliseconds: 100), () {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.conversation['title'] ?? 'Conversación #${widget.conversation['id']}';
    
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchMessages),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final msg = _messages[index];
                      // Un mensaje real debería verificar si sender_id == mi user_id
                      // Aquí asumiremos que es alternado para el mockup visual si no hay auth local
                      final isMe = msg['sender_id'] == 1; // dummy fallback
                      
                      return Align(
                        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isMe ? Colors.blue : Colors.grey[300],
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                            children: [
                              Text(
                                msg['content'] ?? '',
                                style: TextStyle(color: isMe ? Colors.white : Colors.black),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                msg['sender_name'] ?? 'Usuario',
                                style: TextStyle(color: isMe ? Colors.white70 : Colors.black54, fontSize: 10),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: const InputDecoration(
                      hintText: 'Escribe un mensaje...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(30)),
                      ),
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: Colors.blue,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white),
                    onPressed: _sendMessage,
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
