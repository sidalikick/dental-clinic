import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="glass sticky top-0 z-50 py-4 px-6 mb-8">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-xl text-white shadow-lg group-hover:scale-105 transition-transform">
            <Stethoscope size={28} />
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            عيادة ابتسامتك
          </span>
        </Link>
        
        {/* Links */}
        <div className="flex items-center gap-2 md:gap-4 text-sm font-semibold text-slate-600">
            <Link to="/" className="hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-slate-50">
              الرئيسية
            </Link>
            <Link to="/track" className="hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-slate-50">
              متابعة حجز
            </Link>
            <span className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></span>
            <div className="hidden md:flex gap-2">
                <Link to="/reception" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg transition-colors">
                  بوابة الاستقبال
                </Link>
                <Link to="/doctor" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg transition-colors">
                  بوابة الطبيب
                </Link>
            </div>
        </div>
      </div>
    </nav>
  );
}
