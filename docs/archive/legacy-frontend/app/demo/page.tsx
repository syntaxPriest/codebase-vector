import type { Metadata } from "next";
import { ClientShell } from "@/components/workspace/ClientShell";

export const metadata: Metadata = {
  title: "Codebase / demo",
};

export default function DemoPage() {
  return <ClientShell repo={{ kind: "demo" }} />;
}
