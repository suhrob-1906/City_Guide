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
    {
        id: 'clinics',
        name: 'Clinics',
        nameRu: 'Поликлиники',
        icon: '🏥',
        color: '#8b5cf6',
        overpassQuery: 'amenity=clinic',
    },
    {
        id: 'scooters',
        name: 'Electric Scooters',
        nameRu: 'Электросамокаты',
        icon: '🛴',
        color: '#f59e0b',
        // Query for scooter rental/sharing stations and parking
        overpassQuery: 'amenity=bicycle_rental;amenity=charging_station',
    },
    {
        id: 'rent_car',
        name: 'Rent Car',
        nameRu: 'Аренда авто',
        icon: '🚗',
        color: '#ef4444',
        overpassQuery: 'amenity=car_rental',
    },
    {
        id: 'parking',
        name: 'Parking',
        nameRu: 'Парковка',
        icon: '🅿️',
        color: '#3b82f6',
        overpassQuery: 'amenity=parking',
    },
];
