import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, User, ChevronRight } from 'lucide-react';

export default function ReceptionLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.role === 'reception' || data.role === 'doctor') {
          localStorage.setItem('role', 'reception');
          localStorage.setItem('user', JSON.stringify(data));
          navigate('/reception/dashboard');
        } else {
          setError('عذراً، هذا الحساب ليس لديه صلاحيات الاستقبال');
        }
      } else {
        setError(data.message || 'بيانات الدخول غير صحيحة');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال بالسيرفر');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative p-6">
      <Link to="/" className="absolute top-6 right-6 flex items-center gap-1 text-slate-500 hover:text-primary transition-colors font-medium">
        <ChevronRight size={20} />
        العودة للرئيسية
      </Link>
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-secondary p-8 text-center text-white">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold">بوابة الاستقبال</h2>
          <p className="text-secondary-100 opacity-90 text-sm mt-2">تسجيل الدخول لإدارة حجوزات العيادة</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm font-medium border border-red-100 text-center">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">اسم المستخدم</label>
            <div className="relative">
              <User size={18} className="absolute right-3 top-3 text-slate-400" />
              <input type="text" 
                autoFocus
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                placeholder="أدخل اسم المستخدم" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock size={18} className="absolute right-3 top-3 text-slate-400" />
              <input type="password" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                placeholder="أدخل كلمة المرور" />
            </div>
          </div>
          
          <button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 mt-4">
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
}
