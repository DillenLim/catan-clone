import "./globals.css";
import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
    title: "Catan Friends",
    description: "A minimal, web-based Catan clone for friends.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${inter.variable} ${outfit.variable} bg-slate-900 text-slate-100`}>
            <body className={`${inter.className} bg-slate-900 min-h-screen antialiased`}>{children}</body>
        </html>
    );
}
