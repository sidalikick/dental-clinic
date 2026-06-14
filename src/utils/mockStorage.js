export const initMockData = () => {
    if (!localStorage.getItem("appointments")) {
      localStorage.setItem("appointments", JSON.stringify([
        {
          id: "REF-12345",
          patientName: "أحمد بن محمد",
          phone: "0501234567",
          service: "تنظيف أسنان",
          date: "2026-04-20",
          time: "10:00",
          status: "مؤكد", // قيد المراجعة، مؤكد، ملغى، منجز
          notes: "",
          createdAt: new Date().toISOString(),
        }
      ]));
    }
  };
  
  export const getAppointments = () => {
    return JSON.parse(localStorage.getItem("appointments") || "[]");
  };
  
  export const addAppointment = (app) => {
    const apps = getAppointments();
    
    // Find how many appointments already exist for this SPECIFIC DATE
    const sameDayApps = apps.filter(a => a.date === app.date);
    const nextQueueNumber = sameDayApps.length + 1;

    const newApp = {
      ...app,
      id: `REF-${Math.floor(10000 + Math.random() * 90000)}`,
      queueNumber: nextQueueNumber,
      status: 'قيد الانتظار',
      notes: "",
      createdAt: new Date().toISOString()
    };
    apps.push(newApp);
    localStorage.setItem("appointments", JSON.stringify(apps));
    return newApp;
  };
  
  export const updateAppointmentStatus = (id, newStatus) => {
    const apps = getAppointments();
    const index = apps.findIndex(a => a.id === id);
    if (index > -1) {
      apps[index].status = newStatus;
      localStorage.setItem("appointments", JSON.stringify(apps));
      return apps[index];
    }
    return null;
  };

  export const updateAppointmentNotes = (id, newNotes) => {
    const apps = getAppointments();
    const index = apps.findIndex(a => a.id === id);
    if (index > -1) {
      apps[index].notes = newNotes;
      localStorage.setItem("appointments", JSON.stringify(apps));
      return apps[index];
    }
    return null;
  };
  
  export const findAppointmentByRef = (refId) => {
    const apps = getAppointments();
    return apps.find(a => a.id === refId) || null;
  };

  export const findAppointmentsByPatient = (name, phone) => {
    const apps = getAppointments();
    return apps.filter(a => a.patientName.includes(name) && a.phone === phone);
  };

  export const callNextPatient = () => {
    const apps = getAppointments();
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Find and complete any currently "In Treatment" patient for TODAY
    const currentIdx = apps.findIndex(a => a.status === 'جاري الكشف' && a.date === today);
    if (currentIdx > -1) {
      apps[currentIdx].status = 'منجز';
    }

    // 2. Find the first patient waiting for TODAY
    // Waiting statuses: 'مؤكد', 'قيد المراجعة', 'قيد الانتظار'
    const waitingStatuses = ['مؤكد', 'قيد المراجعة', 'قيد الانتظار'];
    
    const sortedApps = [...apps].sort((a, b) => {
      // Sort by queue number primarily for today
      return (a.queueNumber || 0) - (b.queueNumber || 0);
    });

    const nextPatient = sortedApps.find(a => 
      a.date === today && 
      waitingStatuses.includes(a.status)
    );

    if (nextPatient) {
      const actualIdx = apps.findIndex(a => a.id === nextPatient.id);
      apps[actualIdx].status = 'جاري الكشف';
      localStorage.setItem("appointments", JSON.stringify(apps));
      return apps[actualIdx];
    }

    localStorage.setItem("appointments", JSON.stringify(apps));
    return null;
  };
