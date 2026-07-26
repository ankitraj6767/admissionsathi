import { slugify } from '@/lib/utils';

export interface StateSeed {
    name: string;
    code: string;
    region: 'North' | 'South' | 'East' | 'West' | 'Central' | 'North-East';
    isUnionTerritory?: boolean;
    counsellingAuthority?: string;
    isFeatured?: boolean;
    cities: { name: string; tier: 1 | 2 | 3; isMetro?: boolean; isFeatured?: boolean }[];
}

/** States, union territories and major cities used by filters and SEO landing pages. */
export const STATE_SEEDS: StateSeed[] = [
    {
        name: 'Delhi',
        code: 'DL',
        region: 'North',
        isUnionTerritory: true,
        counsellingAuthority: 'Directorate of Training & Technical Education',
        isFeatured: true,
        cities: [
            { name: 'New Delhi', tier: 1, isMetro: true, isFeatured: true },
            { name: 'Dwarka', tier: 2 },
            { name: 'Rohini', tier: 2 },
        ],
    },
    {
        name: 'Maharashtra',
        code: 'MH',
        region: 'West',
        counsellingAuthority: 'State CET Cell, Maharashtra',
        isFeatured: true,
        cities: [
            { name: 'Mumbai', tier: 1, isMetro: true, isFeatured: true },
            { name: 'Pune', tier: 1, isMetro: true, isFeatured: true },
            { name: 'Nagpur', tier: 2, isFeatured: true },
            { name: 'Nashik', tier: 2 },
            { name: 'Aurangabad', tier: 3 },
        ],
    },
    {
        name: 'Karnataka',
        code: 'KA',
        region: 'South',
        counsellingAuthority: 'Karnataka Examinations Authority',
        isFeatured: true,
        cities: [
            { name: 'Bengaluru', tier: 1, isMetro: true, isFeatured: true },
            { name: 'Mysuru', tier: 2, isFeatured: true },
            { name: 'Mangaluru', tier: 2 },
            { name: 'Hubballi', tier: 3 },
        ],
    },
    {
        name: 'Tamil Nadu',
        code: 'TN',
        region: 'South',
        counsellingAuthority: 'Directorate of Technical Education, Tamil Nadu',
        isFeatured: true,
        cities: [
            { name: 'Chennai', tier: 1, isMetro: true, isFeatured: true },
            { name: 'Coimbatore', tier: 2, isFeatured: true },
            { name: 'Madurai', tier: 2 },
            { name: 'Tiruchirappalli', tier: 3 },
        ],
    },
    {
        name: 'Uttar Pradesh',
        code: 'UP',
        region: 'North',
        counsellingAuthority: 'Abdul Kalam Technical University',
        isFeatured: true,
        cities: [
            { name: 'Lucknow', tier: 1, isFeatured: true },
            { name: 'Noida', tier: 1, isFeatured: true },
            { name: 'Kanpur', tier: 2 },
            { name: 'Varanasi', tier: 2 },
            { name: 'Prayagraj', tier: 3 },
        ],
    },
    {
        name: 'Telangana',
        code: 'TG',
        region: 'South',
        counsellingAuthority: 'TS EAMCET Convener',
        isFeatured: true,
        cities: [
            { name: 'Hyderabad', tier: 1, isMetro: true, isFeatured: true },
            { name: 'Warangal', tier: 3 },
        ],
    },
    {
        name: 'West Bengal',
        code: 'WB',
        region: 'East',
        counsellingAuthority: 'West Bengal Joint Entrance Examinations Board',
        isFeatured: true,
        cities: [
            { name: 'Kolkata', tier: 1, isMetro: true, isFeatured: true },
            { name: 'Durgapur', tier: 3 },
            { name: 'Siliguri', tier: 3 },
        ],
    },
    {
        name: 'Gujarat',
        code: 'GJ',
        region: 'West',
        counsellingAuthority: 'Admission Committee for Professional Courses',
        cities: [
            { name: 'Ahmedabad', tier: 1, isFeatured: true },
            { name: 'Surat', tier: 2 },
            { name: 'Vadodara', tier: 2 },
        ],
    },
    {
        name: 'Rajasthan',
        code: 'RJ',
        region: 'North',
        counsellingAuthority: 'Centre for Electronic Governance, Jaipur',
        cities: [
            { name: 'Jaipur', tier: 1, isFeatured: true },
            { name: 'Kota', tier: 2, isFeatured: true },
            { name: 'Udaipur', tier: 3 },
        ],
    },
    {
        name: 'Madhya Pradesh',
        code: 'MP',
        region: 'Central',
        counsellingAuthority: 'Directorate of Technical Education, MP',
        cities: [
            { name: 'Bhopal', tier: 2, isFeatured: true },
            { name: 'Indore', tier: 1, isFeatured: true },
            { name: 'Gwalior', tier: 3 },
        ],
    },
    {
        name: 'Bihar',
        code: 'BR',
        region: 'East',
        counsellingAuthority: 'Bihar Combined Entrance Competitive Examination Board',
        isFeatured: true,
        cities: [
            { name: 'Patna', tier: 2, isFeatured: true },
            { name: 'Gaya', tier: 3 },
            { name: 'Muzaffarpur', tier: 3 },
        ],
    },
    {
        name: 'Kerala',
        code: 'KL',
        region: 'South',
        counsellingAuthority: 'Commissioner for Entrance Examinations, Kerala',
        cities: [
            { name: 'Thiruvananthapuram', tier: 2, isFeatured: true },
            { name: 'Kochi', tier: 2, isFeatured: true },
            { name: 'Kozhikode', tier: 3 },
        ],
    },
    {
        name: 'Punjab',
        code: 'PB',
        region: 'North',
        counsellingAuthority: 'Punjab Technical Education Board',
        cities: [
            { name: 'Chandigarh', tier: 2, isFeatured: true },
            { name: 'Ludhiana', tier: 3 },
            { name: 'Amritsar', tier: 3 },
        ],
    },
    {
        name: 'Odisha',
        code: 'OD',
        region: 'East',
        counsellingAuthority: 'Odisha Joint Entrance Examination Committee',
        cities: [
            { name: 'Bhubaneswar', tier: 2, isFeatured: true },
            { name: 'Cuttack', tier: 3 },
        ],
    },
    {
        name: 'Assam',
        code: 'AS',
        region: 'North-East',
        counsellingAuthority: 'Assam Science & Technology University',
        cities: [
            { name: 'Guwahati', tier: 2, isFeatured: true },
            { name: 'Dibrugarh', tier: 3 },
        ],
    },
    {
        name: 'Haryana',
        code: 'HR',
        region: 'North',
        counsellingAuthority: 'Haryana State Technical Education Society',
        cities: [
            { name: 'Gurugram', tier: 1, isFeatured: true },
            { name: 'Faridabad', tier: 2 },
            { name: 'Sonipat', tier: 3 },
        ],
    },
    {
        name: 'Andhra Pradesh',
        code: 'AP',
        region: 'South',
        counsellingAuthority: 'AP State Council of Higher Education',
        cities: [
            { name: 'Visakhapatnam', tier: 2, isFeatured: true },
            { name: 'Vijayawada', tier: 2 },
            { name: 'Guntur', tier: 3 },
        ],
    },
    {
        name: 'Uttarakhand',
        code: 'UK',
        region: 'North',
        cities: [
            { name: 'Dehradun', tier: 2, isFeatured: true },
            { name: 'Haridwar', tier: 3 },
        ],
    },
    {
        name: 'Jharkhand',
        code: 'JH',
        region: 'East',
        cities: [
            { name: 'Ranchi', tier: 2, isFeatured: true },
            { name: 'Jamshedpur', tier: 3 },
        ],
    },
    {
        name: 'Chhattisgarh',
        code: 'CG',
        region: 'Central',
        cities: [
            { name: 'Raipur', tier: 2, isFeatured: true },
            { name: 'Bilaspur', tier: 3 },
        ],
    },
    {
        name: 'Goa',
        code: 'GA',
        region: 'West',
        cities: [
            { name: 'Goa Panaji', tier: 3, isFeatured: true },
            { name: 'Vasco da Gama', tier: 3 },
        ],
    },
];

export function stateSlug(name: string) {
    return slugify(name);
}
