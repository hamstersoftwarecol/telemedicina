import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';
import 'appointment_form_screen.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _appointments = [];

  @override
  void initState() {
    super.initState();
    _fetchAppointments();
  }

  Future<void> _fetchAppointments() async {
    setState(() => _isLoading = true);
    try {
      // Usar un rango amplio de ejemplo (mes actual)
      final now = DateTime.now();
      final from = DateTime(now.year, now.month, 1).toIso8601String().split('T')[0];
      final to = DateTime(now.year, now.month + 2, 0).toIso8601String().split('T')[0];

      final response = await _apiService.get('/api/appointments?from=$from&to=$to&limit=50');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _appointments = data['data'] ?? [];
        });
      }
    } catch (e) {
      print('Error fetching appointments: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending': return Colors.orange;
      case 'confirmed': return Colors.blue;
      case 'in_progress': return Colors.purple;
      case 'completed': return Colors.green;
      case 'cancelled': return Colors.red;
      default: return Colors.grey;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmada';
      case 'in_progress': return 'En progreso';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  }

  Future<void> _updateStatus(int id, String status) async {
    setState(() => _isLoading = true);
    try {
      final res = await _apiService.patch('/api/appointments/$id/status', {'status': status});
      if (res.statusCode == 200) {
        _fetchAppointments();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Cita $status')));
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error al actualizar')));
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
        title: const Text('Agenda'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AppointmentFormScreen()),
              );
              if (result == true) {
                _fetchAppointments();
              }
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _appointments.isEmpty
              ? const Center(child: Text('No hay citas en este periodo'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _appointments.length,
                  itemBuilder: (context, index) {
                    final appt = _appointments[index];
                    final date = appt['appointment_date'].toString().split('T')[0];
                    final time = '${appt['start_time']} - ${appt['end_time']}';
                    final statusColor = _getStatusColor(appt['status']);

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        title: Text('${appt['patient_name']} - $date', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Hora: $time'),
                            Text('Médico: ${appt['doctor_name']}'),
                            Text('Motivo: ${appt['reason'] ?? 'No especificado'}'),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: statusColor.withOpacity(0.5)),
                              ),
                              child: Text(
                                _getStatusLabel(appt['status']),
                                style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        trailing: PopupMenuButton<String>(
                          onSelected: (val) async {
                            if (val == 'edit') {
                              final result = await Navigator.push(
                                context,
                                MaterialPageRoute(builder: (context) => AppointmentFormScreen(appointment: appt)),
                              );
                              if (result == true) _fetchAppointments();
                            } else if (val == 'confirmed') {
                              _updateStatus(appt['id'], 'confirmed');
                            } else if (val == 'cancelled') {
                              _updateStatus(appt['id'], 'cancelled');
                            }
                          },
                          itemBuilder: (context) => [
                            const PopupMenuItem(value: 'edit', child: Text('Editar')),
                            if (appt['status'] == 'pending') const PopupMenuItem(value: 'confirmed', child: Text('Confirmar')),
                            if (appt['status'] != 'cancelled') const PopupMenuItem(value: 'cancelled', child: Text('Cancelar', style: TextStyle(color: Colors.red))),
                          ],
                        ),
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Detalle de cita')),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
