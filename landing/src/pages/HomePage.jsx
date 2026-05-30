import { Link } from 'react-router-dom'

// --- Sección 1: Hero ---
function HeroSection() {
  return (
    <section className="bg-gradient-main min-h-[90vh] flex items-center">
      <div className="max-w-6xl mx-auto px-4 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Texto */}
        <div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6">
            Terapia fonoaudiológica que los niños{' '}
            <span className="italic">quieren hacer</span>
          </h1>
          <p className="font-body text-lg text-white/90 mb-8 leading-relaxed max-w-lg">
            Conectamos a fonoaudiólogos, padres y niños en una plataforma segura,
            gamificada y fácil de usar.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/comenzar"
              className="font-heading font-semibold bg-white text-primary px-7 py-3.5 rounded-button hover:bg-surface transition-colors text-base"
            >
              Comenzar gratis
            </Link>
            <a
              href="#como-funciona"
              className="font-heading font-semibold border-2 border-white text-white px-7 py-3.5 rounded-button hover:bg-white/10 transition-colors text-base"
            >
              Ver cómo funciona
            </a>
          </div>
        </div>

        {/* Ilustración */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative">
            <div className="absolute inset-0 bg-white/10 rounded-2xl blur-xl scale-110" />
            <img
              src="/assets/personajes/Nino.png"
              alt="Niño jugando con actividades fonoaudiológicas"
              className="relative w-72 sm:w-80 lg:w-96 object-contain drop-shadow-xl"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = '/assets/personajes/Nina.jpg'
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// --- Sección 2: Propuesta de valor ---
const valuePropCards = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    title: 'Para el profesional',
    description: 'Gestiona terapias, asigna actividades y haz seguimiento del progreso de cada paciente desde un panel claro y ordenado.',
    accent: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
    title: 'Para el tutor',
    description: 'Acompaña a tu hijo o hija con actividades pensadas para su terapia. Mira su progreso y celebra cada avance.',
    accent: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    title: 'Para el niño',
    description: 'Juega, aprende y celebra cada logro en tu propio espacio. Las actividades son divertidas y están hechas para ti.',
    accent: 'text-creative',
    bg: 'bg-creative/10',
  },
]

function ValuePropSection() {
  return (
    <section id="beneficios" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-text-strong mb-4">
            ¿Por qué Didactifonis?
          </h2>
          <p className="font-body text-text-soft text-lg max-w-xl mx-auto">
            Una sola plataforma diseñada para cada quien: el profesional, la familia y el niño.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {valuePropCards.map((card) => (
            <div
              key={card.title}
              className="bg-surface rounded-card p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`${card.bg} ${card.accent} w-14 h-14 rounded-xl flex items-center justify-center mb-5`}>
                {card.icon}
              </div>
              <h3 className="font-heading font-semibold text-xl text-text-strong mb-3">
                {card.title}
              </h3>
              <p className="font-body text-text-soft leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// --- Sección 3: Cómo funciona ---
const steps = [
  {
    number: '01',
    title: 'El profesional crea la terapia',
    description: 'El fonoaudiólogo selecciona actividades y las asigna al niño según sus objetivos terapéuticos.',
  },
  {
    number: '02',
    title: 'El tutor la acompaña en casa',
    description: 'Los padres tienen acceso a las actividades asignadas y pueden guiar a su hijo/a durante la práctica.',
  },
  {
    number: '03',
    title: 'El niño juega y progresa',
    description: 'El niño completa actividades en un entorno divertido y sus resultados se registran automáticamente.',
  },
]

function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 bg-surface">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-text-strong mb-4">
            Simple desde el primer día
          </h2>
          <p className="font-body text-text-soft text-lg max-w-xl mx-auto">
            Tres pasos que conectan a toda la red de apoyo del niño.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative flex flex-col items-center text-center md:items-start md:text-left">
              {/* Conector horizontal entre steps (solo desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-0.5 bg-primary/20" />
              )}

              <div className="w-14 h-14 rounded-full bg-gradient-main flex items-center justify-center mb-5 flex-shrink-0 shadow-sm">
                <span className="font-heading font-bold text-white text-lg">{step.number}</span>
              </div>
              <h3 className="font-heading font-semibold text-lg text-text-strong mb-2">
                {step.title}
              </h3>
              <p className="font-body text-text-soft leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// --- Sección 4: Para quién es ---
const proBenefits = [
  'Panel de gestión claro y sin ruido visual',
  'Asignación libre de actividades por paciente',
  'Seguimiento de progreso en tiempo real',
  'Fichas de sesión y notas clínicas (Capa 2)',
  'Sincronización automática con los tutores',
  'Historial de resultados por niño',
]

const tutorBenefits = [
  'Acceso a actividades asignadas por el profesional',
  'Vista de progreso de tu hijo/a',
  'Espacio seguro para menores de edad',
  'Comunicación con el fonoaudiólogo de seguimiento',
  'Notificaciones de nuevas tareas asignadas',
  'Sin configuraciones complejas — fácil desde el día uno',
]

function ForWhomSection() {
  return (
    <section id="para-quien" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-text-strong mb-4">
            Diseñado para cada rol
          </h2>
          <p className="font-body text-text-soft text-lg max-w-xl mx-auto">
            Cada usuario tiene su propio espacio, adaptado a sus necesidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profesionales */}
          <div className="bg-surface rounded-card p-8 border border-accent/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-xl text-text-strong">
                Fonoaudiólogos y terapeutas
              </h3>
            </div>
            <ul className="space-y-3">
              {proBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 font-body text-text-soft">
                  <span className="text-accent mt-0.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Tutores */}
          <div className="bg-surface rounded-card p-8 border border-primary/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <h3 className="font-heading font-bold text-xl text-text-strong">
                Padres y tutores
              </h3>
            </div>
            <ul className="space-y-3">
              {tutorBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 font-body text-text-soft">
                  <span className="text-primary mt-0.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

// --- Sección 5: Recursos de muestra ---
const sampleActivities = [
  {
    id: 1,
    title: 'Sonidos del bosque',
    type: 'Discriminación auditiva',
    difficulty: 'Inicial',
    difficultyColor: 'bg-optimism/20 text-text-strong',
    placeholderBg: 'bg-gradient-energy',
    icon: '🌲',
  },
  {
    id: 2,
    title: 'El tren de las sílabas',
    type: 'Conciencia fonológica',
    difficulty: 'Intermedio',
    difficultyColor: 'bg-primary/10 text-primary',
    placeholderBg: 'bg-gradient-main',
    icon: '🚂',
  },
  {
    id: 3,
    title: 'Rima y recuerda',
    type: 'Memoria fonológica',
    difficulty: 'Avanzado',
    difficultyColor: 'bg-creative/10 text-creative',
    placeholderBg: 'bg-gradient-creative',
    icon: '🎵',
  },
]

function ResourcesSampleSection() {
  return (
    <section id="recursos" className="py-20 bg-surface">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-text-strong mb-4">
            Explora actividades de muestra
          </h2>
          <p className="font-body text-text-soft text-lg max-w-xl mx-auto">
            Así lucen las actividades que los niños disfrutan en Didactifonis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {sampleActivities.map((activity) => (
            <div key={activity.id} className="bg-white rounded-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Imagen placeholder */}
              <div className={`${activity.placeholderBg} h-40 flex items-center justify-center`}>
                <span className="text-5xl" role="img" aria-label={activity.title}>
                  {activity.icon}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-heading font-semibold text-text-strong mb-1">
                  {activity.title}
                </h3>
                <p className="font-body text-sm text-text-soft mb-3">
                  {activity.type}
                </p>
                <span className={`${activity.difficultyColor} text-xs font-body font-semibold px-3 py-1 rounded-full`}>
                  {activity.difficulty}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/recursos"
            className="font-heading font-semibold bg-white border-2 border-primary text-primary px-7 py-3 rounded-button hover:bg-primary hover:text-white transition-colors inline-block"
          >
            Ver todos los recursos
          </Link>
        </div>
      </div>
    </section>
  )
}

// --- Sección 6: CTA final ---
function FinalCtaSection() {
  return (
    <section className="bg-gradient-creative py-24">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-4">
          Empieza hoy, sin compromiso
        </h2>
        <p className="font-body text-lg text-white/90 mb-10 max-w-md mx-auto">
          30 días de prueba gratuita. Sin tarjeta de crédito.
        </p>
        <Link
          to="/comenzar"
          className="font-heading font-semibold bg-white text-creative px-8 py-4 rounded-button hover:bg-surface transition-colors text-lg inline-block shadow-sm"
        >
          Crear cuenta gratis
        </Link>
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
      <ForWhomSection />
      <ResourcesSampleSection />
      <FinalCtaSection />
    </main>
  )
}
