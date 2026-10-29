import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/components/query-provider";
import { Inter, IBM_Plex_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const ibmPlexSansHeading = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "AICTE Scrutiny System | Institutional Document Verification",
  description: "Automated document checks and cross-verification for AICTE institutional approval workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", inter.variable, ibmPlexSansHeading.variable)}
    >
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col font-sans transition-colors duration-150">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
            <footer className="border-t border-border bg-card/60 py-3 text-center text-[11px] text-muted-foreground">
              All India Council for Technical Education (AICTE) • Official Scrutiny Portal
            </footer>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
