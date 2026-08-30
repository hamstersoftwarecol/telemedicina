import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../services/api_service.dart';

class NewMessageScreen extends StatefulWidget {
  const NewMessageScreen({super.key});

  @override
  State<NewMessageScreen> createState() => _NewMessageScreenState();
}

class _NewMessageScreenState extends State<NewMessageScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _users = [];
  int? _selectedUserId;

  final _titleController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _fetchUsers() async {
    try {
      final response = await _apiService.get('/api/messages/users');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _users = data['data'] ?? [];
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _startConversation() async {
    if (_selectedUserId == null) return;
    
    setState(() => _isLoading = true);
    try {
      final payload = {
        'participant_ids': [_selectedUserId],
        'title': _titleController.text.isNotEmpty ? _titleController.text : null,
      };
      
      final res = await _apiService.post('/api/messages/conversations', payload);
      if (res.statusCode == 201) {
        if (mounted) Navigator.pop(context, true);
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nueva Conversación'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<int>(
                    value: _selectedUserId,
                    decoration: const InputDecoration(labelText: 'Usuario *', border: OutlineInputBorder()),
                    items: _users.map((u) => DropdownMenuItem<int>(
                          value: u['id'],
                          child: Text('${u['first_name']} ${u['last_name']}'),
                        )).toList(),
                    onChanged: (v) => setState(() => _selectedUserId = v),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _titleController,
                    decoration: const InputDecoration(labelText: 'Título del chat (opcional)', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: _selectedUserId != null ? _startConversation : null,
                    style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                    child: const Text('INICIAR CHAT'),
                  ),
                ],
              ),
            ),
    );
  }
}
