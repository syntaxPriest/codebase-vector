"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LucideIcon } from "lucide-react";

export interface ContextMenuItem {
  label: string;
  Icon?: LucideIcon;
  onClick?: () => void;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  /** Right-aligned secondary text (e.g. "@-ref"). */
  hint?: string;
}

interface MenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface ContextMenuApi {
  open: (e: { clientX: number; clientY: number; preventDefault: () => void }, items: ContextMenuItem[]) => void;
  close: () => void;
}

const Ctx = createContext<ContextMenuApi | null>(null);

const NOOP_API: ContextMenuApi = { open: () => {}, close: () => {} };

export function useContextMenu(): ContextMenuApi {
  // Stable api object identity → consuming components never re-render
  // when the menu opens or closes. The fallback is also a module-level
  // constant so non-provider trees behave the same way.
  return useContext(Ctx) ?? NOOP_API;
}

// The Provider holds *only* the api. State lives in the host below,
// so opening / closing the menu re-renders just the host, not every
// consumer of the context.
export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const subscriberRef = useRef<((next: MenuState | null) => void) | null>(null);

  const api = useMemo<ContextMenuApi>(
    () => ({
      open: (e, items) => {
        e.preventDefault();
        if (items.length === 0) return;
        subscriberRef.current?.({ x: e.clientX, y: e.clientY, items });
      },
      close: () => subscriberRef.current?.(null),
    }),
    [],
  );

  const subscribe = useCallback((fn: (next: MenuState | null) => void) => {
    subscriberRef.current = fn;
    return () => {
      if (subscriberRef.current === fn) subscriberRef.current = null;
    };
  }, []);

  return (
    <Ctx.Provider value={api}>
      {children}
      <MenuHost subscribe={subscribe} />
    </Ctx.Provider>
  );
}

interface MenuHostProps {
  subscribe: (fn: (next: MenuState | null) => void) => () => void;
}

function MenuHost({ subscribe }: MenuHostProps) {
  const [state, setState] = useState<MenuState | null>(null);

  useEffect(() => subscribe(setState), [subscribe]);

  useEffect(() => {
    if (!state) return;
    const close = () => setState(null);
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-context-menu-root]")) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [state]);

  if (!state) return null;
  return <FloatingMenu state={state} onClose={() => setState(null)} />;
}

function FloatingMenu({ state, onClose }: { state: MenuState; onClose: () => void }) {
  const MENU_W = 240;
  const MENU_MAX_H = 320;
  const x = typeof window !== "undefined"
    ? Math.min(state.x, window.innerWidth - MENU_W - 8)
    : state.x;
  const y = typeof window !== "undefined"
    ? Math.min(state.y, window.innerHeight - MENU_MAX_H - 8)
    : state.y;

  return (
    <div
      role="menu"
      data-context-menu-root
      onMouseDown={(e: ReactMouseEvent) => e.stopPropagation()}
      onContextMenu={(e: ReactMouseEvent) => e.preventDefault()}
      style={{
        position: "fixed",
        left: x,
        top: y,
        width: MENU_W,
        maxHeight: MENU_MAX_H,
        zIndex: 100,
        boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
      }}
      className="bg-white border border-neutral-300 py-1 overflow-y-auto"
    >
      {state.items.map((item, i) => {
        if (item.separator) {
          return <div key={`sep-${i}`} className="my-1 border-t border-neutral-200" />;
        }
        return (
          <button
            key={`${i}-${item.label}`}
            role="menuitem"
            type="button"
            tabIndex={-1}
            disabled={item.disabled}
            onMouseDown={(e: ReactMouseEvent) => {
              // Run before any blur-driven side effects (which would
              // clear the document selection) and don't accept focus
              // (which would trigger scroll-into-view in some browsers).
              e.preventDefault();
              e.stopPropagation();
              if (!item.disabled) item.onClick?.();
              onClose();
            }}
            onClick={(e: ReactMouseEvent) => e.preventDefault()}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors ${
              item.disabled
                ? "text-neutral-300 cursor-not-allowed"
                : "text-neutral-800 hover:bg-neutral-100"
            }`}
          >
            {item.Icon
              ? <item.Icon size={12} strokeWidth={1.75} className="text-neutral-500 flex-shrink-0" />
              : <span className="w-3 flex-shrink-0" />}
            <span className="flex-1 truncate">{item.label}</span>
            {item.shortcut && (
              <kbd className="text-[10px] font-mono text-neutral-400">{item.shortcut}</kbd>
            )}
            {item.hint && (
              <span className="text-[10px] font-mono text-neutral-400">{item.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
