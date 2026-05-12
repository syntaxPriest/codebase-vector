import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Codebase — see any codebase as a graph";

export default async function OpengraphImage(): Promise<Response> {
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
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 600, color: "#171717", lineHeight: 1.05, letterSpacing: -2 }}>
          <div style={{ display: "flex" }}>see any codebase</div>
          <div style={{ display: "flex" }}>as a graph.</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#737373", marginTop: 28 }}>
          paste a github url. files become nodes. imports become edges.
        </div>
      </div>
    ),
    size,
  );
}
