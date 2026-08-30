import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/config/router.dart';
import 'core/theme/app_theme.dart';
import 'services/auth_service.dart';
import 'services/assistant_service.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final authService = AuthService();
  await authService.initAuth();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authService),
        ChangeNotifierProvider(create: (_) => AssistantService()),
        Provider(create: (_) => ApiService()),
      ],
      child: const TelemedicinaApp(),
    ),
  );
}

class TelemedicinaApp extends StatelessWidget {
  const TelemedicinaApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    
    return MaterialApp.router(
      title: 'Telemedicina',
      theme: AppTheme.lightTheme,
      routerConfig: AppRouter.getRouter(authService),
      debugShowCheckedModeBanner: false,
    );
  }
}
