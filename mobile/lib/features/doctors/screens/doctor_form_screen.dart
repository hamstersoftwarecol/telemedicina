import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../services/api_service.dart';

class DoctorFormScreen extends StatefulWidget {
  final Map<String, dynamic>? doctor;

  const DoctorFormScreen({super.key, this.doctor});

  @override
  State<DoctorFormScreen> createState() => _DoctorFormScreenState();
}

class _DoctorFormScreenState extends State<DoctorFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  List<dynamic> _specialties = [];

  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _licenseController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _officeController;
  late TextEditingController _feeController;

  int? _specialtyId;

  @override
  void initState() {
    super.initState();
    _fetchSpecialties();

    final d = widget.doctor;
    _firstNameController = TextEditingController(text: d?['first_name'] ?? '');
    _lastNameController = TextEditingController(text: d?['last_name'] ?? '');
    _licenseController = TextEditingController(text: d?['license_number'] ?? '');
    _emailController = TextEditingController(text: d?['email'] ?? '');
    _phoneController = TextEditingController(text: d?['phone'] ?? '');
    _officeController = TextEditingController(text: d?['office_number'] ?? '');
    _feeController = TextEditingController(text: d?['consultation_fee']?.toString() ?? '0');

    if (d != null) {
      _specialtyId = d['specialty_id'];
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _licenseController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _officeController.dispose();
    _feeController.dispose();
    super.dispose();
  }

  Future<void> _fetchSpecialties() async {
    try {
      final res = await _apiService.get('/api/specialties');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _specialties = data['data'] ?? [];
            if (_specialtyId == null && _specialties.isNotEmpty) {
              _specialtyId = _specialties.first['id'];
            }
          });
        }
      }
    } catch (e) {
      print('Error fetching specialties: $e');
    }
  }

  Future<void> _saveDoctor() async {
    if (!_formKey.currentState!.validate()) return;
    if (_specialtyId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Seleccione una especialidad')));
      return;
    }

    setState(() => _isLoading = true);

    final payload = {
      'first_name': _firstNameController.text,
      'last_name': _lastNameController.text,
      'license_number': _licenseController.text,
      'email': _emailController.text,
      'specialty_id': _specialtyId,
      'phone': _phoneController.text.isNotEmpty ? _phoneController.text : null,
      'office_number': _officeController.text.isNotEmpty ? _officeController.text : null,
      'consultation_fee': int.tryParse(_feeController.text) ?? 0,
    };

    try {
      if (widget.doctor == null) {
        final res = await _apiService.post('/api/doctors', payload);
        if (res.statusCode == 201) {
          if (mounted) Navigator.pop(context, true);
        } else {
          final err = jsonDecode(res.body);
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err['error'] ?? 'Error')));
        }
      } else {
        final id = widget.doctor!['id'];
        final res = await _apiService.put('/api/doctors/$id', payload);
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
    final isEdit = widget.doctor != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Editar Médico' : 'Nuevo Médico'),
        actions: [
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Colors.white)))
          else
            IconButton(icon: const Icon(Icons.check), onPressed: _saveDoctor),
        ],
      ),
      body: _specialties.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Datos Personales', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
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
                    DropdownButtonFormField<int>(
                      value: _specialtyId,
                      decoration: const InputDecoration(labelText: 'Especialidad *', border: OutlineInputBorder()),
                      items: _specialties.map((s) => DropdownMenuItem<int>(value: s['id'], child: Text(s['name']))).toList(),
                      onChanged: (v) => setState(() => _specialtyId = v),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _licenseController,
                      decoration: const InputDecoration(labelText: 'Número de Licencia *', border: OutlineInputBorder()),
                      validator: (v) => v!.isEmpty ? 'Requerido' : null,
                    ),
                    const SizedBox(height: 24),
                    const Text('Contacto y Consultorio', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(labelText: 'Correo Electrónico *', border: OutlineInputBorder()),
                      keyboardType: TextInputType.emailAddress,
                      validator: (v) => v!.isEmpty || !v.contains('@') ? 'Correo inválido' : null,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _phoneController,
                            decoration: const InputDecoration(labelText: 'Teléfono', border: OutlineInputBorder()),
                            keyboardType: TextInputType.phone,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _officeController,
                            decoration: const InputDecoration(labelText: 'Consultorio', border: OutlineInputBorder()),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _feeController,
                      decoration: const InputDecoration(labelText: 'Tarifa (COP)', border: OutlineInputBorder()),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _saveDoctor,
                        style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                        child: Text(isEdit ? 'GUARDAR CAMBIOS' : 'REGISTRAR MÉDICO'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
