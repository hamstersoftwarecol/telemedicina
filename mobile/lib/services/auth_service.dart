import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class AuthService extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;

  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;

  Future<void> initAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null) {
      _isAuthenticated = true;
      // Idealmente aquí haríamos una petición a /auth/me para validar el token y obtener datos
      final userStr = prefs.getString('user');
      if (userStr != null) {
        _user = jsonDecode(userStr);
      }
    }
    notifyListeners();
  }

  Future<bool> requestCode(String identifier) async {
    try {
      final response = await _apiService.post('/api/auth/request-code', {
        'identifier': identifier,
      });

      if (response.statusCode == 200) {
        return true;
      }
      print('Request code failed with status ${response.statusCode}: ${response.body}');
      return false;
    } catch (e) {
      print('Request code error: $e');
      return false;
    }
  }

  Future<bool> verifyCode(String identifier, String code) async {
    try {
      final response = await _apiService.post('/api/auth/verify-code', {
        'identifier': identifier,
        'code': code,
      });

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final token = data['access_token'] as String?;
        final user = data['user'];

        if (token == null) {
          return false;
        }

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', token);
        await prefs.setString('user', jsonEncode(user ?? {}));

        _isAuthenticated = true;
        _user = user;
        notifyListeners();
        return true;
      }
      print('Verify code failed with status ${response.statusCode}: ${response.body}');
      return false;
    } catch (e) {
      print('Verify code error: $e');
      return false;
    }
  }

  Future<bool> register(Map<String, dynamic> data) async {
    try {
      final response = await _apiService.post('/api/auth/register', data);
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        return true; // The UI will handle navigation to verify code
      }
      print('Register API failed with status ${response.statusCode}: ${response.body}');
      return false;
    } catch (e) {
      print('Register error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
    _isAuthenticated = false;
    _user = null;
    notifyListeners();
  }
}
