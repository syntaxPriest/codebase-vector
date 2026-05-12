"use client";

import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { GithubMark } from "@/components/ui/GithubMark";
import { GoogleMark } from "@/components/ui/GoogleMark";
import type { AuthProvider } from "@/lib/codebase/types";

export type AuthMode = "login" | "signup";

const DEMO_EMAIL = "demo@codebase.dev";
const DEMO_PASSWORD = "password123";

const PROVIDER_LABEL: Record<Exclude<AuthProvider, "email">, string> = {
  github: "GitHub",
  google: "Google",
};

function ProviderIcon({ provider, size = 14 }: { provider: Exclude<AuthProvider, "email">; size?: number }) {
  if (provider === "github") return <GithubMark size={size} />;
  return <GoogleMark size={size} />;
}

interface SignInModalProps {
  open: boolean;
  initialMode: AuthMode;
  onClose: () => void;
}

export function SignInModal({ open, initialMode, onClose }: SignInModalProps) {
  const { providers, login, signup } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError(null);
    setLoading(false);
    const t = setTimeout(() => emailRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open, initialMode]);

  if (!open) return null;

  const oauthProviders: Array<Exclude<AuthProvider, "email">> = providers
    .filter((p): p is Exclude<AuthProvider, "email"> => p !== "email");

  const submit = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await signup(email.trim(), password, name.trim());
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "auth failed");
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setName("");
    setError(null);
    setMode("login");
  };

  const submitDisabled =
    loading ||
    !email.trim() ||
    !password ||
    (mode === "signup" && password.length < 6);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/20 flex items-start justify-center pt-[12vh]"
      onClick={onClose}
      onKeyDown={onKey}
    >
      <div
        className="bg-white border border-neutral-300 w-[420px] max-w-[calc(100vw-32px)]"
        style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.14)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex items-center border-b border-neutral-200">
          <Tab active={mode === "login"} onClick={() => { setMode("login"); setError(null); }} label="Log in" />
          <Tab active={mode === "signup"} onClick={() => { setMode("signup"); setError(null); }} label="Sign up" />
          <button
            onClick={onClose}
            className="ml-auto mr-2 p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="close"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* Form */}
        <form className="px-5 py-5 space-y-3" onSubmit={submit}>
          {mode === "signup" && (
            <Field label="Name" optional>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="optional"
                autoComplete="name"
                className="w-full px-3 py-2 text-[13px] border border-neutral-200 outline-none focus:border-neutral-900 transition-colors text-neutral-900 placeholder:text-neutral-400"
              />
            </Field>
          )}

          <Field label="Email">
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full px-3 py-2 text-[13px] font-mono border border-neutral-200 outline-none focus:border-neutral-900 transition-colors text-neutral-900 placeholder:text-neutral-400"
            />
          </Field>

          <Field label="Password" hint={mode === "signup" ? "min. 6 characters" : undefined}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full px-3 py-2 text-[13px] font-mono border border-neutral-200 outline-none focus:border-neutral-900 transition-colors text-neutral-900 placeholder:text-neutral-400"
            />
          </Field>

          <button
            type="submit"
            disabled={submitDisabled}
            className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 bg-neutral-900 text-white hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed text-[12px] font-medium tracking-wide uppercase transition-colors"
          >
            {loading
              ? <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              : <span>{mode === "login" ? "Log in" : "Create account"}</span>}
          </button>

          {error && (
            <div className="text-[11px] text-neutral-700 font-mono" role="alert">{error}</div>
          )}
        </form>

        {/* Demo creds (login only) */}
        {mode === "login" && (
          <div className="px-5 pb-4">
            <div className="border border-dashed border-neutral-200 px-3 py-2.5 flex items-start justify-between gap-3">
              <div className="text-[11px] leading-relaxed">
                <div className="text-neutral-500 font-mono mb-0.5">demo credentials</div>
                <div className="font-mono text-neutral-800">
                  {DEMO_EMAIL}<br />
                  {DEMO_PASSWORD}
                </div>
              </div>
              <button
                onClick={fillDemo}
                className="text-[10px] tracking-wide uppercase font-mono text-neutral-700 hover:text-neutral-900 underline-offset-2 hover:underline whitespace-nowrap"
              >
                use →
              </button>
            </div>
          </div>
        )}

        {/* OAuth */}
        {oauthProviders.length > 0 && (
          <>
            <div className="px-5 flex items-center gap-2 text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono">
              <span className="flex-1 h-px bg-neutral-200" />
              <span>or</span>
              <span className="flex-1 h-px bg-neutral-200" />
            </div>
            <div className="px-5 pt-3 pb-5 space-y-2">
              {oauthProviders.map((p) => (
                <a
                  key={p}
                  href={`/api/auth/${p}`}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 text-[12px] text-neutral-800 transition-colors"
                >
                  <ProviderIcon provider={p} size={13} />
                  <span>continue with {PROVIDER_LABEL[p]}</span>
                </a>
              ))}
            </div>
          </>
        )}

        {oauthProviders.length === 0 && (
          <div className="px-5 pb-4 text-[10px] text-neutral-400 font-mono">
            Set <code className="bg-neutral-100 px-1">GITHUB_CLIENT_ID</code> or{" "}
            <code className="bg-neutral-100 px-1">GOOGLE_CLIENT_ID</code> in <code className="bg-neutral-100 px-1">.env.local</code> to enable OAuth.
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-[12px] tracking-wide transition-colors ${
        active
          ? "text-neutral-900 border-b-[1.5px] border-neutral-900 -mb-[1px]"
          : "text-neutral-500 hover:text-neutral-800"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase font-mono">
          {label}{optional && <span className="text-neutral-300"> · optional</span>}
        </span>
        {hint && <span className="text-[10px] text-neutral-400 font-mono">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
