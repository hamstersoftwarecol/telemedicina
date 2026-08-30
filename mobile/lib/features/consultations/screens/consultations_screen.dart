import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';
import 'consultation_form_screen.dart';

class ConsultationsScreen extends StatefulWidget {
  const ConsultationsScreen({super.key});

  @override
  State<ConsultationsScreen> createState() => _ConsultationsScreenState();
}

class _ConsultationsScreenState extends State<ConsultationsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _consultations = [];

  @override
  void initState() {
    super.initState();
    _fetchConsultations();
  }

  Future<void> _fetchConsultations() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/api/consultations?limit=50');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _consultations = data['data'] ?? [];
        });
      }
    } catch (e) {
      print('Error fetching consultations: $e');
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
        title: const Text('Consultas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ConsultationFormScreen()),
              );
              if (result == true) {
                _fetchConsultations();
              }
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _consultations.isEmpty
              ? const Center(child: Text('No hay consultas registradas'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _consultations.length,
                  itemBuilder: (context, index) {
                    final c = _consultations[index];
                    final date = c['consultation_date'].toString().split('T')[0];

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.assignment, color: Colors.blue),
                        ),
                        title: Text(
                          c['patient_name'] ?? 'Paciente',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text('Motivo: ${c['chief_complaint'] ?? 'No especificado'}', maxLines: 1, overflow: TextOverflow.ellipsis),
                            Text('Dx: ${c['diagnosis'] ?? 'Sin diagnóstico'}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.green)),
                          ],
                        ),
                        isThreeLine: true,
                        trailing: IconButton(
                          icon: const Icon(Icons.edit, color: Colors.blue),
                          onPressed: () async {
                            final result = await Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => ConsultationFormScreen(consultation: c)),
                            );
                            if (result == true) _fetchConsultations();
                          },
                        ),
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Detalle de consulta #${c['id']}')),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
