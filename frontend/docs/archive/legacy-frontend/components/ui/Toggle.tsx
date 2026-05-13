import { Check } from "lucide-react";

interface ToggleProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

export function Toggle({ active, onClick, label }: ToggleProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 border text-[11px] transition-colors ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400 hover:text-neutral-900"
      }`}
    >
      <span
        className={`flex items-center justify-center w-3.5 h-3.5 ${
          active ? "text-white" : "text-transparent"
        }`}
      >
        <Check size={12} strokeWidth={2.25} />
      </span>
      <span>{label}</span>
    </button>
  );
}
