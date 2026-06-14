import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../services/printer_service.dart';
import '../models/appointment.dart';
import 'login_screen.dart';
import 'patient_search_screen.dart';
import 'clinic_settings_screen.dart';

class DoctorDashboard extends StatefulWidget {
  @override
  _DoctorDashboardState createState() => _DoctorDashboardState();
}

class _DoctorDashboardState extends State<DoctorDashboard> {
  final ApiService _apiService = ApiService();
  final PrinterService _printerService = PrinterService();
  List<Appointment> _appointments = [];
  List<Map<String, dynamic>> _presets = [];
  bool _isLoading = true;
  String _activeTab = 'waiting'; // 'waiting', 'completed'

  // History States
  List<Appointment> _patientHistory = [];
  bool _isLoadingHistory = false;
  String _modalActiveTab = 'visit'; 

  // Stats
  double get _todayRevenue => _appointments
      .where((a) => a.status == 'منجز' && a.paymentStatus == 'مدفوع')
      .fold(0, (sum, item) => sum + item.treatmentPrice);

  double get _totalDebts => _appointments
      .where((a) => a.status == 'منجز' && a.paymentStatus != 'مدفوع')
      .fold(0, (sum, item) => sum + item.treatmentPrice);

  int get _waitingCount => _appointments.where((a) => a.status != 'منجز' && a.status != 'ملغى').length;
  int get _completedCount => _appointments.where((a) => a.status == 'منجز').length;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final apps = await _apiService.getTodayAppointments();
      final prs = await _apiService.getPrescriptionTemplates();
      setState(() {
        _appointments = apps;
        _presets = prs;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      print('Load doctor data error: $e');
    }
  }

  Future<void> _loadPatientHistory(Appointment app, StateSetter setModalState) async {
    setModalState(() {
      _isLoadingHistory = true;
      _patientHistory = [];
    });
    try {
      final all = await _apiService.getAllAppointments();
      final history = all.where((a) => 
        a.id != app.id &&
        a.patientName.trim().toLowerCase() == app.patientName.trim().toLowerCase() &&
        a.status == 'منجز'
      ).toList();
      setModalState(() {
        _patientHistory = history;
        _isLoadingHistory = false;
      });
    } catch (e) {
      setModalState(() => _isLoadingHistory = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final waitingList = _appointments.where((a) => a.status != 'منجز' && a.status != 'ملغى').toList();
    final completedList = _appointments.where((a) => a.status == 'منجز').toList();
    final List<Appointment> displayList = _activeTab == 'waiting' ? waitingList : completedList;

    return Scaffold(
      backgroundColor: Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        title: Text('لوحة تحكم الطبيب', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
        backgroundColor: Color(0xFF0F172A),
        foregroundColor: Colors.white,
        centerTitle: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(bottom: Radius.circular(25))),
        actions: [
          IconButton(icon: Icon(Icons.refresh), onPressed: _loadData),
          IconButton(icon: Icon(Icons.search), onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PatientSearchScreen()))),
          IconButton(icon: Icon(Icons.settings), onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ClinicSettingsScreen())).then((_) => _loadData())),
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: () => _showLogoutDialog(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Stats Row
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                _buildStatCard('دخل اليوم', '${_todayRevenue.toInt()} ج', Colors.green, Icons.payments),
                _buildStatCard('ديون عالقة', '${_totalDebts.toInt()} ج', Colors.red, Icons.money_off),
                _buildStatCard('في الانتظار', '$_waitingCount', Colors.orange, Icons.hourglass_empty),
              ],
            ),
          ),

          // Next Patient Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ElevatedButton.icon(
              onPressed: () async {
                final result = await _apiService.callNext();
                if (result != null) {
                  _loadData();
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تم نداء المريض: ${result.patientName}'), backgroundColor: Colors.teal));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('لا يوجد مرضى في قائمة الانتظار'), backgroundColor: Colors.amber.shade900));
                }
              },
              icon: Icon(Icons.volume_up, size: 24),
              label: Text('استدعاء المريض التالي', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                minimumSize: Size(double.infinity, 56),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 4,
              ),
            ),
          ),

          // Tabs
          Container(
            margin: EdgeInsets.all(16),
            padding: EdgeInsets.all(6),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)]),
            child: Row(
              children: [
                _buildTabBtn('completed', 'منجزين اليوم', completedList.length, Icons.check_circle_outline),
                _buildTabBtn('waiting', 'قائمة الانتظار', waitingList.length, Icons.pending_actions),
              ],
            ),
          ),

          // Patient List
          Expanded(
            child: _isLoading 
              ? Center(child: CircularProgressIndicator(color: Color(0xFF0F172A)))
              : displayList.isEmpty 
                ? _buildEmptyState()
                : ListView.builder(
                    padding: EdgeInsets.only(bottom: 20),
                    itemCount: displayList.length,
                    itemBuilder: (context, index) => _buildPatientCard(displayList[index]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 4),
        padding: EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: color.withOpacity(0.1)),
          boxShadow: [BoxShadow(color: color.withOpacity(0.05), blurRadius: 10, offset: Offset(0, 4))],
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 18),
            SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
            Text(label, style: TextStyle(fontSize: 9, color: Colors.grey.shade600, fontWeight: FontWeight.bold)),
          ],
        ),
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
          decoration: BoxDecoration(color: active ? Color(0xFF0F172A) : Colors.transparent, borderRadius: BorderRadius.circular(15)),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: active ? Colors.white : Colors.grey, size: 16),
              SizedBox(width: 6),
              Text(label, style: TextStyle(color: active ? Colors.white : Colors.grey, fontWeight: FontWeight.bold, fontSize: 12)),
              if (count > 0) ...[
                SizedBox(width: 6),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: active ? Colors.white24 : Colors.grey.shade200, borderRadius: BorderRadius.circular(10)),
                  child: Text('$count', style: TextStyle(color: active ? Colors.white : Colors.grey.shade700, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ]
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPatientCard(Appointment app) {
    bool isExamining = app.status == 'جاري الكشف';
    
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: Offset(0, 4))],
        border: Border.all(color: isExamining ? Colors.teal.withOpacity(0.3) : Colors.transparent, width: 2),
      ),
      child: ListTile(
        onTap: () => _openClinicalModal(app),
        contentPadding: EdgeInsets.all(16),
        leading: Container(
          width: 50, height: 50,
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: isExamining ? [Colors.teal, Colors.cyan] : [Color(0xFFF1F5F9), Color(0xFFE2E8F0)]),
            borderRadius: BorderRadius.circular(15),
          ),
          child: Center(child: Text('#${app.queueNumber}', style: TextStyle(color: isExamining ? Colors.white : Color(0xFF475569), fontWeight: FontWeight.w900, fontSize: 18))),
        ),
        title: Text(app.patientName, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        subtitle: Text(app.service, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
        trailing: Container(
          padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: isExamining ? Colors.teal.shade50 : Colors.grey.shade50, borderRadius: BorderRadius.circular(10)),
          child: Text(isExamining ? 'افحص الآن' : (app.status == 'منجز' ? 'تم الفحص' : 'انتظار'), 
            style: TextStyle(color: isExamining ? Colors.teal : Colors.blueGrey, fontSize: 10, fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }

  void _openClinicalModal(Appointment app) {
    final TextEditingController _notesController = TextEditingController(text: app.notes);
    final TextEditingController _prescController = TextEditingController(text: app.prescription);
    final TextEditingController _priceController = TextEditingController(text: app.treatmentPrice > 0 ? app.treatmentPrice.toString() : '');
    
    _modalActiveTab = 'visit';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          if (_isLoadingHistory == false && _patientHistory.isEmpty) {
             _loadPatientHistory(app, setModalState);
          }
          
          return Container(
            height: MediaQuery.of(context).size.height * 0.9,
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
            padding: EdgeInsets.fromLTRB(20, 10, 20, MediaQuery.of(context).viewInsets.bottom + 20),
            child: Column(
              children: [
                Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10))),
                SizedBox(height: 20),
                Text(app.patientName, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                Text('الخدمة: ${app.service}', style: TextStyle(color: Colors.grey, fontSize: 14)),
                SizedBox(height: 20),
                
                // Modal Tabs
                Row(
                  children: [
                    _buildModalTabBtn('history', 'سجل المريض (${_patientHistory.length})', setModalState),
                    SizedBox(width: 10),
                    _buildModalTabBtn('visit', 'الفحص الحالي', setModalState),
                  ],
                ),
                SizedBox(height: 20),
                
                Expanded(
                  child: SingleChildScrollView(
                    child: _modalActiveTab == 'visit' 
                      ? _buildVisitTab(_notesController, _prescController, _priceController, app)
                      : _buildHistoryTab(),
                  ),
                ),
                
                if (_modalActiveTab == 'visit')
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: ElevatedButton(
                      onPressed: () async {
                        final price = double.tryParse(_priceController.text) ?? 0.0;
                        final ok = await _apiService.updateClinical(app.id, _notesController.text, _prescController.text, price, 'منجز');
                        if (ok) {
                          Navigator.pop(context);
                          _loadData();
                        }
                      },
                      child: Text('حفظ البيانات وإنهاء الفحص', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green, foregroundColor: Colors.white,
                        minimumSize: Size(double.infinity, 54),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                  ),
              ],
            ),
          );
        }
      ),
    );
  }

  Widget _buildModalTabBtn(String key, String label, StateSetter setModalState) {
    bool active = _modalActiveTab == key;
    return Expanded(
      child: InkWell(
        onTap: () => setModalState(() => _modalActiveTab = key),
        child: Container(
          padding: EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: active ? Color(0xFF0F172A) : Colors.grey.shade50,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: active ? Color(0xFF0F172A) : Colors.grey.shade200),
          ),
          child: Center(child: Text(label, style: TextStyle(color: active ? Colors.white : Colors.grey, fontWeight: FontWeight.bold))),
        ),
      ),
    );
  }

  Widget _buildVisitTab(TextEditingController notes, TextEditingController presc, TextEditingController price, Appointment app) {
    String? selectedMedicine;
    final TextEditingController medSearchCtrl = TextEditingController();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildSectionTitle('الملاحظات الطبية والتشخيص'),
        TextField(controller: notes, maxLines: 3, decoration: _inputDecoration('اكتب التشخيص هنا...')),
        SizedBox(height: 20),
        
        _buildSectionTitle('إضافة دواء من قاعدة البيانات'),
        Container(
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.teal.withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.teal.withOpacity(0.1)),
          ),
          child: Column(
            children: [
              Autocomplete<Map<String, dynamic>>(
                displayStringForOption: (Map<String, dynamic> option) => option['medicine'] ?? '',
                optionsBuilder: (TextEditingValue textEditingValue) {
                  if (textEditingValue.text.isEmpty) return const Iterable<Map<String, dynamic>>.empty();
                  return _presets.where((p) => p['medicine'].toString().toLowerCase().contains(textEditingValue.text.toLowerCase()));
                },
                onSelected: (Map<String, dynamic> selection) {
                  final line = "${selection['medicine']} - ${selection['dose']} (${selection['duration']})";
                  if (presc.text.isEmpty) presc.text = line;
                  else presc.text += "\n$line";
                },
                fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
                  return TextField(
                    controller: controller,
                    focusNode: focusNode,
                    decoration: _inputDecoration('ابحث عن دواء...').copyWith(
                      prefixIcon: Icon(Icons.search, color: Colors.teal),
                      suffixIcon: Icon(Icons.keyboard_arrow_down, color: Colors.teal),
                    ),
                  );
                },
              ),
              SizedBox(height: 8),
              Text('اختر الدواء وسيتم إضافته تلقائياً للوصفة أدناه', style: TextStyle(fontSize: 10, color: Colors.teal.shade700)),
            ],
          ),
        ),
        SizedBox(height: 20),
        
        _buildSectionTitle('الوصفة الطبية النهائية (Rx)'),
        TextField(controller: presc, maxLines: 4, decoration: _inputDecoration('الأدوية والجرعات...')),
        SizedBox(height: 20),
        
        _buildSectionTitle('سعر العلاج'),
        TextField(controller: price, keyboardType: TextInputType.number, decoration: _inputDecoration('0.00 د.ج').copyWith(prefixIcon: Icon(Icons.monetization_on, color: Colors.green))),
        SizedBox(height: 20),
      ],
    );
  }

  Widget _buildPrescriptionPresets(TextEditingController presc) {
    if (_presets.isEmpty) return SizedBox();
    return Container(
      height: 40,
      margin: EdgeInsets.only(bottom: 10),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _presets.length,
        itemBuilder: (context, i) {
          final p = _presets[i];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ActionChip(
              label: Text(p['medicine'] ?? '', style: TextStyle(fontSize: 11)),
              onPressed: () {
                final line = "${p['medicine']} - ${p['dose']} (${p['duration']})";
                if (presc.text.isEmpty) presc.text = line;
                else presc.text += "\n$line";
              },
              backgroundColor: Colors.teal.shade50,
            ),
          );
        },
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (_isLoadingHistory) return Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));
    if (_patientHistory.isEmpty) return _buildEmptyStateHistory();
    
    return ListView.builder(
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics(),
      itemCount: _patientHistory.length,
      itemBuilder: (context, index) {
        final h = _patientHistory[index];
        return Container(
          margin: EdgeInsets.only(bottom: 12),
          padding: EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade100)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(h.date, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.indigo)),
                  Text(h.service, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                ],
              ),
              Divider(height: 20),
              if (h.notes != null) Text('التشخيص: ${h.notes}', style: TextStyle(fontSize: 13)),
              if (h.prescription != null) Text('الوصفة: ${h.prescription}', style: TextStyle(fontSize: 13, color: Colors.teal.shade700, fontWeight: FontWeight.bold)),
              if (h.treatmentPrice > 0) Align(alignment: Alignment.centerLeft, child: Text('${h.treatmentPrice.toInt()} د.ج', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.green))),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, right: 4),
      child: Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A), fontSize: 14)),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: Colors.grey.shade50,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
    );
  }

  Widget _buildEmptyState() {
    return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.layers_clear, size: 60, color: Colors.grey.shade300), SizedBox(height: 10), Text('لا يوجد مرضى حالياً', style: TextStyle(color: Colors.grey))]));
  }

  Widget _buildEmptyStateHistory() {
    return Center(child: Column(children: [SizedBox(height: 40), Icon(Icons.history_toggle_off, size: 50, color: Colors.grey.shade300), SizedBox(height: 10), Text('لا توجد سجلات سابقة لهذا المريض', style: TextStyle(color: Colors.grey))]));
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('تسجيل الخروج'),
        content: Text('هل أنت متأكد من الخروج؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text('إلغاء')),
          TextButton(onPressed: () => Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => LoginScreen()), (r) => false), child: Text('خروج', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
  }
}
