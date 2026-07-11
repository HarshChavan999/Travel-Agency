import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
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

  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${inter.variable} font-inter antialiased`}
      >
        <AuthProvider>
          <ComparisonProvider>
            {children}
          </ComparisonProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
