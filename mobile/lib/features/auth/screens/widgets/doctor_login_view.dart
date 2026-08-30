import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../../services/auth_service.dart';

class DoctorLoginView extends StatefulWidget {
  const DoctorLoginView({Key? key}) : super(key: key);

  @override
  State<DoctorLoginView> createState() => _DoctorLoginViewState();
}

class _DoctorLoginViewState extends State<DoctorLoginView> {
  final _identifierController = TextEditingController(text: 'info@hamstersoftware.com');
  final _codeController = TextEditingController();
  bool _isLoading = false;
  int _step = 1;

  void _handleRequestCode() async {
    if (_identifierController.text.trim().isEmpty) return;
    
    setState(() => _isLoading = true);
    final authService = Provider.of<AuthService>(context, listen: false);
    
    final success = await authService.requestCode(_identifierController.text);
    
    if (mounted) setState(() => _isLoading = false);
    
    if (success) {
      if (mounted) setState(() => _step = 2);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al enviar el código')),
        );
      }
    }
  }

  void _handleVerifyCode() async {
    if (_codeController.text.trim().length != 6) return;
    
    setState(() => _isLoading = true);
    final authService = Provider.of<AuthService>(context, listen: false);
    
    final success = await authService.verifyCode(
      _identifierController.text,
      _codeController.text,
    );
    
    if (mounted) setState(() => _isLoading = false);
    
    if (success) {
      if (mounted) context.go('/dashboard');
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Código incorrecto o expirado')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 48),
          const Icon(Icons.favorite, size: 48, color: Color(0xFF2563EB)),
          const SizedBox(height: 16),
          const Text(
            'Telemedicina',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
          Text(
            _step == 1 ? 'Acceso exclusivo para personal médico' : 'Verifica tu identidad',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.grey, fontSize: 16),
          ),
          const SizedBox(height: 48),
          
          if (_step == 1) ...[
            TextField(
              controller: _identifierController,
              decoration: const InputDecoration(
                labelText: 'Correo electrónico o Teléfono',
                hintText: 'info@hamstersoftware.com o 3001234567',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _isLoading ? null : _handleRequestCode,
              child: _isLoading 
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Enviar Código', style: TextStyle(fontSize: 16)),
            ),
          ] else ...[
            Text(
              'Enviamos un código a ${_identifierController.text}',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _codeController,
              textAlign: TextAlign.center,
              maxLength: 6,
              style: const TextStyle(letterSpacing: 8, fontSize: 24, fontWeight: FontWeight.bold),
              decoration: const InputDecoration(
                labelText: 'Código de 6 dígitos',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _isLoading ? null : _handleVerifyCode,
              child: _isLoading 
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Verificar y Entrar', style: TextStyle(fontSize: 16)),
            ),
            TextButton(
              onPressed: () => setState(() { _step = 1; _codeController.clear(); }),
              child: const Text('Volver'),
            ),
          ],
        ],
      ),
    );
  }
}
