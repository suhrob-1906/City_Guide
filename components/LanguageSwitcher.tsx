'use client';

import { useLanguage } from '@/lib/language';
import { Globe } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        console.log('[LanguageSwitcher] Mounted, current language:', language);
    }, [language]);

    // Don't render on server to avoid hydration mismatch
    if (!mounted) {
        return null;
    }

    const handleLanguageChange = (lang: 'en' | 'ru') => {
        console.log('[LanguageSwitcher] Button clicked, changing to:', lang);
        setLanguage(lang);
    };

    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 glass px-4 py-2 rounded-full shadow-lg border border-white/20">
            <Globe className="w-4 h-4 text-white" />
            <div className="flex bg-black/20 rounded-full p-1">
                <button
                    onClick={() => handleLanguageChange('en')}
                    className={`px-3 py-1 rounded-full transition-all text-sm font-bold ${language === 'en'
                        ? 'bg-white text-purple-600 shadow-md'
                        : 'text-white hover:bg-white/20'
                        }`}
                >
                    EN
                </button>
                <button
                    onClick={() => handleLanguageChange('ru')}
                    className={`px-3 py-1 rounded-full transition-all text-sm font-bold ${language === 'ru'
                        ? 'bg-white text-purple-600 shadow-md'
                        : 'text-white hover:bg-white/20'
                        }`}
                >
                    RU
                </button>
            </div>
        </div>
    );
}
