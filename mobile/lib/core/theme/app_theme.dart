import 'package:flutter/material.dart';

class AppTheme {
  // Colores principales tomados del frontend web
  static const Color primary = Color(0xFF2563EB); // hsl(221.2 83.2% 53.3%)
  static const Color primaryForeground = Colors.white;
  static const Color background = Color(0xFFFFFFFF);
  static const Color foreground = Color(0xFF0F172A);
  static const Color muted = Color(0xFFF1F5F9);
  static const Color mutedForeground = Color(0xFF64748B);
  static const Color border = Color(0xFFE2E8F0);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.light(
        primary: primary,
        onPrimary: primaryForeground,
        background: background,
        onBackground: foreground,
        surface: background,
        onSurface: foreground,
      ),
      scaffoldBackgroundColor: background,
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        foregroundColor: foreground,
        elevation: 0,
        centerTitle: false,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: primaryForeground,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.transparent,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        hintStyle: const TextStyle(color: mutedForeground),
      ),
    );
  }
}
