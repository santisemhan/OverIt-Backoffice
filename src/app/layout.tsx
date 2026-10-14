import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

// Brand faces (licensed, so they ship with the repo instead of coming from Google Fonts).
// Satoshi carries the interface; Isidora is display only.
const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "../fonts/Satoshi-Regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/Satoshi-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/Satoshi-Bold.otf", weight: "700", style: "normal" },
    { path: "../fonts/Satoshi-Black.otf", weight: "900", style: "normal" },
  ],
});

const isidora = localFont({
  variable: "--font-isidora",
  display: "swap",
  src: [{ path: "../fonts/Isidora-Black.ttf", weight: "900", style: "normal" }],
});

export const metadata: Metadata = {
  title: { default: "Over It Back Office", template: "%s · Over It Back Office" },
  description: "Trackeo y moderación de Over It (uso interno).",
  applicationName: "Over It Back Office",
  // Internal tool: never indexed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#5E5BE2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${satoshi.variable} ${isidora.variable} antialiased`}>
      <body className="min-h-dvh">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
