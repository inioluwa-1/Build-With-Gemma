import type { Metadata, Viewport } from "next";
import { Archivo_Black, Inter, Libre_Caslon_Text } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

/** Display face: heavy, compact, reads like signage at arm's length. */
const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Editorial serif for the wordmark and the home-screen hero (stitch split
 * layout). It gives the landing an official-document register; the working
 * screens keep Archivo Black for verdicts, where signage weight matters more.
 */
const libreCaslon = Libre_Caslon_Text({
  variable: "--font-libre-caslon",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

/**
 * Body face. The `vietnamese` subset is not a mistake — it carries U+1EA0–1EF9,
 * which is where Yorùbá's ẹ and ọ live. Ṣ/ṣ (U+1E62/3) fall outside every Inter
 * subset and drop to the Android system font; verify that substitution on a real
 * device before demo (design.md §2, P0 QA item).
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vernac — Official documents, in your true tongue",
  description:
    "Photograph any official document and read it in your own language. Where published rules exist, Vernac checks the numbers and shows the math.",
  applicationName: "Vernac",
  appleWebApp: { capable: true, title: "Vernac", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#F2C230",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${archivoBlack.variable} ${libreCaslon.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning covers only <body>'s own attributes — browser
          extensions (Grammarly, password managers) inject data-* here after SSR,
          which would otherwise flag a hydration mismatch. Real mismatches inside
          the app tree are still reported. */}
      <body className="bg-paper text-ink min-h-full" suppressHydrationWarning>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
