import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from './ClientLayout';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
    title: 'Uzbek City Helper',
    description: 'Weather, air quality, geomagnetic activity, and accessibility information for Uzbek cities',
    keywords: ['Uzbekistan', 'Tashkent', 'Samarkand', 'Bukhara', 'weather', 'air quality', 'accessibility'],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
