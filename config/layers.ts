export interface PoiLayer {
    id: string;
    name: string;
    nameRu: string;
    icon: string;
    color: string;
    overpassQuery: string;
}

export const POI_LAYERS: PoiLayer[] = [
    {
        id: 'toilets',
        name: 'Toilets',
        nameRu: 'Туалеты',
        icon: '🚻', // This is for UI, not map
        color: '#3b82f6',
        overpassQuery: 'amenity=toilets',
    },
    {
        id: 'hospitals',
        name: 'Hospitals',
        nameRu: 'Больницы',
        icon: '🏥',
        color: '#ef4444',
        overpassQuery: 'amenity=hospital',
    },
    {
        id: 'wheelchair',
        name: 'Wheelchair Access',
        nameRu: 'Доступность',
        icon: '♿',
        color: '#10b981',
        overpassQuery: 'wheelchair=yes',
    },
];
