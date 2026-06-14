import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/printer_service.dart';

class ReceiptPreviewDialog extends StatelessWidget {
  final Map<String, dynamic> data;
  final PrinterService _printerService = PrinterService();

  ReceiptPreviewDialog({required this.data});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: Colors.grey[200],
      contentPadding: EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      content: SingleChildScrollView(
        child: Container(
          width: 300, // Simulating 58mm width roughly in logical pixels
          padding: EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'عيادة الدكتور بويوسف سفيان',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              Text(
                'جراحة وتجميل الأسنان',
                textAlign: TextAlign.center,
                style: TextStyle(fontFamily: 'monospace', fontSize: 12),
              ),
              Divider(thickness: 1, color: Colors.black),
              _buildRow('التاريخ', data['date']?.toString() ?? ''),
              _buildRow('رقم الدور', '#${data['queueNumber']}'),
              _buildRow('المريض', data['patientName']?.toString() ?? ''),
              Divider(thickness: 1, color: Colors.black),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  'الوصفة / العلاج:',
                  style: TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold),
                ),
              ),
              SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  data['prescription']?.toString() ?? 'لا توجد وصفة',
                  style: TextStyle(fontFamily: 'monospace', fontSize: 13),
                ),
              ),
              Divider(thickness: 1, color: Colors.black),
              _buildRow('سعر العلاج', '${data['treatmentPrice']} د.ج'),
              _buildRow('حالة الدفع', data['paymentStatus']?.toString() ?? ''),
              SizedBox(height: 15),
              QrImageView(
                data: 'Receipt ID: ${data['id'] ?? data['queueNumber']}',
                version: QrVersions.auto,
                size: 80.0,
              ),
              SizedBox(height: 15),
              Text(
                'نتمنى لكم الشفاء العاجل',
                style: TextStyle(fontFamily: 'monospace', fontSize: 11, fontStyle: FontStyle.italic),
              ),
              SizedBox(height: 10),
              Text(
                '--------------------------------',
                style: TextStyle(fontFamily: 'monospace', fontSize: 10),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('إلغاء', style: TextStyle(color: Colors.red)),
        ),
        ElevatedButton.icon(
          onPressed: () async {
            Navigator.pop(context);
            _printNow(context);
          },
          icon: Icon(Icons.print),
          label: Text('طباعة'),
          style: ElevatedButton.styleFrom(backgroundColor: Colors.black, foregroundColor: Colors.white),
        ),
      ],
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(value, style: TextStyle(fontFamily: 'monospace', fontSize: 13)),
          Text('$label:', style: TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }

  Future<void> _printNow(BuildContext context) async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('جاري الاتصال بالطابعة...'), backgroundColor: Colors.indigo),
    );
    
    final success = await _printerService.printEscPosReceipt(data);
    
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تمت الطباعة بنجاح'), backgroundColor: Colors.green),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('فشلت الطباعة! تحقق من الاتصال'), backgroundColor: Colors.red),
      );
    }
  }
}
