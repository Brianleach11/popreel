import type { Metadata } from "next";
import { Inter } from "next/font/google"
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PopReel",
  description:
    "PopReel is a platform for creating and sharing pop culture content.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
          <Toaster richColors/>
        </body>
      </html>
    </ClerkProvider>
  );
}
