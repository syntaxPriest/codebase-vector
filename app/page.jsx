"use client";

import dynamic from "next/dynamic";

const CodebaseVectorSpace = dynamic(
  () => import("@/components/CodebaseVectorSpace"),
  { ssr: false }
);

export default function Page() {
  return <CodebaseVectorSpace />;
}
