import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TestModeBanner from "@/components/TestModeBanner";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Reffie Follow-Up Writer",
  description: "Generate follow-up emails for sales calls",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} bg-[#FAF8F5] min-h-screen`}>
        <TestModeBanner />
        {children}
      </body>
    </html>
  );
}
