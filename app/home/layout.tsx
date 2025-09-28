import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/home/header";

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "GlobeTrail",
    description: "AI-Powered Travel Planning",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistMono.variable} ${inter.variable} antialiased`}
                suppressHydrationWarning
            >
                <Header />
                {children}
            </body>
        </html>
    );
}
