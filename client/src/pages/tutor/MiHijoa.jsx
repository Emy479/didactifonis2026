import { useNavigate } from 'react-router-dom';
import { useChild } from '../../context/ChildContext';

export default function MiHijoa() {
  const { activeChild, enterChildMode } = useChild();
  const navigate = useNavigate();

  if (!activeChild) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-body text-text-soft">No hay ningún niño seleccionado</p>
      </div>
    );
  }

  const calculateAge = (birthDate) => {
    if (!birthDate) return '—';
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleEnterChildMode = () => {
    enterChildMode(activeChild);
    navigate('/nino');
  };

  const progressData = [
    { label: 'Pronunciación', value: 85, color: 'bg-accent' },
    { label: 'Comprensión', value: 80, color: 'bg-primary' },
    { label: 'Conciencia fonológica', value: 80, color: 'bg-creative' },
    { label: 'Participación', value: 70, color: 'bg-energy' },
  ];

  const activities = [
    { name: 'Espejo mágico', level: 'Nivel 2', duration: '15 min' },
    { name: 'Encuentra el sonido', level: 'Nivel 1', duration: '10 min' },
    { name: 'Palabras locas', level: 'Nivel 3', duration: '20 min' },
  ];

  const getAvatarDisplay = (avatarId) => {
    const avatarMap = {
      'nino-1': { emoji: '👦', bg: 'bg-accent' },
      'nino-2': { emoji: '🧒', bg: 'bg-primary' },
      'nina-1': { emoji: '👧', bg: 'bg-creative' },
      'nina-2': { emoji: '🧑', bg: 'bg-optimism' },
    };
    const avatar = avatarMap[avatarId] || { emoji: '👤', bg: 'bg-surface' };
    return (
      <div className={`w-20 h-20 rounded-full ${avatar.bg} flex items-center justify-center text-4xl`}>
        {avatar.emoji}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-white p-8">
      {/* Encabezado */}
      <div className="flex items-start gap-6 mb-8">
        {getAvatarDisplay(activeChild.avatarId)}
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-semibold text-text-strong mb-1">
            {activeChild.name}
          </h1>
          <p className="font-body text-text-soft mb-3">
            {calculateAge(activeChild.birthDate)} años
          </p>
          <p className="font-body text-sm text-text-soft">
            <span className="font-semibold">Objetivo principal:</span> Mejorar la pronunciación del fonema /R/
          </p>
        </div>
        <div className="text-right">
          <p className="font-body text-xs text-text-soft mb-1">Próxima cita</p>
          <p className="font-heading text-lg font-semibold text-accent">21 de mayo</p>
        </div>
      </div>

      {/* Botón Ingresar al modo niño */}
      <button
        onClick={handleEnterChildMode}
        className="w-full bg-gradient-creative text-white font-heading font-semibold rounded-xl px-6 py-4 mb-8 hover:opacity-90 transition"
      >
        🎮 Ingresar al modo niño
      </button>

      {/* Resumen de progreso */}
      <section className="mb-8">
        <h2 className="font-heading text-xl font-semibold text-text-strong mb-4">Resumen de progreso</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {progressData.map((item, idx) => (
            <div key={idx} className="bg-surface rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="font-body text-sm font-medium text-text-strong">{item.label}</p>
                <p className="font-heading text-lg font-semibold text-text-strong">{item.value}%</p>
              </div>
              <div className="w-full bg-white rounded-full h-2.5">
                <div
                  className={`${item.color} h-2.5 rounded-full transition-all`}
                  style={{ width: `${item.value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Actividades asignadas */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-heading text-xl font-semibold text-text-strong">Actividades asignadas</h2>
          <button className="font-body text-sm text-accent hover:underline">Ver todas →</button>
        </div>
        <div className="space-y-3">
          {activities.map((activity, idx) => (
            <div key={idx} className="bg-surface rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-body font-semibold text-text-strong">{activity.name}</p>
                <p className="font-body text-sm text-text-soft">{activity.level}</p>
              </div>
              <div className="text-right">
                <p className="font-body text-sm text-text-soft">{activity.duration}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Consejo para ti */}
      <section className="mb-8">
        <h2 className="font-heading text-xl font-semibold text-text-strong mb-3">💡 Consejo para ti</h2>
        <div className="bg-optimism/10 border-l-4 border-optimism rounded-lg p-4">
          <p className="font-body text-sm text-text-strong">
            Practica con tu hijo/a durante 10-15 minutos diarios. La constancia es clave para ver resultados.
            Celebra cada pequeño logro para mantener la motivación.
          </p>
        </div>
      </section>

      {/* Aviso obligatorio (spec §6.3) - solo si no hay profesional vinculado */}
      {!activeChild.linkedProfessional && (
        <section>
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
            <p className="font-body text-sm text-text-strong">
              ℹ️ El material de apoyo ayuda, pero no reemplaza el tratamiento ni el seguimiento de un profesional fonoaudiólogo.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
