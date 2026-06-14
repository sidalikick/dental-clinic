class Appointment {
  final String id;
  final String patientId;
  final String patientName;
  final String phone;
  final String service;
  final String date;
  final String time;
  final String status;
  final int queueNumber;
  final double treatmentPrice;
  final String? notes;
  final String? prescription;
  final String? createdAt;
  final String? paymentStatus;

  Appointment({
    required this.id,
    required this.patientId,
    required this.patientName,
    required this.phone,
    required this.service,
    required this.date,
    required this.time,
    required this.status,
    required this.queueNumber,
    required this.treatmentPrice,
    this.notes,
    this.prescription,
    this.createdAt,
    this.paymentStatus,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) {
    // Robust payment status parsing
    var rawPayment = json['paymentStatus'] ?? json['payment_status'] ?? 'غير مدفوع';
    String status = 'غير مدفوع';
    
    if (rawPayment != null) {
      String p = rawPayment.toString().toLowerCase().trim();
      if (p == 'مدفوع' || p == 'paid' || p == '1' || p == 'true' || p == 'yes') {
        status = 'مدفوع';
      }
    }

    return Appointment(
      id: json['id'] ?? '',
      patientId: json['patientId']?.toString() ?? '',
      patientName: json['patientName'] ?? 'مريض غير معروف',
      phone: json['phone'] ?? '',
      service: json['service'] ?? '',
      date: json['date'] ?? '',
      time: json['time'] ?? '',
      status: json['status'] ?? 'قيد الانتظار',
      queueNumber: json['queueNumber'] is int ? json['queueNumber'] : int.tryParse(json['queueNumber']?.toString() ?? '0') ?? 0,
      treatmentPrice: json['treatmentPrice'] is num ? (json['treatmentPrice'] as num).toDouble() : double.tryParse(json['treatmentPrice']?.toString() ?? '0') ?? 0,
      notes: json['notes'],
      prescription: json['prescription'],
      createdAt: json['createdAt'],
      paymentStatus: status,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'patientId': patientId,
      'patientName': patientName,
      'phone': phone,
      'service': service,
      'date': date,
      'time': time,
      'status': status,
      'queueNumber': queueNumber,
      'treatmentPrice': treatmentPrice,
      'notes': notes,
      'prescription': prescription,
      'paymentStatus': paymentStatus,
    };
  }
}
