import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
// import FirebaseDebugger from "@/components/FirebaseDebugger";
// import AuthDebugger from "@/components/AuthDebugger";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XOXO - Live Video Connections",
  description: "Connect with amazing people through live video chat",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900`}
      >
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        </head>
        <AuthProvider>
          {children}
          {/* <AuthDebugger /> */}
          {/* <FirebaseDebugger /> */}
        </AuthProvider>
      </body>
    </html>
  );
}
