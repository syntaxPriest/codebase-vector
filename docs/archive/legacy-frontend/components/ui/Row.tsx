import type { ReactNode } from "react";

interface RowProps {
  label: string;
  value: ReactNode;
}

export function Row({ label, value }: RowProps) {
  return (
    <div>
      <span className="text-neutral-400">{label} </span>
      <span className="text-neutral-900 font-medium tabular-nums">{value}</span>
    </div>
  );
}
