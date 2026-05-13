"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SignInModal, type AuthMode } from "./SignInModal";

// Top-of-landing auth controls. Signed-out state shows "Log in" /
// "Sign up" buttons that open the modal in the matching tab.
// Signed-in state shows a compact chip with avatar, name, provider
// badge, and a logout icon.
export function TopAuth() {
  const { user, githubAccess, loading, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<AuthMode>("login");

  const open = (mode: AuthMode) => {
    setModalMode(mode);
    setModalOpen(true);
  };

  if (loading) {
    return <span className="text-[11px] text-neutral-300 font-mono">·</span>;
  }

  if (user) {
    return (
      <div className="inline-flex items-center gap-2.5 text-[11px]">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            width={22}
            height={22}
            className="w-[22px] h-[22px] rounded-full border border-neutral-200"
          />
        ) : (
          <div className="w-[22px] h-[22px] rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[10px] font-mono text-neutral-700">
            {(user.name || user.email || "u").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-neutral-800 font-medium">
            {user.name || user.email || "user"}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">·{user.provider}</span>
        </div>
        {!githubAccess && user.provider !== "github" && (
          <a
            href="/api/auth/github"
            className="text-[10px] text-neutral-400 hover:text-neutral-900 font-mono underline-offset-2 hover:underline"
            title="connect GitHub for private repo access"
          >
            +github
          </a>
        )}
        <button
          onClick={logout}
          className="text-neutral-400 hover:text-neutral-900 transition-colors"
          aria-label="sign out"
          title="sign out"
        >
          <LogOut size={12} strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="inline-flex items-center gap-2">
        <button
          onClick={() => open("login")}
          className="px-3 py-1.5 text-[11px] tracking-wide text-neutral-700 hover:text-neutral-900 transition-colors"
        >
          Log in
        </button>
        <button
          onClick={() => open("signup")}
          className="px-3 py-1.5 text-[11px] tracking-wide bg-neutral-900 text-white hover:bg-black transition-colors"
        >
          Sign up
        </button>
      </div>

      <SignInModal
        open={modalOpen}
        initialMode={modalMode}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
