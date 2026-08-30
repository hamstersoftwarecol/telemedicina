import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../services/api_service.dart';
import 'invoice_form_screen.dart';

class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({super.key});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _invoices = [];

  @override
  void initState() {
    super.initState();
    _fetchInvoices();
  }

  Future<void> _fetchInvoices() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/api/invoices?limit=50');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _invoices = data['data'] ?? [];
        });
      }
    } catch (e) {
      print('Error fetching invoices: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Facturación'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const InvoiceFormScreen()),
              );
              if (result == true) {
                _fetchInvoices();
              }
            },
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _invoices.isEmpty
              ? const Center(child: Text('No hay facturas registradas'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _invoices.length,
                  itemBuilder: (context, index) {
                    final invoice = _invoices[index];
                    final amount = invoice['total_amount']?.toString() ?? '0.00';
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Colors.amber,
                          child: Icon(Icons.receipt_long, color: Colors.white),
                        ),
                        title: Text('Factura #${invoice['id']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Paciente: ${invoice['patient_name'] ?? 'N/A'}\nEstado: ${invoice['status'] ?? 'Pendiente'}'),
                        isThreeLine: true,
                        trailing: Text('\$$amount', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Ver factura - Próximamente')),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
