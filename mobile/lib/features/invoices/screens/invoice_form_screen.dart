import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../services/api_service.dart';

class InvoiceFormScreen extends StatefulWidget {
  const InvoiceFormScreen({super.key});

  @override
  State<InvoiceFormScreen> createState() => _InvoiceFormScreenState();
}

class _InvoiceFormScreenState extends State<InvoiceFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  bool _isFetchingData = true;

  List<dynamic> _patients = [];
  int? _patientId;
  DateTime? _dueDate;

  final _taxController = TextEditingController(text: '0');
  final _discountController = TextEditingController(text: '0');

  final List<Map<String, TextEditingController>> _items = [];

  @override
  void initState() {
    super.initState();
    _fetchPatients();
    _addItem();
  }

  @override
  void dispose() {
    _taxController.dispose();
    _discountController.dispose();
    for (var i in _items) {
      i['description']?.dispose();
      i['unit_price']?.dispose();
      i['quantity']?.dispose();
    }
    super.dispose();
  }

  void _addItem() {
    setState(() {
      _items.add({
        'description': TextEditingController(),
        'unit_price': TextEditingController(),
        'quantity': TextEditingController(text: '1'),
      });
    });
  }

  void _removeItem(int index) {
    setState(() {
      final item = _items.removeAt(index);
      item['description']?.dispose();
      item['unit_price']?.dispose();
      item['quantity']?.dispose();
    });
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

  Future<void> _selectDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _dueDate = picked);
  }

  Future<void> _saveInvoice() async {
    if (!_formKey.currentState!.validate()) return;
    if (_patientId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Seleccione paciente')));
      return;
    }
    if (_items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Agregue al menos un ítem')));
      return;
    }

    setState(() => _isLoading = true);

    final itemsList = _items.map((i) => {
      'description': i['description']?.text,
      'unit_price': double.tryParse(i['unit_price']?.text ?? '0'),
      'quantity': int.tryParse(i['quantity']?.text ?? '1'),
    }).toList();

    final payload = {
      'patient_id': _patientId,
      'due_date': _dueDate?.toIso8601String().split('T')[0],
      'tax_rate': double.tryParse(_taxController.text) ?? 0,
      'discount_amount': double.tryParse(_discountController.text) ?? 0,
      'items': itemsList,
    };

    try {
      final res = await _apiService.post('/api/invoices', payload);
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
        title: const Text('Generar Factura'),
        actions: [
          if (_isLoading)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: Colors.white)))
          else
            IconButton(icon: const Icon(Icons.check), onPressed: _saveInvoice),
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
                  InkWell(
                    onTap: _selectDueDate,
                    child: InputDecorator(
                      decoration: const InputDecoration(labelText: 'Fecha de Vencimiento', border: OutlineInputBorder()),
                      child: Text(_dueDate != null ? _dueDate!.toIso8601String().split('T')[0] : 'Opcional'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: TextFormField(controller: _taxController, decoration: const InputDecoration(labelText: 'Impuesto (%)', border: OutlineInputBorder()), keyboardType: TextInputType.number)),
                      const SizedBox(width: 16),
                      Expanded(child: TextFormField(controller: _discountController, decoration: const InputDecoration(labelText: 'Descuento (\$)', border: OutlineInputBorder()), keyboardType: TextInputType.number)),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Conceptos', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
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
                                Text('Ítem ${i + 1}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                if (_items.length > 1)
                                  IconButton(icon: const Icon(Icons.delete, color: Colors.red), onPressed: () => _removeItem(i)),
                              ],
                            ),
                            TextFormField(controller: item['description'], decoration: const InputDecoration(labelText: 'Descripción *'), validator: (v) => v!.isEmpty ? 'Requerido' : null),
                            Row(
                              children: [
                                Expanded(child: TextFormField(controller: item['unit_price'], decoration: const InputDecoration(labelText: 'Precio Unitario *'), keyboardType: TextInputType.number, validator: (v) => v!.isEmpty ? 'Requerido' : null)),
                                const SizedBox(width: 8),
                                Expanded(child: TextFormField(controller: item['quantity'], decoration: const InputDecoration(labelText: 'Cantidad *'), keyboardType: TextInputType.number, validator: (v) => v!.isEmpty ? 'Requerido' : null)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _saveInvoice,
                    style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                    child: const Text('GENERAR FACTURA'),
                  ),
                ],
              ),
            ),
    );
  }
}
