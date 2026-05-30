import { Link } from 'react-router-dom'

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173'

const benefits = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
    title: 'Terapeutas personalizados',
    description: 'Conecta con fonoaudiólogos que diseñan actividades a medida para cada niño.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Entorno seguro para tu familia',
    description: 'Los datos de tu hijo/a están protegidos con los más altos estándares de privacidad.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    title: 'Seguimiento en tiempo real',
    description: 'Mira el progreso de cada sesión y celebra cada avance junto a tu familia.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    title: 'Diversión que educa',
    description: 'Actividades gamificadas que los niños quieren repetir una y otra vez.',
  },
]

const stats = [
  { value: '+500', label: 'Familias activas' },
  { value: '+20.000', label: 'Actividades completadas' },
  { value: '100%', label: 'Seguro y privado' },
  { value: '98%', label: 'Satisfacción familiar' },
]

const propositions = [
  '30 dias gratis',
  '100% seguro',
  'Sin compromiso',
]

// Icono check SVG
function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Columna izquierda: propuesta de valor */}
          <div>
            <h1 className="font-heading font-bold text-4xl sm:text-5xl text-text-strong mb-3 leading-tight">
              Comienza hoy{' '}
              <span className="text-primary">el camino de tu hijo/a</span>
            </h1>
            <p className="font-body text-lg text-text-soft mb-8 leading-relaxed">
              Crea tu cuenta en minutos y accede a una plataforma segura, gamificada y fácil de usar.
            </p>

            {/* Proposiciones rápidas */}
            <div className="flex flex-wrap gap-3 mb-10">
              {propositions.map((p) => (
                <span
                  key={p}
                  className="flex items-center gap-1.5 font-body text-sm text-text-soft bg-white border border-surface px-3 py-1.5 rounded-full"
                >
                  <span className="text-primary">
                    <CheckIcon />
                  </span>
                  {p}
                </span>
              ))}
            </div>

            {/* Lista de beneficios */}
            <div className="grid grid-cols-1 gap-5 mb-12">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {b.icon}
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-sm text-text-strong mb-0.5">
                      {b.title}
                    </p>
                    <p className="font-body text-sm text-text-soft leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="bg-white rounded-card p-6 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-heading font-bold text-xl text-primary mb-0.5">
                    {s.value}
                  </p>
                  <p className="font-body text-xs text-text-soft leading-snug">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha: card de registro */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-white rounded-card shadow-sm p-10">
              <h2 className="font-heading font-bold text-2xl text-text-strong mb-1 text-center">
                Crea tu cuenta
              </h2>
              <p className="font-body text-sm text-text-soft text-center mb-2">
                Elige el plan que mejor se adapte a tu familia.
              </p>

              {/* Propuesta destacada */}
              <div className="bg-primary/5 border border-primary/20 rounded-card p-4 mb-8 text-center">
                <p className="font-heading font-bold text-text-strong text-base">
                  30 dias gratis
                </p>
                <p className="font-body text-sm text-text-soft">
                  Sin tarjeta de credito · Sin compromiso
                </p>
              </div>

              <a
                href={`${APP_URL}/register`}
                className="block w-full text-center font-heading font-semibold bg-gradient-main text-white py-4 rounded-button hover:opacity-90 transition-opacity text-base mb-4"
              >
                Crear mi cuenta
              </a>

              <p className="font-body text-xs text-text-soft text-center leading-relaxed mb-6">
                Serás redirigido/a a la plataforma de forma segura para completar tu registro.
              </p>

              <hr className="border-surface mb-6" />

              <p className="font-body text-sm text-text-soft text-center">
                ¿Ya tienes cuenta?{' '}
                <Link
                  to="/iniciar-sesion"
                  className="font-semibold text-primary hover:underline"
                >
                  Iniciar sesion
                </Link>
              </p>
            </div>

            <p className="font-body text-xs text-text-soft text-center mt-4 px-2">
              Al registrarte aceptas nuestros{' '}
              <a href="/terminos" className="text-primary hover:underline">Terminos de uso</a>
              {' '}y{' '}
              <a href="/privacidad" className="text-primary hover:underline">Politica de privacidad</a>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
