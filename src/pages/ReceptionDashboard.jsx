import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, CheckCircle, XCircle, Printer, Filter, UserPlus, X, Users, Clock, UserCheck, Activity, DollarSign, TrendingUp, History, Monitor, ChevronLeftCircle, Globe, User, Ticket } from 'lucide-react';
import { getAppointments, getTodayAppointments, updateAppointmentStatus, addAppointment, callNextPatient, updatePaymentStatus, getServices, getClinicInfo } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReceptionDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Add Patient Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dbServices, setDbServices] = useState([]);
  const [dbPrices, setDbPrices] = useState({});
  const [newPatient, setNewPatient] = useState({
    patientName: '',
    phone: '',
    service: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    source: 'reception'
  });
  const [selectedAppForTicket, setSelectedAppForTicket] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null); // For prescription viewing/printing
  const [printMode, setPrintMode] = useState('report'); // 'report', 'ticket', or 'prescription'
  const [clinicInfo, setClinicInfo] = useState({ name: 'عيادة الأسنان' });

  useEffect(() => {
    const fetchInfo = async () => {
      const info = await getClinicInfo();
      if (info && info.name) {
        setClinicInfo(info);
        document.title = `${info.name} - الاستقبال`;
      }
    };
    fetchInfo();
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => {
      setSelectedAppForTicket(null);
      setPrintMode('report');
      document.body.classList.remove('ticket-mode');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Ensure printing happens AFTER state update
  useEffect(() => {
    if (selectedAppForTicket && printMode === 'ticket') {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [selectedAppForTicket, printMode]);

  useEffect(() => {
    // Check auth
    if (localStorage.getItem('role') !== 'reception') {
      navigate('/reception');
    } else {
      loadData();
      fetchPrices();
      
      // Auto-refresh every 5 seconds to sync with online bookings and doctor updates
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [navigate]);

  const fetchPrices = async () => {
    try {
      const data = await getServices();
      setDbServices(data);
      const priceMap = {};
      data.forEach(s => priceMap[s.name] = parseFloat(s.price));
      setDbPrices(priceMap);
      if (data.length > 0 && !newPatient.service) {
        setNewPatient(prev => ({...prev, service: data[0].name}));
      }
    } catch (err) {
      console.error("Error fetching services:", err);
    }
  };

  const loadData = async () => {
    try {
      const todayApps = await getTodayAppointments();
      setAppointments(todayApps);
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('role');
    navigate('/reception');
  };

  const changeStatus = async (id, newStatus) => {
    try {
      await updateAppointmentStatus(id, newStatus);
      loadData();
    } catch (err) {
      console.error("Error changing status:", err);
    }
  };

  const handlePayment = async (id, newStatus) => {
    try {
      await updatePaymentStatus(id, newStatus);
      loadData();
    } catch (err) {
      console.error("Error updating payment:", err);
    }
  };

  const handlePrint = () => {
    setPrintMode('report');
    document.body.classList.remove('ticket-mode');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleNext = async () => {
    try {
      const next = await callNextPatient();
      if (next) {
        loadData();
      } else {
        alert('لا توجد حجوزات مؤكدة قادمة في القائمة.');
      }
    } catch (err) {
      console.error("Error calling next:", err);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (newPatient.patientName && newPatient.phone) {
      try {
        const result = await addAppointment({ ...newPatient, source: 'reception' });
        
        if (result.error || result.message) {
          alert(result.message || "حدث خطأ أثناء إضافة المريض");
          return;
        }

        setIsModalOpen(false);
        const now = new Date();
        const defaultDate = now.toISOString().split('T')[0];

        setNewPatient({
          patientName: '',
          phone: '',
          service: dbServices[0]?.name || '',
          date: defaultDate,
          time: '10:00',
          source: 'reception'
        });
        loadData();
      } catch (err) {
        console.error("Error adding patient:", err);
        alert("حدث خطأ أثناء إضافة المريض");
      }
    }
  };

  const filteredApps = appointments.filter(app => {
    const matchSearch = app.patientName.includes(searchTerm) || app.phone.includes(searchTerm) || app.id.includes(searchTerm);
    const matchStatus = filterStatus === 'all' || app.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStats = () => {
    const total = appointments.length;
    const confirmed = appointments.filter(a => a.status === 'مؤكد').length;
    const waiting = appointments.filter(a => a.status === 'قيد المراجعة').length;
    const completedApps = appointments.filter(a => a.status === 'منجز');
    const completed = completedApps.length;
    
    // Revenue from completed
    let revenue = 0;
    let debts = 0;
    completedApps.forEach(app => {
      const price = (app.treatmentPrice !== null && app.treatmentPrice !== undefined && app.treatmentPrice !== '') 
        ? parseFloat(app.treatmentPrice) 
        : (dbPrices[app.service] || 0);
      if (app.paymentStatus === 'مدفوع') {
        revenue += price;
      } else {
        debts += price;
      }
    });
    
    // Most popular service
    const counts = appointments.reduce((acc, app) => {
      acc[app.service] = (acc[app.service] || 0) + 1;
      return acc;
    }, {});
    const popular = Object.entries(counts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'لا يوجد';

    return { total, confirmed, waiting, completed, revenue, debts, popular };
  };

  const stats = getStats();
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

  const handlePrintTicket = (app) => {
    setPrintMode('ticket');
    setSelectedAppForTicket(app);
    document.body.classList.add('ticket-mode');
  };

  const activeApps = filteredApps.filter(app => app.status !== 'منجز');
  const completedToday = filteredApps.filter(app => app.status === 'منجز');
  const [mobileTab, setMobileTab] = useState('active'); // 'active' or 'completed'

  return (
    <div className={`${printMode === 'ticket' ? 'print:min-h-0 print:bg-white' : 'min-h-screen bg-slate-50'} flex flex-col font-['Cairo']`}>
      {/* Header */}
      <header className={`bg-secondary text-white shadow-md p-4 sticky top-0 z-30 ${printMode === 'report' ? 'print:hidden' : 'print:hidden'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <span className="font-bold text-lg md:text-xl">{clinicInfo.name}</span>
            </div>
            <span className="hidden lg:inline font-medium opacity-90 text-sm">إدارة حجوزات العيادة</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => navigate('/reception/history')} 
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-2 md:px-4 md:py-2 rounded-lg transition-colors font-semibold text-xs md:text-sm border border-white/10"
              title="الأرشيف"
            >
              <History size={18} />
              <span className="hidden md:inline">الأرشيف</span>
            </button>
            <button 
              onClick={() => window.open('/display', '_blank')} 
              className="hidden sm:flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-100 p-2 md:px-4 md:py-2 rounded-lg transition-colors font-semibold text-xs md:text-sm border border-indigo-500/30"
            >
              <Monitor size={18} />
              <span className="hidden lg:inline">الشاشة</span>
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-200 p-2 md:px-4 md:py-2 rounded-lg transition-colors font-semibold text-xs md:text-sm border border-red-500/20">
              <LogOut size={18} />
              <span className="hidden md:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      <main className={`${printMode === 'ticket' ? 'print:hidden' : 'flex-1 print:hidden'} max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6 w-full`}>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 print:hidden">
          <div className="glass p-3 md:p-4 rounded-2xl flex items-center gap-3 md:gap-4 border-l-4 border-l-indigo-500">
            <div className="bg-indigo-500/10 p-2 md:p-3 rounded-xl text-indigo-600 hidden sm:block">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[10px] md:text-xs font-bold text-slate-400">المسجلين</div>
              <div className="text-lg md:text-2xl font-black text-slate-800">{stats.total}</div>
            </div>
          </div>
          <div className="glass p-3 md:p-4 rounded-2xl flex items-center gap-3 md:gap-4 border-l-4 border-l-green-500">
            <div className="bg-green-500/10 p-2 md:p-3 rounded-xl text-green-600 hidden sm:block">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="text-[10px] md:text-xs font-bold text-slate-400">المؤكدة</div>
              <div className="text-lg md:text-2xl font-black text-slate-800">{stats.confirmed}</div>
            </div>
          </div>
          <div className="glass p-3 md:p-4 rounded-2xl flex items-center gap-3 md:gap-4 border-l-4 border-l-amber-500">
            <div className="bg-amber-500/10 p-2 md:p-3 rounded-xl text-amber-600 hidden sm:block">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-[10px] md:text-xs font-bold text-slate-400">في المراجعة</div>
              <div className="text-lg md:text-2xl font-black text-slate-800">{stats.waiting}</div>
            </div>
          </div>
          <div className="glass p-3 md:p-4 rounded-2xl flex items-center gap-3 md:gap-4 border-l-4 border-l-blue-500">
            <div className="bg-blue-500/10 p-2 md:p-3 rounded-xl text-blue-600 hidden sm:block">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-[10px] md:text-xs font-bold text-slate-400">المدفوعات</div>
              <div className="text-sm md:text-xl font-black text-slate-800">{stats.revenue} دج</div>
            </div>
          </div>
          <div className="glass p-3 md:p-4 rounded-2xl flex items-center gap-3 md:gap-4 border-l-4 border-l-rose-500 col-span-2 lg:col-span-1">
            <div className="bg-rose-500/10 p-2 md:p-3 rounded-xl text-rose-600 hidden sm:block">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-[10px] md:text-xs font-bold text-slate-400">الديون</div>
              <div className="text-sm md:text-xl font-black text-rose-600">{stats.debts} دج</div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="glass rounded-2xl p-3 md:p-4 flex flex-col lg:flex-row gap-4 justify-between items-center print:hidden">
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 flex-1">
            <div className="relative flex-1">
              <Search size={18} className="absolute right-3 top-3 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2 outline-none focus:border-secondary transition-all text-sm text-slate-900 font-semibold"
                placeholder="ابحث بالاسم، الرقم..."
              />
            </div>
            <div className="relative flex-1 sm:max-w-[200px]">
              <Filter size={18} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2 outline-none focus:border-secondary transition-all appearance-none text-sm text-slate-900 font-bold"
              >
                <option value="all">كل الحالات</option>
                <option value="قيد المراجعة">قيد المراجعة</option>
                <option value="مؤكد">مؤكد</option>
                <option value="منجز">منجز</option>
                <option value="ملغى">ملغى</option>
              </select>
            </div>
          </div>
          
          <div className="flex w-full lg:w-auto gap-2 md:gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 lg:flex-none bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 font-semibold justify-center shadow-lg shadow-primary/20 text-sm"
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">مريض جديد</span>
              <span className="sm:hidden">إضافة</span>
            </button>
            <button 
              onClick={handleNext}
              className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 font-bold justify-center shadow-lg shadow-indigo-600/30 border-b-4 border-indigo-800 text-sm"
            >
              <ChevronLeftCircle size={18} />
              <span className="hidden sm:inline">نداء التالي</span>
              <span className="sm:hidden">التالي</span>
            </button>
            <button onClick={handlePrint} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 transition-colors font-semibold justify-center">
              <Printer size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden bg-white p-1 rounded-xl border border-slate-200 shadow-sm print:hidden">
          <button 
            onClick={() => setMobileTab('active')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mobileTab === 'active' ? 'bg-primary text-white shadow-md' : 'text-slate-500'}`}
          >
            <Users size={16} />
            القائمة النشطة ({activeApps.length})
          </button>
          <button 
            onClick={() => setMobileTab('completed')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mobileTab === 'completed' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500'}`}
          >
            <CheckCircle size={16} />
            المنجزين ({completedToday.length})
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Active Appointments Column */}
          <div className={`lg:col-span-3 space-y-4 ${mobileTab !== 'active' ? 'hidden md:block' : ''}`}>
            <div className="hidden md:flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="text-primary" size={20} />
                قائمة الانتظار والمراجعة
              </h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {activeApps.length} مريض
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                      <th className="p-4 font-bold text-center">الدور</th>
                      <th className="p-4 font-bold">المريض</th>
                      <th className="p-4 font-bold text-center">المصدر</th>
                      <th className="p-4 font-bold">الخدمة</th>
                      <th className="p-4 font-bold">الثمن</th>
                      <th className="p-4 font-bold">الحالة</th>
                      <th className="p-4 font-bold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeApps.length === 0 ? (
                      <tr><td colSpan="7" className="p-10 text-center text-slate-400 font-bold">لا توجد مواعيد نشطة حالياً.</td></tr>
                    ) : (
                      activeApps.map(app => (
                        <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-center">
                            <div className="text-lg font-black text-primary">#{app.queueNumber || '0'}</div>
                            <div className="text-[9px] text-slate-400 font-mono">{app.id}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-800">{app.patientName}</div>
                            <div className="text-[10px] text-slate-500 font-mono" dir="ltr">{app.phone}</div>
                          </td>
                          <td className="p-4 text-center">
                            {app.bookingSource === 'online' ? (
                              <div className="inline-flex flex-col items-center text-blue-500 relative">
                                <Globe size={16} />
                                <span className="text-[9px] font-bold">أونلاين</span>
                                {app.status === 'قيد المراجعة' && (
                                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="inline-flex flex-col items-center text-slate-400">
                                <User size={16} />
                                <span className="text-[9px] font-bold">استقبال</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getServiceColor(app.service)}`}>
                              {app.service}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="text-xs font-black text-indigo-600 font-mono">{app.treatmentPrice || 0} دج</div>
                            <div className="text-[9px] text-rose-500 font-bold">غير مدفوع</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black ${
                              app.status === 'مؤكد' ? 'bg-green-50 text-green-700' :
                              app.status === 'جاري الكشف' ? 'bg-indigo-600 text-white animate-pulse' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-center">
                              {app.status === 'قيد المراجعة' && (
                                <button onClick={() => changeStatus(app.id, 'مؤكد')} className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              <button onClick={() => handlePrintTicket(app)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors" title="طباعة التذكرة">
                                <Ticket size={16} />
                              </button>
                              {app.prescription && (
                                <button 
                                  onClick={() => {
                                    setPrintMode('prescription');
                                    setSelectedApp(app);
                                    setTimeout(() => window.print(), 100);
                                  }} 
                                  className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                                  title="طباعة الوصفة"
                                >
                                  <Printer size={16} />
                                </button>
                              )}
                              <button onClick={() => changeStatus(app.id, 'ملغى')} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors">
                                <XCircle size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View for Active */}
              <div className="md:hidden divide-y divide-slate-100">
                {activeApps.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 font-bold text-sm">لا توجد مواعيد نشطة.</div>
                ) : (
                  activeApps.map(app => (
                    <div key={app.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-black text-primary">#{app.queueNumber || '0'}</div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{app.patientName}</div>
                            <div className="text-[10px] text-slate-500 font-mono" dir="ltr">{app.phone}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          app.status === 'مؤكد' ? 'bg-green-50 text-green-700' :
                          app.status === 'جاري الكشف' ? 'bg-indigo-600 text-white animate-pulse' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-600">{app.service}</span>
                        <span className="font-black text-indigo-600">{app.treatmentPrice || 0} دج</span>
                      </div>
                      <div className="flex gap-2">
                        {app.status === 'قيد المراجعة' && (
                          <button onClick={() => changeStatus(app.id, 'مؤكد')} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-xs font-bold">تأكيد</button>
                        )}
                        <button onClick={() => handlePrintTicket(app)} className="flex-1 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                          <Ticket size={14} /> تذكرة
                        </button>
                        {app.prescription && (
                          <button 
                            onClick={() => {
                              setPrintMode('prescription');
                              setSelectedApp(app);
                              setTimeout(() => window.print(), 100);
                            }}
                            className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <Printer size={14} /> وصفة
                          </button>
                        )}
                        <button onClick={() => changeStatus(app.id, 'ملغى')} className="flex-1 py-2 bg-red-50 text-red-500 border border-red-100 rounded-lg text-xs font-bold">إلغاء</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Completed Appointments Sidebar */}
          <div className={`lg:col-span-1 space-y-4 ${mobileTab !== 'completed' ? 'hidden md:block' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="text-emerald-500" size={20} />
                المنجزين اليوم
              </h3>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {completedToday.length}
              </span>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-300px)] pr-1 custom-scrollbar">
              {completedToday.length === 0 ? (
                <div className="py-10 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100 text-slate-400 text-xs font-bold">
                  لم يتم إنهاء أي حالة بعد.
                </div>
              ) : (
                completedToday.map(app => (
                  <div key={app.id} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs font-black text-emerald-600">#{app.queueNumber}</div>
                      <div className={`text-[9px] font-black px-1.5 py-0.5 rounded ${app.paymentStatus === 'مدفوع' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {app.paymentStatus || 'غير مدفوع'}
                      </div>
                    </div>
                    <div className="font-bold text-slate-800 text-xs mb-1 truncate">{app.patientName}</div>
                    <div className="text-[10px] text-slate-500 flex justify-between items-center mb-2">
                      <span>{app.service}</span>
                      <span className="font-mono text-indigo-600 font-bold">{app.treatmentPrice || 0} دج</span>
                    </div>
                    <div className="flex gap-1">
                      {app.paymentStatus !== 'مدفوع' && (
                        <button 
                          onClick={() => handlePayment(app.id, 'مدفوع')} 
                          className="flex-1 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all text-[10px] font-black shadow-sm flex items-center justify-center gap-1"
                        >
                          <DollarSign size={10} />
                          دفع
                        </button>
                      )}
                      {app.prescription && (
                        <button 
                          onClick={() => {
                            setPrintMode('prescription');
                            setSelectedApp(app);
                            setTimeout(() => window.print(), 100);
                          }} 
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all text-[10px] font-black shadow-sm flex items-center justify-center gap-1"
                        >
                          <Printer size={10} />
                          وصفة
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/20"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-primary">
                  <UserPlus size={20} />
                  <h3 className="font-bold text-lg">تسجيل مريض جديد</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors p-1 hover:bg-slate-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddPatient} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-black text-slate-700 mr-1">اسم المريض</label>
                  <input 
                    required
                    type="text" 
                    placeholder="الاسم الكامل"
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm text-lg font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                    value={newPatient.patientName}
                    onChange={(e) => setNewPatient({...newPatient, patientName: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-black text-slate-700 mr-1">رقم الهاتف</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="05xxxxxxxx"
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm text-lg font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                      value={newPatient.phone}
                      onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-black text-slate-700 mr-1">الخدمة المطلوبة</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all shadow-sm text-lg font-bold text-slate-900 cursor-pointer pr-4 pl-10"
                        value={newPatient.service}
                        onChange={(e) => setNewPatient({...newPatient, service: e.target.value})}
                      >
                        <option value="" disabled>اختر الخدمة...</option>
                        {dbServices.map(s => (
                           <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronLeftCircle size={18} className="absolute left-3 top-4 text-slate-400 pointer-events-none -rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-2">
                  <div className="space-y-1">
                    <label className="text-sm font-black text-slate-700 mr-1 text-xs">تاريخ الموعد</label>
                    <input 
                      type="date"
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all shadow-sm text-lg font-bold text-slate-900"
                      value={newPatient.date}
                      onChange={(e) => setNewPatient({...newPatient, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-black text-slate-700 mr-1 text-xs">الوقت</label>
                    <input 
                      type="time" 
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all shadow-sm text-lg font-bold text-slate-900"
                      value={newPatient.time}
                      onChange={(e) => setNewPatient({...newPatient, time: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 px-5 py-3 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    إلغاء
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-5 py-3 font-bold bg-primary text-white hover:bg-primary/90 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    حفظ البيانات
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prescription A5 Print Layout (Selective display on print via media CSS) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A5 portrait;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, main, .print\\:hidden, #root > div > header, #root > div > main, .modal-overlay {
            background: none !important;
            display: none !important;
          }
          /* Show print container */
          .print\\:flex {
            display: flex !important;
          }
          .print-prescription-box {
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

      {selectedApp && printMode === 'prescription' && (
        <div className="hidden print:flex flex-col justify-between h-full w-full relative overflow-hidden p-8 font-sans print-prescription-box" style={{ direction: 'ltr', minHeight: '190mm' }}>
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

                <div className="text-right text-slate-800">
                  <h4 className="font-extrabold text-lg text-[#0093a8]">{clinicInfo?.doctorName || 'Oliver Wilson, M.D.'}</h4>
                  <p className="text-xs font-semibold text-[#0093a8] opacity-90">{clinicInfo?.specialty || 'Dentist'}</p>
                  <p className="text-xs font-bold text-[#0093a8] mt-2">{clinicInfo?.name || 'Borcelle Medical'}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{clinicInfo?.address || '123 Anywhere St. Any City'}</p>
                </div>
              </div>

              {/* Patient details */}
              <div className="grid grid-cols-3 gap-2 text-xs font-bold text-slate-700 border-t-2 border-[#0093a8] pt-4 mb-6">
                <div className="col-span-2 flex items-center gap-1">
                  <span className="text-[#0093a8] text-nowrap">Patient's Name:</span>
                  <span className="border-b border-[#0093a8]/50 flex-1 min-h-[1.2rem] text-slate-800 px-1 font-medium">{selectedApp.patientName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#0093a8]">Date:</span>
                  <span className="border-b border-[#0093a8]/50 flex-1 min-h-[1.2rem] text-slate-800 px-1 font-medium text-center font-mono">{selectedApp.date}</span>
                </div>
                <div className="col-span-3 flex items-center gap-1 mt-2">
                  <span className="text-[#0093a8]">Age:</span>
                  <span className="border-b border-[#0093a8]/50 w-24 min-h-[1.2rem] text-slate-800 px-1 font-medium text-center font-mono">{selectedApp.patientAge || '________'}</span>
                </div>
              </div>

              {/* Rx Section */}
              <div className="my-6">
                <div className="text-[#0093a8] font-serif italic font-extrabold text-3xl mb-4">Rx</div>
                <div className="font-mono text-sm pl-2 text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[180px]">
                  {selectedApp.prescription}
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
      )}

      {/* Ticket Template for Printing (56mm Thermal Printer Version - Black Text & Western Numerals) */}
      <div className={`${printMode === 'ticket' ? 'print:block' : 'hidden'} hidden print:bg-white print:text-black print:static`} dir="rtl">
        {selectedAppForTicket && (
          <div style={{ width: '56mm', margin: '0' }} className="print:p-1 flex flex-col items-center text-center overflow-hidden">
            <h2 className="text-base font-black leading-tight mb-1">{clinicInfo.name}</h2>
            <div className="text-[9px] border-y border-black w-full py-1 mb-2 font-bold">
              {new Date().toLocaleDateString('en-GB')} | {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
            
            <div className="mb-1 text-sm font-bold truncate w-full">{selectedAppForTicket.patientName}</div>
            
            <div className="w-full py-1 border-2 border-black mb-2 flex flex-col items-center">
              <div className="text-[9px] font-bold mb-0.5">رقم الدور</div>
              <div className="text-5xl font-black text-black leading-none">{selectedAppForTicket.queueNumber || '0'}</div>
            </div>

            <div className="text-[10px] font-bold mb-2">{selectedAppForTicket.service}</div>

            <div className="flex flex-col items-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + '/track/' + selectedAppForTicket.id)}`} 
                alt="QR" 
                className="w-20 h-20"
              />
              <div className="text-[9px] font-mono mt-1 font-bold">{selectedAppForTicket.id}</div>
            </div>
            <div className="w-full border-t border-dashed border-black mt-2 pt-1 mb-4"></div>
          </div>
        )}
      </div>

      {/* Daily Report Table Template (A4 Full Page) */}
      <div className={`${printMode === 'report' ? 'print:block' : 'hidden'} hidden print:p-10 print:bg-white`} dir="rtl">
        <div className="flex justify-between items-center mb-8 border-b-2 border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 mb-1">{clinicInfo.name}</h1>
            <p className="text-sm font-bold text-slate-500">كشف المراجعات اليومي | إدارة بوابة الاستقبال</p>
          </div>
          <div className="text-left font-bold text-slate-600">
            <div>التاريخ: {new Date().toLocaleDateString('en-GB')}</div>
            <div>الوقت: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <table className="w-full border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 text-right">رقم الدور</th>
              <th className="border border-slate-300 p-2 text-right">اسم المريض</th>
              <th className="border border-slate-300 p-2 text-right">رقم الهاتف</th>
              <th className="border border-slate-300 p-2 text-right">الخدمة</th>
              <th className="border border-slate-300 p-2 text-right text-indigo-600">الثمن (دج)</th>
              <th className="border border-slate-300 p-2 text-right">الحالة</th>
              <th className="border border-slate-300 p-2 text-right text-emerald-600">الدفع</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((app) => (
              <tr key={app.id} className="border-b border-slate-200">
                <td className="border border-slate-300 p-2 font-bold">#{app.queueNumber || '0'}</td>
                <td className="border border-slate-300 p-2 font-bold">{app.patientName}</td>
                <td className="border border-slate-300 p-2 font-mono text-xs">{app.phone}</td>
                <td className="border border-slate-300 p-2">{app.service}</td>
                <td className="border border-slate-300 p-2 font-bold text-indigo-700">{app.treatmentPrice || 0}</td>
                <td className="border border-slate-300 p-2 text-xs font-bold">{app.status}</td>
                <td className="border border-slate-300 p-2 text-xs font-black">{app.paymentStatus || 'غير مدفوع'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 grid grid-cols-3 gap-6 text-center">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-400 mb-1">إجمالي الحالات</div>
            <div className="text-xl font-black">{stats.total}</div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="text-xs font-bold text-emerald-600 mb-1">إجمالي المدفوعات</div>
            <div className="text-xl font-black text-emerald-700">{stats.revenue} دج</div>
          </div>
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
            <div className="text-xs font-bold text-rose-600 mb-1">إجمالي الديون</div>
            <div className="text-xl font-black text-rose-700">{stats.debts} دج</div>
          </div>
        </div>

        <div className="mt-20 flex justify-between px-10">
          <div className="text-center">
            <div className="w-40 border-b border-slate-400 mb-2"></div>
            <p className="text-sm font-bold text-slate-500">توقيع موظف الاستقبال</p>
          </div>
          <div className="text-center">
            <div className="w-40 border-b border-slate-400 mb-2"></div>
            <p className="text-sm font-bold text-slate-500">ختم العيادة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
