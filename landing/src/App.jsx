import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ResourcesPage from './pages/ResourcesPage'
import ContactPage from './pages/ContactPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route
          path="/recursos"
          element={
            <Layout>
              <ResourcesPage />
            </Layout>
          }
        />
        <Route
          path="/contacto"
          element={
            <Layout>
              <ContactPage />
            </Layout>
          }
        />
        <Route
          path="/iniciar-sesion"
          element={
            <Layout>
              <LoginPage />
            </Layout>
          }
        />
        <Route
          path="/comenzar"
          element={
            <Layout>
              <RegisterPage />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
