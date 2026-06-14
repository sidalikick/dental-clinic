import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PatientTracking from './pages/PatientTracking';
import ReceptionLogin from './pages/ReceptionLogin';
import ReceptionDashboard from './pages/ReceptionDashboard';
import DoctorLogin from './pages/DoctorLogin';
import DoctorDashboard from './pages/DoctorDashboard';
import History from './pages/History';
import WaitingRoomDisplay from './pages/WaitingRoomDisplay';
import Settings from './pages/Settings';
import Prescriptions from './pages/Prescriptions';

import { ClinicProvider } from './context/ClinicContext';

function App() {
  return (
    <ClinicProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Routes>
            {/* Public / Patient Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/track/:refId?" element={<PatientTracking />} />
            
            {/* Receptionist Routes */}
            <Route path="/reception" element={<ReceptionLogin />} />
            <Route path="/reception/dashboard" element={<ReceptionDashboard />} />
            <Route path="/reception/history" element={<History />} />
            
            {/* Doctor Routes */}
            <Route path="/doctor" element={<DoctorLogin />} />
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/settings" element={<Settings />} />
            <Route path="/doctor/prescriptions" element={<Prescriptions />} />
            {/* TV Display Route */}
            <Route path="/display" element={<WaitingRoomDisplay />} />
          </Routes>
        </div>
      </Router>
    </ClinicProvider>
  );
}

export default App;

