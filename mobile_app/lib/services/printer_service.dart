import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:blue_thermal_printer/blue_thermal_printer.dart';

class PrinterService {
  static const String _prefIpKey = 'printer_ip_address';
  static const String _prefPortKey = 'printer_port';
  static const String _prefBtAddressKey = 'printer_bluetooth_address';
  static const String _prefBtNameKey = 'printer_bluetooth_name';
  static const String _prefPrintModeKey = 'printer_connection_mode';

  Future<String> getPrinterIp() async => (await SharedPreferences.getInstance()).getString(_prefIpKey) ?? '192.168.1.200';
  Future<int> getPrinterPort() async => (await SharedPreferences.getInstance()).getInt(_prefPortKey) ?? 9100;
  Future<String> getPrintMode() async => (await SharedPreferences.getInstance()).getString(_prefPrintModeKey) ?? 'direct';
  Future<String?> getBluetoothAddress() async => (await SharedPreferences.getInstance()).getString(_prefBtAddressKey);
  Future<String?> getBluetoothName() async => (await SharedPreferences.getInstance()).getString(_prefBtNameKey);

  Future<void> saveSettings(String ip, int port) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefIpKey, ip);
    await prefs.setInt(_prefPortKey, port);
  }

  Future<void> setPrintMode(String mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefPrintModeKey, mode);
  }

  Future<void> saveBluetoothDevice(String name, String address) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefBtNameKey, name);
    await prefs.setString(_prefBtAddressKey, address);
  }

  Future<bool> testConnection(String ip, int port) async {
    try {
      final socket = await Socket.connect(ip, port, timeout: const Duration(seconds: 3));
      await socket.close();
      return true;
    } catch (e) { return false; }
  }

  Future<List<BluetoothDevice>> getPairedDevices() async => await BlueThermalPrinter.instance.getBondedDevices();

  Future<bool> testBluetoothConnection(String name, String address) async {
    try {
      final device = BluetoothDevice(name, address);
      await BlueThermalPrinter.instance.connect(device);
      await BlueThermalPrinter.instance.disconnect();
      return true;
    } catch (e) { return false; }
  }

  Future<bool> sendRawBytes(List<int> bytes) async {
    final mode = await getPrintMode();
    if (mode == 'bluetooth') {
      try {
        BlueThermalPrinter bluetooth = BlueThermalPrinter.instance;
        if (!(await bluetooth.isConnected ?? false)) {
          final addr = await getBluetoothAddress();
          final name = await getBluetoothName();
          if (addr == null) return false;
          await bluetooth.connect(BluetoothDevice(name, addr));
        }
        await bluetooth.writeBytes(Uint8List.fromList(bytes));
        return true;
      } catch (e) { return false; }
    } else {
      try {
        final socket = await Socket.connect(await getPrinterIp(), await getPrinterPort(), timeout: const Duration(seconds: 5));
        socket.add(Uint8List.fromList(bytes));
        await socket.flush();
        await Future.delayed(const Duration(seconds: 1));
        socket.destroy(); // Use destroy for better Xprinter support
        return true;
      } catch (e) { return false; }
    }
  }

  // --- ESC/POS Logic ---

  List<int> _initPrinter() {
    return [
      0x1B, 0x40,      // Initialize
      0x1B, 0x74, 22,  // Select Code Page CP864
    ];
  }

  Future<bool> printTicket(String queueNumber, String patientName, String id) async {
    List<int> bytes = [];
    bytes.addAll(_initPrinter());
    bytes.addAll([0x1B, 0x61, 1]); // Center
    
    bytes.addAll(ascii.encode('CLINIQUE DR. BOUYOUCEF\n'));
    bytes.addAll(ascii.encode('--------------------------------\n'));
    bytes.addAll(ascii.encode('NUMERO D\'ORDRE\n'));
    
    bytes.addAll([0x1D, 0x21, 0x22]); // Large size
    bytes.addAll(ascii.encode('#$queueNumber\n'));
    bytes.addAll([0x1D, 0x21, 0x00]); // Reset size
    
    // Patient Name (Arabic safe encoding)
    bytes.addAll(ascii.encode('PATIENT: '));
    bytes.addAll(_encodeArabic(patientName));
    bytes.addAll(ascii.encode('\n'));
    
    bytes.addAll(ascii.encode('REF: ${id.toUpperCase()}\n'));
    bytes.addAll(ascii.encode('--------------------------------\n'));
    
    _addQRCodeToBytes(bytes, 'ID: $id');
    bytes.addAll([0x1B, 0x61, 1]);
    bytes.addAll(ascii.encode('\nVEUILLEZ PATIENTER\n'));
    
    bytes.addAll([0x0A, 0x0A, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x00]); 
    return await sendRawBytes(bytes);
  }

  Future<bool> printReceipt(String text) async {
    List<int> bytes = [];
    bytes.addAll(_initPrinter());
    bytes.addAll(ascii.encode(text));
    bytes.addAll([0x0A, 0x0A, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x00]);
    return await sendRawBytes(bytes);
  }

  Future<bool> printTestPage() async {
    List<int> bytes = [];
    bytes.addAll(_initPrinter());
    bytes.addAll([0x1B, 0x61, 1]);
    bytes.addAll(ascii.encode('TEST DE L\'IMPRIMANTE\n'));
    bytes.addAll(ascii.encode('CLINIQUE DR. BOUYOUCEF\n'));
    bytes.addAll(ascii.encode('Date: ${DateTime.now().toString().split('.')[0]}\n'));
    bytes.addAll([0x0A, 0x0A, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x00]);
    return await sendRawBytes(bytes);
  }

  Future<bool> printEscPosReceipt(Map<String, dynamic> data) async {
    List<int> bytes = [];
    bytes.addAll(_initPrinter());
    bytes.addAll([0x1B, 0x61, 1]);
    bytes.addAll(ascii.encode('RECU DE PAIEMENT\n'));
    bytes.addAll(ascii.encode('--------------------------------\n'));
    bytes.addAll([0x1B, 0x61, 0]); // Left
    bytes.addAll(ascii.encode('PATIENT: ${data['patientName']}\n'));
    bytes.addAll(ascii.encode('MONTANT: ${data['treatmentPrice']} DA\n'));
    bytes.addAll([0x0A, 0x1B, 0x61, 1]);
    _addQRCodeToBytes(bytes, 'REC: ${data['id']}');
    bytes.addAll([0x0A, 0x0A, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x00]);
    return await sendRawBytes(bytes);
  }

  void _addQRCodeToBytes(List<int> bytes, String data) {
    List<int> qrData = ascii.encode(data);
    int len = qrData.length + 3;
    bytes.addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06]);
    bytes.addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30]);
    bytes.addAll([0x1D, 0x28, 0x6B, len % 256, len ~/ 256, 0x31, 0x50, 0x30]);
    bytes.addAll(qrData);
    bytes.addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);
  }

  // --- Arabic CP864 Encoding Helper ---

  List<int> _encodeArabic(String text) {
    String reshaped = _reshapeAndReverse(text);
    return _stringToCp864Bytes(reshaped);
  }

  List<int> _stringToCp864Bytes(String text) {
    final Map<int, int> cp864Map = {
      0x0621: 0x91, 0x0622: 0x92, 0x0623: 0x93, 0x0624: 0x94, 0x0625: 0x95, 0x0626: 0x96, 0x0627: 0x97,
      0x0628: 0x98, 0x0629: 0x99, 0x062A: 0x9A, 0x062B: 0x9B, 0x062C: 0x9C, 0x062D: 0x9D, 0x062E: 0x9E,
      0x062F: 0x9F, 0x0630: 0xA0, 0x0631: 0xA1, 0x0632: 0xA2, 0x0633: 0xA3, 0x0634: 0xA4, 0x0635: 0xA5,
      0x0636: 0xA6, 0x0637: 0xA7, 0x0638: 0xA8, 0x0639: 0xA9, 0x063A: 0xAA, 0xFE8E: 0xC2, 0xFE8F: 0xC3,
      0xFE91: 0xC4, 0xFE92: 0xC5, 0xFE93: 0xC6, 0xFE95: 0xC7, 0xFE97: 0xC8, 0xFE99: 0xC9, 0xFE9B: 0xCA,
      0xFE9D: 0xCB, 0xFE9F: 0xCC, 0xFEA1: 0xCD, 0xFEA3: 0xCE, 0xFEA5: 0xCF, 0xFEA7: 0xD0, 0xFEA9: 0xD1,
      0xFEAB: 0xD2, 0xFEAD: 0xD3, 0xFEAF: 0xD4, 0xFEB1: 0xD5, 0xFEB3: 0xD6, 0xFEB5: 0xD7, 0xFEB7: 0xD8,
      0xFEB9: 0xD9, 0xFEBB: 0xDA, 0xFEBD: 0xDB, 0xFEBF: 0xDC, 0xFEC1: 0xDD, 0xFEC3: 0xDE, 0xFEC5: 0xDF,
      0xFEC7: 0xE0, 0xFEC9: 0xE1, 0xFECB: 0xE2, 0xFECD: 0xE3, 0xFECF: 0xE4, 0xFED1: 0xE5, 0xFED3: 0xE6,
      0xFED5: 0xE7, 0xFED7: 0xE8, 0xFED9: 0xE9, 0xFEDB: 0xEA, 0xFEDD: 0xEB, 0xFEDF: 0xEC, 0xFEE1: 0xED,
      0xFEE3: 0xEE, 0xFEE5: 0xEF, 0xFEE7: 0xF0, 0xFEE9: 0xF1, 0xFEEB: 0xF2, 0xFEED: 0xF3, 0xFEEF: 0xF4,
      0xFEF1: 0xF5, 0xFEF2: 0xF6, 0xFEF3: 0xF7, 0xFEF7: 0xF8, 0xFEF9: 0xF9, 0xFEFB: 0xFA, 0xFEFC: 0xFB,
    };

    List<int> bytes = [];
    for (int i = 0; i < text.length; i++) {
      int code = text.codeUnitAt(i);
      if (cp864Map.containsKey(code)) {
        bytes.add(cp864Map[code]!);
      } else if (code < 128) {
        bytes.add(code);
      }
    }
    return bytes;
  }

  String _reshapeAndReverse(String input) {
    if (input.isEmpty) return '';
    List<String> words = input.split(' ');
    List<String> result = [];
    for (var word in words) {
      if (RegExp(r'[\u0600-\u06FF]').hasMatch(word)) {
        String reshaped = _doReshape(word);
        result.add(reshaped.split('').reversed.join(''));
      } else { result.add(word); }
    }
    return result.reversed.join(' ');
  }

  String _doReshape(String word) {
    final Map<String, List<int>> glyphs = {
      'ا': [0x0627, 0x0627, 0xFE8E, 0xFE8E], 'ب': [0x0628, 0xFE8F, 0xFE91, 0xFE92],
      'ت': [0x062A, 0xFE95, 0xFE97, 0xFE98], 'ث': [0x062B, 0xFE99, 0xFE9B, 0xFE9C],
      'ج': [0x062C, 0xFE9D, 0xFE9F, 0xFEA0], 'ح': [0x062D, 0xFEA1, 0xFEA3, 0xFEA4],
      'خ': [0x062E, 0xFEA5, 0xFEA7, 0xFEA8], 'د': [0x062F, 0x062F, 0xFEAA, 0xFEAA],
      'ذ': [0x0630, 0x0630, 0xFEAC, 0xFEAC], 'ر': [0x0631, 0x0631, 0xFEAE, 0xFEAE],
      'ز': [0x0632, 0x0632, 0xFEB0, 0xFEB0], 'س': [0x0633, 0xFEB1, 0xFEB3, 0xFEB4],
      'ش': [0x0634, 0xFEB5, 0xFEB7, 0xFEB8], 'ص': [0x0635, 0xFEB9, 0xFEBB, 0xFEBC],
      'ض': [0x0636, 0xFEBD, 0xFEBF, 0xFEC0], 'ط': [0x0637, 0xFEC1, 0xFEC3, 0xFEC4],
      'ظ': [0x0638, 0xFEC5, 0xFEC7, 0xFEC8], 'ع': [0x0639, 0xFEC9, 0xFECB, 0xFECC],
      'غ': [0x063A, 0xFECD, 0xFECF, 0xFED0], 'ف': [0x0641, 0xFED1, 0xFED3, 0xFED4],
      'ق': [0x0642, 0xFED5, 0xFED7, 0xFED8], 'ك': [0x0643, 0xFED9, 0xFEDB, 0xFEDC],
      'ل': [0x0644, 0xFEDD, 0xFEDF, 0xFEE0], 'م': [0x0645, 0xFEE1, 0xFEE3, 0xFEE4],
      'ن': [0x0646, 0xFEE5, 0xFEE7, 0xFEE8], 'ه': [0x0647, 0xFEE9, 0xFEEB, 0xFEEC],
      'و': [0x0648, 0x0648, 0xFEEE, 0xFEEE], 'ي': [0x064A, 0xFEF1, 0xFEF3, 0xFEF4],
      'ى': [0x0649, 0x0649, 0xFEF0, 0xFEF0], 'ة': [0x0629, 0x0629, 0xFE94, 0xFE94],
    };

    StringBuffer sb = StringBuffer();
    for (int i = 0; i < word.length; i++) {
      String c = word[i];
      if (!glyphs.containsKey(c)) { sb.write(c); continue; }
      bool before = i > 0 && glyphs.containsKey(word[i-1]) && !'اأإآدذر زو ءة'.contains(word[i-1]);
      bool after = i < word.length - 1 && glyphs.containsKey(word[i+1]) && !'ء'.contains(word[i+1]);
      var g = glyphs[c]!;
      if (before && after) sb.write(String.fromCharCode(g[2]));
      else if (before) sb.write(String.fromCharCode(g[3]));
      else if (after) sb.write(String.fromCharCode(g[1]));
      else sb.write(String.fromCharCode(g[0]));
    }
    return sb.toString();
  }
}
