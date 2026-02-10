'use client';

import { LanguageProvider } from '@/lib/language';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <LanguageProvider>
            <LanguageSwitcher />
            {children}
        </LanguageProvider>
    );
}
