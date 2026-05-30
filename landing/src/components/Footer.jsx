import { Link } from 'react-router-dom'

const columns = [
  {
    title: 'Producto',
    links: [
      { label: '¿Cómo funciona?', to: '/#como-funciona' },
      { label: 'Beneficios', to: '/#beneficios' },
      { label: 'Para quién es', to: '/#para-quien' },
      { label: 'Precios', to: '/#precios' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Actividades de muestra', to: '/recursos' },
      { label: 'Blog', to: '/blog' },
      { label: 'Ayuda', to: '/ayuda' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Acerca de', to: '/acerca' },
      { label: 'Contacto', to: '/contacto' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-text-strong text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Logo y descripcion */}
          <div>
            <span className="font-heading font-bold text-lg">
              Didacti<span className="text-primary">fonis</span>
            </span>
            <p className="font-body text-sm text-surface mt-3 leading-relaxed">
              Plataforma de apoyo a la terapia fonoaudiológica infantil. Segura, gamificada y fácil de usar.
            </p>
          </div>

          {/* Columnas de links */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-heading font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <a
                      href={link.to}
                      className="font-body text-sm text-surface hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr className="border-white/10 mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-body text-surface">
          <p>© 2026 Didactifonis. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <a href="/privacidad" className="hover:text-primary transition-colors">Política de privacidad</a>
            <a href="/terminos" className="hover:text-primary transition-colors">Términos de uso</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
