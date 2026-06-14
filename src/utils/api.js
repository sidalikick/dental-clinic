const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

export const getAppointments = async () => {
  const res = await fetch(`${API_URL}/appointments`);
  return res.json();
};

export const getTodayAppointments = async () => {
  const res = await fetch(`${API_URL}/appointments/today`);
  return res.json();
};

export const findAppointmentByRef = async (id) => {
  const res = await fetch(`${API_URL}/appointments/${id}`);
  if (res.status === 404) return null;
  return res.json();
};

export const findAppointmentsByPatient = async (name, phone) => {
  const res = await fetch(`${API_URL}/appointments/search/patient?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`);
  return res.json();
};

export const addAppointment = async (appData) => {
  const res = await fetch(`${API_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appData),
  });
  return res.json();
};

export const updateAppointmentStatus = async (id, status, paymentStatus) => {
  const res = await fetch(`${API_URL}/appointments/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, paymentStatus }),
  });
  return res.json();
};

export const updateAppointmentNotes = async (id, notes, prescription, status, patientName, patientAge, treatmentPrice, paymentStatus) => {
  const res = await fetch(`${API_URL}/appointments/${id}/clinical`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, prescription, status, patientName, patientAge, treatmentPrice, paymentStatus }),
  });
  return res.json();
};

export const callNextPatient = async () => {
  const res = await fetch(`${API_URL}/appointments/call-next`, {
    method: 'POST',
  });
  if (res.status === 404) return null;
  return res.json();
};

// Prescription Templates API Helpers
export const getPrescriptions = async () => {
  const res = await fetch(`${API_URL}/prescriptions`);
  return res.json();
};

export const addPrescription = async (data) => {
  const res = await fetch(`${API_URL}/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updatePrescription = async (id, data) => {
  const res = await fetch(`${API_URL}/prescriptions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deletePrescription = async (id) => {
  const res = await fetch(`${API_URL}/prescriptions/${id}`, {
    method: 'DELETE',
  });
  return res.json();
};

export const importPrescriptions = async (data) => {
  const res = await fetch(`${API_URL}/prescriptions/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  return res.json();
};

// Services API Helper
export const getServices = async () => {
  const res = await fetch(`${API_URL}/settings/services`);
  return res.json();
};

// Clinic Info Branding API Helpers
export const getClinicInfo = async () => {
  try {
    const res = await fetch(`${API_URL}/settings/clinic-info`);
    if (res.ok) return res.json();
    return null;
  } catch (err) {
    console.error("Error fetching clinic info:", err);
    return null;
  }
};

export const updateClinicInfo = async (info) => {
  const res = await fetch(`${API_URL}/settings/clinic-info`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(info),
  });
  return res.json();
};

// Payment Status (separate endpoint)
export const updatePaymentStatus = async (id, paymentStatus) => {
  const res = await fetch(`${API_URL}/appointments/${id}/payment`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentStatus }),
  });
  return res.json();
};
