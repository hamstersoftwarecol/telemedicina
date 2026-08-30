import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  
  String _themeMode = 'light';
  bool _notificationsEnabled = true;

  // Profile data
  Map<String, dynamic> _profile = {};
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _bloodTypeController = TextEditingController();
  final TextEditingController _allergiesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchSettings();
  }

  Future<void> _fetchSettings() async {
    setState(() => _isLoading = true);
    try {
      final settingsRes = await _apiService.get('/api/settings');
      if (settingsRes.statusCode == 200) {
        final data = jsonDecode(settingsRes.body);
        final s = data['data'] ?? {};
        setState(() {
          _themeMode = s['theme_mode'] ?? 'light';
          _notificationsEnabled = s['notifications_enabled'] == true || s['notifications_enabled'] == 'true';
        });
      }

      final profileRes = await _apiService.get('/api/profile');
      if (profileRes.statusCode == 200) {
        final data = jsonDecode(profileRes.body);
        final p = data['data'] ?? {};
        setState(() {
          _profile = p;
          _firstNameController.text = p['first_name'] ?? '';
          _lastNameController.text = p['last_name'] ?? '';
          _phoneController.text = p['phone'] ?? '';
          _bloodTypeController.text = p['blood_type'] ?? '';
          _allergiesController.text = p['allergies'] ?? '';
        });
      }
    } catch (e) {
      print('Error fetching settings/profile: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _bloodTypeController.dispose();
    _allergiesController.dispose();
    super.dispose();
  }

  Future<void> _saveSettings() async {
    setState(() => _isLoading = true);
    try {
      final res = await _apiService.put('/api/settings', {
        'theme_mode': _themeMode,
        'notifications_enabled': _notificationsEnabled.toString(),
      });
      
      final resProfile = await _apiService.put('/api/profile', {
        'first_name': _firstNameController.text,
        'last_name': _lastNameController.text,
        'phone': _phoneController.text,
        'blood_type': _bloodTypeController.text,
        'allergies': _allergiesController.text,
      });

      if (res.statusCode == 200 && resProfile.statusCode == 200 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Configuración y perfil guardados')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Configuración'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _saveSettings,
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Preferencias de la aplicación', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                SwitchListTile(
                  title: const Text('Notificaciones Push'),
                  value: _notificationsEnabled,
                  onChanged: (val) {
                    setState(() {
                      _notificationsEnabled = val;
                    });
                  },
                ),
                SwitchListTile(
                  title: const Text('Modo Oscuro'),
                  value: _themeMode == 'dark',
                  onChanged: (val) {
                    setState(() {
                      _themeMode = val ? 'dark' : 'light';
                    });
                  },
                ),
                
                if (_profile.isNotEmpty) ...[
                  const Divider(height: 32),
                  const Text('Mi Perfil', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _firstNameController,
                    decoration: const InputDecoration(labelText: 'Nombres', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _lastNameController,
                    decoration: const InputDecoration(labelText: 'Apellidos', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _phoneController,
                    decoration: const InputDecoration(labelText: 'Teléfono', border: OutlineInputBorder()),
                  ),
                  if (_profile['document_number'] != null) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: _bloodTypeController,
                      decoration: const InputDecoration(labelText: 'Tipo de Sangre', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _allergiesController,
                      decoration: const InputDecoration(labelText: 'Alergias', border: OutlineInputBorder()),
                    ),
                  ],
                ],

                const Divider(height: 32),
                const Text('Cuenta', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ListTile(
                  leading: const Icon(Icons.lock),
                  title: const Text('Cambiar contraseña'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Cambiar contraseña - Próximamente')),
                    );
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.logout, color: Colors.red),
                  title: const Text('Cerrar sesión', style: TextStyle(color: Colors.red)),
                  onTap: () {
                    _apiService.logout();
                    context.go('/login');
                  },
                ),
              ],
            ),
    );
  }
}
