import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../services/api_service.dart';

class HistoryFormScreen extends StatefulWidget {
  const HistoryFormScreen({super.key});

  @override
  State<HistoryFormScreen> createState() => _HistoryFormScreenState();
}

class _HistoryFormScreenState extends State<HistoryFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  bool _isFetchingData = true;

  List<dynamic> _patients = [];
  int? _patientId;
  String _eventType = 'note';
  DateTime? _date;

  final _titleController = TextEditingController();
  final _descController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchPatients();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _fetchPatients() async {
    try {
      final pRes = await _apiService.get('/api/patients?limit=100');
      if (pRes.statusCode == 200) {
        final pData = jsonDecode(pRes.body);
        if (mounted) {
          setState(() {
            _patients = pData['data'] ?? [];
            _isFetchingData = false;
          });
        }
      }
    } catch (e) {
      if (mounted) setState(() => _isFetchingData = false);
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _saveEvent() async {
    if (!_formKey.currentState!.validate()) return;
    if (_patientId == null || _date == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Seleccione paciente y fecha')));
      return;
    }

    setState(() => _isLoading = true);

    final payload = {
      'patient_id': _patientId,
      'event_type': _eventType,
      'event_date': _date!.toIso8601String().split('T')[0],
      'title': _titleController.text,
      'description': _descController.text.isNotEmpty ? _descController.text : null,
    };

    try {
      final res = await _apiService.post('/api/medical-history', payload);
      if (res.statusCode == 201) {
        if (mounted) Navigator.pop(context, true);
      } else {
        final err = jsonDecode(res.body);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err['error'] ?? 'Error')));
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
        title: const Text('Agregar Evento Clínico'),
        actions: [
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Colors.white)))
          else
            IconButton(icon: const Icon(Icons.check), onPressed: _saveEvent),
        ],
      ),
      body: _isFetchingData
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    DropdownButtonFormField<int>(
                      value: _patientId,
                      decoration: const InputDecoration(labelText: 'Paciente *', border: OutlineInputBorder()),
                      items: _patients.map((p) => DropdownMenuItem<int>(
                            value: p['id'],
                            child: Text('${p['first_name']} ${p['last_name']}'),
                          )).toList(),
                      onChanged: (v) => setState(() => _patientId = v),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: _eventType,
                      decoration: const InputDecoration(labelText: 'Tipo de Evento *', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'consultation', child: Text('Consulta')),
                        DropdownMenuItem(value: 'prescription', child: Text('Receta')),
                        DropdownMenuItem(value: 'exam', child: Text('Examen')),
                        DropdownMenuItem(value: 'surgery', child: Text('Cirugía')),
                        DropdownMenuItem(value: 'note', child: Text('Nota Clínica')),
                      ],
                      onChanged: (v) => setState(() => _eventType = v!),
                    ),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: _selectDate,
                      child: InputDecorator(
                        decoration: const InputDecoration(labelText: 'Fecha *', border: OutlineInputBorder()),
                        child: Text(_date != null ? _date!.toIso8601String().split('T')[0] : 'Seleccionar fecha'),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _titleController,
                      decoration: const InputDecoration(labelText: 'Título *', border: OutlineInputBorder()),
                      validator: (v) => v!.isEmpty ? 'Requerido' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _descController,
                      decoration: const InputDecoration(labelText: 'Descripción / Detalles', border: OutlineInputBorder()),
                      maxLines: 4,
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _saveEvent,
                        style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                        child: const Text('GUARDAR HISTORIAL'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
