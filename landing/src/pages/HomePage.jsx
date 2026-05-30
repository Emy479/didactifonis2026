import { Link } from 'react-router-dom'

// --- Sección 1: Hero ---
function HeroSection() {
  return (
    // Excepcion justificada: gradiente creative (#4C8DFF → #9A6BFF) via style porque
    // Tailwind no admite radial-gradient personalizado sin JIT extendido.
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #4C8DFF 0%, #9A6BFF 100%)' }}
    >
      {/* Patrón de puntos overlay — profundidad visual sutil */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Círculo decorativo grande — esquina superior derecha */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
      />
      {/* Círculo decorativo pequeño — esquina inferior izquierda */}
      <div
        className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
      />

      <div className="max-w-6xl mx-auto px-4 py-16 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
          {/* Columna izquierda — 60% */}
          <div className="lg:col-span-3">
            {/* Badge — primera entrada */}
            <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6 anim-fade-up">
              <p className="font-body text-sm text-white leading-snug max-w-sm">
                Didactifonis conecta a ninos, padres y fonoaudiologos con juegos educativos personalizados y seguimiento en tiempo real.
              </p>
            </div>

            {/* Headline — segunda entrada */}
            <h1 className="font-heading font-bold text-white leading-none mb-6 anim-fade-up-1">
              <span className="block text-6xl md:text-7xl lg:text-8xl">Aprende</span>
              <span className="block text-6xl md:text-7xl lg:text-8xl text-optimism">
                jugando ✦
              </span>
            </h1>

            {/* Subheadline — tercera entrada */}
            <p className="font-body text-lg text-white/80 mb-8 max-w-lg leading-relaxed anim-fade-up-2">
              La plataforma que conecta fonoaudiologos, padres y ninos a traves de actividades divertidas y personalizadas.
            </p>

            {/* CTAs — cuarta entrada */}
            <div className="flex flex-wrap gap-4 mb-10 anim-fade-up-3">
              <Link
                to="/comenzar"
                className="font-heading font-semibold bg-white text-accent px-7 py-3.5 rounded-button hover:bg-surface transition-colors text-base shadow-sm"
              >
                Comenzar ahora
              </Link>
              <a
                href="#como-funciona"
                className="font-heading font-semibold border-2 border-white text-white px-7 py-3.5 rounded-button hover:bg-white/10 transition-colors text-base"
              >
                Saber mas
              </a>
            </div>

            {/* Feature icons row — quinta entrada */}
            <div className="flex flex-wrap gap-6 anim-fade-up-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
                  </svg>
                </div>
                <span className="font-body text-sm text-white font-semibold">Aprende jugando</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <span className="font-body text-sm text-white font-semibold">Seguimiento en tiempo real</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="font-body text-sm text-white font-semibold">Personalizado</span>
              </div>
            </div>
          </div>

          {/* Columna derecha — 40% — fade-in más tardío */}
          <div className="lg:col-span-2 flex justify-center lg:justify-end relative anim-fade-in-5">
            <div className="relative">
              <img
                src="/assets/personajes/Nino.png"
                alt="Nino jugando con actividades fonoaudiologicas"
                className="w-72 lg:w-96 object-contain drop-shadow-xl relative z-10"
              />

              {/* Tarjeta flotante 1 — progreso semanal (superior izquierda) */}
              <div
                className="absolute -top-4 -left-8 bg-white rounded-2xl shadow-lg px-4 py-3 z-20 min-w-[160px] float-card"
                style={{ '--card-rot': '-2deg' }}
              >
                <p className="font-body text-xs text-text-soft mb-1">Progreso semanal</p>
                <div className="flex items-end gap-1 h-8">
                  {[40, 65, 45, 80, 70, 90, 75].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-gradient-main" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <p className="font-heading font-bold text-sm text-text-strong mt-1">+30% esta semana</p>
              </div>

              {/* Tarjeta flotante 2 — actividad completada (superior derecha) */}
              <div
                className="absolute top-4 -right-6 bg-white rounded-2xl shadow-lg px-4 py-3 z-20 min-w-[140px] float-card-2"
                style={{ '--card-rot': '2deg' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-creative/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-creative" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="font-heading font-bold text-sm text-text-strong">Actividad</p>
                </div>
                <p className="font-body text-xs text-text-soft">Completada con exito</p>
                <div className="flex gap-0.5 mt-1.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <svg key={i} className="w-3.5 h-3.5 text-optimism" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>

              {/* Tarjeta flotante 3 — seguimiento activo (inferior) */}
              <div
                className="absolute -bottom-2 -left-4 bg-white rounded-2xl shadow-lg px-4 py-3 z-20 min-w-[160px] float-card-3"
                style={{ '--card-rot': '-1deg' }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-creative flex-shrink-0" />
                  <div>
                    <p className="font-heading font-bold text-xs text-text-strong">Seguimiento activo</p>
                    <p className="font-body text-xs text-text-soft">Dr. Martinez</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-primary ml-auto flex-shrink-0 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// --- Sección 2: Propuesta de valor ---
function ValuePropSection() {
  return (
    <section id="beneficios" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-text-strong mb-4">
            Una plataforma para todos
          </h2>
          <p className="font-body text-text-soft text-lg max-w-xl mx-auto">
            Diseniada para que cada quien encuentre exactamente lo que necesita.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 — Para el niño */}
          <div className="group cursor-default bg-surface rounded-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-lg border border-creative/20 bg-gradient-to-b from-creative/5 to-transparent">
            <img
              src="/assets/personajes/Nino.png"
              alt="Nino aprendiendo jugando"
              className="h-32 object-contain mx-auto mb-4"
            />
            <div className="bg-creative/10 text-creative w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
              </svg>
            </div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-creative mb-1">
              Para el nino
            </p>
            <h3 className="font-heading font-bold text-2xl text-text-strong mb-3">
              Aprende jugando
            </h3>
            <p className="font-body text-text-soft leading-relaxed">
              Actividades divertidas y personalizadas que hacen que cada sesion sea una aventura. Los ninos aprenden sin darse cuenta.
            </p>
          </div>

          {/* Card 2 — Para el tutor */}
          <div className="group cursor-default bg-surface rounded-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-lg border border-primary/20">
            <img
              src="/assets/personajes/Nina.jpg"
              alt="Nina con su tutor"
              className="h-32 object-contain mx-auto mb-4"
            />
            <div className="bg-primary/10 text-primary w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-primary mb-1">
              Para el tutor
            </p>
            <h3 className="font-heading font-bold text-2xl text-text-strong mb-3">
              Consulta Segura
            </h3>
            <p className="font-body text-text-soft leading-relaxed">
              Accede a las actividades de tu hijo/a, sigue su progreso y comunicate con el profesional en un entorno completamente seguro.
            </p>
          </div>

          {/* Card 3 — Para el profesional */}
          <div className="group cursor-default bg-surface rounded-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-lg border border-accent/20">
            <div className="w-20 h-20 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-5 mx-auto group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-accent mb-1">
              Para el profesional
            </p>
            <h3 className="font-heading font-bold text-2xl text-text-strong mb-3">
              Seguimiento en Tiempo Real
            </h3>
            <p className="font-body text-text-soft leading-relaxed">
              Panel de gestion claro y ordenado. Asigna actividades, monitorea el progreso y ajusta la terapia segun los resultados.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// --- Sección 3: Cómo funciona ---
const steps = [
  {
    number: '1',
    title: 'Aprende jugando',
    description: 'El fonoaudiologo crea actividades y terapias personalizadas para cada paciente segun sus objetivos.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    number: '2',
    title: 'Tablet / Juego',
    description: 'El nino juega desde casa con actividades divertidas asignadas por su fonoaudiologo o tutor.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    number: '3',
    title: 'Seguimiento',
    description: 'El profesional y el tutor monitorean el progreso en tiempo real y celebran cada logro del nino.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
]

function HowItWorksSection() {
  return (
    // Excepcion justificada: gradiente diagonal suave (#F5F7FA = surface, #EEF2FF = variacion
    // muy tenue de accent/creative) para dar profundidad sin romper el design-system.
    <section
      id="como-funciona"
      className="py-20 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #F5F7FA 60%, #EEF2FF 100%)' }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-text-strong mb-4">
            Como funciona?
          </h2>
          <p className="font-body text-text-soft text-lg max-w-xl mx-auto">
            Tres pasos simples que conectan a toda la red de apoyo del nino.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Linea horizontal punteada entre pasos — solo desktop */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5 border-t-2 border-dashed border-accent/30" />

          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center relative">
              {/* Circulo numero */}
              <div className="w-20 h-20 rounded-full bg-gradient-main flex flex-col items-center justify-center mb-5 shadow-sm relative z-10">
                {step.icon}
                <span className="font-heading font-bold text-white text-xs leading-none mt-0.5">{step.number}</span>
              </div>
              <h3 className="font-heading font-bold text-lg text-text-strong mb-2">
                {step.title}
              </h3>
              <p className="font-body text-text-soft leading-relaxed text-sm max-w-xs">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// --- Sección 4: Planes ---
const tutorPlanBenefits = [
  'Acceso a actividades de tu hijo/a',
  'Seguimiento de progreso',
  'Comunicacion con el profesional',
  'Soporte prioritario',
]

const proPlanBenefits = [
  'Gestion de multiples pacientes',
  'Creacion de terapias personalizadas',
  'Reportes y estadisticas',
  'Mensajeria con tutores',
  'Soporte prioritario',
]

function PlansSection() {
  return (
    <section id="planes" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-text-strong mb-4">
            Elige el plan que mas se adapta a ti
          </h2>
          <p className="font-body text-text-soft text-lg max-w-xl mx-auto">
            Planes pensados para cada tipo de usuario, con prueba gratuita.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Plan Padres / Tutores */}
          <div className="bg-surface rounded-card p-8 shadow-sm border border-primary/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <img
              src="/assets/personajes/Nina.jpg"
              alt="Nina representando a la familia"
              className="h-28 object-contain block mx-auto mb-2"
            />
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-2xl text-text-strong mb-1">
                Padres / Tutores
              </h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-heading font-bold text-3xl text-text-strong">$9.990</span>
                <span className="font-body text-text-soft">/mes</span>
              </div>
              <p className="font-body text-xs text-text-soft">Facturado mensualmente</p>
            </div>

            <ul className="space-y-3 mb-8">
              {tutorPlanBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 font-body text-text-soft text-sm">
                  <span className="text-primary flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <Link
              to="/comenzar"
              className="font-heading font-semibold w-full block text-center bg-primary text-white px-6 py-3 rounded-button hover:opacity-90 transition-opacity"
            >
              Comenzar prueba gratis
            </Link>
          </div>

          {/* Plan Profesional Independiente */}
          <div className="bg-surface rounded-card p-8 shadow-md border-2 border-accent transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative">
            {/* Badge popular */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-gradient-main text-white font-heading font-semibold text-xs px-4 py-1.5 rounded-full whitespace-nowrap shadow-sm">
                Mas popular
              </span>
            </div>

            <img
              src="/assets/personajes/Nino.png"
              alt="Nino representando al beneficiario del profesional"
              className="h-28 object-contain block mx-auto mb-2"
            />
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-2xl text-text-strong mb-1">
                Profesional Independiente
              </h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-heading font-bold text-3xl text-text-strong">$24.990</span>
                <span className="font-body text-text-soft">/mes</span>
              </div>
              <p className="font-body text-xs text-text-soft">Facturado mensualmente</p>
            </div>

            <ul className="space-y-3 mb-8">
              {proPlanBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 font-body text-text-soft text-sm">
                  <span className="text-accent flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <Link
              to="/comenzar"
              className="font-heading font-semibold w-full block text-center bg-gradient-main text-white px-6 py-3 rounded-button hover:opacity-90 transition-opacity"
            >
              Comenzar prueba gratis
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// --- Sección 5: CTA final ---
function FinalCtaSection() {
  return (
    <section className="bg-gradient-main py-20 relative overflow-hidden">
      {/* Elemento decorativo circular — esquina superior derecha */}
      <div
        className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 translate-x-1/3 -translate-y-1/2 pointer-events-none"
        style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
      />
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Columna izquierda */}
          <div>
            <h2 className="font-heading font-bold text-4xl sm:text-5xl text-white leading-tight mb-4">
              Juntos hacemos que cada palabra cuente
            </h2>
            <p className="font-body text-lg text-white/80 mb-8 max-w-md leading-relaxed">
              Acompana el desarrollo del lenguaje de tu hijo/a con herramientas pensadas para aprender jugando.
            </p>
            <Link
              to="/comenzar"
              className="font-heading font-semibold bg-white text-accent px-8 py-4 rounded-button hover:bg-surface transition-colors text-base inline-block shadow-sm"
            >
              Comenzar ahora
            </Link>
          </div>

          {/* Columna derecha — personaje */}
          <div className="flex justify-center lg:justify-end relative">
            <img
              src="/assets/personajes/Nina.jpg"
              alt="Nina aprendiendo con Didactifonis"
              className="w-64 lg:w-80 object-contain drop-shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// --- HomePage principal ---
export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ValuePropSection />
      <HowItWorksSection />
      <PlansSection />
      <FinalCtaSection />
    </main>
  )
}
