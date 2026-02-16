import React from 'react';
import { ArrowRight, ArrowLeft, ArrowUp, RotateCw, MapPin } from 'lucide-react';
import { useLanguage } from '@/lib/language';
import { translateInstruction } from '@/lib/navigationTranslations';

interface NavigationOverlayProps {
    instruction: string;
    distance: number; // in meters
    type?: number; // maneuver type from OSRM/ORS
    nextInstruction?: string;
    isVisible: boolean;
}

export const NavigationOverlay: React.FC<NavigationOverlayProps> = ({
    instruction,
    distance,
    type,
    isVisible
}) => {
    const { language } = useLanguage();

    if (!isVisible) return null;

    // Translate instruction to current language
    const translatedInstruction = translateInstruction(instruction, language);

    // Helper to get icon based on type/text
    const getIcon = () => {
        // Simple heuristic based on text if type not reliable
        const text = translatedInstruction.toLowerCase();
        if (text.includes('left') || text.includes('налево')) return <ArrowLeft className="w-10 h-10 text-white" />;
        if (text.includes('right') || text.includes('направо')) return <ArrowRight className="w-10 h-10 text-white" />;
        if (text.includes('u-turn') || text.includes('разворот')) return <RotateCw className="w-10 h-10 text-white" />;
        if (text.includes('roundabout') || text.includes('кругов')) return <RotateCw className="w-10 h-10 text-white" />;
        if (text.includes('arrive') || text.includes('прибыл')) return <MapPin className="w-10 h-10 text-white" />;
        return <ArrowUp className="w-10 h-10 text-white" />;
    };

    return (
        <div className="absolute bottom-4 left-4 right-4 z-[20] flex flex-col gap-2 pointer-events-none max-w-full sm:max-w-md mx-auto">
            <div className="bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
                <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/30 shrink-0">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-2xl font-bold font-mono tracking-tight leading-none mb-0.5">
                        {distance < 1000 ? `${Math.round(distance)} м` : `${(distance / 1000).toFixed(1)} км`}
                    </div>
                    <div className="text-sm sm:text-base font-medium text-blue-100 truncate leading-tight">
                        {translatedInstruction}
                    </div>
                </div>
            </div>
        </div>
    );
};
