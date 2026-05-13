import { AlertTriangle } from "lucide-react";
import type { Truncation } from "@/lib/codebase/types";

interface TruncationNoticeProps {
  truncated: Truncation | null;
}

export function TruncationNotice({ truncated }: TruncationNoticeProps) {
  if (!truncated) return null;
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 mt-[88px] z-10 px-3 py-1.5 border border-neutral-200 bg-white text-neutral-700 flex items-center gap-2 text-[11px] font-mono">
      <AlertTriangle size={12} strokeWidth={1.75} className="text-neutral-500" />
      <span>
        showing {truncated.kept} of {truncated.total} source files
      </span>
    </div>
  );
}
