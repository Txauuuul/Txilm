export default function ScoreCard({ emoji, label, value, subtitle, color }) {
  return (
    <div className="flex flex-col items-center bg-cine-card rounded-xl p-3 min-w-[90px] ring-1 ring-cine-border">
      <span className="text-2xl mb-1">{emoji}</span>
      <span className="text-[11px] text-cine-muted font-medium">{label}</span>
      <span className={`text-lg font-extrabold ${color || "text-white"}`}>
        {value ?? "—"}
      </span>
      {subtitle && (
        <span className="text-[10px] text-cine-muted mt-0.5">{subtitle}</span>
      )}
    </div>
  );
}
