import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'app_drawer.dart';

class MainLayout extends StatelessWidget {
  final Widget child;
  
  const MainLayout({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    // Determine the current index for BottomNavigationBar based on route
    final currentRoute = GoRouterState.of(context).uri.toString();
    int currentIndex = 0;
    if (currentRoute.startsWith('/dashboard')) currentIndex = 0;
    else if (currentRoute.startsWith('/doctors')) currentIndex = 1;
    else if (currentRoute.startsWith('/appointments')) currentIndex = 2;
    else if (currentRoute.startsWith('/profile') || currentRoute.startsWith('/settings')) currentIndex = 3;

    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: currentIndex,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Colors.blue,
        unselectedItemColor: Colors.grey,
        onTap: (index) {
          switch (index) {
            case 0:
              context.go('/dashboard');
              break;
            case 1:
              context.go('/doctors');
              break;
            case 2:
              context.go('/appointments');
              break;
            case 3:
              context.go('/settings'); // Assuming settings acts as profile
              break;
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Inicio',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.search),
            label: 'Directorio',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_month),
            label: 'Mis Citas',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}
