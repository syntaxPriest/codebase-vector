import Link from "next/link";
import { UrlForm } from "./UrlForm";
import { RecentRepos } from "./RecentRepos";
import { TopAuth } from "./TopAuth";
import { LottiePlayer } from "@/components/ui/LottiePlayer";

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-neutral-900 px-6 py-12 relative">
      <header className="absolute top-0 inset-x-0 px-6 py-5 flex items-center justify-between">
        <div className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase font-mono">
          codebase
        </div>
        <TopAuth />
      </header>

      <div className="w-full max-w-md">
        <LottiePlayer
          src="/lottie/code-review.json"
          className="mx-auto mb-4"
          style={{ width: 320, height: 214 }}
          ariaLabel="code review animation"
        />
        <h1 className="text-3xl font-semibold tracking-tight text-center text-neutral-900 mb-3">
          See any codebase as a graph.
        </h1>
        <p className="text-[13px] text-neutral-500 text-center mb-8 leading-relaxed">
          Paste a GitHub URL. Files and folders become nodes; imports become edges.
        </p>

        <UrlForm />

        <div className="mt-6 flex items-center justify-center text-[12px]">
          <Link
            href="/demo"
            className="text-neutral-500 hover:text-neutral-900 underline-offset-4 hover:underline transition-colors"
          >
            try a synthetic demo →
          </Link>
        </div>

        <RecentRepos />
      </div>

      <footer className="absolute bottom-6 text-[10px] tracking-[0.2em] text-neutral-300 uppercase font-mono">
        public repos · javascript / typescript
      </footer>
    </div>
  );
}
