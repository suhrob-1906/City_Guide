/**
 * Utility to translate navigation instructions from English to Russian
 */

export function translateInstruction(instruction: string, language: 'en' | 'ru'): string {
    if (language === 'en') return instruction;

    const text = instruction.toLowerCase();

    // Common maneuvers
    const translations: Record<string, string> = {
        // Turns
        'turn left': 'поверните налево',
        'turn right': 'поверните направо',
        'turn sharp left': 'резко поверните налево',
        'turn sharp right': 'резко поверните направо',
        'turn slight left': 'слегка поверните налево',
        'turn slight right': 'слегка поверните направо',
        'bear left': 'держитесь левее',
        'bear right': 'держитесь правее',
        'keep left': 'держитесь левее',
        'keep right': 'держитесь правее',

        // Head
        'head': 'двигайтесь',
        'head north': 'двигайтесь на север',
        'head south': 'двигайтесь на юг',
        'head east': 'двигайтесь на восток',
        'head west': 'двигайтесь на запад',
        'head northeast': 'двигайтесь на северо-восток',
        'head northwest': 'двигайтесь на северо-запад',
        'head southeast': 'двигайтесь на юго-восток',
        'head southwest': 'двигайтесь на юго-запад',

        // Directions
        'north': 'север',
        'south': 'юг',
        'east': 'восток',
        'west': 'запад',
        'northeast': 'северо-восток',
        'northwest': 'северо-запад',
        'southeast': 'юго-восток',
        'southwest': 'юго-запад',

        // Continue
        'continue': 'продолжайте движение',
        'continue straight': 'продолжайте прямо',
        'go straight': 'двигайтесь прямо',

        // Roundabouts
        'roundabout': 'круговое движение',
        'enter the roundabout': 'въезжайте на круговое движение',
        'exit the roundabout': 'съезжайте с кругового движения',
        'take the': 'выберите',
        'first exit': 'первый съезд',
        'second exit': 'второй съезд',
        'third exit': 'третий съезд',
        'fourth exit': 'четвёртый съезд',

        // U-turn
        'make a u-turn': 'развернитесь',
        'u-turn': 'разворот',

        // Arrival
        'arrive': 'вы прибудете',
        'you will arrive': 'вы прибудете',
        'you have arrived': 'вы прибыли',
        'destination': 'пункт назначения',
        'at your destination': 'в пункт назначения',

        // Roads
        'on': 'на',
        'onto': 'на',
        'off': 'с',
        'the': '',
        'road': 'дорогу',
        'street': 'улицу',

        // Misc
        'for': 'в течение',
        'and': 'и',
        'then': 'затем',
    };

    let translated = instruction;

    // Replace each phrase
    for (const [english, russian] of Object.entries(translations)) {
        const regex = new RegExp(`\\b${english}\\b`, 'gi');
        translated = translated.replace(regex, russian);
    }

    return translated;
}

/**
 * Get direction arrow for instruction
 */
export function getDirectionIcon(instruction: string): string {
    const text = instruction.toLowerCase();

    if (text.includes('left') || text.includes('налево')) return '←';
    if (text.includes('right') || text.includes('направо')) return '→';
    if (text.includes('u-turn') || text.includes('разворот')) return '↺';
    if (text.includes('roundabout') || text.includes('кругов')) return '⟲';
    if (text.includes('arrive') || text.includes('прибыл')) return '📍';
    if (text.includes('continue') || text.includes('продолжайте') || text.includes('straight') || text.includes('прямо')) return '↑';

    return '↑';
}
