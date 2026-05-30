export default function TrialBanner({ daysRemaining, onActivate }) {
  const message =
    daysRemaining === 0
      ? 'Tu periodo de prueba vence hoy.'
      : `Te quedan ${daysRemaining} día${daysRemaining === 1 ? '' : 's'} de prueba.`;

  return (
    <div className="w-full bg-orange-50 border border-orange-200 px-4 py-2 flex items-center justify-between gap-4">
      <p className="font-body text-sm text-orange-700">{message}</p>
      <button
        onClick={onActivate}
        className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white font-heading text-xs font-semibold rounded-xl px-3 py-1.5 transition"
      >
        Activar ahora
      </button>
    </div>
  );
}
