import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ApplyFlow · Your next chapter",
  description: "A private, local-first workspace for your job search.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
