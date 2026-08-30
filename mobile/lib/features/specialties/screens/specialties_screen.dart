import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';
import 'specialty_form_screen.dart';

class SpecialtiesScreen extends StatefulWidget {
  const SpecialtiesScreen({super.key});

  @override
  State<SpecialtiesScreen> createState() => _SpecialtiesScreenState();
}

class _SpecialtiesScreenState extends State<SpecialtiesScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _specialties = [];

  @override
  void initState() {
    super.initState();
    _fetchSpecialties();
  }

  Future<void> _fetchSpecialties() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/api/specialties');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _specialties = data['data'] ?? [];
        });
      }
    } catch (e) {
      print('Error fetching specialties: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _deleteSpecialty(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Desactivar Especialidad'),
        content: const Text('¿Deseas desactivar esta especialidad?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Desactivar', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final res = await _apiService.delete('/api/specialties/$id');
      if (res.statusCode == 200) {
        _fetchSpecialties();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Especialidad desactivada')));
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error')));
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
        title: const Text('Especialidades'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SpecialtyFormScreen()),
              );
              if (result == true) {
                _fetchSpecialties();
              }
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _specialties.isEmpty
              ? const Center(child: Text('No hay especialidades registradas'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _specialties.length,
                  itemBuilder: (context, index) {
                    final spec = _specialties[index];
                    
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.teal.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.medical_information, color: Colors.teal),
                        ),
                        title: Text(spec['name'] ?? 'Especialidad', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(spec['description'] ?? 'Sin descripción', maxLines: 2, overflow: TextOverflow.ellipsis),
                        trailing: PopupMenuButton<String>(
                          onSelected: (val) async {
                            if (val == 'edit') {
                              final result = await Navigator.push(
                                context,
                                MaterialPageRoute(builder: (context) => SpecialtyFormScreen(specialty: spec)),
                              );
                              if (result == true) _fetchSpecialties();
                            } else if (val == 'delete') {
                              _deleteSpecialty(spec['id']);
                            }
                          },
                          itemBuilder: (context) => [
                            const PopupMenuItem(value: 'edit', child: Text('Editar')),
                            const PopupMenuItem(value: 'delete', child: Text('Desactivar', style: TextStyle(color: Colors.red))),
                          ],
                        ),
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Doctores de ${spec['name']}')),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
