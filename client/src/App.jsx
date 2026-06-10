import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChildProvider } from './context/ChildContext';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardPro from './pages/pro/DashboardPro';
import DashboardTutor from './pages/tutor/DashboardTutor';
import DashboardNino from './pages/nino/DashboardNino';
import GameHost from './pages/nino/GameHost';
import DashboardAdmin from './pages/admin/DashboardAdmin';
import SubscriptionStatus from './pages/subscription/SubscriptionStatus';
import SubscriptionRequired from './pages/subscription/SubscriptionRequired';
import Checkout from './pages/subscription/Checkout';
import MockConfirm from './pages/subscription/MockConfirm';
import PaymentSuccess from './pages/subscription/PaymentSuccess';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChildProvider>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/subscription/required" element={<SubscriptionRequired />} />
            <Route path="/subscription/mock-confirm" element={<MockConfirm />} />

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
              {/* GameHost antes del wildcard para que tenga precedencia */}
              <Route path="/nino/game/:assignmentId" element={<GameHost />} />
              <Route path="/nino" element={<DashboardNino />} />
              <Route path="/nino/*" element={<DashboardNino />} />
            </Route>

            {/* Rutas protegidas — Suscripción */}
            <Route element={<PrivateRoute allowedRoles={['tutor', 'profesional', 'admin']} />}>
              <Route path="/subscription/status" element={<SubscriptionStatus />} />
              <Route path="/subscription/checkout" element={<Checkout />} />
              <Route path="/subscription/success" element={<PaymentSuccess />} />
            </Route>
          </Routes>
        </ChildProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
