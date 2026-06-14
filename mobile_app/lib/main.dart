import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.init();
  runApp(SofianeDentApp());
}

class SofianeDentApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'عيادة الدكتور بويوسف سفيان',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.blue,
        fontFamily: 'Roboto', // Ideally use an Arabic font if available
        useMaterial3: true,
      ),
      // Localization for Arabic Support
      localizationsDelegates: [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: [
        Locale('ar', 'AE'), // Arabic
      ],
      locale: Locale('ar', 'AE'),
      home: LoginScreen(),
    );
  }
}
