import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';
import 'prescription_form_screen.dart';

class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({super.key});

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _prescriptions = [];
  Map<String, dynamic>? _profile;

  @override
  void initState() {
    super.initState();
    _fetchPrescriptions();
  }

  Future<void> _fetchPrescriptions() async {
    setState(() => _isLoading = true);
    try {
      final profileRes = await _apiService.get('/api/profile');
      if (profileRes.statusCode == 200) {
        final profileData = jsonDecode(profileRes.body);
        _profile = profileData['data'];
      }

      String endpoint = '/api/prescriptions?limit=50';
      if (_profile != null && _profile!['id'] != null) {
        endpoint += '&patient_id=${_profile!['id']}';
      }

      final response = await _apiService.get(endpoint);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _prescriptions = data['data'] ?? [];
        });
      }
    } catch (e) {
      print('Error fetching prescriptions: $e');
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
        title: const Text('Mis Recetas'),
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _prescriptions.isEmpty
              ? const Center(child: Text('No hay recetas registradas'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _prescriptions.length,
                  itemBuilder: (context, index) {
                    final presc = _prescriptions[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Colors.purpleAccent,
                          child: Icon(Icons.medication, color: Colors.white),
                        ),
                        title: Text(presc['patient_name'] ?? 'Receta Médica', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Médico: ${presc['doctor_name'] ?? 'N/A'}\nFecha: ${presc['prescription_date']?.toString().split('T')[0] ?? 'N/A'}'),
                        isThreeLine: true,
                        trailing: const Icon(Icons.download),
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Descargar receta - Próximamente')),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
