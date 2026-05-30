import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardPro from './pages/pro/DashboardPro';
import DashboardTutor from './pages/tutor/DashboardTutor';
import DashboardNino from './pages/nino/DashboardNino';
import DashboardAdmin from './pages/admin/DashboardAdmin';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rutas protegidas — Profesional */}
          <Route element={<PrivateRoute allowedRoles={['profesional']} />}>
            <Route path="/pro/*" element={<DashboardPro />} />
          </Route>

          {/* Rutas protegidas — Tutor */}
          <Route element={<PrivateRoute allowedRoles={['tutor']} />}>
            <Route path="/tutor/*" element={<DashboardTutor />} />
          </Route>

          {/* Rutas protegidas — Admin */}
          <Route element={<PrivateRoute allowedRoles={['admin']} />}>
            <Route path="/admin/*" element={<DashboardAdmin />} />
          </Route>

          {/* Niño: accede siempre vía sesión activa del tutor (spec §2) */}
          <Route element={<PrivateRoute allowedRoles={['tutor']} />}>
            <Route path="/nino/*" element={<DashboardNino />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
