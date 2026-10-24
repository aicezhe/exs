import type { ReactNode } from "react";

export const metadata = {
  title: "EXS",
  description: "Voice command log",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#0e0f11",
          color: "#e6e6e6",
          fontFamily: "ui-sans-serif, -apple-system, system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
