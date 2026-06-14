import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/appointment.dart';

class ApiService {
  static const String localUrl = 'http://192.168.1.20:5000/api'; 
  static const String prodUrl = 'https://sofiane-dent.com/api';

  static String activeUrl = localUrl;

  // Initialize baseUrl dynamically from SharedPreferences
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUrl = prefs.getString('server_url');
      if (savedUrl != null && savedUrl.isNotEmpty) {
        activeUrl = savedUrl;
      } else {
        activeUrl = localUrl;
      }
    } catch (e) {
      activeUrl = localUrl;
      print('ApiService.init error: $e');
    }
  }

  // Update saved server Url dynamically
  static Future<void> setServerUrl(String url) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('server_url', url);
      activeUrl = url;
    } catch (e) {
      print('setServerUrl error: $e');
    }
  }

  static String get baseUrl => activeUrl;

  // Get Services
  Future<List<Map<String, dynamic>>> getServices() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/settings/services'));
      if (response.statusCode == 200) {
        String body = utf8.decode(response.bodyBytes);
        List<dynamic> data = jsonDecode(body);
        return List<Map<String, dynamic>>.from(data);
      }
    } catch (e) {
      print('Fetch services error: $e');
    }
    return [];
  }

  // Login
  Future<Map<String, dynamic>?> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        return null;
      }
    } catch (e) {
      print('Login error: $e');
      return null;
    }
  }

  // Get Today's Appointments
  Future<List<Appointment>> getTodayAppointments() async {
    try {
      print('Fetching from: $baseUrl/appointments/today');
      final response = await http.get(Uri.parse('$baseUrl/appointments/today'));
      
      print('Today Response Status: ${response.statusCode}');
      if (response.statusCode == 200) {
        String body = utf8.decode(response.bodyBytes);
        List<dynamic> data = jsonDecode(body);
        print('Today Appointments found: ${data.length}');
        return data.map((json) => Appointment.fromJson(json)).toList();
      } else {
        print('Server Error: ${response.body}');
      }
      return [];
    } catch (e) {
      print('Fetch today appointments error: $e');
      return [];
    }
  }

  // Get All Appointments
  Future<List<Appointment>> getAllAppointments() async {
    try {
      print('Fetching from: $baseUrl/appointments');
      final response = await http.get(Uri.parse('$baseUrl/appointments'));
      
      print('All Response Status: ${response.statusCode}');
      if (response.statusCode == 200) {
        String body = utf8.decode(response.bodyBytes);
        List<dynamic> data = jsonDecode(body);
        print('All Appointments found: ${data.length}');
        return data.map((json) => Appointment.fromJson(json)).toList();
      } else {
        print('Server Error: ${response.body}');
      }
      return [];
    } catch (e) {
      print('Fetch all appointments error: $e');
      return [];
    }
  }

  // Add Appointment
  Future<Appointment?> addAppointment(Map<String, dynamic> appData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/appointments'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(appData),
      );

      if (response.statusCode == 200) {
        return Appointment.fromJson(jsonDecode(response.body));
      }
      return null;
    } catch (e) {
      print('Add appointment error: $e');
      return null;
    }
  }

  // Update Status (General)
  Future<bool> updateStatus(String id, String status) async {
    try {
      String statusEn = status == 'في الانتظار' ? 'waiting' : 
                        status == 'ملغى' ? 'cancelled' : 
                        status == 'منجز' ? 'completed' : 'pending';
                        
      final response = await http.put(
        Uri.parse('$baseUrl/appointments/$id/status'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'status': status,
          'status_en': statusEn,
          'confirmed': status == 'في الانتظار' ? true : false,
        }),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Update Clinical Data (Doctor)
  Future<bool> updateClinical(String id, String notes, String prescription, double treatmentPrice, String status) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/appointments/$id/clinical'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'notes': notes,
          'prescription': prescription,
          'treatmentPrice': treatmentPrice,
          'status': status,
        }),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Call Next Patient
  Future<Appointment?> callNext() async {
    try {
      final response = await http.post(Uri.parse('$baseUrl/appointments/call-next'));
      if (response.statusCode == 200) {
        return Appointment.fromJson(jsonDecode(response.body));
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Update Payment Status
  Future<bool> updatePaymentStatus(String id, String paymentStatus) async {
    try {
      final bool isPaid = paymentStatus == 'مدفوع';
      final response = await http.put(
        Uri.parse('$baseUrl/appointments/$id/payment'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'paymentStatus': paymentStatus,
          'payment_status': paymentStatus,
          'isPaid': isPaid,
          'paid': isPaid ? 1 : 0,
          'status_en': isPaid ? 'paid' : 'unpaid',
        }),
      );
      print('Update Payment Response: ${response.statusCode} - ${response.body}');
      return response.statusCode == 200;
    } catch (e) {
      print('Update payment error: $e');
      return false;
    }
  }

  // Clinic Info GET / PUT
  Future<Map<String, dynamic>?> getClinicInfo() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/settings/clinic-info'));
      if (response.statusCode == 200) {
        return jsonDecode(utf8.decode(response.bodyBytes));
      }
    } catch (e) {
      print('Get clinic info error: $e');
    }
    return null;
  }

  Future<bool> updateClinicInfo(Map<String, dynamic> info) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/settings/clinic-info'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(info),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Update clinic info error: $e');
      return false;
    }
  }

  // Get Prescription Templates
  Future<List<Map<String, dynamic>>> getPrescriptionTemplates() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/prescriptions'));
      if (response.statusCode == 200) {
        String body = utf8.decode(response.bodyBytes);
        List<dynamic> data = jsonDecode(body);
        return List<Map<String, dynamic>>.from(data);
      }
    } catch (e) {
      print('Fetch prescriptions error: $e');
    }
    return [];
  }


  // News Ticker GET / PUT
  Future<String> getTicker() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/settings/ticker'));
      if (response.statusCode == 200) {
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        return data['value'] ?? '';
      }
    } catch (e) {
      print('Get ticker error: $e');
    }
    return '';
  }

  Future<bool> updateTicker(String text) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/settings/ticker'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'value': text}),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Update ticker error: $e');
      return false;
    }
  }

  // Daily Max Appointments GET / PUT
  Future<String> getMaxAppointments() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/settings/max-appointments'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['value'] ?? '20';
      }
    } catch (e) {
      print('Get max app error: $e');
    }
    return '20';
  }

  Future<bool> updateMaxAppointments(String value) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/settings/max-appointments'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'value': value}),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Update max app error: $e');
      return false;
    }
  }

  // Waiting Room Video GET / PUT
  Future<String> getVideoUrl() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/settings/video'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['value'] ?? '';
      }
    } catch (e) {
      print('Get video error: $e');
    }
    return '';
  }

  Future<bool> updateVideoUrl(String url) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/settings/video'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'value': url}),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Update video error: $e');
      return false;
    }
  }

  // Services CRUD
  Future<bool> addService(String name, double price) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/settings/services'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'name': name, 'price': price}),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Add service error: $e');
      return false;
    }
  }

  Future<bool> updateService(int id, String name, double price) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/settings/services/$id'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'name': name, 'price': price}),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Update service error: $e');
      return false;
    }
  }

  Future<bool> deleteService(int id) async {
    try {
      final response = await http.delete(Uri.parse('$baseUrl/settings/services/$id'));
      return response.statusCode == 200;
    } catch (e) {
      print('Delete service error: $e');
      return false;
    }
  }

  // Users CRUD
  Future<List<Map<String, dynamic>>> getUsers() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/settings/users'));
      if (response.statusCode == 200) {
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        return List<Map<String, dynamic>>.from(data);
      }
    } catch (e) {
      print('Get users error: $e');
    }
    return [];
  }

  Future<bool> addUser(String username, String password, String role, String fullName) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/settings/users'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
          'role': role,
          'fullName': fullName,
        }),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Add user error: $e');
      return false;
    }
  }

  Future<bool> deleteUser(dynamic id) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/settings/users/$id'),
      );
      print('Delete User Response: ${response.statusCode}');
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      print('Delete user error: $e');
      return false;
    }
  }

  Future<bool> updateUser(dynamic id, Map<String, dynamic> data) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/settings/users/$id'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(data),
      );
      print('Update User Response: ${response.statusCode}');
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      print('Update user error: $e');
      return false;
    }
  }

  Future<bool> changePassword(String username, String currentPassword, String newPassword) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/settings/change-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        }),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Change password error: $e');
      return false;
    }
  }

  // --- SERVER-SIDE PRINTER INTEGRATION ---
  Future<Map<String, dynamic>?> getPrinterSettings() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/settings/printer'));
      if (response.statusCode == 200) {
        return jsonDecode(utf8.decode(response.bodyBytes));
      }
    } catch (e) {
      print('Get printer settings error: $e');
    }
    return null;
  }

  Future<bool> updatePrinterSettings(String ip, int port) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/settings/printer'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'ip': ip, 'port': port}),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Update printer settings error: $e');
      return false;
    }
  }

  Future<bool> printViaServer(String text) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/print-receipt'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'text': text}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(utf8.decode(response.bodyBytes));
        return data['success'] == true;
      }
    } catch (e) {
      print('Print via server HTTP error: $e');
    }
    return false;
  }

  // Get Receipt Data for Preview
  Future<Map<String, dynamic>?> getReceipt(String id) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/appointments/$id/receipt'));
      if (response.statusCode == 200) {
        return jsonDecode(utf8.decode(response.bodyBytes));
      }
    } catch (e) {
      print('Get receipt error: $e');
    }
    return null;
  }

  Future<bool> addPrescriptionTemplate(Map<String, dynamic> data) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/prescriptions'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(data),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Add prescription template error: $e');
      return false;
    }
  }
}
