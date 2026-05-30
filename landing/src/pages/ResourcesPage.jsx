import { useState } from 'react'
import { Link } from 'react-router-dom'

// --- Datos mock ---
const activities = [
  // Fonema
  {
    id: 1,
    title: 'La fábrica de la /s/',
    type: 'fonema',
    typeLabel: 'Fonema',
    difficulty: 1,
    duration: '5 min',
    gradientClass: 'bg-gradient-main',
  },
  {
    id: 2,
    title: 'El mundo de la /r/',
    type: 'fonema',
    typeLabel: 'Fonema',
    difficulty: 2,
    duration: '8 min',
    gradientClass: 'bg-gradient-main',
  },
  {
    id: 3,
    title: 'Viaje con la /ch/',
    type: 'fonema',
    typeLabel: 'Fonema',
    difficulty: 3,
    duration: '10 min',
    gradientClass: 'bg-gradient-main',
  },
  // Sílaba
  {
    id: 4,
    title: 'El tren de las sílabas',
    type: 'silaba',
    typeLabel: 'Sílaba',
    difficulty: 1,
    duration: '6 min',
    gradientClass: 'bg-gradient-creative',
  },
  {
    id: 5,
    title: 'Escalón silábico',
    type: 'silaba',
    typeLabel: 'Sílaba',
    difficulty: 2,
    duration: '9 min',
    gradientClass: 'bg-gradient-creative',
  },
  {
    id: 6,
    title: 'Borra la sílaba',
    type: 'silaba',
    typeLabel: 'Sílaba',
    difficulty: 3,
    duration: '12 min',
    gradientClass: 'bg-gradient-creative',
  },
  // Palabra
  {
    id: 7,
    title: 'Completa la palabra',
    type: 'palabra',
    typeLabel: 'Palabra',
    difficulty: 1,
    duration: '7 min',
    gradientClass: 'bg-gradient-energy',
  },
  {
    id: 8,
    title: 'Encuentra la palabra',
    type: 'palabra',
    typeLabel: 'Palabra',
    difficulty: 2,
    duration: '10 min',
    gradientClass: 'bg-gradient-energy',
  },
  {
    id: 9,
    title: 'Corazón de palabras',
    type: 'palabra',
    typeLabel: 'Palabra',
    difficulty: 3,
    duration: '14 min',
    gradientClass: 'bg-gradient-energy',
  },
]

const typeFilters = [
  { value: 'todos', label: 'Todos' },
  { value: 'fonema', label: 'Fonema' },
  { value: 'silaba', label: 'Sílaba' },
  { value: 'palabra', label: 'Palabra' },
]

const difficultyFilters = [
  { value: 0, label: 'Cualquier dificultad' },
  { value: 1, label: 'Nivel 1' },
  { value: 2, label: 'Nivel 2' },
  { value: 3, label: 'Nivel 3' },
]

// Icono estrella SVG
function StarIcon({ filled }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      className="w-4 h-4"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  )
}

function DifficultyStars({ level }) {
  return (
    <span className="flex items-center gap-0.5 text-optimism">
      {[1, 2, 3].map((n) => (
        <StarIcon key={n} filled={n <= level} />
      ))}
    </span>
  )
}

// Icono reloj SVG
function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
    </svg>
  )
}

function ActivityCard({ activity }) {
  return (
    <div className="bg-white rounded-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Imagen placeholder con gradiente */}
      <div className={`${activity.gradientClass} h-36 flex items-center justify-center`}>
        <span className="font-heading font-bold text-white/70 text-sm tracking-widest uppercase">
          {activity.typeLabel}
        </span>
      </div>

      {/* Contenido */}
      <div className="p-5">
        <h3 className="font-heading font-semibold text-text-strong text-base mb-1 leading-snug">
          {activity.title}
        </h3>
        <p className="font-body text-xs text-text-soft mb-3 uppercase tracking-wide">
          {activity.typeLabel}
        </p>

        <div className="flex items-center justify-between">
          <DifficultyStars level={activity.difficulty} />
          <span className="flex items-center gap-1 font-body text-xs text-text-soft">
            <ClockIcon />
            {activity.duration}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ResourcesPage() {
  const [activeType, setActiveType] = useState('todos')
  const [activeDifficulty, setActiveDifficulty] = useState(0)

  const filtered = activities.filter((a) => {
    const matchType = activeType === 'todos' || a.type === activeType
    const matchDiff = activeDifficulty === 0 || a.difficulty === activeDifficulty
    return matchType && matchDiff
  })

  return (
    <main className="min-h-screen bg-surface">
      {/* Header de sección */}
      <section className="bg-gradient-main py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="font-heading font-bold text-4xl sm:text-5xl text-white mb-4 leading-tight">
            Recursos de muestra
          </h1>
          <p className="font-body text-lg text-white/90 max-w-xl mx-auto">
            Explora algunas de nuestras actividades. Regístrate para acceder al catálogo completo.
          </p>
        </div>
      </section>

      {/* Filtros */}
      <section className="py-8 bg-white border-b border-surface">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Filtro por tipo */}
            <div className="flex flex-wrap gap-2">
              {typeFilters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActiveType(f.value)}
                  className={`font-body text-sm px-4 py-2 rounded-button border transition-colors ${
                    activeType === f.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-text-soft border-surface hover:border-primary hover:text-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:block w-px h-6 bg-surface" />

            {/* Filtro por dificultad */}
            <div className="flex flex-wrap gap-2">
              {difficultyFilters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActiveDifficulty(f.value)}
                  className={`font-body text-sm px-4 py-2 rounded-button border transition-colors ${
                    activeDifficulty === f.value
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-text-soft border-surface hover:border-accent hover:text-accent'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid de actividades */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="font-body text-text-soft text-lg">
                No hay actividades con esos filtros. Intenta otra combinación.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Banner CTA */}
      <section className="py-16 bg-gradient-creative">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-4">
            ¿Te gustó lo que viste?
          </h2>
          <p className="font-body text-lg text-white/90 mb-8 max-w-md mx-auto">
            Crea una cuenta y accede a todo el catálogo de actividades fonoaudiológicas.
          </p>
          <Link
            to="/comenzar"
            className="font-heading font-semibold bg-white text-creative px-8 py-4 rounded-button hover:bg-surface transition-colors text-base inline-block shadow-sm"
          >
            Comenzar gratis
          </Link>
        </div>
      </section>
    </main>
  )
}
