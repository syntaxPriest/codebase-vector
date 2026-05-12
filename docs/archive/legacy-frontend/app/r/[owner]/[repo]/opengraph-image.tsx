import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Codebase — view this repository as a graph";

interface OgParams {
  params: Promise<{ owner: string; repo: string }>;
}

export default async function OpengraphImage({ params }: OgParams): Promise<Response> {
  const { owner, repo } = await params;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "flex-start",
          background: "#ffffff", padding: "80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 8, color: "#a3a3a3", textTransform: "uppercase", marginBottom: 24 }}>
          codebase
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#525252", marginBottom: 12 }}>
          github.com / {owner}
        </div>
        <div style={{ display: "flex", fontSize: 124, fontWeight: 600, color: "#171717", lineHeight: 1, letterSpacing: -3, maxWidth: 1040, overflow: "hidden" }}>
          {repo}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#737373", marginTop: 32 }}>
          interactive graph of files, folders, and imports.
        </div>
      </div>
    ),
    size,
  );
}
