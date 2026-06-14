import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, Clock, FileText, CheckCircle, Plus, Users, DollarSign, Activity, TrendingUp, XCircle, ChevronLeftCircle, Monitor, Printer, AlertCircle, Settings as SettingsIcon } from 'lucide-react';
import { getAppointments, getTodayAppointments, updateAppointmentNotes, callNextPatient, getPrescriptions, getClinicInfo, addPrescription } from '../utils/api';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [selectedApp, setSelectedApp] = useState(null);
  const [notes, setNotes] = useState('');
  const [patientHistory, setPatientHistory] = useState([]);
  const [showPrescription, setShowPrescription] = useState(false);
  const [prescription, setPrescription] = useState('');
  const [presets, setPresets] = useState([]);
  const [medForm, setMedForm] = useState({ medicine: '', dose: '', duration: '', notes: '' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDoseSuggestions, setShowDoseSuggestions] = useState(false);
  const [clinicInfo, setClinicInfo] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  
  // New filters
  const [activeTab, setActiveTab] = useState('waiting'); // 'waiting', 'completed'
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Check auth
    if (localStorage.getItem('role') !== 'doctor') {
      navigate('/doctor');
    } else {
      loadData();
    }
  }, [navigate]);

  const loadData = async () => {
    try {
      const todayApps = await getTodayAppointments();
      setAppointments(todayApps);
      const prs = await getPrescriptions();
      setPresets(prs || []);
      const info = await getClinicInfo();
      setClinicInfo(info);
    } catch (err) {
      console.error("Error loading appointments:", err);
    }
  };


  const handleNext = async () => {
    const next = await callNextPatient();
    if (next) {
      loadData();
    } else {
      alert('لا توجد حجوزات مؤكدة بانتظارك حالياً.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('role');
    navigate('/doctor');
  };

  const [price, setPrice] = useState(0);

  const openNotesModal = async (app) => {
    setSelectedApp(app);
    setNotes(app.notes || '');
    setPrescription(app.prescription || '');
    setPatientName(app.patientName || '');
    setPatientAge(app.patientAge || '');
    setPrice(app.treatmentPrice !== undefined && app.treatmentPrice !== null && Number(app.treatmentPrice) > 0 ? app.treatmentPrice : (prices[app.service] || 0));
    setShowPrescription(false);
    
    // Load patient history
    try {
      const all = await getAppointments();
      const history = all.filter(a => 
        a.id !== app.id && 
        a.patientName === app.patientName && 
        a.phone === app.phone &&
        a.status === 'منجز'
      );
      setPatientHistory(history);
    } catch (err) {
      console.error("Error loading patient history:", err);
    }
  };

  const saveNotes = async () => {
    if(selectedApp) {
      try {
        const nextStatus = selectedApp.status !== 'منجز' ? 'منجز' : selectedApp.status;
        await updateAppointmentNotes(selectedApp.id, notes, prescription, nextStatus, patientName, patientAge, price);
        setSelectedApp(null);
        loadData();
      } catch (err) {
        console.error("Error saving notes:", err);
        alert("حدث خطأ أثناء حفظ البيانات");
      }
    }
  };

  const handlePrintPrescription = () => {
    window.print();
  };

  const handleAddMedication = async (e) => {
    if (e) e.preventDefault();
    if (!medForm.medicine.trim()) return;

    const exists = presets.some(
      (p) => p.medicine.toLowerCase().trim() === medForm.medicine.toLowerCase().trim()
    );

    if (!exists) {
      try {
        const newPreset = {
          disease: selectedApp?.service || 'عام',
          medicine: medForm.medicine.trim(),
          dose: medForm.dose.trim(),
          duration: medForm.duration.trim(),
          age: 'الكل',
          notes: medForm.notes.trim()
        };
        await addPrescription(newPreset);
        const prs = await getPrescriptions();
        setPresets(prs || []);
      } catch (err) {
        console.error("Error auto-saving new medication template:", err);
      }
    }

    const cleanDose = medForm.dose
      .replace(/حبة/g, '')
      .replace(/مرات/g, '')
      .replace(/يومياً/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    let parts = [medForm.medicine.trim()];
    if (cleanDose) parts.push(cleanDose);
    if (medForm.duration) parts.push(`${medForm.duration}j`);
    if (medForm.notes) parts.push(`(${medForm.notes.trim()})`);

    const compactLine = parts.join(' - ');

    setPrescription((prev) => (prev ? `${prev}\n${compactLine}` : compactLine));
    setMedForm({ medicine: '', dose: '', duration: '', notes: '' });
    setShowSuggestions(false);
  };

  const waitingApps = appointments.filter(app => {
    const matchSearch = app.patientName.includes(searchTerm) || app.phone.includes(searchTerm);
    return matchSearch && (app.status === 'مؤكد' || app.status === 'جاري الكشف' || app.status === 'قيد الانتظار' || app.status === 'قيد المراجعة');
  });

  const completedApps = appointments.filter(app => {
    const matchSearch = app.patientName.includes(searchTerm) || app.phone.includes(searchTerm);
    return matchSearch && app.status === 'منجز';
  });

  const getServiceColor = (service) => {
    const services = {
      'تنظيف أسنان': 'bg-cyan-100 text-cyan-700 border-cyan-200',
      'حشوات تجميلية': 'bg-pink-100 text-pink-700 border-pink-200',
      'علاج عصب': 'bg-purple-100 text-purple-700 border-purple-200',
      'تقويم أسنان': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'تبييض أسنان': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'زراعة أسنان': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
    return services[service] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    // The API now returns date and time as TEXT. 
    // If we have an ISO string from createdAt, we format it.
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return isoString;
    }
  };

  // Doctor Stats Calculation
  const prices = {
    'تنظيف أسنان': 200,
    'حشوات تجميلية': 500,
    'علاج عصب': 1200,
    'تقويم أسنان': 5000,
    'تبييض أسنان': 1000,
    'زراعة أسنان': 3500,
  };

  const getDoctorStats = () => {
    const completedApps = appointments.filter(a => a.status === 'منجز');
    const confirmedApps = appointments.filter(a => a.status === 'مؤكد');
    
    const income = completedApps.reduce((sum, app) => sum + (prices[app.service] || 0), 0);
    const completedCount = completedApps.length;
    const pendingCount = confirmedApps.length;
    
    // Performance: Ratio of completed to total today (confirmed + completed)
    const totalToday = completedCount + pendingCount;
    const efficiency = totalToday > 0 ? Math.round((completedCount / totalToday) * 100) : 0;

    // Service Breakdown
    const serviceCounts = {};
    completedApps.forEach(a => {
      serviceCounts[a.service] = (serviceCounts[a.service] || 0) + 1;
    });
    const topService = Object.entries(serviceCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'لا يوجد';

    return { income, completedCount, pendingCount, efficiency, topService };
  };

  const stats = getDoctorStats();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white shadow-md p-4 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <span className="font-bold text-xl">بوابة الطبيب</span>
            </div>
            <div className="hidden md:flex flex-col border-r border-white/20 pr-4">
              <span className="text-xs opacity-70 font-bold">الوقت الحالي</span>
              <span className="font-mono text-sm font-bold">{currentTime.toLocaleTimeString('en-US', { hour12: false })}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleNext}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl transition-all active:scale-95 font-bold text-sm shadow-lg border border-emerald-400"
            >
              <ChevronLeftCircle size={18} />
              استدعاء التالي
            </button>
            <button 
              onClick={() => navigate('/reception/history')} 
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors font-semibold text-sm border border-white/10"
              title="الأرشيف والسجلات"
            >
              <FileText size={18} />
              <span className="hidden lg:inline">الأرشيف</span>
            </button>
            <button 
              onClick={() => window.open('/display', '_blank')} 
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors font-semibold text-sm border border-white/10"
              title="شاشة الانتظار"
            >
              <Monitor size={16} />
            </button>
            <button 
              onClick={() => navigate('/doctor/settings')} 
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors font-semibold text-sm border border-white/10"
              title="الإعدادات"
            >
              <SettingsIcon size={18} />
              <span className="hidden lg:inline">الإعدادات</span>
            </button>
            <button 
              onClick={() => navigate('/doctor/prescriptions')} 
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors font-semibold text-sm border border-white/10"
              title="قوالب الوصفات الطبية"
            >
              <FileText size={18} />
              <span className="hidden lg:inline">الوصفات الطبية</span>
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-100 px-4 py-2 rounded-lg transition-colors font-semibold text-sm border border-rose-500/20">
              <LogOut size={18} />
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto p-6 flex flex-col gap-6 w-full">
        
        {/* Doctor Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass p-5 rounded-3xl border-l-4 border-indigo-500 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">صافي أرباح العيادة (اليوم)</p>
                <h3 className="text-2xl font-black text-indigo-600 font-mono">{stats.income} <span className="text-sm">ريال</span></h3>
              </div>
              <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-600">
                <DollarSign size={22} />
              </div>
            </div>
          </div>
          
          <div className="glass p-5 rounded-3xl border-l-4 border-emerald-500 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">المرضى المنجزين</p>
                <h3 className="text-2xl font-black text-slate-800">{stats.completedCount}</h3>
              </div>
              <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600">
                <CheckCircle size={22} />
              </div>
            </div>
          </div>

          <div className="glass p-5 rounded-3xl border-l-4 border-amber-500 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">بانتظار الكشف</p>
                <h3 className="text-2xl font-black text-slate-800">{stats.pendingCount}</h3>
              </div>
              <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-600">
                <Users size={22} />
              </div>
            </div>
          </div>

          <div className="glass p-5 rounded-3xl border-l-4 border-rose-500 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">معدل الإنجاز</p>
                <h3 className="text-2xl font-black text-slate-800">{stats.efficiency}%</h3>
              </div>
              <div className="bg-rose-500/10 p-2.5 rounded-xl text-rose-600">
                <Activity size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="glass rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center print:hidden">
          <div className="flex w-full md:w-auto gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search size={20} className="absolute right-3 top-3 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-primary transition-all shadow-sm"
                placeholder="ابحث عن مريض..."
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Activity size={16} />
              <span className="text-xs font-bold text-nowrap">الخدمة الأكثر طلباً: {stats.topService}</span>
            </div>
            <div className="text-sm font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
              الانتظار: {waitingApps.length} | المنجزون: {completedApps.length}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit print:hidden">
          <button 
            onClick={() => setActiveTab('waiting')}
            className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'waiting' ? 'bg-white shadow-md text-primary' : 'text-slate-500 hover:text-slate-800'}`}
          >
            بانتظار الكشف ({waitingApps.length})
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'completed' ? 'bg-white shadow-md text-primary' : 'text-slate-500 hover:text-slate-800'}`}
          >
            المرضى المنجزون اليوم ({completedApps.length})
          </button>
        </div>

        {/* Section 1: Waiting List */}
        {activeTab === 'waiting' && (
          <div className="space-y-3">
            <h2 className="text-lg font-black text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              المرضى بانتظار الكشف ({waitingApps.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {waitingApps.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
                  لا توجد مواعيد بانتظار الكشف حالياً.
                </div>
              ) : (
                waitingApps.map((app) => (
                  <div key={app.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 transition-shadow hover:shadow-md">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-primary font-black text-2xl font-mono">#{app.queueNumber || '0'}</span>
                        <h3 className="font-bold text-lg text-slate-800">{app.patientName}</h3>
                        <div className="text-sm text-slate-500 dir-ltr mt-1 font-mono">{app.phone}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        app.status === 'جاري الكشف' ? 'bg-indigo-600 text-white animate-pulse' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {app.status === 'جاري الكشف' ? 'تحت الكشف الآن' : 'بانتظار الكشف'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">نوع الخدمة</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getServiceColor(app.service)}`}>
                          {app.service}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">ثمن العلاج</span>
                        <span className="font-bold text-slate-700">{prices[app.service] || 0} د.ج</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">موعد الحجز</span>
                        <span className="font-bold text-slate-700" dir="ltr">{app.date} / {app.time}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                        <span className="text-slate-400 text-xs">وقت التسجيل في النظام</span>
                        <span className="text-xs font-mono font-bold text-slate-400">{formatTime(app.createdAt)}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => openNotesModal(app)}
                      className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors bg-primary text-white hover:bg-primary/90"
                    >
                      <Plus size={18} /> كتابة الملاحظات الطبية
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Section 2: Completed List */}
        {activeTab === 'completed' && (
          <div className="space-y-3">
            <h2 className="text-lg font-black text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              المرضى المنجزون اليوم ({completedApps.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedApps.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
                  لا يوجد أي مريض منجز اليوم حتى الآن.
                </div>
              ) : (
                completedApps.map((app) => (
                  <div key={app.id} className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 bg-blue-50/30 transition-shadow hover:shadow-md">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-primary font-black text-2xl font-mono">#{app.queueNumber || '0'}</span>
                        <h3 className="font-bold text-lg text-slate-800">{app.patientName}</h3>
                        <div className="text-sm text-slate-500 dir-ltr mt-1 font-mono">{app.phone}</div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        مكتمل
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">نوع الخدمة</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getServiceColor(app.service)}`}>
                          {app.service}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">ثمن العلاج</span>
                        <span className="font-bold text-slate-700">{app.treatmentPrice !== undefined && app.treatmentPrice !== null ? app.treatmentPrice : (prices[app.service] || 0)} د.ج</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">موعد الحجز</span>
                        <span className="font-bold text-slate-700" dir="ltr">{app.date} / {app.time}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                        <span className="text-slate-400 text-xs">وقت التسجيل في النظام</span>
                        <span className="text-xs font-mono font-bold text-slate-400">{formatTime(app.createdAt)}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => openNotesModal(app)}
                      className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <CheckCircle size={18} /> عرض وتعديل الملاحظات
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* Notes & Medical History Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:w-full print:m-0 print-modal-box">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-800">الملف الطبي للمريض</h3>
                  <p className="text-slate-500 text-sm font-medium">{selectedApp.patientName} | {selectedApp.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <XCircle size={28} />
              </button>
            </div>

            {/* A5 print settings style */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                @page {
                  size: A5 portrait;
                  margin: 8mm;
                }
                body {
                  background: white;
                  color: black;
                }
                header, footer, main, .print\:hidden, .modal-overlay {
                  background: none !important;
                  display: none !important;
                }
                /* Show print container */
                .print\\:flex {
                  display: flex !important;
                }
                .print-modal-box {
                  position: absolute !important;
                  top: 0 !important;
                  left: 0 !important;
                  width: 100% !important;
                  height: 100% !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  border: none !important;
                  box-shadow: none !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
              }
            `}} />

            {/* A5 Prescription Layout for Print */}
            <div className="hidden print:flex flex-col justify-between h-full w-full relative overflow-hidden p-8 font-sans" style={{ direction: 'ltr', minHeight: '190mm' }}>
              
              {/* Watermark Logo/Cross */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none">
                {clinicInfo?.logoUrl ? (
                  <img src={clinicInfo.logoUrl} alt="" className="w-64 h-64 object-contain" />
                ) : (
                  <svg viewBox="0 0 200 200" className="w-64 h-64" fill="none" strokeWidth="8">
                    <path d="M100 30 v140 M30 100 h140" stroke="#0093a8" strokeWidth="24" />
                    <path d="M100 30 v140 M30 100 h140" stroke="#aee2e6" strokeWidth="12" />
                    <path d="M60 70 C40 80, 40 120, 70 140 C100 160, 130 150, 150 120" stroke="#0093a8" strokeWidth="8" />
                    <circle cx="150" cy="120" r="10" fill="#0093a8" />
                    <path d="M60 70 L50 60 C45 55, 45 45, 50 40" stroke="#0093a8" strokeWidth="6" />
                    <path d="M60 70 L70 60 C75 55, 75 45, 70 40" stroke="#0093a8" strokeWidth="6" />
                  </svg>
                )}
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between flex-1">
                <div>
                  {/* Header Section */}
                  <div className="flex justify-between items-start mb-6">
                    {/* Top Left: Logo */}
                    <div>
                      {clinicInfo?.logoUrl ? (
                        <img src={clinicInfo.logoUrl} alt="Logo" className="w-20 h-20 object-contain" />
                      ) : (
                        <svg viewBox="0 0 200 200" className="w-20 h-20" fill="none" strokeWidth="8">
                          <path d="M100 30 v140 M30 100 h140" stroke="#0093a8" strokeWidth="24" />
                          <path d="M100 30 v140 M30 100 h140" stroke="#aee2e6" strokeWidth="12" />
                          <path d="M60 70 C40 80, 40 120, 70 140 C100 160, 130 150, 150 120" stroke="#0093a8" strokeWidth="8" />
                          <circle cx="150" cy="120" r="10" fill="#0093a8" />
                          <path d="M60 70 L50 60 C45 55, 45 45, 50 40" stroke="#0093a8" strokeWidth="6" />
                          <path d="M60 70 L70 60 C75 55, 75 45, 70 40" stroke="#0093a8" strokeWidth="6" />
                        </svg>
                      )}
                    </div>

                    {/* Top Right: Doctor Info */}
                    <div className="text-right text-slate-800">
                      <h4 className="font-extrabold text-lg text-[#0093a8]">{clinicInfo?.doctorName || 'Oliver Wilson, M.D.'}</h4>
                      <p className="text-xs font-semibold text-[#0093a8] opacity-90">{clinicInfo?.specialty || 'Urologist'}</p>
                      <p className="text-xs font-bold text-[#0093a8] mt-2">{clinicInfo?.name || 'Borcelle Medical'}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{clinicInfo?.address || '123 Anywhere St. Any City'}</p>
                    </div>
                  </div>

                  {/* Patient info details with lines */}
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold text-slate-700 border-t-2 border-[#0093a8] pt-4 mb-6">
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="text-[#0093a8] text-nowrap">Patient's Name:</span>
                      <span className="border-b border-[#0093a8]/50 flex-1 min-h-[1.2rem] text-slate-800 px-1 font-medium">{patientName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[#0093a8]">Date:</span>
                      <span className="border-b border-[#0093a8]/50 flex-1 min-h-[1.2rem] text-slate-800 px-1 font-medium text-center font-mono">{selectedApp.date}</span>
                    </div>
                    <div className="col-span-3 flex items-center gap-1 mt-2">
                      <span className="text-[#0093a8]">Age:</span>
                      <span className="border-b border-[#0093a8]/50 w-24 min-h-[1.2rem] text-slate-800 px-1 font-medium text-center font-mono">{patientAge || '________'}</span>
                    </div>
                  </div>

                  {/* Rx Section */}
                  <div className="my-6">
                    <div className="text-[#0093a8] font-serif italic font-extrabold text-3xl mb-4">Rx</div>
                    <div className="pl-2 text-slate-800 min-h-[180px] flex flex-col gap-1 w-full">
                      {(prescription || '').split('\n').map((line, idx) => {
                        if (!line.trim()) return <div key={idx} className="h-3"></div>;
                        const arabicRegex = /([\u0600-\u06FF].*)/;
                        const match = line.match(arabicRegex);
                        if (match) {
                          const arabicPart = match[0].trim();
                          const rawNonArabic = line.substring(0, line.indexOf(arabicPart)).trim();
                          const nonArabicPart = rawNonArabic.endsWith('-') 
                            ? rawNonArabic.slice(0, -1).trim() 
                            : rawNonArabic;
                          return (
                            <div key={idx} className="flex justify-between items-baseline w-full text-xs border-b border-dashed border-slate-100 pb-0.5">
                              <span className="font-mono text-sm font-bold text-slate-800 whitespace-nowrap">{nonArabicPart}</span>
                              <span className="text-[9px] text-slate-500 font-sans whitespace-nowrap select-none" style={{ direction: 'rtl' }}>
                                {arabicPart}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div key={idx} className="text-sm font-mono font-bold text-slate-800 border-b border-dashed border-slate-100 pb-0.5 whitespace-nowrap">
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="border-t-2 border-[#0093a8]/30 pt-4 mt-auto flex justify-between items-end">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#0093a8]">Contact Number:</p>
                    <p className="text-sm font-black text-slate-800 font-mono">{clinicInfo?.phone || '+123-456-7890'}</p>
                  </div>
                  <div className="text-center w-40 border-t border-[#0093a8] pt-1">
                    <p className="text-[9px] font-bold text-[#0093a8]">Signature</p>
                  </div>
                </div>
              </div>
            </div>


            <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-8 print:hidden">
              {/* Left Column: Form */}
              <div className="flex-1 space-y-6 print:w-full">
                
                {/* Patient Editable Details */}
                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">الاسم واللقب</label>
                    <input 
                      type="text" 
                      value={patientName} 
                      onChange={(e) => setPatientName(e.target.value)} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">العمر</label>
                    <input 
                      type="text" 
                      value={patientAge} 
                      onChange={(e) => setPatientAge(e.target.value)} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-primary transition-all"
                      placeholder="مثال: 25 سنة"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">ثمن العلاج (د.ج)</label>
                    <input 
                      type="number" 
                      value={price} 
                      onChange={(e) => setPrice(e.target.value)} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="print:hidden">
                   <div className="flex bg-slate-100 p-1 rounded-xl mb-4 w-fit">
                      <button 
                        onClick={() => setShowPrescription(false)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!showPrescription ? 'bg-white shadow-md text-primary' : 'text-slate-500'}`}
                      >
                        الملاحظات الطبية
                      </button>
                      <button 
                        onClick={() => setShowPrescription(true)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${showPrescription ? 'bg-white shadow-md text-primary' : 'text-slate-500'}`}
                      >
                        وصفة طبية
                      </button>
                   </div>
                </div>

                {!showPrescription ? (
                  <div className="space-y-4">
                    <div className="print:block">
                      <label className="block text-sm font-bold text-slate-700 mb-2">التشخيص وخطة العلاج</label>
                      <textarea 
                        rows="8"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 outline-none focus:border-primary transition-all resize-none font-medium leading-relaxed"
                        placeholder="اكتب تفاصيل الزيارة، الإجراءات التي تمت، والتوصيات..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 print:block">
                    <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                      <TrendingUp size={16} className="text-primary" />
                      الوصفة الطبية (Rx)
                    </label>

                     <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 relative">
                      <span className="text-xs text-slate-500 font-bold block mb-1">إضافة دواء للوصفة (إكمال تلقائي):</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="اسم الدواء..."
                            value={medForm.medicine}
                            onChange={(e) => {
                              setMedForm({...medForm, medicine: e.target.value});
                              setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary transition-all font-semibold"
                          />
                          {showSuggestions && medForm.medicine.trim() !== '' && (
                            <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-[180px] overflow-y-auto z-50">
                              {presets
                                .filter(p => p.medicine.toLowerCase().includes(medForm.medicine.toLowerCase()))
                                .map((p, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={() => {
                                      setMedForm({
                                        medicine: p.medicine,
                                        dose: p.dose || '',
                                        duration: p.duration || '',
                                        notes: p.notes || ''
                                      });
                                      setShowSuggestions(false);
                                    }}
                                    className="w-full text-right px-3 py-2 text-xs hover:bg-slate-100 transition-colors border-b border-slate-50 last:border-0 font-semibold block"
                                  >
                                    {p.medicine}
                                  </button>
                                ))
                              }
                              {presets.filter(p => p.medicine.toLowerCase().includes(medForm.medicine.toLowerCase())).length === 0 && (
                                <div className="p-3 text-xs text-slate-400 text-center font-bold">
                                  دواء جديد (سيحفظ تلقائياً)
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="الجرعة (مثال: 1 حبة 3 مرات يومياً)"
                            value={medForm.dose}
                            onChange={(e) => {
                              setMedForm({...medForm, dose: e.target.value});
                              setShowDoseSuggestions(true);
                            }}
                            onFocus={() => setShowDoseSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowDoseSuggestions(false), 200)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary transition-all font-semibold"
                          />
                          {showDoseSuggestions && (
                            <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-[180px] overflow-y-auto z-50">
                              {[
                                "1 حبة 3 مرات يومياً بعد الأكل",
                                "1 حبة 3 مرات يومياً قبل الأكل",
                                "1 حبة مرتين يومياً بعد الأكل",
                                "1 حبة مرتين يومياً قبل الأكل",
                                "1 حبة يومياً بعد الأكل",
                                "1 حبة يومياً قبل الأكل",
                                "1 حبة عند الألم",
                                "مضمضة 3 مرات يومياً بعد الأكل",
                                "مضمضة مرتين يومياً بعد الأكل",
                                "2 حبة مرتين يومياً بعد الأكل",
                                "2 حبة مرتين يومياً قبل الأكل"
                              ]
                                .filter(d => d.includes(medForm.dose))
                                .map((d, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={() => {
                                      setMedForm({ ...medForm, dose: d });
                                      setShowDoseSuggestions(false);
                                    }}
                                    className="w-full text-right px-3 py-2 text-xs hover:bg-slate-100 transition-colors border-b border-slate-50 last:border-0 font-semibold block"
                                  >
                                    {d}
                                  </button>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <input 
                            type="text"
                            placeholder="المدة (أيام)"
                            value={medForm.duration}
                            onChange={(e) => setMedForm({...medForm, duration: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary transition-all font-semibold"
                          />
                        </div>
                        <div className="col-span-2 flex gap-2">
                          <input 
                            type="text"
                            placeholder="ملاحظات..."
                            value={medForm.notes}
                            onChange={(e) => setMedForm({...medForm, notes: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary transition-all font-semibold flex-1"
                          />
                          <button
                            type="button"
                            onClick={handleAddMedication}
                            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                          >
                            إضافة
                          </button>
                        </div>
                      </div>
                    </div>

                    <textarea 
                      rows="8"
                      className="w-full bg-blue-50/30 border-2 border-blue-100 rounded-2xl p-5 outline-none focus:border-primary transition-all resize-none font-mono text-blue-900 leading-relaxed"
                      placeholder="1. Amoxicillin 500mg - 3 times daily&#10;2. Paracetamol 500mg - When needed"
                      value={prescription}
                      onChange={(e) => setPrescription(e.target.value)}
                    ></textarea>
                  </div>
                )}
                
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 print:hidden">
                  <AlertCircle size={20} className="text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed font-medium">
                    سيتم حفظ هذه البيانات في سجل المريض الدائم. تأكد من مراجعة الملاحظات قبل الحفظ والإغلاق.
                  </p>
                </div>
              </div>

              {/* Right Column: History */}
              <div className="w-full md:w-80 space-y-4 print:hidden">
                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                  <Clock size={18} className="text-indigo-500" />
                  السجل التاريخي
                </h4>
                
                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {patientHistory.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-bold">لا توجد زيارات سابقة</p>
                    </div>
                  ) : (
                    patientHistory.map((h, i) => (
                      <div key={i} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:border-primary/30 transition-all group">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-slate-400">{h.date}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{h.service}</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-3 group-hover:line-clamp-none transition-all italic">
                          {h.notes || 'لا توجد ملاحظات'}
                        </p>
                        {h.prescription && (
                          <div className="mt-2 pt-2 border-t border-slate-50">
                             <p className="text-[10px] font-bold text-blue-500">الوصفة: {h.prescription}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-3">
                <button 
                  onClick={handlePrintPrescription}
                  className="px-6 py-2.5 font-bold bg-slate-800 text-white hover:bg-slate-700 rounded-xl transition-all flex items-center gap-2"
                >
                  طباعة الوصفة
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSelectedApp(null)} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">
                  تجاهل
                </button>
                <button onClick={saveNotes} className="px-8 py-2.5 font-bold bg-primary text-white hover:bg-primary/90 rounded-xl transition-all">
                  حفظ السجل وإنهاء الموعد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
