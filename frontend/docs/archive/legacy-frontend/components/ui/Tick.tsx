interface TickProps {
  className?: string;
}

export function Tick({ className = "" }: TickProps) {
  return <div className={`corner-mark ${className}`} />;
}
