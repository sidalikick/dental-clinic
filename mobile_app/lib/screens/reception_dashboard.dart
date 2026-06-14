import 'dart:async'; // استيراد الـ Timer
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/api_service.dart';
import '../services/printer_service.dart';
import '../models/appointment.dart';
import '../widgets/receipt_preview_dialog.dart';
import 'login_screen.dart';
import 'patient_search_screen.dart';
import 'clinic_settings_screen.dart';

class ReceptionDashboard extends StatefulWidget {
  @override
  _ReceptionDashboardState createState() => _ReceptionDashboardState();
}

class _ReceptionDashboardState extends State<ReceptionDashboard> {
  final ApiService _apiService = ApiService();
  final PrinterService _printerService = PrinterService();
  List<Appointment> _appointments = [];
  List<Map<String, dynamic>> _services = [];
  bool _isLoading = true;
  bool _isServerOnline = true;
  String _activeTab = 'waiting';
  Timer? _heartbeatTimer; // تعريف التايمر

  @override
  void initState() {
    super.initState();
    _loadData();
    _fetchServices();
    _startHeartbeat(); // بدء الفحص التلقائي
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel(); // إغلاق التايمر عند الخروج من الشاشة
    super.dispose();
  }

  void _startHeartbeat() {
    _heartbeatTimer = Timer.periodic(Duration(seconds: 10), (timer) async {
      try {
        // فحص خفيف جداً للسيرفر
        await _apiService.getServices(); 
        if (!_isServerOnline) setState(() => _isServerOnline = true);
      } catch (e) {
        if (_isServerOnline) setState(() => _isServerOnline = false);
      }
    });
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final apps = await _apiService.getTodayAppointments();
      setState(() {
        _appointments = apps;
        _isLoading = false;
        _isServerOnline = true; // Connection successful
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _isServerOnline = false; // Connection failed
      });
      print('Load data error: $e');
    }
  }

  Future<void> _fetchServices() async {
    try {
      final svs = await _apiService.getServices();
      setState(() => _services = svs);
    } catch (e) {
      print('Fetch services error: $e');
    }
  }

  List<String> get _serviceNames => _services.isNotEmpty 
      ? _services.map((s) => s['name']?.toString() ?? '').where((n) => n.isNotEmpty).toList()
      : ['تنظيف أسنان', 'علاج عصب', 'تقويم', 'زراعة'];

  double get _todayRevenue => _appointments
      .where((a) => a.status == 'منجز' && a.paymentStatus == 'مدفوع')
      .fold(0, (sum, item) => sum + item.treatmentPrice);

  int get _waitingCount => _appointments.where((a) => a.status != 'منجز' && a.status != 'ملغى').length;
  int get _completedCount => _appointments.where((a) => a.status == 'منجز').length;

  int? get _nextQueueNumber {
    final waiting = _appointments.where((a) => a.status == 'قيد الانتظار' || a.status == 'في الانتظار').toList();
    if (waiting.isNotEmpty) {
      waiting.sort((a, b) => a.queueNumber.compareTo(b.queueNumber));
      return waiting.first.queueNumber;
    }
    return null;
  }

  void _shareViaWhatsApp(Appointment app) async {
    final text = Uri.encodeComponent('''
مرحباً ${app.patientName}،
تم تسجيل موعدك في عيادة الدكتور بويوسف سفيان للأسنان.
رقم دورك هو: #${app.queueNumber}
الوقت المتوقع: ${app.time}
نتمنى لكم الشفاء العاجل!
''');
    final url = 'https://wa.me/213${app.phone.replaceAll(RegExp(r'[^0-9]'), '')}?text=$text';
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    }
  }

  void _showPrescriptionPreview(Appointment app) {
    final String date = DateTime.now().toLocal().toString().split(' ')[0];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        title: Row(children: [Icon(Icons.description, color: Colors.teal), SizedBox(width: 10), Text('معاينة الوصفة')]),
        content: Container(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.teal.shade50,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.teal.shade100),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('د. بويوسف سفيان', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.teal.shade900)),
                    Divider(height: 24),
                    Text('المريض: ${app.patientName}', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w600)),
                    Text('التاريخ: $date', textAlign: TextAlign.right, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                    SizedBox(height: 16),
                    Text('الأدوية:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.teal.shade800)),
                    SizedBox(height: 4),
                    Text(app.prescription ?? 'لا توجد أدوية مسجلة', style: TextStyle(fontSize: 15, height: 1.4)),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('إغلاق', style: TextStyle(color: Colors.grey.shade700))),
          ElevatedButton.icon(
            onPressed: () async {
              Navigator.pop(context);
              await _printerService.printReceipt(app.prescription ?? '');
            },
            icon: Icon(Icons.print),
            label: Text('طباعة الآن'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.teal,
              foregroundColor: Colors.white,
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          )
        ],
      ),
    );
  }

  void _showTicketPreview(Appointment app) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        title: Row(children: [Icon(Icons.confirmation_number, color: Color(0xFF6366F1)), SizedBox(width: 10), Text('معاينة التذكرة')]),
        content: Container(
          width: 300,
          padding: EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('عيادة الدكتور بويوسف سفيان', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              Divider(),
              Text('رقم الدور', style: TextStyle(fontSize: 12, color: Colors.grey)),
              Text('#${app.queueNumber}', style: TextStyle(fontSize: 48, fontWeight: FontWeight.w900, color: Color(0xFF6366F1))),
              SizedBox(height: 10),
              QrImageView(
                data: 'Appointment: ${app.id}',
                version: QrVersions.auto,
                size: 100.0,
              ),
              SizedBox(height: 10),
              Text('المريض: ${app.patientName}', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w600)),
              Text('REF: ${app.id.toUpperCase()}', style: TextStyle(fontSize: 10, color: Colors.blueGrey, fontWeight: FontWeight.bold)),
              Text('التاريخ: ${DateTime.now().toString().split(' ')[0]}', style: TextStyle(fontSize: 11, color: Colors.grey)),
              Divider(),
              Text('يرجى الانتظار حتى مناداة رقمك', style: TextStyle(fontSize: 10, fontStyle: FontStyle.italic)),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('إلغاء')),
          ElevatedButton.icon(
            onPressed: () async {
              Navigator.pop(context);
              final ok = await _printerService.printTicket(
                app.queueNumber.toString(), 
                app.patientName, 
                app.id
              );
              if (!ok) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشلت الطباعة!'), backgroundColor: Colors.red));
              }
            },
            icon: Icon(Icons.print),
            label: Text('طباعة الآن'),
            style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF6366F1), foregroundColor: Colors.white),
          )
        ],
      ),
    );
  }

  void _showReceiptPreview(String id) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(child: CircularProgressIndicator()),
    );
    
    final receiptData = await _apiService.getReceipt(id);
    Navigator.pop(context); // Remove loading indicator
    
    if (receiptData != null) {
      showDialog(
        context: context,
        builder: (context) => ReceiptPreviewDialog(data: receiptData),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('خطأ في جلب بيانات الإيصال'), backgroundColor: Colors.red),
      );
    }
  }

  Widget _buildStatCard(String label, String value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 4),
        padding: EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: color)),
            Text(label, style: TextStyle(fontSize: 10, color: color.withOpacity(0.8), fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget build(BuildContext context) {
    final onlineRequests = _appointments.where((a) => a.status == 'قيد المراجعة' || a.status == 'طلب جديد').toList();
    final waitingList = _appointments.where((a) => a.status != 'منجز' && a.status != 'ملغى' && a.status != 'قيد المراجعة' && a.status != 'طلب جديد').toList();
    final completedList = _appointments.where((a) => a.status == 'منجز').toList();

    List<Appointment> displayList;
    if (_activeTab == 'online') {
      displayList = onlineRequests;
    } else if (_activeTab == 'waiting') {
      displayList = waitingList;
    } else {
      displayList = completedList;
    }

    return Scaffold(
      backgroundColor: Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        title: Column(
          children: [
            Text('لوحة تحكم الاستقبال', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _isServerOnline ? Colors.greenAccent : Colors.redAccent,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: _isServerOnline ? Colors.greenAccent.withOpacity(0.5) : Colors.redAccent.withOpacity(0.5),
                        blurRadius: 4,
                        spreadRadius: 2,
                      )
                    ],
                  ),
                ),
                SizedBox(width: 6),
                Text(
                  _isServerOnline ? 'متصل بالسيرفر' : 'غير متصل (أوفلاين)',
                  style: TextStyle(fontSize: 10, color: Colors.white70, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
        backgroundColor: Color(0xFF1E293B),
        foregroundColor: Colors.white,
        centerTitle: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(bottom: Radius.circular(25))),
        actions: [
          IconButton(icon: Icon(Icons.refresh), onPressed: _loadData),
          IconButton(icon: Icon(Icons.search), onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PatientSearchScreen()))),
          IconButton(icon: Icon(Icons.settings), onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ClinicSettingsScreen())).then((_) => _loadData())),
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: Text('تسجيل الخروج'),
                  content: Text('هل أنت متأكد من رغبتك في تسجيل الخروج؟'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context), child: Text('إلغاء')),
                    TextButton(
                      onPressed: () {
                        Navigator.pop(context);
                        Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => LoginScreen()), (route) => false);
                      },
                      child: Text('خروج', style: TextStyle(color: Colors.red)),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                _buildStatCard('في الانتظار', '$_waitingCount', Colors.orange, Icons.hourglass_empty),
                _buildStatCard('المنجزين', '$_completedCount', Colors.green, Icons.check_circle),
                _buildStatCard('دخل اليوم', '${_todayRevenue.toInt()} ج', Colors.blue, Icons.payments),
              ],
            ),
          ),
          
          if (onlineRequests.isNotEmpty)
            Container(
              margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(15),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.notification_important, color: Colors.amber.shade900),
                  SizedBox(width: 10),
                  Expanded(child: Text('لديك ${onlineRequests.length} طلبات حجز جديدة من الموقع', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber.shade900))),
                  TextButton(
                    onPressed: () => setState(() => _activeTab = 'online'),
                    child: Text('عرض الطلبات', style: TextStyle(decoration: TextDecoration.underline)),
                  )
                ],
              ),
            ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ElevatedButton.icon(
              onPressed: () async {
                final result = await _apiService.callNext();
                if (result != null) {
                  _loadData();
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تم نداء: ${result.patientName}'), backgroundColor: Color(0xFF6366F1)));
                }
              },
              icon: Icon(Icons.volume_up, size: 28),
              label: Text(
                _nextQueueNumber != null ? 'استدعاء التالي (#$_nextQueueNumber)' : 'استدعاء المريض التالي', 
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Color(0xFF6366F1),
                foregroundColor: Colors.white,
                minimumSize: Size(double.infinity, 60),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                elevation: 4,
              ),
            ),
          ),
          Container(
            margin: EdgeInsets.all(16),
            padding: EdgeInsets.all(6),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)]),
            child: Row(
              children: [
                _buildTabBtn('completed', 'المنجزين', completedList.length, Icons.done_all),
                _buildTabBtn('waiting', 'الانتظار', waitingList.length, Icons.person_search),
                _buildTabBtn('online', 'أونلاين', onlineRequests.length, Icons.language),
              ],
            ),
          ),
          Expanded(
            child: _isLoading 
              ? Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
              : RefreshIndicator(
                  onRefresh: _loadData,
                  color: Color(0xFF6366F1),
                  child: displayList.isEmpty 
                    ? _buildEmptyState()
                    : ListView.builder(
                        padding: EdgeInsets.only(bottom: 100),
                        physics: AlwaysScrollableScrollPhysics(), // Ensures it can scroll even if list is short
                        itemCount: displayList.length,
                        itemBuilder: (context, index) {
                          final app = displayList[index];
                          if (_activeTab == 'online') {
                            return _buildOnlineRequestCard(app);
                          }
                          return _buildPatientCard(app);
                        },
                      ),
                ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddPatientBottomSheet,
        backgroundColor: Color(0xFF1E293B),
        icon: Icon(Icons.add, color: Colors.white),
        label: Text('تسجيل مريض جديد', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildTabBtn(String key, String label, int count, IconData icon) {
    bool active = _activeTab == key;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeTab = key),
        child: AnimatedContainer(
          duration: Duration(milliseconds: 300),
          padding: EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(color: active ? Color(0xFF1E293B) : Colors.transparent, borderRadius: BorderRadius.circular(15)),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, color: active ? Colors.white : Colors.grey, size: 16),
                  SizedBox(width: 4),
                  if (count > 0)
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: active ? Colors.white.withOpacity(0.2) : Colors.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$count',
                        style: TextStyle(
                          color: active ? Colors.white : Colors.blue.shade700,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
              SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  color: active ? Colors.white : Colors.grey,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOnlineRequestCard(Appointment app) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blue.shade100),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)],
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(backgroundColor: Colors.blue.shade50, child: Icon(Icons.person, color: Colors.blue)),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(app.patientName, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text(app.service, style: TextStyle(color: Colors.grey, fontSize: 13)),
                  ],
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
                child: Text('حجز أونلاين', style: TextStyle(color: Colors.blue, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          Divider(height: 24),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () async {
                    setState(() => _isLoading = true);
                    final ok = await _apiService.updateStatus(app.id, 'في الانتظار');
                    if (ok) {
                      await Future.delayed(Duration(milliseconds: 300));
                      await _loadData();
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تم قبول الحجز وتأكيده بنجاح'), backgroundColor: Colors.green));
                    } else {
                      setState(() => _isLoading = false);
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('فشل تأكيد الحجز، حاول مجدداً'), backgroundColor: Colors.red));
                    }
                  },
                  icon: Icon(Icons.check),
                  label: Text('قبول وتأكيد'),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, elevation: 0),
                ),
              ),
              SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    setState(() => _isLoading = true);
                    final ok = await _apiService.updateStatus(app.id, 'ملغى');
                    if (ok) {
                      await _loadData();
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تم رفض وإلغاء الطلب'), backgroundColor: Colors.red));
                    }
                  },
                  icon: Icon(Icons.close),
                  label: Text('رفض الحجز'),
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: BorderSide(color: Colors.red)),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildPatientCard(Appointment app) {
    bool isChecking = app.status == 'جاري الكشف';
    bool isPaid = app.paymentStatus == 'مدفوع';

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 15, offset: Offset(0, 5))],
        border: Border.all(color: isChecking ? Color(0xFF6366F1).withOpacity(0.3) : Colors.transparent, width: 2),
      ),
      child: ListTile(
        onTap: () => _openPatientActionsBottomSheet(app),
        contentPadding: EdgeInsets.all(16),
        leading: Container(
          width: 55,
          height: 55,
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: isChecking ? [Color(0xFF6366F1), Color(0xFF818CF8)] : [Color(0xFFF1F5F9), Color(0xFFE2E8F0)]),
            borderRadius: BorderRadius.circular(18),
          ),
          child: Center(
            child: Text('#${app.queueNumber}', style: TextStyle(color: isChecking ? Colors.white : Color(0xFF475569), fontWeight: FontWeight.w900, fontSize: 20)),
          ),
        ),
        title: Text(app.patientName, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 17, color: Color(0xFF1E293B))),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(app.service, style: TextStyle(color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                SizedBox(width: 8),
                Text('• REF: ${app.id.substring(app.id.length > 8 ? app.id.length - 8 : 0).toUpperCase()}', 
                  style: TextStyle(color: Colors.blueGrey, fontSize: 11, fontWeight: FontWeight.bold)),
              ],
            ),
            SizedBox(height: 6),
            Row(
              children: [
                _buildStatusChip(app.status, isChecking ? Color(0xFF6366F1) : Colors.blueGrey),
                SizedBox(width: 8),
                if (app.status == 'منجز') _buildStatusChip(isPaid ? 'مدفوع' : 'لم يدفع', isPaid ? Colors.green : Colors.red),
              ],
            )
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(app.time, style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF6366F1))),
            if (app.treatmentPrice > 0) Text('${app.treatmentPrice.toInt()} ج', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.green)),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String label, Color color) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.layers_clear_outlined, size: 80, color: Colors.grey.shade300),
          SizedBox(height: 16),
          Text('لا توجد بيانات حالياً', style: TextStyle(color: Colors.grey, fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  void _openPatientActionsBottomSheet(Appointment app) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(35))),
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10))),
            SizedBox(height: 20),
            Text(app.patientName, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
            Text('رقم الدور #${app.queueNumber} | ${app.service}', style: TextStyle(color: Colors.grey)),
            SizedBox(height: 30),
            GridView.count(
              shrinkWrap: true,
              crossAxisCount: 3,
              mainAxisSpacing: 15,
              crossAxisSpacing: 15,
              children: [
                _buildActionCircle(Icons.confirmation_number, 'تذكرة', Color(0xFF6366F1), () {
                  Navigator.pop(context);
                  _showTicketPreview(app);
                }),
                _buildActionCircle(Icons.description, 'وصفة', Colors.teal, () {
                  Navigator.pop(context);
                  _showPrescriptionPreview(app);
                }),
                _buildActionCircle(Icons.receipt_long, 'إيصال', Colors.blueGrey, () {
                  Navigator.pop(context);
                  _showReceiptPreview(app.id);
                }),
                _buildActionCircle(Icons.message, 'واتساب', Colors.green, () {
                  Navigator.pop(context);
                  _shareViaWhatsApp(app);
                }),
                _buildActionCircle(Icons.volume_up, 'نداء', Colors.orange, () async {
                  Navigator.pop(context);
                  await _apiService.updateStatus(app.id, 'جاري الكشف');
                  _loadData();
                }),
                _buildActionCircle(Icons.payments, isPaid(app) ? 'إلغاء دفع' : 'تأكيد دفع', Colors.blue, () async {
                  Navigator.pop(context);
                  final newStatus = isPaid(app) ? 'غير مدفوع' : 'مدفوع';
                  await _apiService.updatePaymentStatus(app.id, newStatus);
                  await Future.delayed(Duration(milliseconds: 500));
                  _loadData();
                }),
                if (app.status != 'منجز')
                  _buildActionCircle(Icons.cancel, 'إلغاء', Colors.red, () async {
                    Navigator.pop(context);
                    await _apiService.updateStatus(app.id, 'ملغى');
                    _loadData();
                  }),
              ],
            ),
            SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  bool isPaid(Appointment app) => app.paymentStatus?.trim() == 'مدفوع';

  Widget _buildActionCircle(IconData icon, String label, Color color, VoidCallback onTap) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 28),
          ),
        ),
        SizedBox(height: 8),
        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
      ],
    );
  }

  void _openAddPatientBottomSheet() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    String? selectedService = _serviceNames[0];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(35))),
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom + 24, left: 24, right: 24, top: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('تسجيل مريض جديد', textAlign: TextAlign.center, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
              SizedBox(height: 20),
              TextField(controller: nameCtrl, decoration: InputDecoration(labelText: 'اسم المريض', prefixIcon: Icon(Icons.person), border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)))),
              SizedBox(height: 15),
              TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: InputDecoration(labelText: 'رقم الهاتف', prefixIcon: Icon(Icons.phone), border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)))),
              SizedBox(height: 15),
              DropdownButtonFormField<String>(
                value: selectedService,
                items: _serviceNames.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                onChanged: (v) => setModalState(() => selectedService = v),
                decoration: InputDecoration(labelText: 'الخدمة', border: OutlineInputBorder(borderRadius: BorderRadius.circular(15))),
              ),
              SizedBox(height: 25),
              ElevatedButton(
                onPressed: () async {
                  if (nameCtrl.text.isEmpty) return;
                  final data = {
                    'patientName': nameCtrl.text,
                    'phone': phoneCtrl.text,
                    'service': selectedService,
                    'date': DateTime.now().toString().split(' ')[0],
                    'time': TimeOfDay.now().format(context),
                    'source': 'reception'
                  };
                  await _apiService.addAppointment(data);
                  Navigator.pop(context);
                  _loadData();
                },
                child: Text('تأكيد الحجز الآن', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF1E293B), foregroundColor: Colors.white, padding: EdgeInsets.symmetric(vertical: 18), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
              )
            ],
          ),
        ),
      ),
    );
  }
}
