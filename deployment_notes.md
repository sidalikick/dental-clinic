# دليل استضافة وتجهيز مشروع عيادة الأسنان (Dental Clinic System)

يحتوي هذا الملف على جميع المعلومات والبيانات الهامة الخاصة باستضافة وتشغيل المشروع أونلاين.

---

## 🔑 بيانات قاعدة البيانات (Supabase)
* **المزود:** [Supabase](https://supabase.com)
* **اسم المشروع:** `sidalikick's Project`
* **الموقع الجغرافي (Region):** Europe
* **كلمة المرور الخاصة بقاعدة البيانات:**
  ```text
  e!Vn.52K_JjjN!T
  ```
* **رابط الاتصال (Connection String URI) بعد التعديل:**
  ```text
  postgresql://postgres:e!Vn.52K_JjjN!T@db.bbjsftjapeuburorsymy.supabase.co:5432/postgres
  ```

---

## 🚀 إعدادات الاستضافة على (Render.com)
عند ربط مستودع GitHub الخاص بك بـ Render وإنشاء **Web Service** جديدة، استخدم الإعدادات التالية:

### ⚙️ الإعدادات الأساسية (Build & Start)
* **Environment / Runtime:** `Node`
* **Build Command:**
  ```bash
  npm install && npm run build
  ```
  *(يقوم بتثبيت الحزم وبناء واجهة React في مجلد `dist`)*
* **Start Command:**
  ```bash
  node server/launcher.js
  ```
  *(يقوم بتهيئة قاعدة البيانات تلقائياً وتشغيل التطبيق)*

### 🌐 المتغيرات البيئية (Environment Variables)
قم بإضافة المتغيرات التالية في إعدادات Render (تبويب Environment):

| اسم المتغير (Key) | القيمة (Value) | الوصف |
| :--- | :--- | :--- |
| `DATABASE_URL` | *رابط الاتصال من Supabase الموضح أعلاه* | للاتصال بقاعدة البيانات أونلاين |
| `NODE_ENV` | `production` | لتشغيل المشروع في وضع الإنتاج |
| `PORT` | `10000` (أو اتركه فارغاً ليقوم Render بتحديده تلقائياً) | المنفذ الذي يستمع إليه السيرفر |

---

## 🛠️ تشغيل المشروع محلياً (لو أردت الرجوع إليه)
* لتثبيت الإضافات محلياً: قم بتشغيل الملف `Setup.bat` أو `Setup_Machine.bat`.
* لتشغيل المشروع محلياً: قم بتشغيل ملف `run_app.bat`.
* قاعدة البيانات المحلية الحالية:
  * **المضيف (Host):** `localhost`
  * **المنفذ (Port):** `5432`
  * **قاعدة البيانات (DB Name):** `dental_clinic`
  * **المستخدم (User):** `postgres`
  * **كلمة المرور المحلية (Local Pass):** `kick`
