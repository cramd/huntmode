import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import { PostHogProvider } from "@/components/PostHogProvider";
import { PostHogPageView } from "@/components/PostHogPageView";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HuntMode | AI Job Application Assistant",
  description: "An open source AI job application assistant providing free BYOK AI-powered resume tailoring, cover letter generation, and application tracking. Your API keys remain 100% locally secure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full">
        <GoogleAnalytics gaId="G-M7B7K5L6WF" />
        <PostHogProvider>
          <AuthProvider>
            <PostHogPageView />
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}

