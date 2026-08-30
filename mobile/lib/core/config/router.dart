import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/auth_service.dart';
import '../widgets/main_layout.dart';

import '../../features/auth/screens/login_screen.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/patients/screens/patients_screen.dart';
import '../../features/appointments/screens/appointments_screen.dart';
import '../../features/consultations/screens/consultations_screen.dart';
import '../../features/videocalls/screens/videocalls_screen.dart';
import '../../features/prescriptions/screens/prescriptions_screen.dart';
import '../../features/exams/screens/exams_screen.dart';
import '../../features/medical_history/screens/medical_history_screen.dart';
import '../../features/doctors/screens/doctors_screen.dart';
import '../../features/specialties/screens/specialties_screen.dart';
import '../../features/invoices/screens/invoices_screen.dart';
import '../../features/reports/screens/reports_screen.dart';
import '../../features/messages/screens/messages_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/help/screens/help_screen.dart';

class AppRouter {
  static GoRouter getRouter(AuthService authService) {
    return GoRouter(
      initialLocation: authService.isAuthenticated ? '/dashboard' : '/login',
      refreshListenable: authService,
      redirect: (context, state) {
        final isLoggedIn = authService.isAuthenticated;
        final isLoggingIn = state.matchedLocation == '/login';

        if (!isLoggedIn && !isLoggingIn) return '/login';
        if (isLoggedIn && isLoggingIn) return '/dashboard';
        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        ShellRoute(
          builder: (context, state, child) {
            return MainLayout(child: child);
          },
          routes: [
            GoRoute(
              path: '/dashboard',
              builder: (context, state) => const DashboardScreen(),
            ),
            GoRoute(
              path: '/patients',
              builder: (context, state) => const PatientsScreen(),
            ),
            GoRoute(
              path: '/appointments',
              builder: (context, state) => const AppointmentsScreen(),
            ),
            GoRoute(
              path: '/consultations',
              builder: (context, state) => const ConsultationsScreen(),
            ),
            GoRoute(
              path: '/videocalls',
              builder: (context, state) => const VideoCallsScreen(),
            ),
            GoRoute(
              path: '/prescriptions',
              builder: (context, state) => const PrescriptionsScreen(),
            ),
            GoRoute(
              path: '/exams',
              builder: (context, state) => const ExamsScreen(),
            ),
            GoRoute(
              path: '/medical_history',
              builder: (context, state) => const MedicalHistoryScreen(),
            ),
            GoRoute(
              path: '/doctors',
              builder: (context, state) => const DoctorsScreen(),
            ),
            GoRoute(
              path: '/specialties',
              builder: (context, state) => const SpecialtiesScreen(),
            ),
            GoRoute(
              path: '/invoices',
              builder: (context, state) => const InvoicesScreen(),
            ),
            GoRoute(
              path: '/reports',
              builder: (context, state) => const ReportsScreen(),
            ),
            GoRoute(
              path: '/messages',
              builder: (context, state) => const MessagesScreen(),
            ),
            GoRoute(
              path: '/notifications',
              builder: (context, state) => const NotificationsScreen(),
            ),
            GoRoute(
              path: '/settings',
              builder: (context, state) => const SettingsScreen(),
            ),
            GoRoute(
              path: '/help',
              builder: (context, state) => const HelpScreen(),
            ),
          ],
        ),
      ],
    );
  }
}
