import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ayuda y Soporte'),
      ),
      drawer: const AppDrawer(),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Center(
            child: Icon(Icons.help_outline, size: 80, color: Colors.blue),
          ),
          const SizedBox(height: 24),
          const Text(
            'Centro de Ayuda Telemedicina',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          const Text(
            '¿Cómo podemos ayudarte hoy?',
            style: TextStyle(fontSize: 16, color: Colors.grey),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          _buildHelpCard(context, Icons.menu_book, 'Guía de Usuario', 'Aprende a utilizar todas las funciones de la aplicación.'),
          _buildHelpCard(context, Icons.contact_support, 'Preguntas Frecuentes', 'Respuestas a los problemas más comunes.'),
          _buildHelpCard(context, Icons.headset_mic, 'Contactar Soporte Técnico', 'Habla con un asesor para asistencia personalizada.'),
          const SizedBox(height: 32),
          const Text(
            'Versión de la aplicación: 1.0.0',
            style: TextStyle(fontSize: 12, color: Colors.grey),
            textAlign: TextAlign.center,
          )
        ],
      ),
    );
  }

  Widget _buildHelpCard(BuildContext context, IconData icon, String title, String subtitle) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(icon, color: Colors.blue),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Abriendo: $title')),
          );
        },
      ),
    );
  }
}
