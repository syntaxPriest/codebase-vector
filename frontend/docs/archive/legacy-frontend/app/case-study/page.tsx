// Hidden test page that renders a real-world README under realistic
// repo metadata so the image-path / link rewriter and the rest of the
// markdown rendering can be verified visually against GitHub's own
// rendering.

import { readFileSync } from "fs";
import path from "path";
import type { Metadata } from "next";
import { CaseStudyClient } from "./CaseStudyClient";

export const metadata: Metadata = {
  title: "Codebase / case study · nasa-jpl/open-source-rover",
};

const md = readFileSync(
  path.join(process.cwd(), "case-studies", "nasa-rover.md"),
  "utf8",
);

export default function Page() {
  return (
    <CaseStudyClient
      readme={md}
      owner="nasa-jpl"
      repoName="open-source-rover"
      branch="master"
    />
  );
}
