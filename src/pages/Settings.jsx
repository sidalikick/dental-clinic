import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  UserPlus, 
  ShieldCheck, 
  Megaphone, 
  Save, 
  Trash2, 
  Users, 
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Video,
  Palette,
  Image as ImageIcon,
  Stethoscope,
  CalendarDays,
  Database,
  Download,
  TrendingUp,
  Smartphone,
  QrCode,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getServices } from '../utils/api';
import ClinicAnalytics from '../components/ClinicAnalytics';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE = '/api';

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ticker');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // States for sections
  const [tickerText, setTickerText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'reception', fullName: '' });
  const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [clinicInfo, setClinicInfo] = useState({
    name: 'Cabinet Dentaire Dr. BOUYOUCEF SOFIANE',
    workingHours: '09:00 - 17:00',
    address: "Cité Frères Mernache (Tala larbaa) Tizi N'bechar / Sétif",
    mapsLink: '',
    phone: '0661 22 16 17',
    logoUrl: '',
    facebook: '',
    instagram: '',
    doctorName: 'Dr. BOUYOUCEF SOFIANE',
    specialty: 'Chirurgie Dentaire'
  });
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', price: '' });
  const [maxAppointments, setMaxAppointments] = useState('20');
  
  // Connection state
  const [serverIp, setServerIp] = useState('localhost');
  const [serverPort, setServerPort] = useState('5000');
  const [phonePath, setPhonePath] = useState('/reception');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchTicker();
    fetchVideo();
    fetchUsers();
    fetchClinicInfo();
    fetchServicesList();
    fetchMaxAppointments();
    fetchServerIp();
  }, []);

  const fetchServerIp = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/ip`);
      const data = await res.json();
      if (data && data.ip) {
        setServerIp(data.ip);
        setServerPort(data.port || '5000');
      }
    } catch (err) {
      console.error('Error fetching server IP:', err);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const fetchClinicInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/clinic-info`);
      const data = await res.json();
      if (data) setClinicInfo(data);
    } catch (err) {
      console.error('Error fetching clinic info:', err);
    }
  };

  const fetchTicker = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/ticker`);
      const data = await res.json();
      if (data) setTickerText(data.value);
    } catch (err) {
      console.error('Error fetching ticker:', err);
    }
  };

  const fetchVideo = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/video`);
      const data = await res.json();
      if (data && data.value) setVideoUrl(data.value);
    } catch (err) {
      console.error('Error fetching video:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleUpdateTicker = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/ticker`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: tickerText })
      });
      if (res.ok) showMessage('تم تحديث شريط الأخبار بنجاح');
    } catch (err) {
      showMessage('فشل تحديث شريط الأخبار', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVideo = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/video`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: videoUrl })
      });
      if (res.ok) showMessage('تم تحديث رابط الفيديو بنجاح');
    } catch (err) {
      showMessage('فشل تحديث رابط الفيديو', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        showMessage('تم إضافة المستخدم بنجاح');
        setNewUser({ username: '', password: '', role: 'reception', fullName: '' });
        fetchUsers();
      } else {
        const data = await res.json();
        showMessage(data.message || 'فشل إضافة المستخدم', 'error');
      }
    } catch (err) {
      showMessage('حدث خطأ أثناء إضافة المستخدم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (security.newPassword !== security.confirmPassword) {
      return showMessage('كلمتا المرور غير متطابقتين', 'error');
    }
    setLoading(true);
    try {
      const username = 'doctor'; // Since only doctor can access settings
      const res = await fetch(`${API_BASE}/settings/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          currentPassword: security.currentPassword, 
          newPassword: security.newPassword 
        })
      });
      if (res.ok) {
        showMessage('تم تغيير كلمة المرور بنجاح');
        setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        showMessage(data.message || 'فشل تغيير كلمة المرور', 'error');
      }
    } catch (err) {
      showMessage('حدث خطأ أثناء تغيير كلمة المرور', 'error');
    } finally {
      setLoading(false);
    }
  };



  const handleUpdateClinicInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/clinic-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinicInfo)
      });
      if (res.ok) {
        showMessage('تم تحديث بيانات وتصميم العيادة بنجاح');
      } else {
        showMessage('فشل تحديث بيانات العيادة', 'error');
      }
    } catch (err) {
      showMessage('حدث خطأ أثناء حفظ بيانات العيادة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchServicesList = async () => {
    try {
      const data = await getServices();
      setServices(data);
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  };

  const fetchMaxAppointments = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/max-appointments`);
      const data = await res.json();
      if (data) setMaxAppointments(data.value);
    } catch (err) {
      console.error('Error fetching max appointments:', err);
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService)
      });
      if (res.ok) {
        showMessage('تم إضافة الخدمة بنجاح');
        setNewService({ name: '', price: '' });
        fetchServicesList();
      } else {
        const data = await res.json();
        showMessage(data.message || 'فشل إضافة الخدمة', 'error');
      }
    } catch (err) {
      showMessage('حدث خطأ أثناء إضافة الخدمة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    try {
      const res = await fetch(`${API_BASE}/settings/services/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMessage('تم حذف الخدمة بنجاح');
        fetchServicesList();
      }
    } catch (err) {
      showMessage('فشل حذف الخدمة', 'error');
    }
  };

  const handleUpdateMaxAppointments = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/max-appointments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: maxAppointments })
      });
      if (res.ok) showMessage('تم تحديث حد المواعيد اليومي بنجاح');
      else showMessage('فشل تحديث حد المواعيد', 'error');
    } catch (err) {
      showMessage('حدث خطأ أثناء التحديث', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAllData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings/backup`);
      if (!res.ok) throw new Error('فشل جلب البيانات من الخادم');
      const data = await res.json();
      
      // Load xlsx dynamically
      const XLSX = await import('xlsx');
      
      // Create a workbook
      const wb = XLSX.utils.book_new();
      
      // 1. Appointments Sheet
      if (data.appointments && data.appointments.length > 0) {
        const appointmentsData = data.appointments.map(a => ({
          'رقم الموعد': a.id,
          'اسم المريض': a.patientName,
          'الهاتف': a.patientPhone,
          'العمر': a.patientAge,
          'الخدمة / العلاج': a.service,
          'تاريخ الحجز': a.date,
          'وقت الحجز': a.time,
          'حالة الموعد': a.status,
          'الرقم اليومي': a.queueNumber,
          'المبلغ المالي': a.treatmentPrice ? `${a.treatmentPrice} دج` : '0 دج',
          'حالة الدفع': a.paymentStatus,
          'مصدر الحجز': a.bookingSource === 'online' ? 'الموقع الإلكتروني' : 'الاستقبال',
          'ملاحظات الطبيب': a.notes || '',
          'الوصفة الطبية (Rx)': a.prescription || '',
          'تاريخ الإنشاء': new Date(a.createdAt).toLocaleString('ar-DZ')
        }));
        const wsApps = XLSX.utils.json_to_sheet(appointmentsData);
        XLSX.utils.book_append_sheet(wb, wsApps, 'المواعيد والزيارات');
      }

      // 2. Patients Sheet
      if (data.patients && data.patients.length > 0) {
        const patientsData = data.patients.map(p => ({
          'معرف المريض': p.id,
          'اسم المريض': p.name,
          'رقم الهاتف': p.phone,
          'العمر': p.age || '',
          'مصدر التسجيل': p.registrationSource === 'online' ? 'الموقع' : 'الاستقبال',
          'تاريخ التسجيل': new Date(p.createdAt).toLocaleString('ar-DZ')
        }));
        const wsPatients = XLSX.utils.json_to_sheet(patientsData);
        XLSX.utils.book_append_sheet(wb, wsPatients, 'قائمة المرضى');
      }

      // 3. Prescription Templates
      if (data.prescriptions && data.prescriptions.length > 0) {
        const prescriptionsData = data.prescriptions.map(p => ({
          'معرف الوصفة': p.id,
          'المرض / التشخيص': p.disease,
          'الدواء الموصوف': p.medicine,
          'الجرعة': p.dose || '',
          'المدة (أيام)': p.duration || '',
          'الفئة العمرية': p.age || '',
          'ملاحظات الاستخدام': p.notes || ''
        }));
        const wsPrescriptions = XLSX.utils.json_to_sheet(prescriptionsData);
        XLSX.utils.book_append_sheet(wb, wsPrescriptions, 'الوصفات الجاهزة');
      }

      // 4. Services
      if (data.services && data.services.length > 0) {
        const servicesData = data.services.map(s => ({
          'معرف الخدمة': s.id,
          'اسم الخدمة / العلاج': s.name,
          'السعر الافتراضي': `${s.price} دج`
        }));
        const wsServices = XLSX.utils.json_to_sheet(servicesData);
        XLSX.utils.book_append_sheet(wb, wsServices, 'الخدمات والأسعار');
      }

      // 5. Users
      if (data.users && data.users.length > 0) {
        const usersData = data.users.map(u => ({
          'رقم المستخدم': u.id,
          'اسم المستخدم (Login)': u.username,
          'الاسم الكامل': u.fullName,
          'الدور / الصلاحية': u.role === 'doctor' ? 'طبيب' : 'موظف استقبال'
        }));
        const wsUsers = XLSX.utils.json_to_sheet(usersData);
        XLSX.utils.book_append_sheet(wb, wsUsers, 'الحسابات والموظفين');
      }

      // 6. Clinic Info
      if (data.clinicInfo) {
        const infoData = [{
          'اسم العيادة': data.clinicInfo.name,
          'اسم الطبيب': data.clinicInfo.doctorName,
          'التخصص': data.clinicInfo.specialty,
          'أوقات العمل': data.clinicInfo.workingHours,
          'العنوان': data.clinicInfo.address,
          'الهاتف': data.clinicInfo.phone
        }];
        const wsInfo = XLSX.utils.json_to_sheet(infoData);
        XLSX.utils.book_append_sheet(wb, wsInfo, 'بيانات العيادة');
      }

      // Save file
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Dental_Clinic_Backup_${dateStr}.xlsx`);
      showMessage('تم تحميل النسخة الاحتياطية بنجاح ✓');
    } catch (err) {
      console.error(err);
      showMessage(err.message || 'فشل تصدير النسخة الاحتياطية', 'error');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/doctor/dashboard" className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowRight size={24} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
              <SettingsIcon className="text-primary" size={32} />
              إعدادات العيادة
            </h1>
            <p className="text-slate-500 mt-1">إدارة الموظفين والحماية وشاشة العرض</p>
          </div>
        </div>

        {message.text && (
          <div className={`flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 ${
            message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-bold">{message.text}</span>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('ticker')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'ticker' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Megaphone size={20} />
            شريط الأخبار
          </button>
          <button 
            onClick={() => setActiveTab('video')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'video' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Video size={20} />
            إعدادات شاشة العرض
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'users' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users size={20} />
            إدارة الموظفين
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'security' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck size={20} />
            الحماية والخصوصية
          </button>
          <button 
            onClick={() => setActiveTab('branding')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'branding' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Palette size={20} />
            تصميم وبيانات العيادة
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'services' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Stethoscope size={20} />
            الخدمات والأسعار
          </button>
          <button 
            onClick={() => setActiveTab('booking')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'booking' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CalendarDays size={20} />
            إعدادات الحجز
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'analytics' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TrendingUp size={20} />
            إحصائيات وتحليلات
          </button>
          <button 
            onClick={() => setActiveTab('phone')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'phone' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Smartphone size={20} />
            الاتصال بالهاتف
          </button>
          <button 
            onClick={() => setActiveTab('backup')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
              activeTab === 'backup' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Database size={20} />
            النسخ الاحتياطي (Excel)
          </button>
          <button 
            onClick={() => navigate('/doctor/prescriptions')}
            className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold bg-white text-slate-600 hover:bg-slate-50 transition-all border border-dashed border-slate-200"
          >
            <SettingsIcon size={20} className="text-emerald-500" />
            قائمة الوصفات الجاهزة
          </button>

        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white p-6 md:p-10 shadow-2xl shadow-slate-200/50 min-h-[600px]">
            
            {/* News Ticker Tab */}
            {activeTab === 'ticker' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                    <Megaphone size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">إعدادات شريط الأخبار</h2>
                    <p className="text-slate-500">النص الذي يظهر في أسفل شاشة قاعة الانتظار</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateTicker} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">نص الإعلان</label>
                    <textarea 
                      className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 min-h-[150px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg leading-relaxed"
                      placeholder="أدخل النص هنا..."
                      value={tickerText}
                      onChange={(e) => setTickerText(e.target.value)}
                    />
                  </div>
                  <button 
                    disabled={loading}
                    className="flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <Save size={20} />
                    {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                </form>
              </div>
            )}

            {/* Video Settings Tab */}
            {activeTab === 'video' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Video size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">إعدادات الفيديو</h2>
                    <p className="text-slate-500">الفيديو الذي يظهر في شاشة قاعة الانتظار</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateVideo} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">رابط الفيديو</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg"
                      placeholder="رابط يوتيوب أو مسار فيديو مباشر (MP4)"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                    />
                  </div>
                  <button 
                    disabled={loading}
                    className="flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <Save size={20} />
                    {loading ? 'جاري الحفظ...' : 'حفظ رابط الفيديو'}
                  </button>
                </form>
              </div>
            )}

            {/* User Management Tab */}
            {activeTab === 'users' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">إدارة الموظفين</h2>
                    <p className="text-slate-500">إضافة أطباء وموظفي استقبال جدد</p>
                  </div>
                </div>

                <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                  <div className="col-span-full mb-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <UserPlus size={18} className="text-primary" />
                      إضافة موظف جديد
                    </h3>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                      placeholder="مثال: د. أحمد علي"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم المستخدم</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      placeholder="Username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
                    <input 
                      type="password"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">الصلاحية</label>
                    <select 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    >
                      <option value="reception">موظف استقبال</option>
                      <option value="doctor">طبيب</option>
                    </select>
                  </div>
                  <div className="col-span-full">
                    <button 
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {loading ? 'جاري الإضافة...' : 'إضافة الموظف للنظام'}
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 px-2">
                    <Users size={18} className="text-primary" />
                    الموظفون المسجلون
                  </h3>
                  <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 text-slate-500 text-sm font-bold">
                        <tr>
                          <th className="px-6 py-4">الاسم الكامل</th>
                          <th className="px-6 py-4">اسم المستخدم</th>
                          <th className="px-6 py-4">الصلاحية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users.map(user => (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold">{user.fullName}</td>
                            <td className="px-6 py-4 text-slate-500">{user.username}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                user.role === 'doctor' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                              }`}>
                                {user.role === 'doctor' ? 'طبيب' : 'استقبال'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">الحماية والخصوصية</h2>
                    <p className="text-slate-500">تحديث كلمة مرور الطبيب وإعدادات الدخول</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="max-w-md space-y-6 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                  <div className="mb-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Lock size={18} className="text-primary" />
                      تغيير كلمة المرور
                    </h3>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور الحالية</label>
                    <input 
                      type="password"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={security.currentPassword}
                      onChange={(e) => setSecurity({...security, currentPassword: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور الجديدة</label>
                    <input 
                      type="password"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={security.newPassword}
                      onChange={(e) => setSecurity({...security, newPassword: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">تأكيد كلمة المرور</label>
                    <input 
                      type="password"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={security.confirmPassword}
                      onChange={(e) => setSecurity({...security, confirmPassword: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                  <button 
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <Palette size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">بيانات وتصميم الوصفة الطبية (A5)</h2>
                    <p className="text-slate-500">تعديل معلومات الهيدر، الطبيب، العنوان، وشعار العيادة للطباعة المخصصة</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Form */}
                  <form onSubmit={handleUpdateClinicInfo} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">اسم الطبيب (مثال: د. أحمد علي)</label>
                        <input 
                          type="text"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary text-base"
                          value={clinicInfo.doctorName || ''}
                          onChange={e => setClinicInfo({...clinicInfo, doctorName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">التخصص (مثال: طب وجراحة الأسنان)</label>
                        <input 
                          type="text"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary text-base"
                          value={clinicInfo.specialty || ''}
                          onChange={e => setClinicInfo({...clinicInfo, specialty: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">اسم العيادة / المؤسسة الطبية</label>
                      <input 
                        type="text"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary text-base"
                        value={clinicInfo.name || ''}
                        onChange={e => setClinicInfo({...clinicInfo, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">رابط شعار العيادة (Logo URL)</label>
                      <input 
                        type="text"
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary text-sm"
                        value={clinicInfo.logoUrl || ''}
                        onChange={e => setClinicInfo({...clinicInfo, logoUrl: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">رقم الهاتف (الظاهر أسفل الوصفة)</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary text-left text-sm"
                          dir="ltr"
                          value={clinicInfo.phone || ''}
                          onChange={e => setClinicInfo({...clinicInfo, phone: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">أوقات العمل</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary text-sm"
                          value={clinicInfo.workingHours || ''}
                          onChange={e => setClinicInfo({...clinicInfo, workingHours: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">العنوان الجغرافي للعيادة</label>
                      <input 
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary text-sm"
                        value={clinicInfo.address || ''}
                        onChange={e => setClinicInfo({...clinicInfo, address: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">صفحة Facebook (رابط)</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary text-left text-sm"
                          dir="ltr"
                          value={clinicInfo.facebook || ''}
                          onChange={e => setClinicInfo({...clinicInfo, facebook: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">صفحة Instagram (رابط)</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary text-left text-sm"
                          dir="ltr"
                          value={clinicInfo.instagram || ''}
                          onChange={e => setClinicInfo({...clinicInfo, instagram: e.target.value})}
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-bold px-10 py-3 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 mt-4"
                    >
                      <Save size={18} />
                      {loading ? 'جاري الحفظ...' : 'حفظ إعدادات الهوية والتصميم'}
                    </button>
                  </form>

                  {/* A5 Prescription Live Preview */}
                  <div className="border border-slate-200 rounded-[2rem] p-6 bg-white shadow-sm flex flex-col justify-between max-w-[380px] w-full mx-auto min-h-[500px] relative overflow-hidden">
                    
                    {/* Watermark Logo/Cross */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none select-none">
                      {clinicInfo.logoUrl ? (
                        <img src={clinicInfo.logoUrl} alt="" className="w-48 h-48 object-contain" />
                      ) : (
                        <svg viewBox="0 0 200 200" className="w-48 h-48" fill="none" strokeWidth="8">
                          <path d="M100 30 v140 M30 100 h140" stroke="#0093a8" strokeWidth="24" />
                          <path d="M100 30 v140 M30 100 h140" stroke="#aee2e6" strokeWidth="12" />
                          <path d="M60 70 C40 80, 40 120, 70 140 C100 160, 130 150, 150 120" stroke="#0093a8" strokeWidth="8" />
                          <circle cx="150" cy="120" r="10" fill="#0093a8" />
                          <path d="M60 70 L50 60 C45 55, 45 45, 50 40" stroke="#0093a8" strokeWidth="6" />
                          <path d="M60 70 L70 60 C75 55, 75 45, 70 40" stroke="#0093a8" strokeWidth="6" />
                        </svg>
                      )}
                    </div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        {/* Header Section */}
                        <div className="flex justify-between items-start mb-6">
                          {/* Top Left: Logo */}
                          <div>
                            {clinicInfo.logoUrl ? (
                              <img src={clinicInfo.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                            ) : (
                              <svg viewBox="0 0 200 200" className="w-16 h-16" fill="none" strokeWidth="8">
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
                            <h4 className="font-extrabold text-base text-[#0093a8]">{clinicInfo.doctorName || 'Oliver Wilson, M.D.'}</h4>
                            <p className="text-xs font-semibold text-[#0093a8] opacity-90">{clinicInfo.specialty || 'Urologist'}</p>
                            <p className="text-xs font-bold text-[#0093a8] mt-2">{clinicInfo.name || 'Borcelle Medical'}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{clinicInfo.address || '123 Anywhere St. Any City'}</p>
                          </div>
                        </div>

                        {/* Patient info details with lines */}
                        <div className="grid grid-cols-3 gap-2 text-xs font-bold text-slate-700 border-t-2 border-[#0093a8] pt-4 mb-6">
                          <div className="col-span-2 flex items-center gap-1">
                            <span className="text-[#0093a8] text-nowrap">Patient's Name:</span>
                            <span className="border-b border-[#0093a8]/50 flex-1 min-h-[1.2rem] text-slate-800 px-1 font-medium">محمد بن علي</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[#0093a8]">Date:</span>
                            <span className="border-b border-[#0093a8]/50 flex-1 min-h-[1.2rem] text-slate-800 px-1 font-medium text-center font-mono">03/06/2026</span>
                          </div>
                          <div className="col-span-3 flex items-center gap-1 mt-2">
                            <span className="text-[#0093a8]">Age:</span>
                            <span className="border-b border-[#0093a8]/50 w-24 min-h-[1.2rem] text-slate-800 px-1 font-medium text-center font-mono">28 سنة</span>
                          </div>
                        </div>

                        {/* Rx Section */}
                        <div className="my-6">
                          <div className="text-[#0093a8] font-serif italic font-extrabold text-2xl mb-3">Rx</div>
                          <div className="font-mono text-xs pl-2 space-y-2 text-slate-800 leading-relaxed">
                            <p>1. Amoxicilline 500mg - 1 حبة 3 مرات يومياً - لمدة 7 أيام</p>
                            <p>2. Paracetamol 1g - عند الحاجة</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Section */}
                      <div className="border-t-2 border-[#0093a8]/30 pt-4 mt-auto flex justify-between items-end">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[#0093a8]">Contact Number:</p>
                          <p className="text-xs font-black text-slate-800 font-mono">{clinicInfo.phone || '+123-456-7890'}</p>
                        </div>
                        <div className="text-center w-32 border-t border-[#0093a8] pt-1">
                          <p className="text-[9px] font-bold text-[#0093a8]">Signature</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Services Management Tab */}
            {activeTab === 'services' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Stethoscope size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">إدارة الخدمات والأسعار</h2>
                    <p className="text-slate-500">تحديد أنواع العلاج المتوفرة وأسعارها الافتراضية</p>
                  </div>
                </div>

                <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 items-end">
                  <div className="col-span-full md:col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم الخدمة</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={newService.name}
                      onChange={(e) => setNewService({...newService, name: e.target.value})}
                      placeholder="مثال: خلع سن"
                    />
                  </div>
                  <div className="col-span-full md:col-span-1">
                    <label className="block text-sm font-bold text-slate-700 mb-2">السعر الافتراضي (دج)</label>
                    <input 
                      type="number"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={newService.price}
                      onChange={(e) => setNewService({...newService, price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-full md:col-span-1">
                    <button 
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {loading ? 'جاري الإضافة...' : 'إضافة خدمة'}
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 px-2">
                    <Stethoscope size={18} className="text-primary" />
                    قائمة الخدمات الحالية
                  </h3>
                  <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 text-slate-500 text-sm font-bold">
                        <tr>
                          <th className="px-6 py-4">اسم الخدمة</th>
                          <th className="px-6 py-4">السعر الافتراضي</th>
                          <th className="px-6 py-4 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {services.map(service => (
                          <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold">{service.name}</td>
                            <td className="px-6 py-4 text-indigo-600 font-black">{service.price} دج</td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => handleDeleteService(service.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Booking Settings Tab */}
            {activeTab === 'booking' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <CalendarDays size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">إعدادات الحجز والمواعيد</h2>
                    <p className="text-slate-500">التحكم في قيود الحجز والمواعيد اليومية</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateMaxAppointments} className="space-y-6">
                  <div className="max-w-md">
                    <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Users size={18} className="text-primary" />
                      الحد الأقصى للمواعيد في اليوم الواحد
                    </label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xl font-bold"
                        placeholder="20"
                        value={maxAppointments}
                        onChange={(e) => setMaxAppointments(e.target.value)}
                      />
                      <span className="text-slate-500 font-bold">موعد</span>
                    </div>
                    <p className="mt-4 text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <AlertCircle size={14} className="inline ml-1 text-amber-500" />
                      سيقوم النظام بمنع أي حجز جديد يتجاوز هذا العدد في اليوم الواحد، سواء كان الحجز من الموقع أو من قبل موظف الاستقبال.
                    </p>
                  </div>
                  <button 
                    disabled={loading}
                    className="flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <Save size={20} />
                    {loading ? 'جاري الحفظ...' : 'حفظ إعدادات الحجز'}
                  </button>
                </form>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <ClinicAnalytics />
              </div>
            )}

            {/* Phone Tab */}
            {activeTab === 'phone' && (
              <div className="space-y-8 animate-in fade-in duration-500" dir="rtl">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">الاتصال بالهاتف النقال</h2>
                    <p className="text-slate-500">امسح رمز الـ QR أو انسخ الرابط للتحكم بالنظام أو عرض شاشة الانتظار من الهاتف</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Explanation & Options */}
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <label className="block text-sm font-bold text-slate-700 mb-3">اختر الصفحة التي تريد فتحها على الهاتف:</label>
                      <select 
                        value={phonePath}
                        onChange={(e) => setPhonePath(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="/reception">لوحة تحكم موظف الاستقبال (Reception)</option>
                        <option value="/doctor">لوحة تحكم الطبيب (Doctor)</option>
                        <option value="/display">شاشة التلفزيون / قاعة الانتظار (TV Display)</option>
                        <option value="/">صفحة الحجز السريع للمرضى (Booking)</option>
                        <option value="/track">تتبع دور المريض في قاعة الانتظار (Tracking)</option>
                      </select>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 text-right">
                      <h3 className="font-bold text-slate-800 text-base">تعليمات الاتصال:</h3>
                      <ul className="text-sm text-slate-600 space-y-2 list-decimal list-inside pr-2 leading-relaxed">
                        <li>تأكد من أن الهاتف المحمول وجهاز الكمبيوتر متصلان بـ **نفس شبكة الواي فاي (Wi-Fi)**.</li>
                        <li>افتح تطبيق الكاميرا على هاتفك وقم بمسح **رمز الـ QR** المقابل.</li>
                        <li>أو اضغط على زر النسخ وأرسل الرابط لهاتفك مباشرة.</li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <input 
                        type="text" 
                        readOnly 
                        value={`http://${serverIp}:${serverPort}${phonePath}`}
                        className="flex-1 bg-transparent font-mono text-sm outline-none text-slate-600"
                        dir="ltr"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`http://${serverIp}:${serverPort}${phonePath}`);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${copiedLink ? 'bg-emerald-100 text-emerald-600' : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200'}`}
                        title="نسخ الرابط"
                      >
                        {copiedLink ? 'تم النسخ' : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center bg-slate-50 p-8 rounded-3xl border border-slate-100">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50">
                      <QRCodeSVG 
                        value={`http://${serverIp}:${serverPort}${phonePath}`} 
                        size={200}
                        bgColor="#ffffff"
                        fgColor="#0f172a"
                        level="Q"
                        includeMargin={false}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-400 mt-4 tracking-wider uppercase font-mono">http://{serverIp}:{serverPort}{phonePath}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Backup Tab */}
            {activeTab === 'backup' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <Database size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">النسخ الاحتياطي للبيانات</h2>
                    <p className="text-slate-500">تصدير جميع بيانات العيادة إلى ملف Excel (XLSX) لحفظها بأمان</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl mt-1 flex-shrink-0">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">تنبيه أمان وحفظ</h3>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        يحتوي ملف النسخة الاحتياطية على جميع جداول النظام: المواعيد وتفاصيل المرضى، الوصفات الطبية المخزنة، قائمة الخدمات والأسعار، والمستخدمين. يرجى الاحتفاظ بالملف في مكان آمن لضمان سرية معلومات المرضى.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-wrap gap-4">
                    <button 
                      onClick={handleExportAllData}
                      disabled={loading}
                      className="flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-extrabold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 text-base"
                    >
                      <Download size={20} />
                      {loading ? 'جاري التحضير والتصدير...' : 'تحميل النسخة الاحتياطية (Excel)'}
                    </button>
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
}

