import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Search, Filter, Calendar, 
  Download, Printer, FileText, ChevronDown, XCircle, Globe, User
} from 'lucide-react';
import { getAppointments, getClinicInfo } from '../utils/api';

export default function History() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [clinicInfo, setClinicInfo] = useState(null);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    // Auth check - allow both reception and doctor
    const role = localStorage.getItem('role');
    if (role !== 'reception' && role !== 'doctor') {
      navigate('/');
    } else {
      const fetchData = async () => {
        try {
          const all = await getAppointments();
          setAppointments(all);
          const info = await getClinicInfo();
          setClinicInfo(info);
        } catch (err) {
          console.error("Error fetching history:", err);
        }
      };
      fetchData();
    }
  }, [navigate]);

  const filteredHistory = appointments.filter(app => {
    const matchSearch = app.patientName.includes(searchTerm) || app.phone.includes(searchTerm) || app.id.includes(searchTerm);
    const matchService = serviceFilter === 'all' || app.service === serviceFilter;
    const matchStatus = statusFilter === 'all' || app.status === statusFilter;
    
    // Date filtering
    let matchDate = true;
    if (dateFrom && app.date < dateFrom) matchDate = false;
    if (dateTo && app.date > dateTo) matchDate = false;
    
    return matchSearch && matchService && matchStatus && matchDate;
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
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return isoString;
    }
  };

  const handleBack = () => {
    const role = localStorage.getItem('role');
    if (role === 'doctor') {
      navigate('/doctor/dashboard');
    } else {
      navigate('/reception/dashboard');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-800 text-white shadow-lg p-4 sticky top-0 z-20 print:hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack} 
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowRight size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">أرشيف الحجوزات والسجلات</h1>
              <p className="text-xs text-slate-400">البحث التاريخي المتقدم في قاعدة البيانات</p>
            </div>
          </div>
          
          <div className="flex gap-3">
             <button onClick={handlePrint} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-semibold">
               <Printer size={18} />
               <span className="hidden md:inline">طباعة الأرشيف</span>
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto p-6 w-full flex flex-col gap-6">
        
        {/* Advanced Filter Panel */}
        <div className="glass rounded-3xl p-6 shadow-xl border border-white/20 print:hidden">
          <div className="flex items-center gap-2 mb-6 text-slate-700">
            <Filter size={20} className="text-indigo-500" />
            <h2 className="font-bold">خيارات الفلترة المتقدمة</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Text Search */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 pr-1">البحث بالبيانات</label>
              <div className="relative">
                <Search size={18} className="absolute right-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="الاسم، الهاتف، الرقم..."
                  className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 shadow-sm outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-500 pr-1">نطاق التاريخ (من - إلى)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar size={16} className="absolute right-3 top-3.5 text-slate-400" />
                  <input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 shadow-sm outline-none focus:border-indigo-500 transition-all text-xs"
                  />
                </div>
                <div className="text-slate-300">/</div>
                <div className="relative flex-1">
                  <Calendar size={16} className="absolute right-3 top-3.5 text-slate-400" />
                  <input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 shadow-sm outline-none focus:border-indigo-500 transition-all text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Service & Status */}
            <div className="grid grid-cols-2 gap-3 lg:col-span-1">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 pr-1">الخدمة</label>
                  <select 
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm outline-none appearance-none cursor-pointer text-xs font-bold"
                  >
                    <option value="all">الكل</option>
                    <option>تنظيف أسنان</option>
                    <option>حشوات تجميلية</option>
                    <option>علاج عصب</option>
                    <option>تقويم أسنان</option>
                    <option>تبييض أسنان</option>
                    <option>زراعة أسنان</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 pr-1">الحالة</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm outline-none appearance-none cursor-pointer text-xs font-bold"
                  >
                    <option value="all">الكل</option>
                    <option>قيد المراجعة</option>
                    <option>مؤكد</option>
                    <option>منجز</option>
                    <option>ملغى</option>
                  </select>
               </div>
            </div>
          </div>
        </div>

        {/* History Results Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-12">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-indigo-500" />
              <span className="font-bold text-slate-700">نتائج الأرشيف</span>
              <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                {filteredHistory.length} سجل
              </span>
            </div>
            <div className="text-xs text-slate-400">شاشة عرض المعلومات التاريخية</div>
          </div>
          
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold border-b border-slate-100">
                  <th className="p-4 uppercase tracking-wider">الرقم المرجعي</th>
                  <th className="p-4">بيانات المريض</th>
                  <th className="p-4 print:hidden">مصدر الحجز</th>
                  <th className="p-4 print:hidden">نوع الحجز</th>
                  <th className="p-4 print:hidden">سعر العلاج</th>
                  <th className="p-4 text-center print:hidden">التاريخ الأساسي</th>
                  <th className="p-4">وقت التسجيل</th>
                  <th className="p-4">الحالة النهائية</th>
                  <th className="p-4 text-center print:hidden">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-12 text-center text-slate-400 font-medium">
                      لا توجد أية نتائج تطابق محددات البحث التاريخي.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((app) => (
                    <motion.tr 
                      layout
                      key={app.id} 
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-4 font-mono text-xs font-bold text-slate-400 group-hover:text-indigo-600">
                        #{app.id}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{app.patientName}</div>
                        <div className="text-xs text-slate-500 font-mono" dir="ltr">{app.phone}</div>
                      </td>
                      <td className="p-4 print:hidden">
                        {(app.bookingSource || app.source) === 'online' ? (
                          <span className="flex items-center gap-1 text-blue-500 text-xs font-bold">
                            <Globe size={14} /> أونلاين
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                            <User size={14} /> استقبال
                          </span>
                        )}
                      </td>
                      <td className="p-4 print:hidden">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${getServiceColor(app.service)}`}>
                          {app.service}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-700 print:hidden text-xs">{app.treatmentPrice || 0} د.ج</td>
                      <td className="p-4 text-center print:hidden">
                        <div className="text-xs font-extrabold text-slate-700">{app.date}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{app.time}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 inline-block">
                          {formatTime(app.createdAt)}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black ${
                          app.status === 'مؤكد' ? 'bg-green-100 text-green-700' :
                          app.status === 'ملغى' ? 'bg-red-100 text-red-700' :
                          app.status === 'منجز' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-4 text-center print:hidden">
                        {app.prescription ? (
                          <button
                            onClick={() => setSelectedApp(app)}
                            title="طباعة الوصفة الطبية"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                          >
                            <Printer size={12} />
                            طباعة الوصفة
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400">لا توجد نتائج.</div>
            ) : (
              filteredHistory.map((app) => (
                <div key={app.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400">#{app.id}</div>
                      <div className="font-bold text-slate-800">{app.patientName}</div>
                      <div className="text-xs text-slate-500 font-mono" dir="ltr">{app.phone}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-black ${
                      app.status === 'مؤكد' ? 'bg-green-100 text-green-700' :
                      app.status === 'منجز' ? 'bg-blue-100 text-blue-700' :
                      app.status === 'ملغى' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-400 block">الخدمة</span>
                      <span className="font-bold">{app.service}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-left">
                      <span className="text-slate-400 block">التاريخ</span>
                      <span className="font-bold">{app.date} | {app.time}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-slate-400 block">مصدر الحجز</span>
                      <span className="font-bold flex items-center gap-1">
                        {(app.bookingSource || app.source) === 'online' ? (
                          <><Globe size={12} className="text-blue-500" /> أونلاين</>
                        ) : (
                          <><User size={12} className="text-slate-400" /> استقبال</>
                        )}
                      </span>
                    </div>
                    {app.prescription && (
                      <div className="bg-slate-50 p-2 rounded-lg text-center">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="text-emerald-600 font-bold text-[10px] flex items-center gap-1 mx-auto"
                        >
                          <Printer size={12} />
                          طباعة الوصفة
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* Prescription Preview & Print Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col print:shadow-none print:w-full print:m-0 print-modal-box">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                  <Printer size={24} />
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-800">طباعة الوصفة الطبية</h3>
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
                header, footer, main, .print\\:hidden, #app, .modal-overlay {
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
                    <div className="pl-2 text-slate-800 min-h-[180px] flex flex-col gap-1 w-full">
                      {(selectedApp.prescription || '').split('\n').map((line, idx) => {
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

            {/* Screen Preview */}
            <div className="p-8 space-y-4 print:hidden">
              <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-6">
                <div className="text-primary font-serif italic font-extrabold text-2xl mb-2">Rx</div>
                <div className="font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedApp.prescription}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 flex justify-between items-center print:hidden">
              <button onClick={() => setSelectedApp(null)} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">
                إغلاق
              </button>
              <button 
                onClick={() => window.print()}
                className="px-8 py-2.5 font-bold bg-primary text-white hover:bg-primary/90 rounded-xl transition-all flex items-center gap-2"
              >
                <Printer size={16} />
                طباعة الآن
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
