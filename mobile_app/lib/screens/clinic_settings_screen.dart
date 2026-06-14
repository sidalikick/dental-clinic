import 'package:flutter/material.dart';
import 'package:blue_thermal_printer/blue_thermal_printer.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/printer_service.dart';


class ClinicSettingsScreen extends StatefulWidget {
  @override
  _ClinicSettingsScreenState createState() => _ClinicSettingsScreenState();
}

class _ClinicSettingsScreenState extends State<ClinicSettingsScreen> {
  final ApiService _apiService = ApiService();
  final PrinterService _printerService = PrinterService();
  bool _isLoading = true;
  String _userRole = 'doctor';
  String _username = '';


  // General settings state
  Map<String, dynamic> _clinicInfo = {
    'name': '',
    'workingHours': '',
    'address': '',
    'mapsLink': '',
    'phone': '',
    'logoUrl': '',
    'facebook': '',
    'instagram': '',
  };
  String _tickerText = '';
  String _videoUrl = '';
  String _maxAppointments = '20';

  // Lists state
  List<Map<String, dynamic>> _services = [];
  List<Map<String, dynamic>> _users = [];

  // Controllers for general form
  final _nameController = TextEditingController();
  final _hoursController = TextEditingController();
  final _addressController = TextEditingController();
  final _mapsController = TextEditingController();
  final _phoneController = TextEditingController();
  final _logoController = TextEditingController();
  final _facebookController = TextEditingController();
  final _instagramController = TextEditingController();

  final _tickerController = TextEditingController();
  final _videoController = TextEditingController();
  final _maxAppsController = TextEditingController();

  // Change password controllers
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  // Printer settings controllers
  final _printerIpController = TextEditingController();
  final _printerPortController = TextEditingController();

  // Bluetooth states
  String _activePrintMode = 'server';
  List<BluetoothDevice> _pairedDevices = [];
  BluetoothDevice? _selectedBtDevice;
  bool _isScanningBt = false;


  @override
  void initState() {
    super.initState();
    _loadAllSettings();
  }

  Future<void> _loadAllSettings() async {
    setState(() => _isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      _userRole = prefs.getString('role') ?? 'doctor';
      _username = prefs.getString('username') ?? '';

      // Only fetch admin data if user is doctor
      if (_userRole == 'doctor') {
        final info = await _apiService.getClinicInfo();
        if (info != null) {
          _clinicInfo = info;
          _nameController.text = info['name'] ?? '';
          _hoursController.text = info['workingHours'] ?? '';
          _addressController.text = info['address'] ?? '';
          _mapsController.text = info['mapsLink'] ?? '';
          _phoneController.text = info['phone'] ?? '';
          _logoController.text = info['logoUrl'] ?? '';
          _facebookController.text = info['facebook'] ?? '';
          _instagramController.text = info['instagram'] ?? '';
        }

        _tickerController.text = await _apiService.getTicker();
        _videoController.text = await _apiService.getVideoUrl();
        _maxAppsController.text = await _apiService.getMaxAppointments();

        _services = await _apiService.getServices();
        _users = await _apiService.getUsers();
      }

      // Printer settings (Shared)
      final printerIp = await _printerService.getPrinterIp();
      final printerPort = await _printerService.getPrinterPort();
      _printerIpController.text = printerIp;
      _printerPortController.text = printerPort.toString();

      final activeMode = await _printerService.getPrintMode();
      final savedBtAddress = await _printerService.getBluetoothAddress();
      final savedBtName = await _printerService.getBluetoothName();

      setState(() {
        _activePrintMode = activeMode;
        if (savedBtAddress != null && savedBtName != null) {
          _selectedBtDevice = BluetoothDevice(savedBtName, savedBtAddress);
        }
        _isLoading = false;
      });
    } catch (e) {
      print('Load settings error: $e');
      setState(() => _isLoading = false);
    }
  }


  void _showSnackBar(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: color),
    );
  }

  // Save General Clinic Info
  Future<void> _saveClinicInfo() async {
    setState(() => _isLoading = true);
    final updatedInfo = {
      'name': _nameController.text.trim(),
      'workingHours': _hoursController.text.trim(),
      'address': _addressController.text.trim(),
      'mapsLink': _mapsController.text.trim(),
      'phone': _phoneController.text.trim(),
      'logoUrl': _logoController.text.trim(),
      'facebook': _facebookController.text.trim(),
      'instagram': _instagramController.text.trim(),
    };

    final ok = await _apiService.updateClinicInfo(updatedInfo);
    setState(() => _isLoading = false);
    if (ok) {
      _showSnackBar('تم حفظ بيانات العيادة بنجاح', Colors.green);
    } else {
      _showSnackBar('خطأ أثناء حفظ بيانات العيادة', Colors.red);
    }
  }

  // Save TV Ticker, Video, & Limit
  Future<void> _saveTVSettings() async {
    setState(() => _isLoading = true);
    final okTicker = await _apiService.updateTicker(_tickerController.text.trim());
    final okVideo = await _apiService.updateVideoUrl(_videoController.text.trim());
    final okLimit = await _apiService.updateMaxAppointments(_maxAppsController.text.trim());
    setState(() => _isLoading = false);

    if (okTicker && okVideo && okLimit) {
      _showSnackBar('تم تحديث إعدادات شاشة الانتظار والحد اليومي', Colors.green);
    } else {
      _showSnackBar('فشل تحديث بعض إعدادات صالة الانتظار', Colors.amber);
    }
  }

  // Add Dentistry Service Dialog
  void _openAddServiceDialog({Map<String, dynamic>? existingService}) {
    final nameCtrl = TextEditingController(text: existingService?['name'] ?? '');
    final priceCtrl = TextEditingController(text: existingService?['price']?.toString() ?? '');
    final isEdit = existingService != null;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(isEdit ? 'تعديل الخدمة العلاجية' : 'إضافة خدمة علاجية جديدة', textAlign: TextAlign.right),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              textAlign: TextAlign.right,
              decoration: InputDecoration(
                hintText: 'اسم الخدمة (مثال: علاج عصب)',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            SizedBox(height: 15),
            TextField(
              controller: priceCtrl,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.right,
              decoration: InputDecoration(
                hintText: 'السعر الافتراضي (د.ج)',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('إلغاء')),
          ElevatedButton(
            onPressed: () async {
              final name = nameCtrl.text.trim();
              final price = double.tryParse(priceCtrl.text) ?? 0.0;
              if (name.isEmpty || price <= 0) {
                _showSnackBar('الرجاء إدخال بيانات صحيحة', Colors.red);
                return;
              }

              Navigator.pop(context);
              setState(() => _isLoading = true);

              bool ok;
              if (isEdit) {
                ok = await _apiService.updateService(existingService['id'], name, price);
              } else {
                ok = await _apiService.addService(name, price);
              }

              if (ok) {
                _showSnackBar(isEdit ? 'تم تعديل الخدمة بنجاح' : 'تم إضافة الخدمة بنجاح', Colors.green);
                _loadAllSettings();
              } else {
                setState(() => _isLoading = false);
                _showSnackBar('حدث خطأ أثناء المعالجة', Colors.red);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF2563EB)),
            child: Text(isEdit ? 'حفظ التعديل' : 'إضافة', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  // Delete Dentistry Service
  Future<void> _deleteService(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('تأكيد الحذف', textAlign: TextAlign.right),
        content: Text('هل أنت متأكد من رغبتك في حذف هذه الخدمة نهائياً؟', textAlign: TextAlign.right),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text('إلغاء')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('نعم، حذف', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      final ok = await _apiService.deleteService(id);
      if (ok) {
        _showSnackBar('تم حذف الخدمة بنجاح', Colors.green);
        _loadAllSettings();
      } else {
        setState(() => _isLoading = false);
        _showSnackBar('فشل حذف الخدمة العلاجية', Colors.red);
      }
    }
  }

  // Add User Staff Account Dialog
  void _openAddUserDialog() {
    final userCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    String selectedRole = 'reception';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('إنشاء حساب موظف جديد', textAlign: TextAlign.right),
        content: StatefulBuilder(
          builder: (context, setDialogState) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  textAlign: TextAlign.right,
                  decoration: InputDecoration(
                    hintText: 'الاسم الكامل الموظف',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                SizedBox(height: 12),
                TextField(
                  controller: userCtrl,
                  textAlign: TextAlign.right,
                  decoration: InputDecoration(
                    hintText: 'اسم المستخدم للدخول',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                SizedBox(height: 12),
                TextField(
                  controller: passCtrl,
                  obscureText: true,
                  textAlign: TextAlign.right,
                  decoration: InputDecoration(
                    hintText: 'كلمة المرور الافتراضية',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                SizedBox(height: 15),
                DropdownButtonFormField<String>(
                  value: selectedRole,
                  decoration: InputDecoration(
                    labelText: 'الصلاحية / الوظيفة',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: [
                    DropdownMenuItem(value: 'reception', child: Text('الاستقبال / الممرض(ة)', textAlign: TextAlign.right)),
                    DropdownMenuItem(value: 'doctor', child: Text('طبيب أسنان (Doctor)', textAlign: TextAlign.right)),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setDialogState(() => selectedRole = val);
                    }
                  },
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('إلغاء')),
          ElevatedButton(
            onPressed: () async {
              final name = nameCtrl.text.trim();
              final username = userCtrl.text.trim();
              final password = passCtrl.text.trim();

              if (name.isEmpty || username.isEmpty || password.isEmpty) {
                _showSnackBar('الرجاء ملء كافة الحقول المطلوبة', Colors.red);
                return;
              }

              Navigator.pop(context);
              setState(() => _isLoading = true);
              final ok = await _apiService.addUser(username, password, selectedRole, name);
              if (ok) {
                _showSnackBar('تم إنشاء حساب الموظف بنجاح', Colors.green);
                _loadAllSettings();
              } else {
                setState(() => _isLoading = false);
                _showSnackBar('اسم المستخدم موجود بالفعل أو حدث خطأ بالسيرفر', Colors.red);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF2563EB)),
            child: Text('إنشاء الحساب'),
          ),
        ],
      ),
    );
  }

  // Delete User
  Future<void> _deleteUser(Map<String, dynamic> user) async {
    final String identifier = (user['id'] ?? user['username']).toString();
    
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('تأكيد الحذف', textAlign: TextAlign.right),
        content: Text('هل أنت متأكد من حذف المستخدم "${user['fullName']}" نهائياً؟', textAlign: TextAlign.right),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text('إلغاء')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('نعم، حذف'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      final ok = await _apiService.deleteUser(identifier);
      if (ok) {
        _showSnackBar('تم حذف المستخدم بنجاح', Colors.green);
        _loadAllSettings();
      } else {
        setState(() => _isLoading = false);
        _showSnackBar('فشل حذف المستخدم. تأكد من صلاحيات السيرفر.', Colors.red);
      }
    }
  }

  // Edit User Dialog
  void _openEditUserDialog(Map<String, dynamic> user) {
    final String identifier = (user['id'] ?? user['username']).toString();
    final nameCtrl = TextEditingController(text: user['fullName']);
    String selectedRole = user['role'] ?? 'reception';
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('تعديل بيانات الموظف', textAlign: TextAlign.right),
        content: StatefulBuilder(
          builder: (context, setDialogState) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('المستخدم: ${user['username']}', style: TextStyle(fontWeight: FontWeight.bold)),
              SizedBox(height: 15),
              TextField(
                controller: nameCtrl,
                textAlign: TextAlign.right,
                decoration: InputDecoration(
                  labelText: 'الاسم الكامل',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              SizedBox(height: 15),
              DropdownButtonFormField<String>(
                value: selectedRole,
                decoration: InputDecoration(
                  labelText: 'الصلاحية',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                items: [
                  DropdownMenuItem(value: 'reception', child: Text('استقبال')),
                  DropdownMenuItem(value: 'doctor', child: Text('طبيب')),
                ],
                onChanged: (val) => setDialogState(() => selectedRole = val!),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('إلغاء')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              setState(() => _isLoading = true);
              final ok = await _apiService.updateUser(identifier, {
                'fullName': nameCtrl.text.trim(),
                'role': selectedRole,
              });
              if (ok) {
                _showSnackBar('تم تحديث البيانات بنجاح', Colors.green);
                _loadAllSettings();
              } else {
                setState(() => _isLoading = false);
                _showSnackBar('فشل تحديث البيانات', Colors.red);
              }
            },
            child: Text('حفظ التغييرات'),
          ),
        ],
      ),
    );
  }

  // User Change Password
  Future<void> _changeUserPassword() async {
    final currentPass = _currentPasswordController.text.trim();
    final newPass = _newPasswordController.text.trim();
    final confirm = _confirmPasswordController.text.trim();

    if (currentPass.isEmpty || newPass.isEmpty || confirm.isEmpty) {
      _showSnackBar('الرجاء كتابة كافة حقول كلمة المرور', Colors.red);
      return;
    }

    if (newPass != confirm) {
      _showSnackBar('كلمة المرور الجديدة غير متطابقة', Colors.red);
      return;
    }

    setState(() => _isLoading = true);
    final ok = await _apiService.changePassword(_username, currentPass, newPass);
    setState(() => _isLoading = false);

    if (ok) {
      _showSnackBar('تم تحديث كلمة المرور بنجاح!', Colors.green);
      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();
    } else {
      _showSnackBar('كلمة المرور الحالية غير صحيحة!', Colors.red);
    }
  }

  // Save Printer IP & Port Settings
  Future<void> _savePrinterSettings() async {
    final ip = _printerIpController.text.trim();
    final port = int.tryParse(_printerPortController.text.trim()) ?? 9100;
    if (ip.isEmpty) {
      _showSnackBar('الرجاء إدخال عنوان IP صحيح للطابعة', Colors.red);
      return;
    }
    setState(() => _isLoading = true);
    await _printerService.saveSettings(ip, port);
    setState(() => _isLoading = false);
    _showSnackBar('تم حفظ إعدادات الطابعة بنجاح', Colors.green);
  }

  // Test Socket connection directly
  Future<void> _testPrinterConnection() async {
    final ip = _printerIpController.text.trim();
    final port = int.tryParse(_printerPortController.text.trim()) ?? 9100;
    
    _showSnackBar('جاري فحص الاتصال بالطابعة...', Colors.indigo);
    final isOk = await _printerService.testConnection(ip, port);
    if (isOk) {
      _showSnackBar('تم الاتصال بالطابعة بنجاح!', Colors.green);
    } else {
      _showSnackBar('فشل الاتصال بالطابعة! يرجى التأكد من تشغيلها وتوصيلها بنفس الشبكة.', Colors.red);
    }
  }

  // Improved Print Test Page
  Future<void> _printTestPage() async {
    _showSnackBar('جاري إرسال طلب الطباعة...', Colors.indigo);
    final ok = await _printerService.printTestPage();
    if (ok) {
      _showSnackBar('تم إرسال الصفحة التجريبية بنجاح!', Colors.green);
    } else {
      _showSnackBar('فشلت عملية الطباعة! تأكد من تشغيل الطابعة واقترانها.', Colors.red);
    }
  }

  // Scan Bluetooth Devices
  Future<void> _scanBluetoothDevices() async {
    setState(() => _isScanningBt = true);
    try {
      final devices = await _printerService.getPairedDevices();
      setState(() {
        _pairedDevices = devices;
        _isScanningBt = false;
      });
      if (devices.isEmpty) {
        _showSnackBar('لم يتم العثور على أجهزة مقترنة. يرجى إقران الطابعة أولاً من إعدادات الهاتف.', Colors.amber);
      } else {
        _showSnackBar('تم تحديث قائمة أجهزة البلوتوث المقترنة بنجاح!', Colors.green);
      }
    } catch (e) {
      setState(() => _isScanningBt = false);
      _showSnackBar('خطأ أثناء البحث عن أجهزة البلوتوث', Colors.red);
    }
  }

  // Connect & Save Bluetooth Printer
  Future<void> _connectBluetoothPrinter() async {
    if (_selectedBtDevice == null) {
      _showSnackBar('الرجاء اختيار طابعة بلوتوث أولاً', Colors.red);
      return;
    }
    setState(() => _isLoading = true);
    final ok = await _printerService.testBluetoothConnection(_selectedBtDevice!.name ?? '', _selectedBtDevice!.address ?? '');
    setState(() => _isLoading = false);
    
    if (ok) {
      await _printerService.saveBluetoothDevice(_selectedBtDevice!.name ?? '', _selectedBtDevice!.address ?? '');
      _showSnackBar('تم الاتصال وحفظ طابعة البلوتوث بنجاح!', Colors.green);
    } else {
      _showSnackBar('فشل الاتصال بالطابعة! تأكد من تشغيلها وقربها من الهاتف.', Colors.red);
    }
  }

  // Switch Active Printing Mode
  Future<void> _switchPrintMode(String mode) async {
    setState(() => _activePrintMode = mode);
    await _printerService.setPrintMode(mode);
    _showSnackBar('تم تغيير وضع الطباعة إلى: ${mode == 'server' ? 'السيرفر الرئيسي' : mode == 'bluetooth' ? 'البلوتوث المباشر' : 'الاتصال المباشر بالشبكة'}', Colors.green);
  }


  Widget _buildTextField(TextEditingController controller, String label, IconData icon, {bool isMultiline = false, bool isLtr = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextField(
        controller: controller,
        maxLines: isMultiline ? 3 : 1,
        textAlign: isLtr ? TextAlign.left : TextAlign.right,
        textDirection: isLtr ? TextDirection.ltr : TextDirection.rtl,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, color: Color(0xFF2563EB)),
          filled: true,
          fillColor: Colors.grey.shade50,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: BorderSide(color: Colors.grey.shade200),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(15),
            borderSide: BorderSide(color: Colors.grey.shade200),
          ),
        ),
      ),
    );
  }

  Widget _buildModeOption(String mode, String label, IconData icon, Color color) {
    final isSelected = _activePrintMode == mode;
    return InkWell(
      onTap: () => _switchPrintMode(mode),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 100, // Fixed width for scrollable row
        padding: EdgeInsets.symmetric(vertical: 10, horizontal: 2),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.1) : Colors.grey.shade50,
          border: Border.all(
            color: isSelected ? color : Colors.grey.shade200,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: isSelected ? color : Colors.grey.shade600, size: 20),
            SizedBox(height: 4),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? color : Colors.grey.shade700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isReception = _userRole == 'reception';

    return DefaultTabController(
      key: ValueKey(_userRole),
      length: isReception ? 2 : 6,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: Text('إعدادات العيادة والتحكم'),
          backgroundColor: Color(0xFF0F172A),
          foregroundColor: Colors.white,
          centerTitle: true,
          bottom: TabBar(
            isScrollable: !isReception,
            labelColor: Colors.amberAccent,
            unselectedLabelColor: Colors.white70,
            indicatorColor: Colors.amberAccent,
            tabs: isReception
                ? [
                    Tab(icon: Icon(Icons.print), text: 'الطابعة والشبكة'),
                    Tab(icon: Icon(Icons.security), text: 'كلمة المرور'),
                  ]
                : [
                    Tab(icon: Icon(Icons.business), text: 'العيادة'),
                    Tab(icon: Icon(Icons.print), text: 'الطابعة'),
                    Tab(icon: Icon(Icons.medical_services), text: 'الخدمات العلاجية'),
                    Tab(icon: Icon(Icons.people), text: 'الموظفون'),
                    Tab(icon: Icon(Icons.tv), text: 'شاشة الصالة'),
                    Tab(icon: Icon(Icons.security), text: 'الأمان'),
                  ],
          ),
        ),
        body: _isLoading
            ? Center(child: CircularProgressIndicator())
            : TabBarView(
                children: isReception
                    ? [
                        _buildPrinterTab(),
                        _buildSecurityTab(),
                      ]
                    : [
                        _buildClinicTab(),
                        _buildPrinterTab(),
                        _buildServicesTab(),
                        _buildUsersTab(),
                        _buildTVTab(),
                        _buildSecurityTab(),
                      ],
              ),
      ),
    );
  }

  Widget _buildClinicTab() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('البيانات الأساسية للعيادة', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Divider(height: 20),
                  _buildTextField(_nameController, 'اسم العيادة', Icons.local_hospital),
                  _buildTextField(_phoneController, 'رقم هاتف الاتصال', Icons.phone, isLtr: true),
                  _buildTextField(_hoursController, 'مواقيت العمل بالعيادة', Icons.access_time),
                  _buildTextField(_addressController, 'عنوان العيادة الجغرافي', Icons.location_on),
                  _buildTextField(_logoController, 'رابط صورة اللوقو / الشعار', Icons.image, isLtr: true),
                  _buildTextField(_mapsController, 'رابط قوقل ماب الجغرافي', Icons.map, isLtr: true),
                  _buildTextField(_facebookController, 'رابط الفيسبوك للعيادة', Icons.link, isLtr: true),
                  _buildTextField(_instagramController, 'رابط الانستغرام للعيادة', Icons.link, isLtr: true),
                ],
              ),
            ),
          ),
          SizedBox(height: 20),
          ElevatedButton(
            onPressed: _saveClinicInfo,
            style: ElevatedButton.styleFrom(
              backgroundColor: Color(0xFF10B981),
              padding: EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Text('حفظ تفاصيل العيادة', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildPrinterTab() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Connection Mode Selector Card
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('طريقة اتصال الطابعة بالهاتف', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  SizedBox(height: 4),
                  Text('اختر كيف يتصل هاتفك بالطابعة الحرارية الخاصة بالعيادة', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  Divider(height: 24),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildModeOption('server', 'السيرفر الرئيسي', Icons.computer, Colors.blue),
                        SizedBox(width: 8),
                        _buildModeOption('direct', 'شبكة Wi-Fi', Icons.wifi, Colors.orange),
                        SizedBox(width: 8),
                        _buildModeOption('bluetooth', 'بلوتوث مباشر', Icons.bluetooth, Colors.teal),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 16),

          // Mode Specific Settings Card
          if (_activePrintMode == 'bluetooth') ...[
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('إعدادات طابعة البلوتوث المباشرة', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                    Divider(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<BluetoothDevice>(
                            value: _selectedBtDevice != null && _pairedDevices.any((d) => d.address == _selectedBtDevice!.address)
                                ? _pairedDevices.firstWhere((d) => d.address == _selectedBtDevice!.address)
                                : null,
                            decoration: InputDecoration(
                              labelText: 'اختر طابعة البلوتوث المقترنة',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            ),
                            hint: Text(_selectedBtDevice != null ? '${_selectedBtDevice!.name} (${_selectedBtDevice!.address})' : 'لم يتم اختيار طابعة'),
                            items: _pairedDevices.map((device) {
                              return DropdownMenuItem<BluetoothDevice>(
                                value: device,
                                child: Text('${device.name ?? 'طابعة غير معروفة'} (${device.address})', textDirection: TextDirection.ltr),
                              );
                            }).toList(),
                            onChanged: (device) {
                              if (device != null) {
                                setState(() => _selectedBtDevice = device);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _isScanningBt ? null : _scanBluetoothDevices,
                            icon: _isScanningBt 
                                ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.indigo))
                                : Icon(Icons.search, color: Colors.white),
                            label: Text(_isScanningBt ? 'جاري البحث...' : 'البحث عن أجهزة مقترنة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.indigo,
                              padding: EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _connectBluetoothPrinter,
              icon: Icon(Icons.bluetooth_connected, color: Colors.white),
              label: Text('حفظ واختبار اتصال البلوتوث', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                padding: EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ] else ...[
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _activePrintMode == 'server' 
                          ? 'إعدادات اتصال السيرفر بالشبكة المحلية' 
                          : 'إعدادات اتصال الطابعة الحرارية (IP)',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))
                    ),
                    Divider(height: 20),
                    _buildTextField(
                      _printerIpController, 
                      'عنوان IP الخاص بالطابعة (مثال: 192.168.1.200)', 
                      Icons.settings_ethernet,
                      isLtr: true,
                    ),
                    _buildTextField(
                      _printerPortController, 
                      'منفذ الاتصال (الافتراضي: 9100)', 
                      Icons.adjust,
                      isLtr: true,
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _savePrinterSettings,
              icon: Icon(Icons.save, color: Colors.white),
              label: Text('حفظ إعدادات الطابعة الشبكية', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Color(0xFF2563EB),
                padding: EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
            SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _testPrinterConnection,
                    icon: Icon(Icons.wifi_tethering, color: Colors.indigo),
                    label: Text('فحص اتصال IP', style: TextStyle(color: Colors.indigo, fontWeight: FontWeight.bold, fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.indigo),
                      padding: EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
              ],
            ),
          ],
          
          SizedBox(height: 12),
          // Global print test button
          OutlinedButton.icon(
            onPressed: _printTestPage,
            icon: Icon(Icons.print, color: Colors.green),
            label: Text('طباعة ورقة اختبار تجريبية', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 14)),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: Colors.green),
              padding: EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServicesTab() {
    return Padding(
      padding: EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'قائمة أسعار الخدمات العلاجية',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              ElevatedButton.icon(
                onPressed: () => _openAddServiceDialog(),
                style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF2563EB)),
                icon: Icon(Icons.add, color: Colors.white),
                label: Text('إضافة خدمة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          SizedBox(height: 20),
          Expanded(
            child: _services.isEmpty
                ? Center(child: Text('لا توجد خدمات علاجية مسجلة حالياً'))
                : ListView.builder(
                    itemCount: _services.length,
                    itemBuilder: (context, idx) {
                      final s = _services[idx];
                      return Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        margin: EdgeInsets.only(bottom: 12),
                        elevation: 2,
                        child: ListTile(
                          contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                          title: Text(s['name'] ?? '', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          subtitle: Text('السعر الافتراضي: ${s['price']} د.ج', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: Icon(Icons.edit, color: Colors.blue),
                                onPressed: () => _openAddServiceDialog(existingService: s),
                              ),
                              IconButton(
                                icon: Icon(Icons.delete, color: Colors.red),
                                onPressed: () => _deleteService(s['id']),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildUsersTab() {
    return Padding(
      padding: EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'الحسابات النشطة والموظفين',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              ElevatedButton.icon(
                onPressed: _openAddUserDialog,
                style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF2563EB)),
                icon: Icon(Icons.person_add, color: Colors.white),
                label: Text('إضافة موظف', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          SizedBox(height: 20),
          Expanded(
            child: _users.isEmpty
                ? Center(child: Text('لا توجد حسابات موظفين مضافة'))
                : ListView.builder(
                    itemCount: _users.length,
                    itemBuilder: (context, idx) {
                      final u = _users[idx];
                      final roleStr = u['role'] == 'doctor' ? 'طبيب أسنان' : 'موظف استقبال';
                      return Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        margin: EdgeInsets.only(bottom: 12),
                        elevation: 2,
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: u['role'] == 'doctor' ? Colors.teal.shade50 : Colors.indigo.shade50,
                            child: Icon(
                              u['role'] == 'doctor' ? Icons.medical_services : Icons.person,
                              color: u['role'] == 'doctor' ? Colors.teal : Colors.indigo,
                            ),
                          ),
                          title: Text(u['fullName'] ?? '', style: TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('اسم المستخدم: ${u['username']} | الصلاحية: $roleStr'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: Icon(Icons.edit, color: Colors.blue),
                                onPressed: () => _openEditUserDialog(u),
                              ),
                              if (u['username'] != _username) // Don't delete yourself
                                IconButton(
                                  icon: Icon(Icons.delete, color: Colors.red),
                                  onPressed: () => _deleteUser(u),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTVTab() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('إعدادات صالة الانتظار والنداء', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Divider(height: 20),
                  _buildTextField(
                    _tickerController, 
                    'نص الإعلان الترحيبي (الخبر المتحرك بالشاشة)', 
                    Icons.campaign,
                    isMultiline: true,
                  ),
                  _buildTextField(
                    _videoController, 
                    'رابط فيديو صالة الانتظار (يوتيوب أو رابط مباشر)', 
                    Icons.ondemand_video,
                    isLtr: true,
                  ),
                  _buildTextField(
                    _maxAppsController, 
                    'الحد الأقصى لحجوزات اليوم الواحد', 
                    Icons.event_seat,
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 20),
          ElevatedButton(
            onPressed: _saveTVSettings,
            style: ElevatedButton.styleFrom(
              backgroundColor: Color(0xFF2563EB),
              padding: EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Text('حفظ إعدادات التلفزيون والحد اليومي', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildSecurityTab() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('تغيير كلمة المرور الخاصة بك', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Divider(height: 20),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: TextField(
                      controller: _currentPasswordController,
                      obscureText: true,
                      textAlign: TextAlign.right,
                      decoration: InputDecoration(
                        labelText: 'كلمة المرور الحالية',
                        prefixIcon: Icon(Icons.lock_outline, color: Color(0xFF2563EB)),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: TextField(
                      controller: _newPasswordController,
                      obscureText: true,
                      textAlign: TextAlign.right,
                      decoration: InputDecoration(
                        labelText: 'كلمة المرور الجديدة',
                        prefixIcon: Icon(Icons.lock_reset, color: Color(0xFF2563EB)),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: TextField(
                      controller: _confirmPasswordController,
                      obscureText: true,
                      textAlign: TextAlign.right,
                      decoration: InputDecoration(
                        labelText: 'تأكيد كلمة المرور الجديدة',
                        prefixIcon: Icon(Icons.lock_reset, color: Color(0xFF2563EB)),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 20),
          ElevatedButton(
            onPressed: _changeUserPassword,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              padding: EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Text('تحديث كلمة المرور الآمنة', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
