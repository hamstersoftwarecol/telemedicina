import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../services/api_service.dart';

class ExamFormScreen extends StatefulWidget {
  const ExamFormScreen({super.key});

  @override
  State<ExamFormScreen> createState() => _ExamFormScreenState();
}

class _ExamFormScreenState extends State<ExamFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  bool _isFetchingData = true;

  List<dynamic> _patients = [];
  int? _patientId;
  String _examType = 'laboratory';

  final _examNameController = TextEditingController();
  DateTime? _date;

  @override
  void initState() {
    super.initState();
    _fetchPatients();
  }

  @override
  void dispose() {
    _examNameController.dispose();
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

  Future<void> _uploadExam() async {
    if (!_formKey.currentState!.validate()) return;
    if (_patientId == null || _date == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Seleccione paciente y fecha')));
      return;
    }

    setState(() => _isLoading = true);

    try {
      final token = await _apiService.getToken();
      final uri = Uri.parse('${ApiService.baseUrl}/api/exams');
      final request = http.MultipartRequest('POST', uri);
      
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      request.fields['patient_id'] = _patientId.toString();
      request.fields['exam_name'] = _examNameController.text;
      request.fields['exam_type'] = _examType;
      request.fields['exam_date'] = _date!.toIso8601String().split('T')[0];

      // Create a dummy PDF file for demonstration
      final dummyPdfBytes = Uint8List.fromList(utf8.encode('%PDF-1.4 Dummy PDF Content for Testing'));
      request.files.add(http.MultipartFile.fromBytes(
        'file',
        dummyPdfBytes,
        filename: 'exam_result.pdf',
        contentType: http.MediaType('application', 'pdf'),
      ));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201) {
        if (mounted) Navigator.pop(context, true);
      } else {
        final err = jsonDecode(response.body);
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
        title: const Text('Subir Resultado de Examen'),
        actions: [
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Colors.white)))
          else
            IconButton(icon: const Icon(Icons.check), onPressed: _uploadExam),
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
                    TextFormField(
                      controller: _examNameController,
                      decoration: const InputDecoration(labelText: 'Nombre del Examen *', border: OutlineInputBorder()),
                      validator: (v) => v!.isEmpty ? 'Requerido' : null,
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: _examType,
                      decoration: const InputDecoration(labelText: 'Tipo de Examen *', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'laboratory', child: Text('Laboratorio')),
                        DropdownMenuItem(value: 'imaging', child: Text('Imagenología')),
                        DropdownMenuItem(value: 'pathology', child: Text('Patología')),
                        DropdownMenuItem(value: 'other', child: Text('Otro')),
                      ],
                      onChanged: (v) => setState(() => _examType = v!),
                    ),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: _selectDate,
                      child: InputDecorator(
                        decoration: const InputDecoration(labelText: 'Fecha del Examen *', border: OutlineInputBorder()),
                        child: Text(_date != null ? _date!.toIso8601String().split('T')[0] : 'Seleccionar fecha'),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.blue.withOpacity(0.5)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.picture_as_pdf, color: Colors.blue),
                          SizedBox(width: 16),
                          Expanded(child: Text('Nota: Para esta demo se enviará un PDF simulado automáticamente al guardar.')),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _uploadExam,
                        style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                        child: const Text('SUBIR EXAMEN'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
