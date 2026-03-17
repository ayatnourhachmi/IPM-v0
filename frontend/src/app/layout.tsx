/**
 * Root layout — Google Fonts (DM Sans, DM Mono, Playfair Display, JetBrains Mono) and metadata.
 */

import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
    title: "IPM — Innovation Progress Model",
    description: "Innovation portfolio management platform. Submit and manage your business needs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=JetBrains+Mono:wght@400;500&family=Playfair+Display:ital,wght@1,700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                {children}
                <Toaster theme="dark" position="bottom-right" richColors />
            </body>
        </html>
    );
}
