/**
 * Root layout — fonts, theme bootstrap (no-flash), ThemeProvider.
 */

import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
    title: "IPM — Innovation Process Model",
    description: "Innovation portfolio management platform. Submit and manage your business needs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="light">
            <head>
                {/* Read saved theme before first paint to prevent flash */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `try{var t=localStorage.getItem('ipm-theme');if(t==='dark')document.documentElement.className='dark';}catch(e){}`,
                    }}
                />
            </head>
            <body>
                <ThemeProvider>
                    <div className="theme-utility-tray">
                        <ThemeToggle />
                    </div>
                    {children}
                    <Toaster position="bottom-right" richColors />
                </ThemeProvider>
            </body>
        </html>
    );
}
