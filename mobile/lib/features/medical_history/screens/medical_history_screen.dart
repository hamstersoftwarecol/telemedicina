import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';

class MedicalHistoryScreen extends StatefulWidget {
  const MedicalHistoryScreen({super.key});

  @override
  State<MedicalHistoryScreen> createState() => _MedicalHistoryScreenState();
}

class _MedicalHistoryScreenState extends State<MedicalHistoryScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _events = [];
  Map<String, dynamic>? _profile;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() => _isLoading = true);
    try {
      // First get profile to get patient_id
      final profileRes = await _apiService.get('/api/profile');
      if (profileRes.statusCode == 200) {
        final profileData = jsonDecode(profileRes.body);
        _profile = profileData['data'];
      }

      if (_profile != null && _profile!['id'] != null) {
        final response = await _apiService.get('/api/medical-history?patient_id=${_profile!['id']}');
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          setState(() {
            _events = data['data'] ?? [];
          });
        }
      }
    } catch (e) {
      print('Error fetching history: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  IconData _getEventIcon(String type) {
    switch (type) {
      case 'consultation': return Icons.medical_services;
      case 'prescription': return Icons.medication;
      case 'exam': return Icons.biotech;
      case 'hospitalization': return Icons.local_hospital;
      case 'surgery': return Icons.healing;
      case 'allergy': return Icons.warning;
      case 'note': return Icons.note;
      default: return Icons.info;
    }
  }

  Color _getEventColor(String type) {
    switch (type) {
      case 'consultation': return Colors.blue;
      case 'prescription': return Colors.green;
      case 'exam': return Colors.purple;
      case 'hospitalization': return Colors.red;
      case 'surgery': return Colors.orange;
      case 'allergy': return Colors.amber;
      case 'note': return Colors.grey;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Historial Médico'),
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _events.isEmpty
              ? const Center(child: Text('No hay eventos en tu historial'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _events.length,
                  itemBuilder: (context, index) {
                    final event = _events[index];
                    final date = DateTime.parse(event['event_date']).toLocal().toString().split(' ')[0];
                    final type = event['event_type'];
                    
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _getEventColor(type).withOpacity(0.2),
                          child: Icon(_getEventIcon(type), color: _getEventColor(type)),
                        ),
                        title: Text(event['title'] ?? 'Evento', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(date),
                            if (event['doctor_name'] != null) Text('Dr. ${event['doctor_name']}'),
                            if (event['description'] != null) 
                              Padding(
                                padding: const EdgeInsets.only(top: 4.0),
                                child: Text(event['description'], style: const TextStyle(color: Colors.grey)),
                              ),
                          ],
                        ),
                        isThreeLine: event['description'] != null,
                      ),
                    );
                  },
                ),
    );
  }
}
