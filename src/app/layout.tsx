import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";
import { BottomNav, SidebarNav } from "@/components/Sidebar";
import { StatusBanner } from "@/components/StatusBanner";
import { ServiceWorker } from "@/components/ServiceWorker";
import { authEnabled } from "@/lib/auth";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Job Finder",
  description: "Swipe Canadian jobs, tailor your resume, write cover letters and prepare for interviews.",
  applicationName: "Job Finder",
  appleWebApp: { capable: true, title: "Job Finder", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf1f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a23" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const auth = authEnabled();
  return (
    <html lang="en-CA" className={`${publicSans.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="flex min-h-screen flex-col md:flex-row">
          <Suspense fallback={null}>
            <SidebarNav authEnabled={auth} />
          </Suspense>
          <div className="min-w-0 flex-1 pt-[env(safe-area-inset-top)]">
            <StatusBanner />
            <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-8 md:py-10">{children}</main>
          </div>
        </div>
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
        <ServiceWorker />
      </body>
    </html>
  );
}
