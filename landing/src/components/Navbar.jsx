import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const navLinks = [
  { label: 'Inicio', to: '/' },
  { label: '¿Cómo funciona?', to: '/#como-funciona' },
  { label: 'Beneficios', to: '/#beneficios' },
  { label: 'Para quién es', to: '/#planes' },
  { label: 'Recursos', to: '/recursos' },
  { label: 'Contacto', to: '/contacto' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="font-heading font-bold text-xl text-text-strong">
            Didacti<span className="text-primary">fonis</span>
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <li key={link.to}>
              <a
                href={link.to}
                className="font-body text-sm text-text-soft hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/iniciar-sesion"
            className="font-body text-sm font-semibold text-text-strong hover:text-primary transition-colors px-4 py-2"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/comenzar"
            className="font-body text-sm font-semibold bg-gradient-main text-white px-5 py-2 rounded-button hover:opacity-90 transition-opacity"
          >
            Comenzar ahora
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="lg:hidden p-2 rounded-button text-text-soft hover:text-primary transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menu"
        >
          <span className="block w-5 h-0.5 bg-current mb-1 transition-transform" style={menuOpen ? { transform: 'rotate(45deg) translate(2px, 6px)' } : {}} />
          <span className="block w-5 h-0.5 bg-current mb-1 transition-opacity" style={menuOpen ? { opacity: 0 } : {}} />
          <span className="block w-5 h-0.5 bg-current transition-transform" style={menuOpen ? { transform: 'rotate(-45deg) translate(2px, -6px)' } : {}} />
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-surface px-4 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <a
              key={link.to}
              href={link.to}
              className="font-body text-sm text-text-soft hover:text-primary transition-colors py-1"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <hr className="border-surface my-1" />
          <Link
            to="/iniciar-sesion"
            className="font-body text-sm font-semibold text-text-strong hover:text-primary transition-colors py-1"
            onClick={() => setMenuOpen(false)}
          >
            Iniciar sesión
          </Link>
          <Link
            to="/comenzar"
            className="font-body text-sm font-semibold bg-gradient-main text-white px-5 py-2.5 rounded-button hover:opacity-90 transition-opacity text-center"
            onClick={() => setMenuOpen(false)}
          >
            Comenzar ahora
          </Link>
        </div>
      )}
    </header>
  )
}
