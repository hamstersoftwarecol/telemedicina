import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../core/config/constants.dart';

class ApiService {
  final http.Client _client = http.Client();
  
  static String get baseUrl => AppConstants.baseUrl;

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<http.Response> get(String endpoint) async {
    final headers = await _getHeaders();
    return _client.get(Uri.parse('${AppConstants.baseUrl}$endpoint'), headers: headers);
  }

  Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    return _client.post(
      Uri.parse('${AppConstants.baseUrl}$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );
  }

  Future<http.Response> put(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    return _client.put(
      Uri.parse('${AppConstants.baseUrl}$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );
  }

  Future<http.Response> delete(String endpoint) async {
    final headers = await _getHeaders();
    return _client.delete(Uri.parse('${AppConstants.baseUrl}$endpoint'), headers: headers);
  }

  Future<http.Response> patch(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    return _client.patch(
      Uri.parse('${AppConstants.baseUrl}$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );
  }
}
