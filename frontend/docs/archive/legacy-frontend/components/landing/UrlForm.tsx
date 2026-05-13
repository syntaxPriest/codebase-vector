"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { GithubMark } from "@/components/ui/GithubMark";

interface ParsedSlug {
  owner: string;
  repo: string;
}

// Accept "owner/repo", "github.com/owner/repo[.git]",
// "https://github.com/owner/repo[/...]", "git@github.com:owner/repo.git".
export function parseGithub(input: string): ParsedSlug | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:github\.com[/:])?([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i
  );
  if (!m) return null;
  const owner = m[1];
  const repo  = m[2];
  if (owner === "github.com" || !owner || !repo) return null;
  return { owner, repo };
}

export function UrlForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const parsed = parseGithub(value);
        if (!parsed) {
          setError("could not parse · expected github.com/owner/repo");
          return;
        }
        setLoading(true);
        router.push(`/r/${parsed.owner}/${parsed.repo}`);
      }}
      className="space-y-2"
    >
      <div className="flex items-stretch border border-neutral-200 focus-within:border-neutral-900 transition-colors">
        <div className="flex items-center pl-3 pr-2 text-neutral-400">
          <GithubMark size={16} />
        </div>
        <input
          type="text"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="github.com/owner/repo"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 pr-4 py-3 text-[13px] font-mono outline-none bg-white text-neutral-900 placeholder:text-neutral-400"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="px-4 bg-neutral-900 text-white hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          aria-label="open"
        >
          {loading
            ? <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
            : <ArrowRight size={16} strokeWidth={1.75} />}
        </button>
      </div>
      {error && (
        <div className="text-[11px] text-neutral-700 font-mono">{error}</div>
      )}
    </form>
  );
}
