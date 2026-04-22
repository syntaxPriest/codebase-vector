import "./globals.css";

export const metadata = {
  title: "Codebase Vector Space",
  description: "Interactive 3D visualization of a codebase as vectors in ℝ³.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
