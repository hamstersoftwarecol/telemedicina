import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  Map<String, dynamic> _dashboardStats = {};

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/api/reports/dashboard');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _dashboardStats = data['data'] ?? {};
        });
      }
    } catch (e) {
      print('Error fetching reports: $e');
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
        title: const Text('Reportes'),
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Métricas Generales', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _buildStatCard('Total Pacientes', _dashboardStats['total_patients']?.toString() ?? '0', Icons.people, Colors.blue),
                _buildStatCard('Total Citas', _dashboardStats['total_appointments']?.toString() ?? '0', Icons.calendar_today, Colors.green),
                _buildStatCard('Consultas', _dashboardStats['total_consultations']?.toString() ?? '0', Icons.assignment, Colors.purple),
                _buildStatCard('Ingresos', '\$${_dashboardStats['total_revenue'] ?? '0.00'}', Icons.attach_money, Colors.amber),
                const SizedBox(height: 32),
                Center(
                  child: ElevatedButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Generar reporte PDF - Próximamente')),
                      );
                    },
                    child: const Text('Generar Reporte Completo'),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.2),
          child: Icon(icon, color: color),
        ),
        title: Text(title),
        trailing: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
    );
  }
}
