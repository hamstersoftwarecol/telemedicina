import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final user = authService.user;
    
    final currentRoute = GoRouterState.of(context).uri.toString();

    return Drawer(
      child: Column(
        children: [
          UserAccountsDrawerHeader(
            accountName: Text('${user?['first_name'] ?? 'Usuario'} ${user?['last_name'] ?? ''}'),
            accountEmail: Text(user?['email'] ?? ''),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(
                user?['first_name']?.substring(0, 1) ?? 'U',
                style: const TextStyle(fontSize: 24.0, color: Colors.blue),
              ),
            ),
            decoration: const BoxDecoration(
              color: Colors.blue,
            ),
          ),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _buildDrawerItem(context, 'Dashboard', Icons.dashboard, '/dashboard', currentRoute),
                _buildDrawerItem(context, 'Pacientes', Icons.people, '/patients', currentRoute),
                _buildDrawerItem(context, 'Médicos', Icons.medical_services, '/doctors', currentRoute),
                _buildDrawerItem(context, 'Especialidades', Icons.local_hospital, '/specialties', currentRoute),
                _buildDrawerItem(context, 'Agenda', Icons.calendar_month, '/appointments', currentRoute),
                _buildDrawerItem(context, 'Consultas', Icons.assignment, '/consultations', currentRoute),
                _buildDrawerItem(context, 'Videollamadas', Icons.video_call, '/videocalls', currentRoute),
                _buildDrawerItem(context, 'Recetas', Icons.receipt_long, '/prescriptions', currentRoute),
                _buildDrawerItem(context, 'Exámenes', Icons.biotech, '/exams', currentRoute),
                _buildDrawerItem(context, 'Historial Clínico', Icons.history, '/medical_history', currentRoute),
                _buildDrawerItem(context, 'Facturación', Icons.payments, '/invoices', currentRoute),
                _buildDrawerItem(context, 'Reportes', Icons.bar_chart, '/reports', currentRoute),
                const Divider(),
                _buildDrawerItem(context, 'Mensajes', Icons.message, '/messages', currentRoute),
                _buildDrawerItem(context, 'Notificaciones', Icons.notifications, '/notifications', currentRoute),
                _buildDrawerItem(context, 'Configuración', Icons.settings, '/settings', currentRoute),
                _buildDrawerItem(context, 'Ayuda', Icons.help, '/help', currentRoute),
              ],
            ),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Cerrar sesión', style: TextStyle(color: Colors.red)),
            onTap: () {
              authService.logout();
              context.go('/login');
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(BuildContext context, String title, IconData icon, String route, String currentRoute) {
    final isSelected = currentRoute.startsWith(route);
    return ListTile(
      leading: Icon(icon, color: isSelected ? Colors.blue : null),
      title: Text(
        title,
        style: TextStyle(
          color: isSelected ? Colors.blue : null,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      selected: isSelected,
      selectedTileColor: Colors.blue.withOpacity(0.1),
      onTap: () {
        Navigator.pop(context); // Close drawer
        if (!isSelected) {
          context.go(route);
        }
      },
    );
  }
}
