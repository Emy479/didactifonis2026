import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'tutor',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.status === 201) {
        setSuccess('¡Cuenta creada! Redirigiendo a inicio de sesión…');
        setTimeout(() => navigate('/login'), 1500);
      } else if (res.status === 409) {
        setError('Este email ya está registrado');
      } else {
        setError(data.message || 'Error al crear la cuenta');
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-2.5 font-body text-sm text-text-strong outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition bg-white';

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        {/* Encabezado */}
        <h1 className="font-heading text-2xl font-semibold text-text-strong mb-1 text-center">
          Crear cuenta
        </h1>
        <p className="font-body text-sm text-text-soft text-center mb-7">
          Únete a Didactifonis
        </p>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="font-body text-sm font-medium text-text-strong mb-1 block">
              Nombre completo
            </label>
            <input
              type="text"
              name="name"
              required
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              className={inputClass}
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="font-body text-sm font-medium text-text-strong mb-1 block">
              Correo electrónico
            </label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
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
              name="password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="font-body text-sm font-medium text-text-strong mb-1 block">
              Tipo de cuenta
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="tutor">Tutor / Apoderado</option>
              <option value="profesional">Fonoaudiólogo/a</option>
            </select>
          </div>

          {/* Mensajes de estado */}
          {error && (
            <p className="font-body text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="font-body text-sm text-green-600" role="status">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-heading font-semibold rounded-xl py-2.5 mt-1 hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        {/* Link a login */}
        <p className="font-body text-sm text-text-soft text-center mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-accent font-semibold hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
