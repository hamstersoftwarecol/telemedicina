import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../services/api_service.dart';

class AppointmentFormScreen extends StatefulWidget {
  final Map<String, dynamic>? appointment;

  const AppointmentFormScreen({super.key, this.appointment});

  @override
  State<AppointmentFormScreen> createState() => _AppointmentFormScreenState();
}

class _AppointmentFormScreenState extends State<AppointmentFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  bool _isFetchingData = true;

  List<dynamic> _patients = [];
  List<dynamic> _doctors = [];

  int? _patientId;
  int? _doctorId;
  DateTime? _date;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;

  String _type = 'presencial';
  final TextEditingController _reasonController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchFormData();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    _notesController.dispose();
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

            final a = widget.appointment;
            if (a != null) {
              _patientId = a['patient_id'];
              _doctorId = a['doctor_id'];
              _date = DateTime.tryParse(a['appointment_date']);
              if (a['start_time'] != null) {
                final parts = a['start_time'].split(':');
                _startTime = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
              }
              if (a['end_time'] != null) {
                final parts = a['end_time'].split(':');
                _endTime = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
              }
              _type = a['type'] ?? 'presencial';
              _reasonController.text = a['reason'] ?? '';
              _notesController.text = a['notes'] ?? '';
            }
            _isFetchingData = false;
          });
        }
      }
    } catch (e) {
      print('Error fetching form data: $e');
      if (mounted) setState(() => _isFetchingData = false);
    }
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _selectStartTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _startTime ?? const TimeOfDay(hour: 9, minute: 0),
    );
    if (picked != null) {
      setState(() {
        _startTime = picked;
        if (_endTime == null) {
          _endTime = TimeOfDay(hour: (picked.hour + 1) % 24, minute: picked.minute);
        }
      });
    }
  }

  Future<void> _selectEndTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _endTime ?? const TimeOfDay(hour: 10, minute: 0),
    );
    if (picked != null) setState(() => _endTime = picked);
  }

  String _formatTime(TimeOfDay t) {
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  Future<void> _saveAppointment() async {
    if (!_formKey.currentState!.validate()) return;
    if (_patientId == null || _doctorId == null || _date == null || _startTime == null || _endTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Complete todos los campos obligatorios')));
      return;
    }

    setState(() => _isLoading = true);

    final payload = {
      'patient_id': _patientId,
      'doctor_id': _doctorId,
      'appointment_date': _date!.toIso8601String().split('T')[0],
      'start_time': _formatTime(_startTime!),
      'end_time': _formatTime(_endTime!),
      'type': _type,
      'reason': _reasonController.text.isNotEmpty ? _reasonController.text : null,
      'notes': _notesController.text.isNotEmpty ? _notesController.text : null,
    };

    try {
      if (widget.appointment == null) {
        final res = await _apiService.post('/api/appointments', payload);
        if (res.statusCode == 201) {
          if (mounted) Navigator.pop(context, true);
        } else {
          final err = jsonDecode(res.body);
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err['error'] ?? 'Error')));
        }
      } else {
        final id = widget.appointment!['id'];
        final res = await _apiService.put('/api/appointments/$id', payload);
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
    final isEdit = widget.appointment != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Editar Cita' : 'Nueva Cita'),
        actions: [
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Colors.white)))
          else
            IconButton(icon: const Icon(Icons.check), onPressed: _saveAppointment),
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
                            child: Text('${p['first_name']} ${p['last_name']} - ${p['document_number']}'),
                          )).toList(),
                      onChanged: (v) => setState(() => _patientId = v),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<int>(
                      value: _doctorId,
                      decoration: const InputDecoration(labelText: 'Médico *', border: OutlineInputBorder()),
                      items: _doctors.map((d) => DropdownMenuItem<int>(
                            value: d['id'],
                            child: Text('Dr. ${d['first_name']} ${d['last_name']}'),
                          )).toList(),
                      onChanged: (v) => setState(() => _doctorId = v),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: _type,
                      decoration: const InputDecoration(labelText: 'Tipo de cita *', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'presencial', child: Text('Presencial')),
                        DropdownMenuItem(value: 'virtual', child: Text('Virtual')),
                      ],
                      onChanged: (v) => setState(() => _type = v!),
                    ),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: _selectDate,
                      child: InputDecorator(
                        decoration: const InputDecoration(labelText: 'Fecha de la cita *', border: OutlineInputBorder()),
                        child: Text(_date != null ? _date!.toIso8601String().split('T')[0] : 'Seleccionar fecha'),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: _selectStartTime,
                            child: InputDecorator(
                              decoration: const InputDecoration(labelText: 'Hora inicio *', border: OutlineInputBorder()),
                              child: Text(_startTime != null ? _startTime!.format(context) : '--:--'),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: InkWell(
                            onTap: _selectEndTime,
                            child: InputDecorator(
                              decoration: const InputDecoration(labelText: 'Hora fin *', border: OutlineInputBorder()),
                              child: Text(_endTime != null ? _endTime!.format(context) : '--:--'),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _reasonController,
                      decoration: const InputDecoration(labelText: 'Motivo de consulta', border: OutlineInputBorder()),
                      maxLines: 2,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _notesController,
                      decoration: const InputDecoration(labelText: 'Notas adicionales', border: OutlineInputBorder()),
                      maxLines: 2,
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _saveAppointment,
                        style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                        child: Text(isEdit ? 'GUARDAR CAMBIOS' : 'AGENDAR CITA'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
