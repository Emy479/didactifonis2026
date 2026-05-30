import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import DashboardPro from './pages/pro/DashboardPro';
import DashboardTutor from './pages/tutor/DashboardTutor';
import DashboardNino from './pages/nino/DashboardNino';
import DashboardAdmin from './pages/admin/DashboardAdmin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/pro/*" element={<DashboardPro />} />
        <Route path="/tutor/*" element={<DashboardTutor />} />
        <Route path="/nino/*" element={<DashboardNino />} />
        <Route path="/admin/*" element={<DashboardAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}
