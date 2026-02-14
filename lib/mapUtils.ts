import { useLanguage } from '@/lib/language';

export function getLocationButtonText(permissionState: string, t: (key: string) => string): string {
    switch (permissionState) {
        case 'granted':
            return t('map.locationEnabled');
        case 'denied':
            return t('map.locationDenied');
        case 'unavailable':
            return t('map.locationUnavailable');
        default:
            return t('map.enableLocation');
    }
}

export function getLocationButtonStyle(permissionState: string): string {
    const baseStyle = 'px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium';

    switch (permissionState) {
        case 'granted':
            return `${baseStyle} bg-green-500 text-white`;
        case 'denied':
            return `${baseStyle} bg-red-500 text-white cursor-not-allowed`;
        case 'unavailable':
            return `${baseStyle} bg-gray-400 text-white cursor-not-allowed`;
        default:
            return `${baseStyle} bg-blue-500 text-white hover:bg-blue-600`;
    }
}
