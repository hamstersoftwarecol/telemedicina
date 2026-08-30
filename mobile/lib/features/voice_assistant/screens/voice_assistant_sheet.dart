import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../services/assistant_service.dart';

class VoiceAssistantSheet extends StatefulWidget {
  const VoiceAssistantSheet({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: const VoiceAssistantSheet(),
      ),
    );
  }

  @override
  State<VoiceAssistantSheet> createState() => _VoiceAssistantSheetState();
}

class _VoiceAssistantSheetState extends State<VoiceAssistantSheet> {
  final _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    final service = Provider.of<AssistantService>(context, listen: false);
    if (service.messages.isEmpty) {
      service.sendMessage('Hola'); // Trigger initial greeting
    }
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _handleSend() {
    final text = _textController.text;
    if (text.trim().isNotEmpty) {
      Provider.of<AssistantService>(context, listen: false).sendMessage(text);
      _textController.clear();
      Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          _buildHeader(context),
          Expanded(child: _buildChatArea()),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.smart_toy, color: Colors.blue),
              ),
              const SizedBox(width: 12),
              const Text(
                'Asistente Médico',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  Widget _buildChatArea() {
    return Consumer<AssistantService>(
      builder: (context, service, child) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
        
        return ListView.builder(
          controller: _scrollController,
          padding: const EdgeInsets.all(16),
          itemCount: service.messages.length + (service.isLoading ? 1 : 0),
          itemBuilder: (context, index) {
            if (index == service.messages.length) {
              return const Padding(
                padding: EdgeInsets.all(8.0),
                child: Center(
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              );
            }
            
            final msg = service.messages[index];
            final isUser = msg.role == 'user';
            
            return Align(
              alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isUser ? const Color(0xFF2563EB) : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(16).copyWith(
                    bottomRight: isUser ? const Radius.circular(0) : const Radius.circular(16),
                    bottomLeft: !isUser ? const Radius.circular(0) : const Radius.circular(16),
                  ),
                ),
                child: Text(
                  msg.content,
                  style: TextStyle(
                    color: isUser ? Colors.white : Colors.black87,
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _textController,
              decoration: InputDecoration(
                hintText: 'Escribe un mensaje...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.grey.shade100,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              ),
              onSubmitted: (_) => _handleSend(),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            decoration: const BoxDecoration(
              color: Color(0xFF2563EB),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.send, color: Colors.white, size: 20),
              onPressed: _handleSend,
            ),
          ),
        ],
      ),
    );
  }
}
