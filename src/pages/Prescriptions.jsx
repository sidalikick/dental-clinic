import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Search, Plus, Edit2, Trash2, Download, 
  Upload, FileText, Database, Activity, Check, X, AlertCircle
} from 'lucide-react';
import { getPrescriptions, addPrescription, updatePrescription, deletePrescription, importPrescriptions } from '../utils/api';
import * as XLSX from 'xlsx';

export default function Prescriptions() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [diseaseFilter, setDiseaseFilter] = useState('all');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    disease: '',
    medicine: '',
    dose: '',
    duration: '',
    age: '',
    notes: ''
  });

  // Import preview states
  const [importData, setImportData] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    // Auth check
    const role = localStorage.getItem('role');
    if (role !== 'doctor') {
      navigate('/doctor');
    } else {
      loadData();
    }
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPrescriptions();
      setTemplates(data || []);
    } catch (err) {
      console.error('Error loading prescriptions:', err);
      showToast('حدث خطأ أثناء تحميل البيانات', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Diseases list for filters
  const uniqueDiseases = [...new Set(templates.map(t => t.disease))];

  const filteredTemplates = templates.filter(t => {
    const matchSearch = t.disease.includes(searchTerm) || 
                        t.medicine.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (t.notes || '').includes(searchTerm);
    const matchDisease = diseaseFilter === 'all' || t.disease === diseaseFilter;
    return matchSearch && matchDisease;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({ disease: '', medicine: '', dose: '', duration: '', age: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingId(t.id);
    setForm({
      disease: t.disease,
      medicine: t.medicine,
      dose: t.dose || '',
      duration: t.duration || '',
      age: t.age || '',
      notes: t.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه الوصفة الجاهزة؟')) return;
    try {
      await deletePrescription(id);
      showToast('تم حذف الوصفة بنجاح');
      loadData();
    } catch (err) {
      showToast('فشل حذف الوصفة', 'danger');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.disease || !form.medicine) {
      showToast('يرجى تحديد المرض والدواء على الأقل', 'danger');
      return;
    }

    try {
      if (editingId) {
        await updatePrescription(editingId, form);
        showToast('تم تعديل الوصفة الجاهزة بنجاح');
      } else {
        await addPrescription(form);
        showToast('تم إضافة الوصفة الجاهزة بنجاح');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showToast('حدث خطأ أثناء الحفظ', 'danger');
    }
  };

  // EXPORT EXCEL
  const handleExport = () => {
    if (templates.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'danger');
      return;
    }
    const data = templates.map(t => ({
      'المرض / التشخيص': t.disease,
      'اسم الدواء': t.medicine,
      'الجرعة': t.dose,
      'المدة (أيام)': t.duration,
      'الفئة العمرية': t.age,
      'ملاحظات إضافية': t.notes
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الوصفات الجاهزة');
    XLSX.writeFile(wb, 'قائمة_الوصفات_الطبية_الجاهزة.xlsx');
    showToast('تم تصدير ملف Excel بنجاح');
  };

  // IMPORT FILE
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processImportFile(file);
  };

  const processImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const ab = e.target.result;
        const wb = XLSX.read(ab, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) {
          showToast('الملف فارغ', 'danger');
          return;
        }
        setImportData(data);
      } catch (err) {
        showToast('فشل قراءة الملف، تأكد من الصيغة المعتمدة', 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    if (!importData) return;
    try {
      await importPrescriptions(importData);
      showToast(`تم استيراد ${importData.length} وصفة جاهزة بنجاح`);
      setImportData(null);
      loadData();
    } catch (err) {
      showToast('فشل استيراد الوصفات', 'danger');
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['disease', 'medicine', 'dose', 'duration', 'age', 'notes'],
      ['التهاب اللثة', 'Amoxicilline 500mg', '1 حبة 3 مرات يومياً', '7', '18-30', 'بعد الأكل']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قالب_الوصفات');
    XLSX.writeFile(wb, 'قالب_استيراد_الوصفات.xlsx');
  };

  // Calculate Simple Stats
  const getStats = () => {
    const medCounts = {};
    templates.forEach(t => {
      medCounts[t.medicine] = (medCounts[t.medicine] || 0) + 1;
    });
    const topMeds = Object.entries(medCounts).sort((a,b) => b[1]-a[1]).slice(0, 3);
    return {
      total: templates.length,
      diseases: uniqueDiseases.length,
      topMeds
    };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg p-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/doctor/dashboard')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowRight size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Database size={22} className="text-emerald-400" />
                قاعدة بيانات الوصفات الجاهزة (Presets)
              </h1>
              <p className="text-xs text-slate-300">إدارة القوالب سريعة التعبئة للعيادة</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all">
              <Download size={16} /> تصدير Excel
            </button>
            <button onClick={handleOpenAdd} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-md shadow-emerald-500/20">
              <Plus size={16} /> إضافة وصفة نموذجية
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto p-6 w-full flex flex-col gap-6">
        {/* Toast Alert */}
        <AnimatePresence>
          {toast.show && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 ${
                toast.type === 'danger' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}
            >
              {toast.type === 'danger' ? <AlertCircle size={18} /> : <Check size={18} />}
              <span className="font-bold text-sm">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass p-5 rounded-3xl border-l-4 border-indigo-500 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 mb-1">إجمالي الوصفات النموذجية</h3>
            <p className="text-2xl font-black text-slate-800">{stats.total} وصفة</p>
          </div>
          <div className="glass p-5 rounded-3xl border-l-4 border-emerald-500 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 mb-1">عدد الأمراض المدعومة</h3>
            <p className="text-2xl font-black text-slate-800">{stats.diseases} تشخيص</p>
          </div>
          <div className="glass p-5 rounded-3xl border-l-4 border-amber-500 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 mb-1">الأدوية الأكثر تكراراً</h3>
            <div className="flex gap-2 mt-1">
              {stats.topMeds.map(([med, count], i) => (
                <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-lg font-semibold">{med} ({count})</span>
              ))}
              {stats.topMeds.length === 0 && <span className="text-slate-400 text-xs">—</span>}
            </div>
          </div>
        </div>

        {/* Filters and List */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sidebar Filters & Excel Import */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="glass p-6 rounded-3xl border border-slate-200/60 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Search size={18} className="text-primary" /> تصفية وبحث
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500">كلمة البحث</label>
                  <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="ابحث عن مرض أو دواء..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 mt-1 text-sm outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">التشخيص / المرض</label>
                  <select 
                    value={diseaseFilter} 
                    onChange={e => setDiseaseFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 mt-1 text-sm outline-none cursor-pointer"
                  >
                    <option value="all">الكل</option>
                    {uniqueDiseases.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Excel / CSV Drag and Drop Import */}
            <div className="glass p-6 rounded-3xl border border-slate-200/60 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Upload size={18} className="text-primary" /> استيراد سريع
              </h3>
              <div 
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => { e.preventDefault(); setIsDragOver(false); processImportFile(e.dataTransfer.files[0]); }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragOver ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'
                }`}
                onClick={() => document.getElementById('excel-file-input').click()}
              >
                <Upload className="mx-auto text-slate-400 mb-2" size={28} />
                <p className="text-xs font-bold text-slate-600">اسحب ملف Excel هنا أو انقر للاختيار</p>
                <input 
                  type="file" 
                  id="excel-file-input" 
                  accept=".xlsx,.xls,.csv" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                />
              </div>
              <button onClick={downloadTemplate} className="w-full text-center text-xs text-primary font-bold mt-3 hover:underline">
                ⬇️ تحميل قالب Excel للاستيراد
              </button>
            </div>
          </div>

          {/* Prescriptions Table */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {importData ? (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-800">معاينة البيانات المستوردة</h3>
                    <p className="text-xs text-slate-500">يرجى تأكيد إدراج {importData.length} سجل في قاعدة البيانات</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setImportData(null)} className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold text-xs transition-all">إلغاء</button>
                    <button onClick={confirmImport} className="bg-primary text-white px-5 py-2 rounded-xl font-bold text-xs transition-all">تأكيد الحفظ واستيراد الكل</button>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 font-bold border-b border-slate-100">
                        <th className="p-3">المرض</th>
                        <th className="p-3">الدواء</th>
                        <th className="p-3">الجرعة</th>
                        <th className="p-3">المدة</th>
                        <th className="p-3">العمر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.map((r, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="p-3 font-semibold">{r.disease || r.مرض}</td>
                          <td className="p-3 text-primary">{r.medicine || r.دواء}</td>
                          <td className="p-3">{r.dose || r.جرعة || '—'}</td>
                          <td className="p-3">{r.duration || r.مدة || '—'}</td>
                          <td className="p-3">{r.age || r.عمر || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-slate-50/50 p-4 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-700 text-sm">الوصفات المتاحة للعيادة ({filteredTemplates.length})</span>
                  <span className="text-xs text-slate-400">انقر لتعديل أو حذف أي وصفة نموذجية</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 text-xs font-bold border-b border-slate-100">
                        <th className="p-4">المرض / التشخيص</th>
                        <th className="p-4">الدواء المعتمد</th>
                        <th className="p-4">الجرعة المعتادة</th>
                        <th className="p-4">المدة والسن</th>
                        <th className="p-4">ملاحظات</th>
                        <th className="p-4 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="p-12 text-center text-slate-400">جاري تحميل البيانات...</td>
                        </tr>
                      ) : filteredTemplates.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-12 text-center text-slate-400">لا توجد نتائج تطابق معايير البحث.</td>
                        </tr>
                      ) : (
                        filteredTemplates.map((t) => (
                          <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{t.disease}</td>
                            <td className="p-4"><span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-100">{t.medicine}</span></td>
                            <td className="p-4 text-slate-600 text-xs">{t.dose || '—'}</td>
                            <td className="p-4 text-xs text-slate-500">
                              <div>المدة: {t.duration ? `${t.duration} أيام` : '—'}</div>
                              <div>السن: {t.age || '—'}</div>
                            </td>
                            <td className="p-4 text-xs text-slate-400 max-w-[200px] truncate" title={t.notes}>{t.notes || '—'}</td>
                            <td className="p-4 text-center">
                              <div className="flex gap-2 justify-center">
                                <button onClick={() => handleOpenEdit(t)} className="p-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors" title="تعديل"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(t.id)} className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors" title="حذف"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Add / Edit Prescription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl p-8"
          >
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-800">{editingId ? 'تعديل وصفة نموذجية' : 'إضافة وصفة نموذجية جديدة'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">المرض / التشخيص *</label>
                  <input 
                    type="text" 
                    required
                    value={form.disease} 
                    onChange={e => setForm({...form, disease: e.target.value})}
                    placeholder="مثال: خراج الأسنان"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">اسم الدواء *</label>
                  <input 
                    type="text" 
                    required
                    value={form.medicine} 
                    onChange={e => setForm({...form, medicine: e.target.value})}
                    placeholder="مثال: Augmentin 625mg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-600 block mb-1">الجرعة الموصى بها</label>
                  <input 
                    type="text" 
                    value={form.dose} 
                    onChange={e => setForm({...form, dose: e.target.value})}
                    placeholder="مثال: 1 حبة 3 مرات يومياً"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">المدة (أيام)</label>
                  <input 
                    type="number" 
                    value={form.duration} 
                    onChange={e => setForm({...form, duration: e.target.value})}
                    placeholder="7"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">الفئة العمرية (اختياري)</label>
                <input 
                  type="text" 
                  value={form.age} 
                  onChange={e => setForm({...form, age: e.target.value})}
                  placeholder="مثال: 18-30 سنة"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">ملاحظات أو توصيات خاصة</label>
                <textarea 
                  rows="3" 
                  value={form.notes} 
                  onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="مثال: يؤخذ بعد الطعام، يرجى التوقف في حال وجود تحسس..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-all text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">إلغاء</button>
                <button type="submit" className="bg-primary text-white px-7 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md active:scale-95">حفظ الوصفة</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
