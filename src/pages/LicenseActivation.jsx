import { useState } from 'react';
import { ShieldCheck, Key, Laptop, AlertTriangle, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LicenseActivation({ machineId, onActivated }) {
  const [serialKey, setSerialKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleActivate = async (e) => {
    if (e) e.preventDefault();
    if (!serialKey) {
      setError('يرجى إدخال الرقم التسلسلي');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const baseUrl = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;
      const url = `${baseUrl}/api/license/activate`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialKey })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        onActivated();
      } else {
        setError(data.message || 'خطأ في قاعدة البيانات أثناء التفعيل');
      }
    } catch (err) {
      setError('تعذر الاتصال بالخادم. تأكد من تشغيل البرنامج بشكل صحيح.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-4 text-right selection:bg-blue-500/30" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#161d31] p-10 rounded-3xl shadow-2xl max-w-[450px] w-full border border-white/5 relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/10 blur-[100px] -z-10 rounded-full" />
        
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-150" />
            <div className="relative bg-[#1e293b] p-6 rounded-[2.5rem] border border-blue-500/20 shadow-inner">
              <ShieldCheck className="w-20 h-20 text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            </div>
          </div>
        </div>
        
        <h1 className="text-[2.5rem] font-black text-white text-center mb-4 tracking-tight">تفعيل البرنامج</h1>
        <p className="text-gray-400 text-center mb-10 leading-relaxed text-lg px-2">
          هذه النسخة غير مفعلة على هذا الجهاز. يرجى إرسال "رمز الجهاز" للمطور للحصول على الرقم التسلسلي.
        </p>

        <div className="space-y-8">
          {/* Machine ID Section */}
          <div className="relative group">
            <div className="flex items-center justify-between mb-3 px-1">
              <label className="flex items-center text-gray-400 text-sm font-medium">
                <Laptop className="w-4 h-4 ml-2 opacity-70" />
                رمز الجهاز (Machine ID)
              </label>
              <button 
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all duration-300 ${
                  copied ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                }`}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'تم النسخ' : 'نسخ الرمز'}
              </button>
            </div>
            <div 
              onClick={copyToClipboard}
              className="bg-[#0f172a] p-5 rounded-2xl border border-white/5 font-mono text-xl text-center text-blue-400/90 break-all cursor-pointer hover:border-blue-500/30 transition-all duration-300 shadow-inner group-hover:bg-[#0f172a]/80"
            >
              {machineId}
            </div>
          </div>

          {/* Serial Key Section */}
          <div>
            <label className="flex items-center text-gray-300 text-base font-bold mb-4 mr-1">
              <Key className="w-5 h-5 ml-2.5 text-blue-500" />
              الرقم التسلسلي (Serial Key)
            </label>
            <input
              type="text"
              value={serialKey}
              onChange={(e) => setSerialKey(e.target.value.toUpperCase())}
              placeholder="F60E-8F05-F087-27D5"
              className="w-full bg-[#0f172a] border border-white/5 rounded-2xl px-6 py-5 text-white text-center font-mono text-2xl focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:opacity-20"
              dir="ltr"
            />
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-center gap-3 text-red-400 bg-red-400/5 border border-red-400/10 p-5 rounded-2xl text-base font-medium">
                  <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            onClick={handleActivate}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 px-6 rounded-[1.25rem] transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_-10px_rgba(37,99,235,0.5)] active:scale-[0.98] text-xl"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري التحقق...</span>
              </div>
            ) : 'تفعيل البرنامج'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
