import { useState } from 'react'

const motivoOptions = [
  { value: '', label: 'Selecciona un motivo' },
  { value: 'saber-mas', label: 'Quiero saber más sobre Didactifonis' },
  { value: 'fonoaudiologo', label: 'Soy fonoaudiólogo y quiero usar la plataforma' },
  { value: 'problema-tecnico', label: 'Tengo un problema técnico' },
  { value: 'otro', label: 'Otro' },
]

// Icono email SVG
function EmailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

// Icono reloj SVG
function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
    </svg>
  )
}

// Icono check SVG
function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

const initialForm = { nombre: '', email: '', motivo: '', mensaje: '' }

export default function ContactPage() {
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})

  function validate() {
    const next = {}
    if (!form.nombre.trim()) next.nombre = 'El nombre es obligatorio.'
    if (!form.email.trim()) {
      next.email = 'El correo es obligatorio.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Ingresa un correo válido.'
    }
    if (!form.motivo) next.motivo = 'Selecciona un motivo.'
    if (!form.mensaje.trim()) next.mensaje = 'El mensaje es obligatorio.'
    return next
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const next = validate()
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    setSubmitted(true)
  }

  const inputBase =
    'w-full font-body text-sm text-text-strong bg-white border rounded-button px-4 py-3 outline-none transition-colors placeholder:text-text-soft/60'
  const inputNormal = `${inputBase} border-surface focus:border-primary`
  const inputError = `${inputBase} border-red-400 focus:border-red-500`

  return (
    <main className="min-h-screen bg-surface">
      {/* Header */}
      <section className="bg-white border-b border-surface py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="font-heading font-bold text-4xl sm:text-5xl text-text-strong mb-4 leading-tight">
            ¿Tienes preguntas?{' '}
            <span className="text-primary">Escríbenos.</span>
          </h1>
          <p className="font-body text-lg text-text-soft max-w-lg mx-auto">
            Nuestro equipo está listo para responderte y acompañarte en este camino.
          </p>
        </div>
      </section>

      {/* Contenido principal */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

            {/* Columna izquierda: formulario */}
            <div className="bg-white rounded-card p-8 shadow-sm">
              <h2 className="font-heading font-semibold text-xl text-text-strong mb-6">
                Envíanos un mensaje
              </h2>

              {submitted ? (
                <div className="flex flex-col items-center text-center py-10">
                  <span className="text-primary mb-4">
                    <CheckCircleIcon />
                  </span>
                  <h3 className="font-heading font-bold text-xl text-text-strong mb-2">
                    Mensaje recibido
                  </h3>
                  <p className="font-body text-text-soft">
                    Gracias, te contactaremos pronto.
                  </p>
                  <button
                    onClick={() => { setForm(initialForm); setSubmitted(false) }}
                    className="mt-6 font-body text-sm text-primary hover:underline"
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Nombre */}
                  <div>
                    <label className="block font-body text-sm font-semibold text-text-strong mb-1.5">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      placeholder="Tu nombre"
                      className={errors.nombre ? inputError : inputNormal}
                    />
                    {errors.nombre && (
                      <p className="font-body text-xs text-red-500 mt-1">{errors.nombre}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block font-body text-sm font-semibold text-text-strong mb-1.5">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="tu@correo.com"
                      className={errors.email ? inputError : inputNormal}
                    />
                    {errors.email && (
                      <p className="font-body text-xs text-red-500 mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Motivo */}
                  <div>
                    <label className="block font-body text-sm font-semibold text-text-strong mb-1.5">
                      Motivo de contacto
                    </label>
                    <select
                      name="motivo"
                      value={form.motivo}
                      onChange={handleChange}
                      className={`${errors.motivo ? inputError : inputNormal} appearance-none cursor-pointer`}
                    >
                      {motivoOptions.map((o) => (
                        <option key={o.value} value={o.value} disabled={o.value === ''}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {errors.motivo && (
                      <p className="font-body text-xs text-red-500 mt-1">{errors.motivo}</p>
                    )}
                  </div>

                  {/* Mensaje */}
                  <div>
                    <label className="block font-body text-sm font-semibold text-text-strong mb-1.5">
                      Mensaje
                    </label>
                    <textarea
                      name="mensaje"
                      value={form.mensaje}
                      onChange={handleChange}
                      rows={4}
                      placeholder="¿En qué podemos ayudarte?"
                      className={`${errors.mensaje ? inputError : inputNormal} resize-none`}
                    />
                    {errors.mensaje && (
                      <p className="font-body text-xs text-red-500 mt-1">{errors.mensaje}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full font-heading font-semibold bg-gradient-main text-white py-3.5 rounded-button hover:opacity-90 transition-opacity text-base"
                  >
                    Enviar mensaje
                  </button>
                </form>
              )}
            </div>

            {/* Columna derecha: datos de contacto */}
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-heading font-semibold text-xl text-text-strong mb-6">
                  Otras formas de contacto
                </h2>
              </div>

              {/* Email */}
              <div className="bg-white rounded-card p-6 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <EmailIcon />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-text-strong text-sm mb-1">
                    Correo electrónico
                  </h3>
                  <a
                    href="mailto:soporte@didactifonis.cl"
                    className="font-body text-sm text-primary hover:underline"
                  >
                    soporte@didactifonis.cl
                  </a>
                  <p className="font-body text-xs text-text-soft mt-1">
                    Respondemos dentro de las 24 horas hábiles.
                  </p>
                </div>
              </div>

              {/* Horario */}
              <div className="bg-white rounded-card p-6 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                  <ClockIcon />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-text-strong text-sm mb-1">
                    Horario de atención
                  </h3>
                  <p className="font-body text-sm text-text-soft">
                    Lunes a viernes
                  </p>
                  <p className="font-body text-sm text-text-soft">
                    9:00 a 18:00 hrs. (Chile continental)
                  </p>
                </div>
              </div>

              {/* Nota de privacidad */}
              <p className="font-body text-xs text-text-soft leading-relaxed px-1">
                Al enviar este formulario aceptas que tus datos sean utilizados para
                responderte. No los compartimos con terceros. Consulta nuestra{' '}
                <a href="/privacidad" className="text-primary hover:underline">
                  política de privacidad
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
