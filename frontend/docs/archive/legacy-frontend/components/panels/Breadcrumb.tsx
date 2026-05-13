import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
  view: string;
  inRoot: boolean;
  onRoot: () => void;
}

export function Breadcrumb({ view, inRoot, onRoot }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-[11px] px-3 py-1.5 border border-neutral-200 bg-white">
      <button
        onClick={onRoot}
        className={`tracking-wide transition-colors ${
          inRoot ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-900"
        }`}
      >
        root
      </button>
      {!inRoot && (
        <>
          <ChevronRight size={12} strokeWidth={1.75} className="text-neutral-300" />
          <span className="text-neutral-900 tracking-wide">{view}</span>
        </>
      )}
    </div>
  );
}
