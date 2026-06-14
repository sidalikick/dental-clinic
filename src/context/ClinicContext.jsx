import React, { createContext, useContext, useState, useEffect } from 'react';
import { getClinicInfo } from '../utils/api';

const ClinicContext = createContext();

export const ClinicProvider = ({ children }) => {
  const [clinicInfo, setClinicInfo] = useState({
    name: 'عيادة الأسنان',
    logoUrl: '',
    address: '',
    workingHours: ''
  });
  const [loading, setLoading] = useState(true);

  const refreshClinicInfo = async () => {
    const info = await getClinicInfo();
    if (info) {
      setClinicInfo(info);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshClinicInfo();
  }, []);

  return (
    <ClinicContext.Provider value={{ clinicInfo, refreshClinicInfo, loading }}>
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};
