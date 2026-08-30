import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';
import 'videocall_room_screen.dart';

class VideoCallsScreen extends StatefulWidget {
  const VideoCallsScreen({super.key});

  @override
  State<VideoCallsScreen> createState() => _VideoCallsScreenState();
}

class _VideoCallsScreenState extends State<VideoCallsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _videocalls = [];

  @override
  void initState() {
    super.initState();
    _fetchVideoCalls();
  }

  Future<void> _fetchVideoCalls() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/api/appointments?status=confirmed&limit=50');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _videocalls = data['data'] ?? [];
        });
      }
    } catch (e) {
      print('Error fetching videocalls: $e');
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
        title: const Text('Videollamadas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchVideoCalls,
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _videocalls.isEmpty
              ? const Center(child: Text('No hay videollamadas programadas'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _videocalls.length,
                  itemBuilder: (context, index) {
                    final call = _videocalls[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Colors.redAccent,
                          child: Icon(Icons.videocam, color: Colors.white),
                        ),
                        title: Text(call['patient_name'] ?? 'Videollamada', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Estado: ${call['status'] ?? 'Pendiente'}\nFecha: ${call['appointment_date']?.toString().split('T')[0] ?? 'N/A'}'),
                        isThreeLine: true,
                        trailing: ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => VideoCallRoomScreen(appointment: call)),
                            );
                          },
                          child: const Text('Unirse'),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
