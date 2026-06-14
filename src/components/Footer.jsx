import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div>
          <h3 className="text-xl font-bold text-white mb-4">عيادة ابتسامتك</h3>
          <p className="mb-4 text-slate-400 leading-relaxed">
            نسعى لتقديم أفضل خدمات العناية بالأسنان والتجميل بأساليب حديثة وتقنيات متطورة لضمان راحتكم وابتسامتكم الساحرة.
          </p>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-white mb-4">ساعات العمل</h3>
          <ul className="space-y-2">
            <li className="flex justify-between border-b border-slate-700 pb-1">
              <span>الأحد - الخميس</span>
              <span className="text-primary font-medium">9:00 ص - 9:00 م</span>
            </li>
            <li className="flex justify-between border-b border-slate-700 pb-1">
              <span>السبت</span>
              <span className="text-primary font-medium">10:00 ص - 6:00 م</span>
            </li>
            <li className="flex justify-between pb-1">
              <span>الجمعة</span>
              <span className="text-red-400 font-medium">مغلق</span>
            </li>
          </ul>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-white mb-4">تواصل معنا</h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-primary" />
              <span dir="ltr">+966 50 123 4567</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-primary" />
              <span>info@ebtesamatk.com</span>
            </li>
            <li className="flex items-center gap-3">
              <MapPin size={18} className="text-primary" />
              <span>الرياض، طريق الملك فهد، مبنى 12</span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="text-center text-xs text-slate-500 mt-8 pt-4 border-t border-slate-800">
        جميع الحقوق محفوظة &copy; {new Date().getFullYear()} - عيادة ابتسامتك
      </div>
    </footer>
  );
}
