import type { Metadata } from "next";
import { Poppins, Inter, Playfair_Display, DM_Sans, Plus_Jakarta_Sans, Outfit } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ComparisonProvider } from "@/contexts/ComparisonContext";
import { injectImageStyles } from '@/lib/imageStyles';

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  variable: "--font-poppins",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  weight: ['400', '500', '600', '700', '800'],
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600', '700'],
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700', '800'],
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  weight: ['400', '500', '600', '700', '800'],
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TripDM: Direct Message. Better Travel.",
  description: "TripDM connects travelers directly with trusted travel agents through instant messaging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inject image loading styles
  injectImageStyles();

  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${inter.variable} ${playfair.variable} ${dmSans.variable} ${jakarta.variable} ${outfit.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <ComparisonProvider>
            {children}
          </ComparisonProvider>
        </AuthProvider>
      </body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
