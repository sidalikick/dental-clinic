import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import { Search, Download, CheckCircle, Clock, Calendar, Check, AlertCircle, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { findAppointmentByRef, findAppointmentsByPatient, getClinicInfo } from '../utils/api';

export default function PatientTracking() {
  const { refId } = useParams();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState(refId || '');
  const [searchPhone, setSearchPhone] = useState('');
  const [activeTab, setActiveTab] = useState('ref'); // 'ref' or 'info'
  
  const [foundApp, setFoundApp] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [clinic, setClinic] = useState(null);

  useEffect(() => {
    getClinicInfo().then(data => {
      if (data) {
        setClinic(data);
        document.title = `${data.name} - متابعة الحجز`;
      }
    });
  }, []);

  useEffect(() => {
    if (refId) {
      handleSearchByRef(refId);
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => handleSearchByRef(refId), 30000);
      return () => clearInterval(interval);
    }
  }, [refId]);

  const handleSearchByRef = async (id) => {
    try {
      const app = await findAppointmentByRef(id);
      if (app) {
        setFoundApp(app);
        setErrorMsg('');
      } else {
        setFoundApp(null);
        setErrorMsg('لم يتم العثور على حجز بهذا الرقم المرشعي.');
      }
    } catch (err) {
      console.error("Error searching by ref:", err);
      setErrorMsg('حدث خطأ أثناء البحث. حاول مرة أخرى.');
    }
  };

  const handleSearchByInfo = async () => {
    try {
      const apps = await findAppointmentsByPatient(searchQuery, searchPhone);
      if (apps && apps.length > 0) {
        setFoundApp(apps[0]); // Take the latest one
        setErrorMsg('');
      } else {
        setFoundApp(null);
        setErrorMsg('لم يتم العثور على أية حجوزات مطابقة للاسم ورقم الهاتف.');
      }
    } catch (err) {
      console.error("Error searching by info:", err);
      setErrorMsg('حدث خطأ أثناء البحث. حاول مرة أخرى.');
    }
  };

  const onSearch = (e) => {
    e.preventDefault();
    if (activeTab === 'ref') {
      if(searchQuery.trim() !== '') {
          navigate(`/track/${searchQuery}`);
          handleSearchByRef(searchQuery);
      }
    } else {
      handleSearchByInfo();
    }
  };

  const downloadPDF = () => {
    if (!foundApp) return;
    
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a5'
    });

    const clinicName = clinic?.name || 'عيادة الأسنان';
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header background
    doc.setFillColor(14, 165, 233);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Clinic name header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(clinicName, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Appointment Ticket', pageWidth / 2, 27, { align: 'center' });
    
    // Patient info section
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    let y = 50;
    
    doc.text('Ref ID:', 15, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.text(foundApp.id, 15, y + 7);
    
    y += 18;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text('Patient:', 15, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.text(foundApp.patientName, 15, y + 7);
    
    y += 18;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text('Phone:', 15, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.text(foundApp.phone, 15, y + 7);
    
    y += 18;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text('Date & Time:', 15, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.text(`${foundApp.date} / ${foundApp.time}`, 15, y + 7);
    
    y += 18;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text('Service:', 15, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.text(foundApp.service, 15, y + 7);
    
    // Queue number box
    y += 25;
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(1);
    doc.roundedRect(pageWidth / 2 - 30, y, 60, 35, 4, 4, 'S');
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(pageWidth / 2 - 29.5, y + 0.5, 59, 34, 3.5, 3.5, 'F');
    
    doc.setTextColor(3, 105, 161);
    doc.setFontSize(9);
    doc.text('Queue Number', pageWidth / 2, y + 10, { align: 'center' });
    doc.setFontSize(28);
    doc.setTextColor(2, 132, 199);
    doc.text(`#${foundApp.queueNumber || '0'}`, pageWidth / 2, y + 28, { align: 'center' });
    
    // Status
    y += 45;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text('Status:', 15, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.text(foundApp.status, 15, y + 7);
    
    doc.save(`Appointment_${foundApp.id}.pdf`);
  };

  const getStatusColor = (status) => {
    if (status === 'مؤكد') return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (status === 'ملغى') return 'text-red-500 bg-red-500/10 border-red-500/20';
    return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative min-h-screen">
      <Navbar />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-3">
            متابعة حالة الحجز
          </h2>
          <p className="text-slate-500">
            يمكنك الاستعلام عن حالة موعدك باستخدام الرقم المرجعي أو بياناتك الشخصية
          </p>
        </div>

        {/* Search Box */}
        <div className="glass rounded-2xl p-4 mb-10 mx-auto max-w-2xl shadow-xl print:hidden">
          <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
            <button 
              className={`pb-2 px-4 transition-colors font-semibold ${activeTab === 'ref' ? 'text-primary border-b-2 border-primary z-10' : 'text-slate-400 hover:text-slate-600'}`}
              onClick={() => setActiveTab('ref')}
            >
              بالرقم المرجعي
            </button>
            <button 
              className={`pb-2 px-4 transition-colors font-semibold ${activeTab === 'info' ? 'text-primary border-b-2 border-primary z-10' : 'text-slate-400 hover:text-slate-600'}`}
              onClick={() => setActiveTab('info')}
            >
              بالاسم ورقم الهاتف
            </button>
          </div>

          <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-4">
            {activeTab === 'ref' ? (
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="مثال: REF-12345" 
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all text-left dir-ltr"
                />
              </div>
            ) : (
              <>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="الاسم الكامل" 
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
                <div className="flex-1 relative">
                  <input 
                    type="tel" 
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    placeholder="رقم الهاتف" 
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all text-left dir-ltr"
                  />
                </div>
              </>
            )}
            <button type="submit" className="bg-primary hover:bg-primary/90 text-white p-3 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-md">
              <Search size={22} />
            </button>
          </form>
          {errorMsg && (
             <div className="mt-4 flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
               <AlertCircle size={18} />
               {errorMsg}
             </div>
          )}
        </div>

        {/* Results Area */}
        {foundApp && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100"
          >
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              
              <div className="flex-1 w-full space-y-6">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">الرقم المرجعي (Reference ID)</div>
                  <div className="text-2xl font-bold font-mono text-slate-800 bg-slate-100 inline-block px-4 py-1 rounded-lg border border-slate-200">
                    {foundApp.id}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">اسم المريض</div>
                    <div className="font-semibold text-lg text-slate-700">{foundApp.patientName}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">رقم الهاتف</div>
                    <div className="font-semibold text-lg text-slate-700 dir-ltr text-right">{foundApp.phone}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">الخدمة المطلوبة</div>
                    <div className="font-semibold text-lg text-slate-700">{foundApp.service}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">حالة الموعد</div>
                    <div className={`inline-flex flex-row items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(foundApp.status)}`}>
                      {foundApp.status === 'مؤكد' && <CheckCircle size={14} />}
                      {foundApp.status === 'قيد المراجعة' && <Clock size={14} />}
                      {foundApp.status}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100">
                  <div className="bg-white p-3 rounded-full shadow-sm text-primary">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-0.5">موعد الحجز</div>
                    <div className="font-bold text-slate-800">
                      {foundApp.date} <span className="mx-2 text-slate-300">|</span> الساعة {foundApp.time}
                    </div>
                  </div>
                </div>

                {foundApp.status !== 'منجز' && foundApp.status !== 'ملغى' && (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mb-8">
                    <div className="bg-gradient-to-r from-primary to-secondary px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white">
                        <Users size={20} />
                        <span className="font-bold">حالة الطابور المباشرة</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs text-white backdrop-blur-md">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        تحديث مباشر
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100">
                      {/* Your Number */}
                      <div className="p-8 text-center flex flex-col items-center justify-center bg-slate-50/50">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">رقمك الخاص</div>
                        <div className="text-5xl font-black text-secondary">#{foundApp.queueNumber}</div>
                        <div className="text-slate-500 text-xs mt-2">ترتيبك في حجز اليوم</div>
                      </div>
                      
                      {/* Current Number */}
                      <div className="p-8 text-center flex flex-col items-center justify-center bg-white">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">الرقم الحالي عند الطبيب</div>
                        <div className="text-5xl font-black text-primary">
                          {foundApp.currentActiveNumber ? `#${foundApp.currentActiveNumber}` : '--'}
                        </div>
                        <div className="text-slate-500 text-xs mt-2">
                          {foundApp.currentActiveNumber ? 'جاري الكشف عليه الآن' : 'لا يوجد مريض حالياً'}
                        </div>
                      </div>
                      
                      {/* Remaining Turns */}
                      <div className="p-8 text-center flex flex-col items-center justify-center bg-slate-50/50">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">المتبقي لدورك</div>
                        <div className="text-5xl font-black text-amber-500">
                          {foundApp.status === 'جاري الكشف' ? '0' : foundApp.waitingCount}
                        </div>
                        <div className="text-slate-500 text-xs mt-2">
                          {foundApp.status === 'جاري الكشف' ? 'أنت الآن عند الطبيب' : 'مرضى متبقون قبلك'}
                        </div>
                      </div>
                    </div>
                    
                    {foundApp.status === 'جاري الكشف' && (
                      <div className="bg-green-500 text-white text-center py-3 font-bold text-sm animate-pulse">
                        تفضل بالدخول إلى الطبيب الآن
                      </div>
                    )}
                  </div>
                )}
                
                {foundApp.notes && (
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 mt-4">
                    <div className="text-xs font-bold text-primary mb-1">ملاحظات الطبيب / الاستقبال</div>
                    <div className="text-sm text-slate-700">{foundApp.notes}</div>
                  </div>
                )}
              </div>

              <div className="w-full md:w-64 flex flex-col items-center border-t md:border-t-0 md:border-r border-slate-200 pt-8 md:pt-0 md:pr-8">
                <div className="text-slate-500 text-sm font-medium mb-4 text-center">رمز الاستجابة السريعة لموعدك</div>
                <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 mb-6">
                  <QRCodeSVG value={foundApp.id} size={150} level="H" fgColor="#1e293b" />
                </div>
                <button 
                  onClick={downloadPDF}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                >
                  <Download size={18} />
                  تحميل كملف PDF
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
