import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../services/api_service.dart';

class PatientFormScreen extends StatefulWidget {
  final Map<String, dynamic>? patient; // If null, it's create mode.

  const PatientFormScreen({super.key, this.patient});

  @override
  State<PatientFormScreen> createState() => _PatientFormScreenState();
}

class _PatientFormScreenState extends State<PatientFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  bool _isLoading = false;

  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _docNumberController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _addressController;

  String _docType = 'CC';
  String _gender = 'M';
  DateTime? _dob;

  @override
  void initState() {
    super.initState();
    final p = widget.patient;
    _firstNameController = TextEditingController(text: p?['first_name'] ?? '');
    _lastNameController = TextEditingController(text: p?['last_name'] ?? '');
    _docNumberController = TextEditingController(text: p?['document_number'] ?? '');
    _emailController = TextEditingController(text: p?['email'] ?? '');
    _phoneController = TextEditingController(text: p?['phone'] ?? '');
    _addressController = TextEditingController(text: p?['address'] ?? '');

    if (p != null) {
      _docType = p['document_type'] ?? 'CC';
      _gender = p['gender'] ?? 'M';
      if (p['date_of_birth'] != null) {
        _dob = DateTime.tryParse(p['date_of_birth']);
      }
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _docNumberController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dob ?? DateTime(2000),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _dob = picked);
    }
  }

  Future<void> _savePatient() async {
    if (!_formKey.currentState!.validate()) return;
    if (_dob == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Seleccione la fecha de nacimiento')));
      return;
    }

    setState(() => _isLoading = true);

    final payload = {
      'first_name': _firstNameController.text,
      'last_name': _lastNameController.text,
      'document_type': _docType,
      'document_number': _docNumberController.text,
      'date_of_birth': _dob!.toIso8601String().split('T')[0],
      'gender': _gender,
      'email': _emailController.text.isNotEmpty ? _emailController.text : null,
      'phone': _phoneController.text.isNotEmpty ? _phoneController.text : null,
      'address': _addressController.text.isNotEmpty ? _addressController.text : null,
    };

    try {
      if (widget.patient == null) {
        final res = await _apiService.post('/api/patients', payload);
        if (res.statusCode == 201) {
          if (mounted) Navigator.pop(context, true);
        } else {
          final err = jsonDecode(res.body);
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err['error'] ?? 'Error')));
        }
      } else {
        final id = widget.patient!['id'];
        final res = await _apiService.put('/api/patients/$id', payload);
        if (res.statusCode == 200) {
          if (mounted) Navigator.pop(context, true);
        } else {
          final err = jsonDecode(res.body);
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err['error'] ?? 'Error')));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error de conexión: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.patient != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Editar Paciente' : 'Nuevo Paciente'),
        actions: [
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Colors.white)))
          else
            IconButton(icon: const Icon(Icons.check), onPressed: _savePatient),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Información Personal', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _firstNameController,
                      decoration: const InputDecoration(labelText: 'Nombres *', border: OutlineInputBorder()),
                      validator: (v) => v!.isEmpty ? 'Requerido' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lastNameController,
                      decoration: const InputDecoration(labelText: 'Apellidos *', border: OutlineInputBorder()),
                      validator: (v) => v!.isEmpty ? 'Requerido' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: DropdownButtonFormField<String>(
                      isExpanded: true,
                      value: _docType,
                      decoration: const InputDecoration(labelText: 'Tipo Doc *', border: OutlineInputBorder()),
                      items: ['CC', 'TI', 'CE', 'PASSPORT', 'DNI'].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                      onChanged: (v) => setState(() => _docType = v!),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _docNumberController,
                      decoration: const InputDecoration(labelText: 'Número de documento *', border: OutlineInputBorder()),
                      validator: (v) => v!.isEmpty ? 'Requerido' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _selectDate,
                      child: InputDecorator(
                        decoration: const InputDecoration(labelText: 'Fecha de Nac. *', border: OutlineInputBorder()),
                        child: Text(_dob != null ? _dob!.toIso8601String().split('T')[0] : 'Seleccionar'),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      isExpanded: true,
                      value: _gender,
                      decoration: const InputDecoration(labelText: 'Género *', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'M', child: Text('Masculino')),
                        DropdownMenuItem(value: 'F', child: Text('Femenino')),
                        DropdownMenuItem(value: 'O', child: Text('Otro')),
                      ],
                      onChanged: (v) => setState(() => _gender = v!),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text('Contacto', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: 'Correo electrónico', border: OutlineInputBorder()),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: 'Teléfono', border: OutlineInputBorder()),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _addressController,
                decoration: const InputDecoration(labelText: 'Dirección', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _savePatient,
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                  child: Text(isEdit ? 'GUARDAR CAMBIOS' : 'REGISTRAR PACIENTE'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
