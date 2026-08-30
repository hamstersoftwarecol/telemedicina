import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../services/api_service.dart';

class PrescriptionFormScreen extends StatefulWidget {
  final Map<String, dynamic>? prescription;

  const PrescriptionFormScreen({super.key, this.prescription});

  @override
  State<PrescriptionFormScreen> createState() => _PrescriptionFormScreenState();
}

class _PrescriptionFormScreenState extends State<PrescriptionFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  bool _isFetchingData = true;

  List<dynamic> _patients = [];
  List<dynamic> _doctors = [];

  int? _patientId;
  int? _doctorId;

  final _diagnosisController = TextEditingController();
  final _notesController = TextEditingController();

  final List<Map<String, TextEditingController>> _items = [];

  @override
  void initState() {
    super.initState();
    _fetchFormData();
    _addItem(); // Agrega el primer medicamento por defecto
  }

  @override
  void dispose() {
    _diagnosisController.dispose();
    _notesController.dispose();
    for (var i in _items) {
      i['medication_name']?.dispose();
      i['dosage']?.dispose();
      i['frequency']?.dispose();
      i['duration']?.dispose();
    }
    super.dispose();
  }

  void _addItem() {
    setState(() {
      _items.add({
        'medication_name': TextEditingController(),
        'dosage': TextEditingController(),
        'frequency': TextEditingController(),
        'duration': TextEditingController(),
      });
    });
  }

  void _removeItem(int index) {
    setState(() {
      final item = _items.removeAt(index);
      item['medication_name']?.dispose();
      item['dosage']?.dispose();
      item['frequency']?.dispose();
      item['duration']?.dispose();
    });
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

            final p = widget.prescription;
            if (p != null) {
              _patientId = p['patient_id'];
              _doctorId = p['doctor_id'];
              _diagnosisController.text = p['diagnosis'] ?? '';
              _notesController.text = p['notes'] ?? '';
              // En modo edición es más complejo cargar los items si no los pasaron
              // Por simplicidad, este form asume creación de nuevos items o se pasaron en p['items']
            }
            _isFetchingData = false;
          });
        }
      }
    } catch (e) {
      if (mounted) setState(() => _isFetchingData = false);
    }
  }

  Future<void> _savePrescription() async {
    if (!_formKey.currentState!.validate()) return;
    if (_patientId == null || _doctorId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Seleccione paciente y médico')));
      return;
    }

    if (_items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Agregue al menos un medicamento')));
      return;
    }

    setState(() => _isLoading = true);

    final itemsList = _items.map((i) => {
      'medication_name': i['medication_name']?.text,
      'dosage': i['dosage']?.text,
      'frequency': i['frequency']?.text,
      'duration': i['duration']?.text,
    }).toList();

    final payload = {
      'patient_id': _patientId,
      'doctor_id': _doctorId,
      'diagnosis': _diagnosisController.text,
      'notes': _notesController.text,
      'items': itemsList,
    };

    try {
      final res = await _apiService.post('/api/prescriptions', payload);
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
        title: const Text('Nueva Receta'),
        actions: [
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Colors.white)))
          else
            IconButton(icon: const Icon(Icons.check), onPressed: _savePrescription),
        ],
      ),
      body: _isFetchingData
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
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
                    decoration: const InputDecoration(labelText: 'Médico *', border: OutlineInputBorder()),
                    items: _doctors.map((d) => DropdownMenuItem<int>(
                          value: d['id'],
                          child: Text('Dr. ${d['first_name']} ${d['last_name']}'),
                        )).toList(),
                    onChanged: (v) => setState(() => _doctorId = v),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _diagnosisController,
                    decoration: const InputDecoration(labelText: 'Diagnóstico *', border: OutlineInputBorder()),
                    validator: (v) => v!.isEmpty ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _notesController,
                    decoration: const InputDecoration(labelText: 'Instrucciones Generales', border: OutlineInputBorder()),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Medicamentos', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      TextButton.icon(
                        icon: const Icon(Icons.add),
                        label: const Text('Agregar'),
                        onPressed: _addItem,
                      )
                    ],
                  ),
                  const SizedBox(height: 8),
                  ..._items.asMap().entries.map((entry) {
                    final i = entry.key;
                    final item = entry.value;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Medicamento ${i + 1}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                if (_items.length > 1)
                                  IconButton(icon: const Icon(Icons.delete, color: Colors.red), onPressed: () => _removeItem(i)),
                              ],
                            ),
                            TextFormField(controller: item['medication_name'], decoration: const InputDecoration(labelText: 'Nombre *'), validator: (v) => v!.isEmpty ? 'Requerido' : null),
                            Row(
                              children: [
                                Expanded(child: TextFormField(controller: item['dosage'], decoration: const InputDecoration(labelText: 'Dosis *'), validator: (v) => v!.isEmpty ? 'Requerido' : null)),
                                const SizedBox(width: 8),
                                Expanded(child: TextFormField(controller: item['frequency'], decoration: const InputDecoration(labelText: 'Frecuencia *'), validator: (v) => v!.isEmpty ? 'Requerido' : null)),
                              ],
                            ),
                            TextFormField(controller: item['duration'], decoration: const InputDecoration(labelText: 'Duración (ej. 5 días) *'), validator: (v) => v!.isEmpty ? 'Requerido' : null),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _savePrescription,
                    style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                    child: const Text('EMITIR RECETA'),
                  ),
                ],
              ),
            ),
    );
  }
}
