import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/printer_service.dart';
import 'reception_dashboard.dart';
import 'doctor_dashboard.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final ApiService _apiService = ApiService();
  final PrinterService _printerService = PrinterService();
  bool _isLoading = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _loadSavedCredentials();
  }

  void _loadSavedCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _usernameController.text = prefs.getString('saved_username') ?? '';
      _passwordController.text = prefs.getString('saved_password') ?? '';
    });
  }

  void _showServerConfigModal() async {
    final printerIp = await _printerService.getPrinterIp();
    final printerPort = await _printerService.getPrinterPort();
    
    String selectedType = 'custom';
    if (ApiService.baseUrl == ApiService.localUrl) {
      selectedType = 'local';
    } else if (ApiService.baseUrl == ApiService.prodUrl) {
      selectedType = 'prod';
    }

    final TextEditingController _customUrlController = TextEditingController(
      text: selectedType == 'custom' ? ApiService.baseUrl : '',
    );
    final TextEditingController _ipController = TextEditingController(text: printerIp);
    final TextEditingController _portController = TextEditingController(text: printerPort.toString());

    int activeTab = 0; // 0 for Server, 1 for Printer Network/IP

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
            boxShadow: [
              BoxShadow(color: Colors.black26, blurRadius: 20, offset: Offset(0, -5))
            ]
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            left: 24,
            right: 24,
            top: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 50,
                  height: 5,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              SizedBox(height: 20),
              
              Text(
                'الإعدادات المتقدمة',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              SizedBox(height: 20),
              
              // Custom Sliding Tab Bar (Pill selector)
              Container(
                padding: EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    // Network/IP Tab
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setModalState(() {
                            activeTab = 1;
                          });
                        },
                        child: AnimatedContainer(
                          duration: Duration(milliseconds: 200),
                          padding: EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: activeTab == 1 ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: activeTab == 1 
                              ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: Offset(0, 2))]
                              : [],
                          ),
                          child: Center(
                            child: Text(
                              'الشبكة/IP',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: activeTab == 1 ? Color(0xFF2563EB) : Colors.grey.shade500,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    // Server Tab
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setModalState(() {
                            activeTab = 0;
                          });
                        },
                        child: AnimatedContainer(
                          duration: Duration(milliseconds: 200),
                          padding: EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: activeTab == 0 ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: activeTab == 0 
                              ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: Offset(0, 2))]
                              : [],
                          ),
                          child: Center(
                            child: Text(
                              'السيرفر',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: activeTab == 0 ? Color(0xFF2563EB) : Colors.grey.shade500,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: 24),
              
              // Tab Contents
              if (activeTab == 0) ...[
                Text(
                  'اختر السيرفر الذي ترغب في ربط التطبيق به حالياً',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade500,
                  ),
                ),
                SizedBox(height: 20),
                
                _buildConfigOption(
                  title: 'سيرفر محلي (Wi-Fi Local)',
                  subtitle: ApiService.localUrl,
                  icon: Icons.wifi,
                  isSelected: selectedType == 'local',
                  onTap: () {
                    setModalState(() {
                      selectedType = 'local';
                    });
                  },
                ),
                SizedBox(height: 12),
                
                _buildConfigOption(
                  title: 'السيرفر السحابي (Cloud Production)',
                  subtitle: ApiService.prodUrl,
                  icon: Icons.cloud_done,
                  isSelected: selectedType == 'prod',
                  onTap: () {
                    setModalState(() {
                      selectedType = 'prod';
                    });
                  },
                ),
                SizedBox(height: 12),

                _buildConfigOption(
                  title: 'خادم مخصص (Custom Server)',
                  subtitle: 'إدخل عنوان IP أو نطاق خارجي يدوي',
                  icon: Icons.edit_road,
                  isSelected: selectedType == 'custom',
                  onTap: () {
                    setModalState(() {
                      selectedType = 'custom';
                    });
                  },
                ),
                
                if (selectedType == 'custom') ...[
                  SizedBox(height: 16),
                  TextField(
                    controller: _customUrlController,
                    textAlign: TextAlign.left,
                    textDirection: TextDirection.ltr,
                    decoration: InputDecoration(
                      hintText: 'https://your-custom-domain.com/api',
                      prefixIcon: Icon(Icons.link),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(15),
                      ),
                      filled: true,
                      fillColor: Colors.grey.shade50,
                    ),
                  ),
                ],
                SizedBox(height: 30),
                
                ElevatedButton(
                  onPressed: () async {
                    String targetUrl = '';
                    if (selectedType == 'local') {
                      targetUrl = ApiService.localUrl;
                    } else if (selectedType == 'prod') {
                      targetUrl = ApiService.prodUrl;
                    } else {
                      targetUrl = _customUrlController.text.trim();
                      if (targetUrl.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('الرجاء إدخال رابط صحيح'), backgroundColor: Colors.red),
                        );
                        return;
                      }
                    }
                    
                    await ApiService.setServerUrl(targetUrl);
                    Navigator.pop(context);
                    ScaffoldMessenger.of(this.context).showSnackBar(
                      SnackBar(
                        content: Text('تم حفظ وتعديل خادم الاتصال إلى: $targetUrl'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Color(0xFF2563EB),
                    padding: EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 2,
                  ),
                  child: Text(
                    'حفظ وتطبيق الاتصال',
                    style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              ] else ...[
                Text(
                  'IP الطابعة (الشبكة):',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF334155),
                  ),
                ),
                SizedBox(height: 8),
                
                TextField(
                  controller: _ipController,
                  textAlign: TextAlign.left,
                  textDirection: TextDirection.ltr,
                  decoration: InputDecoration(
                    hintText: '192.168.1.200',
                    prefixIcon: Icon(Icons.settings_ethernet),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                  ),
                ),
                SizedBox(height: 12),
                
                TextField(
                  controller: _portController,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.left,
                  textDirection: TextDirection.ltr,
                  decoration: InputDecoration(
                    labelText: 'منفذ الطابعة',
                    hintText: '9100',
                    prefixIcon: Icon(Icons.adjust),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                    filled: true,
                    fillColor: Colors.grey.shade50,
                  ),
                ),
                SizedBox(height: 6),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    'المنفذ الافتراضي: 9100',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade500,
                    ),
                  ),
                ),
                SizedBox(height: 20),
                
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final ip = _ipController.text.trim();
                          final port = int.tryParse(_portController.text.trim()) ?? 9100;
                          if (ip.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('الرجاء إدخال عنوان IP صحيح للطابعة'), backgroundColor: Colors.red),
                            );
                            return;
                          }
                          
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('جاري فحص الاتصال بالطابعة...'), backgroundColor: Colors.indigo),
                          );
                          
                          final isOk = await _printerService.testConnection(ip, port);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(isOk ? 'تم الاتصال بالطابعة بنجاح!' : 'فشل الاتصال بالطابعة! تأكد من تشغيلها وتوصيلها بنفس الشبكة.'),
                              backgroundColor: isOk ? Colors.green : Colors.red,
                            ),
                          );
                        },
                        icon: Icon(Icons.wifi_tethering, color: Colors.indigo, size: 16),
                        label: Text('فحص الاتصال', style: TextStyle(color: Colors.indigo, fontSize: 12, fontWeight: FontWeight.bold)),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: Colors.indigo),
                          padding: EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final ip = _ipController.text.trim();
                          final port = int.tryParse(_portController.text.trim()) ?? 9100;
                          if (ip.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('الرجاء إدخال عنوان IP صحيح للطابعة'), backgroundColor: Colors.red),
                            );
                            return;
                          }
                          
                          await _printerService.saveSettings(ip, port);
                          
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('جاري إرسال الطلب بالطابعة...'), backgroundColor: Colors.indigo),
                          );
                          
                          final ok = await _printerService.printReceipt('''
🦷 عيادة الدكتور بويوسف سفيان للأسنان 🦷
--------------------------------------
طابعة الإيصالات Xprinter متصلة بنجاح!
--------------------------------------
التاريخ: ${DateTime.now().toString().split('.')[0]}
الحالة: جاهزة للعمل ومفعلة!
--------------------------------------
شكراً لاستخدامكم نظام العيادة الذكي.
''');
                          
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(ok ? 'تم إرسال الصفحة التجريبية بنجاح!' : 'فشلت الطباعة! تحقق من حالة الاتصال بالطابعة.'),
                              backgroundColor: ok ? Colors.green : Colors.red,
                            ),
                          );
                        },
                        icon: Icon(Icons.print, color: Colors.green, size: 16),
                        label: Text('طباعة تجريبية', style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: Colors.green),
                          padding: EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 20),
                
                ElevatedButton(
                  onPressed: () async {
                    final ip = _ipController.text.trim();
                    final port = int.tryParse(_portController.text.trim()) ?? 9100;
                    
                    if (ip.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('الرجاء إدخال عنوان IP صحيح للطابعة'), backgroundColor: Colors.red),
                      );
                      return;
                    }
                    
                    await _printerService.saveSettings(ip, port);
                    Navigator.pop(context);
                    
                    ScaffoldMessenger.of(this.context).showSnackBar(
                      SnackBar(
                        content: Text('تم حفظ إعدادات الطابعة الحرارية بنجاح!'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Color(0xFF10B981),
                    padding: EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    'حفظ IP الطابعة',
                    style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
              SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }


  Widget _buildConfigOption({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? Color(0xFFEFF6FF) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? Color(0xFF3B82F6) : Colors.grey.shade200,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 10,
              offset: Offset(0, 4),
            )
          ]
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: isSelected ? Color(0xFF2563EB) : Colors.grey.shade400,
            ),
            SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: Colors.grey.shade500,
                    ),
                    textDirection: TextDirection.ltr,
                  ),
                ],
              ),
            ),
            Container(
              padding: EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isSelected ? Color(0xFFDBEAFE) : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: isSelected ? Color(0xFF2563EB) : Colors.grey.shade500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    final userData = await _apiService.login(
      _usernameController.text,
      _passwordController.text,
    );

    setState(() => _isLoading = false);

    if (userData != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('role', userData['role']);
      await prefs.setString('username', userData['username']);
      await prefs.setString('fullName', userData['fullName'] ?? '');
      
      // Save for auto-fill next time
      await prefs.setString('saved_username', _usernameController.text);
      await prefs.setString('saved_password', _passwordController.text);

      if (userData['role'] == 'doctor') {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => DoctorDashboard()));
      } else if (userData['role'] == 'reception') {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => ReceptionDashboard()));
      } else {
        setState(() => _errorMessage = 'ليس لديك صلاحيات الوصول لهذا التطبيق');
      }
    } else {
      setState(() => _errorMessage = 'اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          SingleChildScrollView(
            child: Column(
              children: [
                Container(
                  height: 300,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF2563EB), Color(0xFF3B82F6)],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(80),
                    ),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.health_and_safety, size: 80, color: Colors.white),
                        SizedBox(height: 10),
                        Text(
                          'عيادة الأسنان',
                          style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'د. بويوسف سفيان',
                          style: TextStyle(color: Colors.white70, fontSize: 16),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(30.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'تسجيل الدخول',
                        textAlign: TextAlign.right,
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                      SizedBox(height: 30),
                      TextField(
                        controller: _usernameController,
                        textAlign: TextAlign.right,
                        decoration: InputDecoration(
                          hintText: 'اسم المستخدم',
                          prefixIcon: Icon(Icons.person_outline),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                        ),
                      ),
                      SizedBox(height: 20),
                      TextField(
                        controller: _passwordController,
                        obscureText: true,
                        textAlign: TextAlign.right,
                        decoration: InputDecoration(
                          hintText: 'كلمة المرور',
                          prefixIcon: Icon(Icons.lock_outline),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                        ),
                      ),
                      if (_errorMessage.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 20),
                          child: Text(_errorMessage, style: TextStyle(color: Colors.red), textAlign: TextAlign.center),
                        ),
                      SizedBox(height: 30),
                      ElevatedButton(
                        onPressed: _isLoading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Color(0xFF2563EB),
                          padding: EdgeInsets.symmetric(vertical: 15),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                        ),
                        child: _isLoading 
                          ? CircularProgressIndicator(color: Colors.white)
                          : Text('دخول', style: TextStyle(fontSize: 18, color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                      SizedBox(height: 20),
                      TextButton.icon(
                        onPressed: _showServerConfigModal,
                        icon: Icon(Icons.settings, color: Color(0xFF2563EB)),
                        label: Text(
                          'إعدادات الاتصال والطابعة الحرارية',
                          style: TextStyle(
                            color: Color(0xFF2563EB),
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 20,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black26,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: Icon(Icons.settings, color: Colors.white, size: 28),
                onPressed: _showServerConfigModal,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
