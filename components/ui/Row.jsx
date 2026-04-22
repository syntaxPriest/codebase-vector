export function Row({ label, value }) {
  return (
    <div>
      <span className="text-white/40">{label} </span>
      <span className="text-white font-medium tabular-nums">{value}</span>
    </div>
  );
}
