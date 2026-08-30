import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../services/api_service.dart';

class SpecialtyFormScreen extends StatefulWidget {
  final Map<String, dynamic>? specialty;

  const SpecialtyFormScreen({super.key, this.specialty});

  @override
  State<SpecialtyFormScreen> createState() => _SpecialtyFormScreenState();
}

class _SpecialtyFormScreenState extends State<SpecialtyFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  bool _isLoading = false;

  late TextEditingController _nameController;
  late TextEditingController _descController;
  late TextEditingController _colorController;
  late TextEditingController _iconController;

  @override
  void initState() {
    super.initState();
    final s = widget.specialty;
    _nameController = TextEditingController(text: s?['name'] ?? '');
    _descController = TextEditingController(text: s?['description'] ?? '');
    _colorController = TextEditingController(text: s?['color'] ?? '#3B82F6');
    _iconController = TextEditingController(text: s?['icon'] ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _colorController.dispose();
    _iconController.dispose();
    super.dispose();
  }

  Future<void> _saveSpecialty() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final payload = {
      'name': _nameController.text,
      'description': _descController.text.isNotEmpty ? _descController.text : null,
      'color': _colorController.text,
      'icon': _iconController.text.isNotEmpty ? _iconController.text : null,
    };

    try {
      if (widget.specialty == null) {
        final res = await _apiService.post('/api/specialties', payload);
        if (res.statusCode == 201) {
          if (mounted) Navigator.pop(context, true);
        } else {
          final err = jsonDecode(res.body);
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err['error'] ?? 'Error')));
        }
      } else {
        final id = widget.specialty!['id'];
        final res = await _apiService.put('/api/specialties/$id', payload);
        if (res.statusCode == 200) {
          if (mounted) Navigator.pop(context, true);
        } else {
          final err = jsonDecode(res.body);
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err['error'] ?? 'Error')));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.specialty != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Editar Especialidad' : 'Nueva Especialidad'),
        actions: [
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Colors.white)))
          else
            IconButton(icon: const Icon(Icons.check), onPressed: _saveSpecialty),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Nombre *', border: OutlineInputBorder()),
                validator: (v) => v!.isEmpty ? 'Requerido' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descController,
                decoration: const InputDecoration(labelText: 'Descripción', border: OutlineInputBorder()),
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _colorController,
                decoration: const InputDecoration(labelText: 'Color (Hex)', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _iconController,
                decoration: const InputDecoration(labelText: 'Ícono (opcional)', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveSpecialty,
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                  child: Text(isEdit ? 'GUARDAR' : 'CREAR'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
