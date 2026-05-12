import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Codebase demo · synthetic codebase";

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
        <div style={{ display: "flex", fontSize: 28, color: "#525252", marginBottom: 12 }}>
          synthetic codebase
        </div>
        <div style={{ display: "flex", fontSize: 130, fontWeight: 600, color: "#171717", lineHeight: 1, letterSpacing: -3 }}>
          demo
        </div>
      </div>
    ),
    size,
  );
}
