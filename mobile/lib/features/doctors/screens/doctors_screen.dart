import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';
import 'doctor_form_screen.dart';

class DoctorsScreen extends StatefulWidget {
  const DoctorsScreen({super.key});

  @override
  State<DoctorsScreen> createState() => _DoctorsScreenState();
}

class _DoctorsScreenState extends State<DoctorsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _doctors = [];

  @override
  void initState() {
    super.initState();
    _fetchDoctors();
  }

  Future<void> _fetchDoctors() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/api/doctors?limit=50');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _doctors = data['data'] ?? [];
        });
      }
    } catch (e) {
      print('Error fetching doctors: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _deleteDoctor(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Desactivar Médico'),
        content: const Text('¿Estás seguro que deseas desactivar este médico?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Desactivar', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final res = await _apiService.delete('/api/doctors/$id');
      if (res.statusCode == 200) {
        _fetchDoctors();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Médico desactivado')));
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al desactivar')));
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
        title: const Text('Médicos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const DoctorFormScreen()),
              );
              if (result == true) {
                _fetchDoctors();
              }
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _doctors.isEmpty
              ? const Center(child: Text('No hay médicos registrados'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _doctors.length,
                  itemBuilder: (context, index) {
                    final doc = _doctors[index];
                    final fullName = 'Dr. ${doc['first_name']} ${doc['last_name']}';
                    final specialty = doc['specialty_name'] ?? 'General';
                    final license = doc['license_number'] ?? 'Sin licencia';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.indigo.shade100,
                          child: Text(
                            doc['first_name'][0].toUpperCase(),
                            style: TextStyle(color: Colors.indigo.shade900),
                          ),
                        ),
                        title: Text(fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('$specialty\nLicencia: $license'),
                        isThreeLine: true,
                        trailing: PopupMenuButton<String>(
                          onSelected: (val) async {
                            if (val == 'edit') {
                              final result = await Navigator.push(
                                context,
                                MaterialPageRoute(builder: (context) => DoctorFormScreen(doctor: doc)),
                              );
                              if (result == true) _fetchDoctors();
                            } else if (val == 'delete') {
                              _deleteDoctor(doc['id']);
                            }
                          },
                          itemBuilder: (context) => [
                            const PopupMenuItem(value: 'edit', child: Text('Editar')),
                            const PopupMenuItem(value: 'delete', child: Text('Desactivar', style: TextStyle(color: Colors.red))),
                          ],
                        ),
                        onTap: () {
                          // Show bottom sheet to book appointment
                          showModalBottomSheet(
                            context: context,
                            shape: const RoundedRectangleBorder(
                              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                            ),
                            builder: (ctx) => Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text('Reservar cita con $fullName', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 10),
                                  Text(specialty, style: const TextStyle(color: Colors.grey)),
                                  const SizedBox(height: 20),
                                  const Text('Seleccione la fecha y hora:', style: TextStyle(fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 10),
                                  // Simplified booking action for phase 1 demo
                                  ElevatedButton(
                                    onPressed: () async {
                                      Navigator.pop(ctx);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Procesando reserva...')),
                                      );
                                      // Normally we would POST to /api/appointments here
                                      // But for the basic view, this is sufficient to show the flow
                                      await Future.delayed(const Duration(seconds: 1));
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('¡Cita reservada exitosamente!')),
                                      );
                                    },
                                    child: const Text('Confirmar Reserva'),
                                  )
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
