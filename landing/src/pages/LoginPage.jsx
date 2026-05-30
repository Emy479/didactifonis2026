import { Link } from 'react-router-dom'

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173'

const benefits = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    title: 'Ver el progreso',
    description: 'Monitorea los avances de tu hijo/a en tiempo real.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    title: 'Gestionar terapias',
    description: 'Accede a las actividades asignadas y a las fichas de sesión.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: 'Recibir notificaciones',
    description: 'Entérate cuando se asignen nuevas tareas o haya novedades.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Entorno seguro',
    description: 'Tu información y la de tu familia está siempre protegida.',
  },
]

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh]">

          {/* Columna izquierda: propuesta de valor */}
          <div>
            <h1 className="font-heading font-bold text-4xl sm:text-5xl text-text-strong mb-5 leading-tight">
              Bienvenido/a de nuevo a{' '}
              <span className="text-primary">Didactifonis</span>
            </h1>
            <p className="font-body text-lg text-text-soft mb-10 leading-relaxed">
              Continúa apoyando el desarrollo comunicativo de tu hijo/a desde donde lo dejaste.
            </p>

            {/* Ilustración placeholder con gradiente */}
            <div className="bg-gradient-main rounded-card p-8 mb-10 flex items-center justify-center min-h-[200px]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>

            {/* Beneficios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {b.icon}
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-sm text-text-strong">
                      {b.title}
                    </p>
                    <p className="font-body text-xs text-text-soft leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha: card de acceso */}
          <div className="flex justify-center lg:justify-end">
            <div className="bg-white rounded-card shadow-sm p-10 w-full max-w-md">
              <h2 className="font-heading font-bold text-2xl text-text-strong mb-2 text-center">
                Iniciar sesión
              </h2>
              <p className="font-body text-sm text-text-soft text-center mb-8">
                Accede a la plataforma para continuar.
              </p>

              <a
                href={APP_URL}
                className="block w-full text-center font-heading font-semibold bg-gradient-main text-white py-4 rounded-button hover:opacity-90 transition-opacity text-base mb-4"
              >
                Acceder a mi cuenta
              </a>

              <p className="font-body text-xs text-text-soft text-center leading-relaxed mb-6">
                Serás redirigido/a a la plataforma de forma segura.
              </p>

              <hr className="border-surface mb-6" />

              <p className="font-body text-sm text-text-soft text-center">
                ¿No tienes cuenta?{' '}
                <Link
                  to="/comenzar"
                  className="font-semibold text-primary hover:underline"
                >
                  Crear una cuenta
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
