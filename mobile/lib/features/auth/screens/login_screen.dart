import 'package:flutter/material.dart';
import 'widgets/patient_portal_view.dart';
import 'widgets/doctor_login_view.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          title: const Text(
            'TelemedApp',
            style: TextStyle(
              color: Color(0xFF2563EB),
              fontWeight: FontWeight.bold,
            ),
          ),
          centerTitle: true,
          bottom: const TabBar(
            labelColor: Color(0xFF2563EB),
            unselectedLabelColor: Colors.grey,
            indicatorColor: Color(0xFF2563EB),
            tabs: [
              Tab(text: 'Portal del Paciente'),
              Tab(text: 'Acceso Doctores'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            PatientPortalView(),
            DoctorLoginView(),
          ],
        ),
      ),
    );
  }
}
