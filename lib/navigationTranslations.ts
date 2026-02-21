/**
 * Utility to translate navigation instructions from English to Russian.
 * Uses longest-match-first to avoid partial word collisions.
 */

type ReplaceFn = (match: string) => string;
type PhraseEntry = [RegExp, string | ReplaceFn];

function ordinalRu(n: number): string {
    return ['первый', 'второй', 'третий', 'четвёртый', 'пятый', 'шестой'][n - 1] ?? `${n}-й`;
}

// All known OSRM / ORS instruction patterns, ordered longest first
const PHRASE_MAP: PhraseEntry[] = [
    // Arrivals
    [/you have arrived at your destination/i, 'Вы прибыли к месту назначения'],
    [/you have arrived/i, 'Вы прибыли'],
    [/arrive at your destination/i, 'Вы прибыли к месту назначения'],
    [/arrive/i, 'Вы прибыли'],

    // U-turns
    [/make a u-?turn/i, 'Развернитесь'],
    [/u-?turn/i, 'Разворот'],

    // Roundabouts
    [/take the (\d+)(?:st|nd|rd|th) exit/i, (m: string) => {
        const match = m.match(/(\d+)/);
        return match ? `${ordinalRu(Number(match[1]))} съезд` : 'съезд';
    }],
    [/at the roundabout.{0,30}(\d+)(?:st|nd|rd|th) exit/i, (m: string) => {
        const match = m.match(/(\d+)/);
        return match ? `На кольце — ${ordinalRu(Number(match[1]))} съезд` : 'На кольце';
    }],
    [/enter the roundabout/i, 'Въезжайте на круговое движение'],
    [/exit the roundabout/i, 'Съезжайте с кругового движения'],
    [/roundabout/i, 'Круговое движение'],

    // Sharp turns
    [/turn sharp(?:ly)? left/i, 'Резко поверните налево'],
    [/turn sharp(?:ly)? right/i, 'Резко поверните направо'],

    // Slight turns
    [/turn slight(?:ly)? left/i, 'Слегка поверните налево'],
    [/turn slight(?:ly)? right/i, 'Слегка поверните направо'],
    [/bear left/i, 'Держитесь левее'],
    [/bear right/i, 'Держитесь правее'],
    [/keep left/i, 'Держитесь левее'],
    [/keep right/i, 'Держитесь правее'],

    // Regular turns
    [/turn left/i, 'Поверните налево'],
    [/turn right/i, 'Поверните направо'],

    // Continue / Straight
    [/continue straight/i, 'Ехать прямо'],
    [/go straight/i, 'Ехать прямо'],
    [/continue/i, 'Ехать прямо'],

    // Departure / Head (compass)
    [/head north\b/i, 'Двигайтесь на север'],
    [/head northeast\b/i, 'Двигайтесь на северо-восток'],
    [/head northwest\b/i, 'Двигайтесь на северо-запад'],
    [/head south\b/i, 'Двигайтесь на юг'],
    [/head southeast\b/i, 'Двигайтесь на юго-восток'],
    [/head southwest\b/i, 'Двигайтесь на юго-запад'],
    [/head east\b/i, 'Двигайтесь на восток'],
    [/head west\b/i, 'Двигайтесь на запад'],
    [/head\b/i, 'Двигайтесь'],
    [/depart/i, 'Начало маршрута'],

    // Merge / Fork
    [/merge left/i, 'Влейтесь в левую полосу'],
    [/merge right/i, 'Влейтесь в правую полосу'],
    [/merge/i, 'Влейтесь'],
    [/fork left/i, 'На развилке держитесь левее'],
    [/fork right/i, 'На развилке держитесь правее'],
    [/fork/i, 'На развилке'],

    // Ramps
    [/take the ramp on the left/i, 'Съезд слева'],
    [/take the ramp on the right/i, 'Съезд справа'],
    [/take the ramp/i, 'Съезд'],

    // Strip trailing "onto Street Name" / "on Street name" to keep it clean
    [/ onto .+$/i, ''],
    [/ on .+$/i, ''],
];

export function translateInstruction(instruction: string, language: 'en' | 'ru'): string {
    if (language === 'en') return instruction;
    if (!instruction || instruction.trim() === '') return '';

    let result = instruction.trim();

    for (const [pattern, replacement] of PHRASE_MAP) {
        if (pattern.test(result)) {
            if (typeof replacement === 'string') {
                result = result.replace(pattern, replacement);
            } else {
                result = result.replace(pattern, replacement);
            }
            break; // Only apply the FIRST matching rule
        }
    }

    // Trim stray whitespace / punctuation
    result = result.replace(/\s{2,}/g, ' ').trim().replace(/[,.\s]+$/, '');
    return result;
}

/**
 * Get direction arrow for instruction
 */
export function getDirectionIcon(instruction: string): string {
    const text = instruction.toLowerCase();
    if (text.includes('left') || text.includes('налево') || text.includes('левее')) return '←';
    if (text.includes('right') || text.includes('направо') || text.includes('правее')) return '→';
    if (text.includes('u-turn') || text.includes('разворот')) return '↺';
    if (text.includes('roundabout') || text.includes('кругов') || text.includes('съезд')) return '⟲';
    if (text.includes('arrive') || text.includes('прибыл') || text.includes('назначен')) return '📍';
    return '↑';
}

/**
 * Format instruction dynamically based on distance for Guidebook/Navigator
 */
export function formatGuidebookInstruction(instruction: string, distance: number, language: 'en' | 'ru'): string {
    const base = translateInstruction(instruction, language);

    if (language === 'en') {
        const distStr = distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`;
        if (distance < 30 || /arrive/i.test(base)) return base;
        if (/straight/i.test(base) && distance > 500) return `Go straight for ${distStr}`;
        return `${base} in ${distStr}`;
    }

    // Russian
    const distStr = distance < 1000 ? `${Math.round(distance)} м` : `${(distance / 1000).toFixed(1)} км`;
    const lower = base.toLowerCase();

    // Arrival — no distance
    if (lower.includes('прибыли') || lower.includes('прибудет') || lower.includes('назначения')) {
        return base;
    }

    // Very close — no distance suffix
    if (distance < 30) {
        return base;
    }

    // Long straight segment
    if ((lower.includes('прямо') || lower.includes('продолжайте')) && distance > 500) {
        return `Ехать прямо ${distStr}`;
    }

    // Turns, roundabout, u-turn — "через X м"
    if (
        lower.includes('налево') ||
        lower.includes('направо') ||
        lower.includes('левее') ||
        lower.includes('правее') ||
        lower.includes('разворот') ||
        lower.includes('кругов') ||
        lower.includes('съезд') ||
        lower.includes('двигайтесь') ||
        lower.includes('начало')
    ) {
        return `${base} через ${distStr}`;
    }

    return `${base} через ${distStr}`;
}
