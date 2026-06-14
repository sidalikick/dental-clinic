import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/appointment.dart';

class PatientSearchScreen extends StatefulWidget {
  @override
  _PatientSearchScreenState createState() => _PatientSearchScreenState();
}

class _PatientSearchScreenState extends State<PatientSearchScreen> {
  final ApiService _apiService = ApiService();
  List<Appointment> _allAppointments = [];
  List<Appointment> _filteredAppointments = [];
  bool _isLoading = true;

  String _searchQuery = '';
  String _selectedService = 'الكل';
  String _selectedStatus = 'الكل';
  
  // Track expanded card IDs
  Set<String> _expandedAppIds = {};

  List<String> _servicesList = ['الكل'];
  bool _isLoadingServices = false;

  @override
  void initState() {
    super.initState();
    _loadData();
    _fetchServices();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final apps = await _apiService.getAllAppointments();
    setState(() {
      _allAppointments = apps;
      _isLoading = false;
      _applyFilters();
    });
  }

  Future<void> _fetchServices() async {
    setState(() => _isLoadingServices = true);
    try {
      final svs = await _apiService.getServices();
      final names = svs.map((s) => s['name']?.toString() ?? '').where((name) => name.isNotEmpty).toList();
      setState(() {
        _servicesList = ['الكل', ...names];
        _isLoadingServices = false;
      });
    } catch (e) {
      setState(() => _isLoadingServices = false);
      // Keep static list if server call fails
      _servicesList = [
        'الكل',
        'تنظيف أسنان',
        'حشوات تجميلية',
        'علاج عصب',
        'تقويم أسنان',
        'تبييض أسنان',
        'زراعة أسنان'
      ];
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredAppointments = _allAppointments.where((app) {
        // Query match (Name, Phone, or ID)
        final matchQuery = app.patientName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            app.phone.contains(_searchQuery) ||
            app.id.toLowerCase().contains(_searchQuery.toLowerCase());

        // Service match
        final matchService = _selectedService == 'الكل' || app.service == _selectedService;

        // Status match
        final matchStatus = _selectedStatus == 'الكل' || app.status == _selectedStatus;

        return matchQuery && matchService && matchStatus;
      }).toList();
    });
  }

  Future<void> _confirmPayment(Appointment app) async {
    // Show confirmation dialog
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('تأكيد الدفع', textAlign: TextAlign.right),
        content: Text(
          'هل تريد تأكيد استلام مبلغ العلاج (${app.treatmentPrice} دج) للمريض ${app.patientName}؟',
          textAlign: TextAlign.right,
        ),
        actions: [
          TextButton(
            child: Text('إلغاء'),
            onPressed: () => Navigator.pop(context, false),
          ),
          ElevatedButton(
            child: Text('تأكيد الدفع'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            onPressed: () => Navigator.pop(context, true),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await _apiService.updatePaymentStatus(app.id, 'مدفوع');
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تم تأكيد الدفع بنجاح!'),
            backgroundColor: Colors.green,
          ),
        );
        // Reload data
        _loadData();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('عذراً، فشل تحديث حالة الدفع.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'مؤكد':
        return Colors.green;
      case 'جاري الكشف':
        return Colors.indigo;
      case 'منجز':
        return Colors.blue;
      case 'ملغى':
        return Colors.red;
      default:
        return Colors.amber;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text('أرشيف وسجل المرضى العام'),
        backgroundColor: Color(0xFF0F172A),
        foregroundColor: Colors.white,
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Search & Filter Panel
          Container(
            color: Colors.white,
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              children: [
                // Search Bar
                TextField(
                  textAlign: TextAlign.right,
                  decoration: InputDecoration(
                    hintText: 'ابحث باسم المريض، رقم الهاتف، المعرّف...',
                    prefixIcon: Icon(Icons.search, color: Color(0xFF2563EB)),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: Icon(Icons.clear),
                            onPressed: () {
                              setState(() {
                                _searchQuery = '';
                              });
                              _applyFilters();
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: Color(0xFF2563EB), width: 1.5),
                    ),
                    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val;
                    });
                    _applyFilters();
                  },
                ),
                SizedBox(height: 12),

                // Service Horizontal List Filter
                Container(
                  height: 38,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    reverse: true, // Right-to-left
                    itemCount: _servicesList.length,
                    itemBuilder: (context, index) {
                      final serviceName = _servicesList[index];
                      final isSelected = _selectedService == serviceName;
                      
                      return Padding(
                        padding: const EdgeInsets.only(left: 8.0),
                        child: ChoiceChip(
                          label: Text(
                            serviceName,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Color(0xFF475569),
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: Color(0xFF2563EB),
                          backgroundColor: Colors.grey.shade100,
                          elevation: isSelected ? 2 : 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          onSelected: (selected) {
                            setState(() {
                              _selectedService = serviceName;
                            });
                            _applyFilters();
                          },
                        ),
                      );
                    },
                  ),
                ),
                SizedBox(height: 8),

                // Status Horizontal List Filter
                Container(
                  height: 38,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    reverse: true, // Right-to-left
                    children: [
                      'الكل',
                      'قيد المراجعة',
                      'مؤكد',
                      'جاري الكشف',
                      'منجز',
                      'ملغى'
                    ].map((statusName) {
                      final isSelected = _selectedStatus == statusName;
                      return Padding(
                        padding: const EdgeInsets.only(left: 8.0),
                        child: ChoiceChip(
                          label: Text(
                            statusName,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Color(0xFF475569),
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: _getStatusColor(statusName),
                          backgroundColor: Colors.grey.shade100,
                          elevation: isSelected ? 2 : 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          onSelected: (selected) {
                            setState(() {
                              _selectedStatus = statusName;
                            });
                            _applyFilters();
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          
          // Total count label
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'تاريخ المراجعة الشامل',
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey.shade500, fontSize: 13),
                ),
                Text(
                  'عدد النتائج: ${_filteredAppointments.length} سجل مريض',
                  style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A), fontSize: 13),
                ),
              ],
            ),
          ),

          // Main list or loading
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator())
                : _filteredAppointments.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search_off, size: 70, color: Colors.grey.shade300),
                            SizedBox(height: 16),
                            Text(
                              'لا توجد أية نتائج تطابق محددات البحث التاريخي',
                              style: TextStyle(color: Colors.grey.shade500, fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        child: ListView.builder(
                          physics: AlwaysScrollableScrollPhysics(),
                          itemCount: _filteredAppointments.length,
                          itemBuilder: (context, index) {
                            final app = _filteredAppointments[index];
                            final isExpanded = _expandedAppIds.contains(app.id);

                            return Card(
                              margin: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              elevation: isExpanded ? 4 : 1,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(16),
                                onTap: () {
                                  setState(() {
                                    if (isExpanded) {
                                      _expandedAppIds.remove(app.id);
                                    } else {
                                      _expandedAppIds.add(app.id);
                                    }
                                  });
                                },
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    children: [
                                      // Summary Header (Visible always)
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                app.date,
                                                style: TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  color: Colors.grey.shade700,
                                                  fontSize: 13,
                                                ),
                                              ),
                                              SizedBox(height: 4),
                                              Text(
                                                app.time,
                                                style: TextStyle(
                                                  color: Colors.grey.shade500,
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ],
                                          ),
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.end,
                                            children: [
                                              Text(
                                                app.patientName,
                                                style: TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 16,
                                                  color: Color(0xFF0F172A),
                                                ),
                                              ),
                                              SizedBox(height: 4),
                                              Row(
                                                children: [
                                                  Text(
                                                    app.phone,
                                                    style: TextStyle(
                                                      color: Colors.grey.shade500,
                                                      fontSize: 12,
                                                      fontFamily: 'monospace',
                                                    ),
                                                  ),
                                                  SizedBox(width: 8),
                                                  Container(
                                                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: _getStatusColor(app.status).withOpacity(0.1),
                                                      borderRadius: BorderRadius.circular(6),
                                                    ),
                                                    child: Text(
                                                      app.status,
                                                      style: TextStyle(
                                                        color: _getStatusColor(app.status),
                                                        fontWeight: FontWeight.bold,
                                                        fontSize: 10,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                      
                                      // Divider shown if expanded
                                      if (isExpanded) ...[
                                        Divider(height: 24, thickness: 1, color: Colors.grey.shade100),
                                        
                                        // Expanded Details Layout
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            // Left Column (Financial and Actions)
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    'الخدمة المطلوبة',
                                                    style: TextStyle(color: Colors.grey.shade400, fontSize: 10, fontWeight: FontWeight.bold),
                                                  ),
                                                  SizedBox(height: 2),
                                                  Text(
                                                    app.service,
                                                    style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF334155), fontSize: 13),
                                                  ),
                                                  SizedBox(height: 16),
                                                  Text(
                                                    'سعر العلاج الفعلي',
                                                    style: TextStyle(color: Colors.grey.shade400, fontSize: 10, fontWeight: FontWeight.bold),
                                                  ),
                                                  SizedBox(height: 2),
                                                  Text(
                                                    '${app.treatmentPrice} دج',
                                                    style: TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF2563EB), fontSize: 15),
                                                  ),
                                                  SizedBox(height: 12),
                                                  // Payment status badge
                                                  Row(
                                                    children: [
                                                      Container(
                                                        padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                        decoration: BoxDecoration(
                                                          color: app.paymentStatus == 'مدفوع'
                                                              ? Colors.green.shade50
                                                              : Colors.red.shade50,
                                                          borderRadius: BorderRadius.circular(8),
                                                          border: Border.all(
                                                            color: app.paymentStatus == 'مدفوع'
                                                                ? Colors.green.shade200
                                                                : Colors.red.shade200,
                                                          ),
                                                        ),
                                                        child: Text(
                                                          app.paymentStatus ?? 'غير مدفوع',
                                                          style: TextStyle(
                                                            color: app.paymentStatus == 'مدفوع'
                                                                ? Colors.green
                                                                : Colors.red,
                                                            fontWeight: FontWeight.w900,
                                                            fontSize: 11,
                                                          ),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  if (app.paymentStatus != 'مدفوع' && app.status == 'منجز') ...[
                                                    SizedBox(height: 12),
                                                    ElevatedButton.icon(
                                                      onPressed: () => _confirmPayment(app),
                                                      icon: Icon(Icons.check_circle_outline, size: 14),
                                                      label: Text('تأكيد الدفع', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                                      style: ElevatedButton.styleFrom(
                                                        backgroundColor: Colors.green,
                                                        foregroundColor: Colors.white,
                                                        padding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                                      ),
                                                    ),
                                                  ]
                                                ],
                                              ),
                                            ),
                                            SizedBox(width: 16),
                                            
                                            // Right Column (Medical Notes and Prescriptions)
                                            Expanded(
                                              flex: 2,
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.end,
                                                children: [
                                                  // Medical Notes
                                                  Row(
                                                    mainAxisAlignment: MainAxisAlignment.end,
                                                    children: [
                                                      Text('التشخيص والملاحظات الطبية', style: TextStyle(color: Colors.grey.shade500, fontSize: 11, fontWeight: FontWeight.bold)),
                                                      SizedBox(width: 4),
                                                      Icon(Icons.notes, size: 14, color: Colors.indigo),
                                                    ],
                                                  ),
                                                  SizedBox(height: 6),
                                                  Container(
                                                    width: double.infinity,
                                                    padding: EdgeInsets.all(10),
                                                    decoration: BoxDecoration(
                                                      color: Colors.grey.shade50,
                                                      borderRadius: BorderRadius.circular(12),
                                                      border: Border.all(color: Colors.grey.shade100),
                                                    ),
                                                    child: Text(
                                                      (app.notes != null && app.notes!.isNotEmpty)
                                                          ? app.notes!
                                                          : 'لا توجد ملاحظات طبية مدونة.',
                                                      textAlign: TextAlign.right,
                                                      style: TextStyle(
                                                        color: (app.notes != null && app.notes!.isNotEmpty)
                                                            ? Color(0xFF1E293B)
                                                            : Colors.grey.shade400,
                                                        fontSize: 12,
                                                        height: 1.4,
                                                      ),
                                                    ),
                                                  ),
                                                  SizedBox(height: 16),
                                                  
                                                  // Prescriptions
                                                  Row(
                                                    mainAxisAlignment: MainAxisAlignment.end,
                                                    children: [
                                                      Text('الوصفة الطبية (Rx)', style: TextStyle(color: Colors.grey.shade500, fontSize: 11, fontWeight: FontWeight.bold)),
                                                      SizedBox(width: 4),
                                                      Icon(Icons.receipt_long_outlined, size: 14, color: Colors.indigo),
                                                    ],
                                                  ),
                                                  SizedBox(height: 6),
                                                  Container(
                                                    width: double.infinity,
                                                    padding: EdgeInsets.all(10),
                                                    decoration: BoxDecoration(
                                                      color: Colors.indigo.shade50.withOpacity(0.5),
                                                      borderRadius: BorderRadius.circular(12),
                                                      border: Border.all(color: Colors.indigo.shade100.withOpacity(0.3)),
                                                    ),
                                                    child: Text(
                                                      (app.prescription != null && app.prescription!.isNotEmpty)
                                                          ? app.prescription!
                                                          : 'لم يتم كتابة وصفة أدوية.',
                                                      textAlign: TextAlign.right,
                                                      style: TextStyle(
                                                        color: (app.prescription != null && app.prescription!.isNotEmpty)
                                                            ? Color(0xFF1E293B)
                                                            : Colors.grey.shade400,
                                                        fontSize: 12,
                                                        height: 1.4,
                                                        fontStyle: (app.prescription != null && app.prescription!.isNotEmpty)
                                                            ? FontStyle.normal
                                                            : FontStyle.italic,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                      
                                      // Tap to expand indicator
                                      Center(
                                        child: Padding(
                                          padding: const EdgeInsets.only(top: 8.0),
                                          child: Icon(
                                            isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                            color: Colors.grey.shade400,
                                            size: 20,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
