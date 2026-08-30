import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../services/api_service.dart';

class ConsultationFormScreen extends StatefulWidget {
  final Map<String, dynamic>? consultation;

  const ConsultationFormScreen({super.key, this.consultation});

  @override
  State<ConsultationFormScreen> createState() => _ConsultationFormScreenState();
}

class _ConsultationFormScreenState extends State<ConsultationFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  bool _isFetchingData = true;

  List<dynamic> _patients = [];
  List<dynamic> _doctors = [];

  int? _patientId;
  int? _doctorId;

  final _complaintController = TextEditingController();
  final _symptomsController = TextEditingController();
  final _diagnosisController = TextEditingController();
  final _treatmentController = TextEditingController();
  final _weightController = TextEditingController();
  final _heightController = TextEditingController();
  final _tempController = TextEditingController();
  final _heartRateController = TextEditingController();
  final _bpSystolicController = TextEditingController();
  final _bpDiastolicController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchFormData();
  }

  @override
  void dispose() {
    _complaintController.dispose();
    _symptomsController.dispose();
    _diagnosisController.dispose();
    _treatmentController.dispose();
    _weightController.dispose();
    _heightController.dispose();
    _tempController.dispose();
    _heartRateController.dispose();
    _bpSystolicController.dispose();
    _bpDiastolicController.dispose();
    super.dispose();
  }

  Future<void> _fetchFormData() async {
    try {
      final pRes = await _apiService.get('/api/patients?limit=100');
      final dRes = await _apiService.get('/api/doctors?limit=100');

      if (pRes.statusCode == 200 && dRes.statusCode == 200) {
        final pData = jsonDecode(pRes.body);
        final dData = jsonDecode(dRes.body);

        if (mounted) {
          setState(() {
            _patients = pData['data'] ?? [];
            _doctors = dData['data'] ?? [];

            final c = widget.consultation;
            if (c != null) {
              _patientId = c['patient_id'];
              _doctorId = c['doctor_id'];
              _complaintController.text = c['chief_complaint'] ?? '';
              _symptomsController.text = c['symptoms'] ?? '';
              _diagnosisController.text = c['diagnosis'] ?? '';
              _treatmentController.text = c['treatment'] ?? '';
              _weightController.text = c['weight_kg']?.toString() ?? '';
              _heightController.text = c['height_cm']?.toString() ?? '';
              _tempController.text = c['temperature_c']?.toString() ?? '';
              _heartRateController.text = c['heart_rate']?.toString() ?? '';
              _bpSystolicController.text = c['blood_pressure_systolic']?.toString() ?? '';
              _bpDiastolicController.text = c['blood_pressure_diastolic']?.toString() ?? '';
            }
            _isFetchingData = false;
          });
        }
      }
    } catch (e) {
      if (mounted) setState(() => _isFetchingData = false);
    }
  }

  Future<void> _saveConsultation() async {
    if (!_formKey.currentState!.validate()) return;
    if (_patientId == null || _doctorId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Seleccione paciente y médico')));
      return;
    }

    setState(() => _isLoading = true);

    final payload = {
      'patient_id': _patientId,
      'doctor_id': _doctorId,
      'chief_complaint': _complaintController.text,
      'symptoms': _symptomsController.text,
      'diagnosis': _diagnosisController.text,
      'treatment': _treatmentController.text,
      'weight_kg': double.tryParse(_weightController.text),
      'height_cm': double.tryParse(_heightController.text),
      'temperature_c': double.tryParse(_tempController.text),
      'heart_rate': int.tryParse(_heartRateController.text),
      'blood_pressure_systolic': int.tryParse(_bpSystolicController.text),
      'blood_pressure_diastolic': int.tryParse(_bpDiastolicController.text),
    };

    try {
      if (widget.consultation == null) {
        final res = await _apiService.post('/api/consultations', payload);
        if (res.statusCode == 201) {
          if (mounted) Navigator.pop(context, true);
        } else {
          final err = jsonDecode(res.body);
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err['error'] ?? 'Error')));
        }
      } else {
        final id = widget.consultation!['id'];
        final res = await _apiService.put('/api/consultations/$id', payload);
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
    final isEdit = widget.consultation != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Editar Consulta' : 'Nueva Consulta'),
        actions: [
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Colors.white)))
          else
            IconButton(icon: const Icon(Icons.check), onPressed: _saveConsultation),
        ],
      ),
      body: _isFetchingData
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                    DropdownButtonFormField<int>(
                      value: _doctorId,
                      decoration: const InputDecoration(labelText: 'Médico Tratante *', border: OutlineInputBorder()),
                      items: _doctors.map((d) => DropdownMenuItem<int>(
                            value: d['id'],
                            child: Text('Dr. ${d['first_name']} ${d['last_name']}'),
                          )).toList(),
                      onChanged: (v) => setState(() => _doctorId = v),
                    ),
                    const SizedBox(height: 24),
                    const Text('Signos Vitales', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(child: TextFormField(controller: _weightController, decoration: const InputDecoration(labelText: 'Peso (kg)', border: OutlineInputBorder()), keyboardType: TextInputType.number)),
                        const SizedBox(width: 8),
                        Expanded(child: TextFormField(controller: _heightController, decoration: const InputDecoration(labelText: 'Altura (cm)', border: OutlineInputBorder()), keyboardType: TextInputType.number)),
                        const SizedBox(width: 8),
                        Expanded(child: TextFormField(controller: _tempController, decoration: const InputDecoration(labelText: 'Temp (°C)', border: OutlineInputBorder()), keyboardType: TextInputType.number)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(child: TextFormField(controller: _heartRateController, decoration: const InputDecoration(labelText: 'Frec. Cardíaca (lpm)', border: OutlineInputBorder()), keyboardType: TextInputType.number)),
                        const SizedBox(width: 8),
                        Expanded(child: TextFormField(controller: _bpSystolicController, decoration: const InputDecoration(labelText: 'PS Sistólica', border: OutlineInputBorder()), keyboardType: TextInputType.number)),
                        const SizedBox(width: 8),
                        Expanded(child: TextFormField(controller: _bpDiastolicController, decoration: const InputDecoration(labelText: 'PS Diastólica', border: OutlineInputBorder()), keyboardType: TextInputType.number)),
                      ],
                    ),
                    const SizedBox(height: 24),
                    const Text('Detalles Médicos', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    const SizedBox(height: 16),
                    TextFormField(controller: _complaintController, decoration: const InputDecoration(labelText: 'Motivo de consulta *', border: OutlineInputBorder()), maxLines: 2, validator: (v) => v!.isEmpty ? 'Requerido' : null),
                    const SizedBox(height: 16),
                    TextFormField(controller: _symptomsController, decoration: const InputDecoration(labelText: 'Síntomas', border: OutlineInputBorder()), maxLines: 2),
                    const SizedBox(height: 16),
                    TextFormField(controller: _diagnosisController, decoration: const InputDecoration(labelText: 'Diagnóstico', border: OutlineInputBorder()), maxLines: 2),
                    const SizedBox(height: 16),
                    TextFormField(controller: _treatmentController, decoration: const InputDecoration(labelText: 'Tratamiento', border: OutlineInputBorder()), maxLines: 2),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _saveConsultation,
                        style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                        child: Text(isEdit ? 'GUARDAR CAMBIOS' : 'REGISTRAR CONSULTA'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
