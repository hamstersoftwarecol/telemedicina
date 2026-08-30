import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';
import 'chat_room_screen.dart';
import 'new_message_screen.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _conversations = [];

  @override
  void initState() {
    super.initState();
    _fetchConversations();
  }

  Future<void> _fetchConversations() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/api/messages/conversations');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _conversations = data['data'] ?? [];
        });
      }
    } catch (e) {
      print('Error fetching conversations: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mensajes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const NewMessageScreen()),
              );
              if (result == true) {
                _fetchConversations();
              }
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _conversations.isEmpty
              ? const Center(child: Text('No tienes conversaciones'))
              : ListView.builder(
                  itemCount: _conversations.length,
                  itemBuilder: (context, index) {
                    final conv = _conversations[index];
                    final title = conv['title'] ?? 'Conversación #${conv['id']}';
                    final lastMsg = conv['last_message'] ?? 'Sin mensajes aún';
                    final unread = conv['unread_count'] ?? 0;

                    return ListTile(
                      leading: const CircleAvatar(
                        child: Icon(Icons.person),
                      ),
                      title: Text(title, style: TextStyle(fontWeight: unread > 0 ? FontWeight.bold : FontWeight.normal)),
                      subtitle: Text(lastMsg, maxLines: 1, overflow: TextOverflow.ellipsis),
                      trailing: unread > 0
                          ? CircleAvatar(
                              radius: 12,
                              backgroundColor: Colors.red,
                              child: Text(unread.toString(), style: const TextStyle(color: Colors.white, fontSize: 12)),
                            )
                          : null,
                      onTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => ChatRoomScreen(conversation: conv)),
                        );
                        _fetchConversations();
                      },
                    );
                  },
                ),
    );
  }
}
