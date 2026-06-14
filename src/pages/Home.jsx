import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, User, Phone, Stethoscope, ChevronLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { addAppointment } from '../utils/api';
import { getServices } from '../utils/api';

export default function Home() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [servicesList, setServicesList] = useState([]);
  const [formData, setFormData] = useState({
    patientName: '',
    phone: '',
    date: '',
    time: '10:00',
    service: 'كشف عام'
  });

  useEffect(() => {
    // Logic: If current time is >= 21:00, default date to tomorrow
    const now = new Date();
    const hours = now.getHours();
    let defaultDate = now.toISOString().split('T')[0];
    
    if (hours >= 21) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      defaultDate = tomorrow.toISOString().split('T')[0];
    }
    
    setFormData(prev => ({ ...prev, date: defaultDate }));
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getServices();
        if (data && data.length > 0) {
          setServicesList(data);
          setFormData(prev => ({ ...prev, service: data[0].name }));
        }
      } catch (err) {
        console.error('Error fetching services:', err);
      }
    };
    fetchServices();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Check max appointments limit for the selected date
      const maxRes = await fetch('/api/settings/max-appointments');
      const maxData = await maxRes.json();
      if (maxData && maxData.value) {
        const appsRes = await fetch('/api/appointments');
        const allApps = await appsRes.json();
        const dayCount = allApps.filter(a => a.date === formData.date && a.status !== 'ملغى').length;
        if (dayCount >= Number(maxData.value)) {
          alert('عذراً، تم الوصول للحد الأقصى للمواعيد في هذا اليوم. يرجى اختيار يوم آخر.');
          setIsSubmitting(false);
          return;
        }
      }

      const result = await addAppointment({ ...formData, bookingSource: 'online' });

      if (result.error || result.message) {
        alert(result.message || "حدث خطأ أثناء الحجز. حاول مرة أخرى.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      navigate(`/track/${result.id}`);
    } catch (err) {
      console.error("Error adding appointment:", err);
      alert("حدث خطأ أثناء الحجز. حاول مرة أخرى.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>

      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row items-center gap-12 z-10 w-full">
        
        {/* Right side - Hero Text */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            عيادة رائدة في طب الأسنان
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6 text-slate-800">
            ابتسامة صحية، <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-secondary to-primary">
              لحياة أكثر إشراقاً
            </span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-lg">
            احجز موعدك الآن بكل سهولة دون الحاجة لإنشاء حساب. احصل على رقم استمارة خاص بك لمتابعة حالة حجزك في أي وقت.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8 text-center text-sm font-semibold text-slate-700">
            <div className="glass p-4 rounded-2xl flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">
                <Stethoscope size={20} />
              </div>
              أطباء مختصون
            </div>
            <div className="glass p-4 rounded-2xl flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <Calendar size={20} />
              </div>
              مواعيد مرنة
            </div>
          </div>
        </motion.div>

        {/* Left side - Booking Form */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="glass-premium rounded-3xl p-8 relative overflow-hidden text-white border-t border-white/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/30 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/20 blur-2xl rounded-full translate-y-1/2 -translate-x-1/2"></div>
            
            <h2 className="text-2xl font-bold mb-2">حجز موعد سريع</h2>
            <p className="text-slate-400 text-sm mb-6">ادخل بياناتك فقط وسنصدر لك رقماً مرجعياً</p>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الاسم الكامل</label>
                <div className="relative">
                  <User size={18} className="absolute right-3 top-3 text-slate-400" />
                  <input required type="text" name="patientName" value={formData.patientName} onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="محمد عبدالله..." />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف</label>
                <div className="relative">
                  <Phone size={18} className="absolute right-3 top-3 text-slate-400" />
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} dir="ltr"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pr-4 pl-10 py-2.5 outline-none focus:border-primary text-right focus:ring-1 focus:ring-primary transition-all"
                    placeholder="05X XXX XXXX" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الوقت المفضل</label>
                <input required type="time" name="time" value={formData.time} onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 outline-none focus:border-primary transition-all shadow-md" />
              </div>
              
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-300 mb-1">الخدمة المطلوبة</label>
                <select name="service" value={formData.service} onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 outline-none focus:border-primary transition-all shadow-md">
                  {servicesList.length > 0 ? (
                    servicesList.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="كشف عام">كشف عام</option>
                      <option value="تنظيف أسنان">تنظيف أسنان</option>
                      <option value="تقويم أسنان">تقويم أسنان</option>
                      <option value="زراعة أسنان">زراعة أسنان</option>
                      <option value="تجميل وابتسامة">تجميل وابتسامة</option>
                    </>
                  )}
                </select>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full mt-4 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/30 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    تأكيد الحجز
                    <ChevronLeft size={20} />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
}
