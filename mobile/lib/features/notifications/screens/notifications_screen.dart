import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _notifications = [];

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/api/notifications?limit=50');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _notifications = data['data'] ?? [];
        });
      }
    } catch (e) {
      print('Error fetching notifications: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _markAllAsRead() async {
    setState(() => _isLoading = true);
    try {
      final res = await _apiService.patch('/api/notifications/read-all', {});
      if (res.statusCode == 200) {
        _fetchNotifications();
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteNotification(int id) async {
    setState(() => _isLoading = true);
    try {
      final res = await _apiService.delete('/api/notifications/$id');
      if (res.statusCode == 200) {
        _fetchNotifications();
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all),
            tooltip: 'Marcar todas como leídas',
            onPressed: _markAllAsRead,
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? const Center(child: Text('No tienes notificaciones nuevas'))
              : ListView.builder(
                  itemCount: _notifications.length,
                  itemBuilder: (context, index) {
                    final notif = _notifications[index];
                    final isRead = notif['is_read'] == 1;

                    return ListTile(
                      tileColor: isRead ? null : Colors.blue.withOpacity(0.05),
                      leading: Icon(
                        Icons.notifications,
                        color: isRead ? Colors.grey : Colors.blue,
                      ),
                      title: Text(
                        notif['title'] ?? 'Notificación',
                        style: TextStyle(fontWeight: isRead ? FontWeight.normal : FontWeight.bold),
                      ),
                      subtitle: Text(notif['message'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete, color: Colors.grey),
                        onPressed: () => _deleteNotification(notif['id']),
                      ),
                      onTap: () async {
                        if (!isRead) {
                          await _apiService.patch('/api/notifications/${notif['id']}/read', {});
                          _fetchNotifications();
                        }
                      },
                    );
                  },
                ),
    );
  }
}
