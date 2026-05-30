// El niño no tiene cuenta propia ni usa AuthContext.
// Accede siempre desde la sesión del tutor.
export default function DashboardNino() {
  return (
    <div className="min-h-screen bg-creative flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold text-white mb-2">
          Mi Espacio
        </h1>
        <p className="font-body text-white/80">
          Modo Niño — próximamente
        </p>
      </div>
    </div>
  );
}
