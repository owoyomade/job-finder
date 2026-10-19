import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";
import { SidebarNav, SidebarNavFallback } from "@/components/Sidebar";
import { StatusBanner } from "@/components/StatusBanner";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Job Finder",
  description: "Search Canadian jobs, tailor your resume, write cover letters and prepare for interviews.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={`${publicSans.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="flex min-h-screen flex-col md:flex-row">
          <aside className="border-b border-line bg-surface px-4 py-3 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r md:px-4 md:py-6">
            <Link href="/jobs" className="mb-3 block font-display text-xl font-extrabold tracking-tight md:mb-8">
              Job Finder
              <span className="block text-xs font-normal tracking-normal text-muted">Canada</span>
            </Link>
            <Suspense fallback={<SidebarNavFallback />}>
              <SidebarNav />
            </Suspense>
          </aside>
          <div className="min-w-0 flex-1">
            <StatusBanner />
            <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
