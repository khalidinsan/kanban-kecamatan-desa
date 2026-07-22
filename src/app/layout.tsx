import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import { BRAND } from "@/config/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: BRAND.name,
  title: {
    default: BRAND.fullName,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: [...BRAND.keywords],
  authors: [{ name: BRAND.regionLong }],
  creator: BRAND.regionLong,
  metadataBase: new URL(
    process.env.AUTH_URL?.replace(/\/$/, "") || "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: BRAND.name,
    title: BRAND.fullName,
    description: BRAND.description,
  },
  twitter: {
    card: "summary",
    title: BRAND.fullName,
    description: BRAND.description,
  },
  icons: {
    icon: [
      { url: "/brand/seal-subang.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/brand/favicon-32.png"],
  },
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0b140f" },
  ],
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-svh bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthSessionProvider>
            {children}
            <Toaster
              richColors
              closeButton
              position="top-right"
              toastOptions={{
                classNames: {
                  toast: "shadow-elevated",
                },
              }}
            />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
