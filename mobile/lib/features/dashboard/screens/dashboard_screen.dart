import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../services/auth_service.dart';
import '../../../services/api_service.dart';
import '../../voice_assistant/screens/voice_assistant_sheet.dart';
import '../../../core/widgets/app_drawer.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  Map<String, dynamic>? _dashboardData;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchDashboardData();
  }

  Future<void> _fetchDashboardData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final response = await _apiService.get('/api/reports/dashboard');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _dashboardData = data;
            _isLoading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _errorMessage = 'Error HTTP ${response.statusCode}: ${response.body}';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      print('Error fetching dashboard: $e');
      if (mounted) {
        setState(() {
          _errorMessage = 'Excepción: $e';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final user = authService.user;
    final firstName = user?['first_name'] ?? 'Usuario';

    return Scaffold(
      drawer: const AppDrawer(),
      appBar: AppBar(
        title: Text('Hola, $firstName 👋'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              authService.logout();
              context.go('/login');
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, color: Colors.red, size: 48),
                        const SizedBox(height: 16),
                        Text('Error al cargar datos: $_errorMessage', textAlign: TextAlign.center, style: const TextStyle(color: Colors.red)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _fetchDashboardData,
                          child: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchDashboardData,
                  child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSummaryCards(),
                    if (user != null && (user['role_id'] == 4 || user['role_name'] == 'patient')) ...[
                      const SizedBox(height: 24),
                      const Text(
                        'Accesos Rápidos',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      _buildPatientQuickLinks(),
                    ],
                    const SizedBox(height: 24),
                    const Text(
                      'Próximas Citas',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    _buildUpcomingAppointments(),
                  ],
                ),
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => VoiceAssistantSheet.show(context),
        backgroundColor: const Color(0xFF2563EB),
        child: const Icon(Icons.mic, color: Colors.white),
      ),
    );
  }

  Widget _buildSummaryCards() {
    final kpis = _dashboardData?['kpis'] ?? {};
    final activeAppointments = (kpis['appointments_today'] ?? 0).toString();
    final activePatients = (kpis['patients_total'] ?? 0).toString();
    final pendingAppointments = (kpis['appointments_pending'] ?? 0).toString();
    final activeVideocalls = (kpis['active_videocalls'] ?? 0).toString();

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildCard(
                'Pacientes Totales',
                activePatients,
                Icons.people,
                Colors.blue,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildCard(
                'Citas Hoy',
                activeAppointments,
                Icons.calendar_today,
                Colors.orange,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildCard(
                'Citas Pendientes',
                pendingAppointments,
                Icons.pending_actions,
                Colors.purple,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildCard(
                'Videollamadas',
                activeVideocalls,
                Icons.video_camera_front,
                Colors.green,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(icon, size: 20, color: color),
            ],
          ),
          const SizedBox(height: 12),
          Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildPatientQuickLinks() {
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: () => context.push('/medical_history'),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade100),
              ),
              child: const Column(
                children: [
                  Icon(Icons.book, size: 32, color: Colors.blue),
                  SizedBox(height: 8),
                  Text('Historial Clínico', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: GestureDetector(
            onTap: () => context.push('/prescriptions'),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.purple.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.purple.shade100),
              ),
              child: const Column(
                children: [
                  Icon(Icons.medication, size: 32, color: Colors.purple),
                  SizedBox(height: 8),
                  Text('Mis Recetas', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.purple)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildUpcomingAppointments() {
    final recent = _dashboardData?['recent_appointments'] as List<dynamic>? ?? [];
    
    if (recent.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(32),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: const Text('No hay citas próximas', style: TextStyle(color: Colors.grey)),
      );
    }

    return Column(
      children: recent.take(5).map((appointment) {
        final doctorName = appointment['doctor_name'] ?? 'Doctor no asignado';
        final specialty = appointment['specialty_name'] ?? 'Medicina General';
        final date = appointment['appointment_date'] ?? '';
        final time = appointment['start_time'] ?? '';
        final type = appointment['type'] == 'virtual' ? 'Videollamada' : 'Presencial';
        
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: appointment['type'] == 'virtual' ? Colors.green.shade50 : Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  appointment['type'] == 'virtual' ? Icons.videocam : Icons.business, 
                  color: appointment['type'] == 'virtual' ? Colors.green : Colors.blue
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(doctorName, style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text(specialty, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                    const SizedBox(height: 4),
                    Text('$type • $date $time', style: TextStyle(color: appointment['type'] == 'virtual' ? Colors.green : Colors.blue, fontSize: 12, fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
