import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';
import 'patient_form_screen.dart';

class PatientsScreen extends StatefulWidget {
  const PatientsScreen({super.key});

  @override
  State<PatientsScreen> createState() => _PatientsScreenState();
}

class _PatientsScreenState extends State<PatientsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _patients = [];
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchPatients();
  }

  Future<void> _fetchPatients() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/api/patients?limit=20&search=$_searchQuery');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _patients = data['data'] ?? [];
        });
      }
    } catch (e) {
      print('Error fetching patients: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _deletePatient(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar Paciente'),
        content: const Text('¿Estás seguro que deseas eliminar este paciente?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Eliminar', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final res = await _apiService.delete('/api/patients/$id');
      if (res.statusCode == 200) {
        _fetchPatients();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Paciente eliminado')));
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al eliminar')));
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pacientes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const PatientFormScreen()),
              );
              if (result == true) {
                _fetchPatients();
              }
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Buscar paciente...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
              onChanged: (val) {
                _searchQuery = val;
                // Simple debounce logic could go here
              },
              onSubmitted: (_) => _fetchPatients(),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _patients.isEmpty
                    ? const Center(child: Text('No se encontraron pacientes'))
                    : ListView.builder(
                        itemCount: _patients.length,
                        itemBuilder: (context, index) {
                          final patient = _patients[index];
                          final fullName = '${patient['first_name']} ${patient['last_name']}';
                          final doc = '${patient['document_type']}: ${patient['document_number']}';
                          final email = patient['email'] ?? 'Sin correo';

                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: Colors.blue.shade100,
                              child: Text(
                                patient['first_name'][0].toUpperCase(),
                                style: TextStyle(color: Colors.blue.shade900),
                              ),
                            ),
                            title: Text(fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text('$doc\n$email'),
                            isThreeLine: true,
                            trailing: PopupMenuButton<String>(
                              onSelected: (val) async {
                                if (val == 'edit') {
                                  final result = await Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (context) => PatientFormScreen(patient: patient)),
                                  );
                                  if (result == true) _fetchPatients();
                                } else if (val == 'delete') {
                                  _deletePatient(patient['id']);
                                }
                              },
                              itemBuilder: (context) => [
                                const PopupMenuItem(value: 'edit', child: Text('Editar')),
                                const PopupMenuItem(value: 'delete', child: Text('Eliminar', style: TextStyle(color: Colors.red))),
                              ],
                            ),
                            onTap: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Detalles de $fullName')),
                              );
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
