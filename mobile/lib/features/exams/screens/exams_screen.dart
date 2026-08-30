import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';
import 'exam_form_screen.dart';

class ExamsScreen extends StatefulWidget {
  const ExamsScreen({super.key});

  @override
  State<ExamsScreen> createState() => _ExamsScreenState();
}

class _ExamsScreenState extends State<ExamsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _exams = [];

  @override
  void initState() {
    super.initState();
    _fetchExams();
  }

  Future<void> _fetchExams() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/api/exams?limit=50');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _exams = data['data'] ?? [];
        });
      }
    } catch (e) {
      print('Error fetching exams: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _deleteExam(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar Examen'),
        content: const Text('¿Deseas eliminar este examen permanentemente?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Eliminar', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final res = await _apiService.delete('/api/exams/$id');
      if (res.statusCode == 200) {
        _fetchExams();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Examen eliminado')));
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
        title: const Text('Órdenes de Exámenes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ExamFormScreen()),
              );
              if (result == true) {
                _fetchExams();
              }
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _exams.isEmpty
              ? const Center(child: Text('No hay exámenes registrados'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _exams.length,
                  itemBuilder: (context, index) {
                    final exam = _exams[index];
                    final date = exam['exam_date'] != null ? exam['exam_date'].toString().split('T')[0] : 'N/A';
                    final type = exam['exam_type'] ?? 'N/A';
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Colors.blueGrey,
                          child: Icon(Icons.science, color: Colors.white),
                        ),
                        title: Text(exam['exam_name'] ?? 'Examen Médico', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Paciente: ${exam['patient_name']}\nFecha: $date\nTipo: $type'),
                        isThreeLine: true,
                        trailing: IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () => _deleteExam(exam['id']),
                        ),
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Detalle de examen - Próximamente')),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
