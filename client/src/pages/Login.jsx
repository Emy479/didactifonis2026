import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const REDIRECT_MAP = {
  tutor: '/tutor',
  profesional: '/pro',
  admin: '/admin',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.token, data.user);
        navigate(REDIRECT_MAP[data.user.role] ?? '/');
      } else {
        setError(data.message || 'Credenciales incorrectas');
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-2.5 font-body text-sm text-text-strong outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition';

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        {/* Encabezado */}
        <h1 className="font-heading text-2xl font-semibold text-text-strong mb-1 text-center">
          Iniciar sesión
        </h1>
        <p className="font-body text-sm text-text-soft text-center mb-7">
          Bienvenido/a a Didactifonis
        </p>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="font-body text-sm font-medium text-text-strong mb-1 block">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="font-body text-sm font-medium text-text-strong mb-1 block">
              Contraseña
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <p className="font-body text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-heading font-semibold rounded-xl py-2.5 mt-1 hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        {/* Link a registro */}
        <p className="font-body text-sm text-text-soft text-center mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-accent font-semibold hover:underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
