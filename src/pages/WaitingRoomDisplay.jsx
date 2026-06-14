import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, Monitor, QrCode as QrIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getTodayAppointments } from '../utils/api';
import { useClinic } from '../context/ClinicContext';

export default function WaitingRoomDisplay() {
  const { clinicInfo } = useClinic();
  const [currentPatient, setCurrentPatient] = useState(null);
  const [nextPatients, setNextPatients] = useState([]);
  const [waitCount, setWaitCount] = useState(0);
  const [tickerText, setTickerText] = useState('أهلاً بكم في عيادتنا');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoState, setVideoState] = useState('large');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [voices, setVoices] = useState([]);
  const lastCalledIdRef = useRef(null);

  // ----- Preload Speech Synthesis Voices -----
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // ----- Clinic info & ticker -----
  useEffect(() => {
    if (clinicInfo?.name) {
      setTickerText(`أهلاً بكم في ${clinicInfo.name}`);
      document.title = `${clinicInfo.name} - شاشة الانتظار`;
    }
  }, [clinicInfo]);

  const fetchTicker = async () => {
    try {
      const res = await fetch('/api/settings/ticker');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.value) setTickerText(data.value);
    } catch (e) {
      console.error('Ticker fetch error', e);
    }
  };

  const fetchVideo = async () => {
    try {
      const res = await fetch('/api/settings/video');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.value) setVideoUrl(data.value);
    } catch (e) {
      console.error('Video fetch error', e);
    }
  };

  // ----- Notification -----
  const announcePatient = (number) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(`رقم ${number}، تفضل بالدخول الآن`);
    
    const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    const arabic = currentVoices.find(v => 
      v.lang.toLowerCase().startsWith('ar') || 
      v.name.toLowerCase().includes('arabic') ||
      v.name.includes('العربية')
    );
    
    if (arabic) utter.voice = arabic;
    utter.lang = 'ar-SA';
    utter.rate = 0.85;
    utter.pitch = 1.1;
    window.speechSynthesis.speak(utter);
  };

  const playNotification = (number) => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().then(() => setTimeout(() => announcePatient(number), 1000)).catch(() => announcePatient(number));
    } catch (e) {
      announcePatient(number);
    }
  };

  // ----- Fetch appointments -----
  const fetchDataEnhanced = async () => {
    try {
      const todays = await getTodayAppointments();
      const current = todays.find(a => a.status === 'جاري الكشف');
      const waiting = todays.filter(a => 
        (a.status === 'مؤكد' || a.status === 'قيد المراجعة') && 
        a.id !== current?.id
      );

      setCurrentPatient(current);
      setWaitCount(waiting.length);
      setNextPatients([...waiting].sort((a, b) => (Number(a.queueNumber) || 0) - (Number(b.queueNumber) || 0)).slice(0, 6));

      if (current) {
        if (current.id !== lastCalledIdRef.current) {
          lastCalledIdRef.current = current.id;
          setVideoState('small');
          playNotification(current.queueNumber || '1');
        }
      } else {
        setVideoState('large');
      }
    } catch (e) {
      console.error('WaitingRoom fetch error', e);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // ----- Effects -----
  useEffect(() => {
    fetchDataEnhanced();
    fetchTicker();
    fetchVideo();
    const interval = setInterval(() => {
      fetchDataEnhanced();
      fetchTicker();
      fetchVideo();
    }, 5000);

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  // Return to large video after 30 seconds of a call
  useEffect(() => {
    if (currentPatient?.id) {
      setVideoState('small');
      const timer = setTimeout(() => {
        setVideoState('large');
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [currentPatient?.id]);

  // ----- Render -----
  return (
    <div className="min-h-screen bg-sky-50 text-slate-800 flex flex-col font-sans overflow-hidden relative">
      {/* Header */}
      <header className="h-20 flex items-center justify-between px-8 bg-white/90 backdrop-blur-md border-b border-sky-100 shadow-sm">
        <div className="flex items-center gap-4">
          {clinicInfo?.logoUrl && (
            <img src={clinicInfo.logoUrl} alt="logo" className="h-12 w-12 object-contain" />
          )}
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-sky-500">
            {clinicInfo?.name || 'العيادة'}
          </h1>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end text-blue-600 font-bold">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-sky-500" />
              <span className="text-2xl uppercase">{currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <span className="text-sm capitalize text-sky-600/70">
              {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          
          <button
            onClick={toggleFullScreen}
            className="p-3 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-full transition-all border border-sky-200 shadow-sm"
            title="ملء الشاشة"
          >
            <Monitor size={24} />
          </button>
        </div>
      </header>

      {/* Main area */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[360px] flex flex-col gap-4 p-4 bg-white border-r border-sky-100 shadow-sm">
          {/* 1. Current Patient Box */}
          <section className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center shadow-lg shadow-emerald-100 border-2 border-white/50">
            <span className="text-white/90 text-xs font-black uppercase tracking-widest mb-1">الرقم الحالي</span>
            <div className="text-7xl font-black text-white leading-none">
              {currentPatient?.queueNumber || '--'}
            </div>
          </section>

          {/* 2. Next Patient Box */}
          <section className="bg-gradient-to-br from-blue-500 to-sky-600 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center shadow-lg shadow-blue-100 border-2 border-white/50">
            <span className="text-white/90 text-xs font-black uppercase tracking-widest mb-1">المراجع القادم</span>
            <div className="text-7xl font-black text-white leading-none">
              {nextPatients[0]?.queueNumber || '--'}
            </div>
          </section>

          {/* 3. Total Waiting Box */}
          <section className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center shadow-lg shadow-indigo-100 border-2 border-white/50">
            <span className="text-white/90 text-xs font-black uppercase tracking-widest mb-1">عدد المنتظرين</span>
            <div className="text-7xl font-black text-white leading-none">
              {waitCount}
            </div>
          </section>

          <div className="flex-1"></div>

          {/* QR Code at the bottom */}
          <section className="flex flex-col items-center gap-2 p-4 bg-white rounded-3xl border border-sky-50 shadow-sm mt-auto mx-2">
            <QRCodeSVG value={window.location.origin} size={100} />
            <p className="text-[10px] text-sky-600 font-bold text-center leading-tight">
              امسح الكود <br/> لحجز موعد أونلاين
            </p>
          </section>
        </aside>

        {/* Video & number overlay */}
        <section className="flex-1 relative flex items-center justify-center">
          <div className="absolute inset-0 overflow-hidden">
            {videoUrl ? (
              <motion.div
                layout
                animate={{
                  width: videoState === 'small' ? '30%' : '100%',
                  height: videoState === 'small' ? '30%' : '100%',
                  borderRadius: videoState === 'small' ? '1.5rem' : '0',
                  opacity: videoState === 'small' ? 0.95 : 1,
                }}
                transition={{ type: 'spring', stiffness: 60, damping: 20 }}
                className="bg-black rounded-xl shadow-xl"
              >
                {(() => {
                  const yt = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
                  if (yt && yt[1]) {
                    const src = `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${yt[1]}`;
                    return <iframe src={src} className="w-full h-full" allow="autoplay" />;
                  }
                  return <video src={videoUrl} autoPlay muted loop className="w-full h-full object-cover" />;
                })()}
              </motion.div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center text-sky-200">
                <Monitor size={200} />
              </div>
            )}
          </div>

          {/* Giant number overlay */}
          <AnimatePresence mode="wait">
            {currentPatient && (
              <motion.div
                key={currentPatient.id}
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{
                  opacity: videoState === 'small' ? 1 : 0,
                  scale: videoState === 'small' ? 1 : 0.5,
                  y: videoState === 'small' ? 0 : 100,
                  x: 0,
                }}
                exit={{ opacity: 0, scale: 0.5, y: -50 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                className={`absolute z-50 flex flex-col items-center justify-center ${videoState === 'small' ? 'w-full h-full' : 'w-auto'}`}
              >
                <div className="bg-white/95 backdrop-blur-md p-12 rounded-[4rem] shadow-2xl border-[6px] border-blue-500 flex flex-col items-center gap-6 min-w-[500px]">
                  <span className="text-blue-600 font-black text-3xl uppercase tracking-[0.2em]">الدور الحالي</span>
                  <div className="text-[22rem] leading-[0.8] font-black text-blue-900 drop-shadow-sm py-4">
                    {currentPatient.queueNumber}
                  </div>
                  <div className="bg-blue-600 text-white px-16 py-5 rounded-3xl text-5xl font-black shadow-xl animate-bounce">
                    تفضل بالدخول
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer ticker */}
      <footer className="h-16 bg-blue-600 flex items-center overflow-hidden relative border-t border-blue-500 shadow-2xl">
        <div className="whitespace-nowrap animate-marquee text-white font-bold text-xl mx-4 tracking-wide">
          ✨ {tickerText} ✨ {tickerText} ✨ {tickerText}
        </div>
        <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-blue-600 to-transparent" />
        <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-blue-600 to-transparent" />
      </footer>

      {/* Inline keyframes */}
      <style>{`
        @keyframes marquee {0% {transform: translateX(100%);} 100% {transform: translateX(-100%);}}
        .animate-marquee {animation: marquee 30s linear infinite;}
      `}</style>
    </div>
  );
}
