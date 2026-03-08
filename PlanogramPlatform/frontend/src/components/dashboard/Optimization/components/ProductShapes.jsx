import React from 'react';

// ─── Category Shape SVGs ───────────────────────────────────────
// Each returns a small SVG icon representing the category silhouette

const BottleShape = ({ color }) => (
    <svg viewBox="0 0 24 40" fill={color} opacity="0.6" className="w-full h-full">
        <rect x="8" y="0" width="8" height="5" rx="1" />
        <rect x="9" y="5" width="6" height="3" />
        <path d="M9 8 L6 14 L6 36 Q6 39 9 39 L15 39 Q18 39 18 36 L18 14 L15 8 Z" />
    </svg>
);

const BagShape = ({ color }) => (
    <svg viewBox="0 0 30 36" fill={color} opacity="0.6" className="w-full h-full">
        <path d="M3 6 Q3 3 6 3 L24 3 Q27 3 27 6 L27 33 Q27 36 24 36 L6 36 Q3 36 3 33 Z" />
        <path d="M8 3 Q8 0 12 0 L18 0 Q22 0 22 3" fill="none" stroke={color} strokeWidth="2" opacity="0.4" />
    </svg>
);

const BoxShape = ({ color }) => (
    <svg viewBox="0 0 30 30" fill={color} opacity="0.6" className="w-full h-full">
        <rect x="2" y="2" width="26" height="26" rx="3" />
        <line x1="2" y1="10" x2="28" y2="10" stroke="white" strokeWidth="1" opacity="0.4" />
    </svg>
);

const BarShape = ({ color }) => (
    <svg viewBox="0 0 36 18" fill={color} opacity="0.6" className="w-full h-full">
        <rect x="1" y="1" width="34" height="16" rx="3" />
        <rect x="4" y="4" width="28" height="10" rx="1" fill="white" opacity="0.15" />
    </svg>
);

const CartonShape = ({ color }) => (
    <svg viewBox="0 0 22 36" fill={color} opacity="0.6" className="w-full h-full">
        <rect x="2" y="4" width="18" height="32" rx="2" />
        <polygon points="2,4 11,0 20,4" opacity="0.8" />
    </svg>
);

const PacketShape = ({ color }) => (
    <svg viewBox="0 0 28 32" fill={color} opacity="0.6" className="w-full h-full">
        <rect x="2" y="2" width="24" height="28" rx="2" />
        <path d="M2 2 L8 0 L20 0 L26 2" fill={color} opacity="0.5" />
    </svg>
);

const NoodlePackShape = ({ color }) => (
    <svg viewBox="0 0 30 28" fill={color} opacity="0.6" className="w-full h-full">
        <rect x="2" y="2" width="26" height="24" rx="4" />
        <path d="M8 12 Q11 8 15 12 Q19 16 22 12" fill="none" stroke="white" strokeWidth="1.5" opacity="0.4" />
    </svg>
);

const CanisterShape = ({ color }) => (
    <svg viewBox="0 0 24 32" fill={color} opacity="0.6" className="w-full h-full">
        <rect x="3" y="4" width="18" height="26" rx="3" />
        <ellipse cx="12" cy="4" rx="9" ry="3" />
        <ellipse cx="12" cy="30" rx="9" ry="3" opacity="0.7" />
    </svg>
);

const CleaningBottleShape = ({ color }) => (
    <svg viewBox="0 0 24 40" fill={color} opacity="0.6" className="w-full h-full">
        <rect x="9" y="0" width="6" height="4" rx="1" />
        <rect x="6" y="0" width="4" height="7" rx="1" />
        <path d="M8 7 L6 12 L6 36 Q6 39 9 39 L15 39 Q18 39 18 36 L18 12 L16 7 Z" />
    </svg>
);

const TubeShape = ({ color }) => (
    <svg viewBox="0 0 20 38" fill={color} opacity="0.6" className="w-full h-full">
        <rect x="7" y="0" width="6" height="4" rx="2" />
        <path d="M4 8 Q4 4 7 4 L13 4 Q16 4 16 8 L16 34 Q16 38 10 38 Q4 38 4 34 Z" />
    </svg>
);

const DiaperPackShape = ({ color }) => (
    <svg viewBox="0 0 30 28" fill={color} opacity="0.6" className="w-full h-full">
        <rect x="2" y="2" width="26" height="24" rx="5" />
        <circle cx="15" cy="14" r="5" fill="white" opacity="0.2" />
    </svg>
);

const FrozenPackShape = ({ color }) => (
    <svg viewBox="0 0 28 32" fill={color} opacity="0.6" className="w-full h-full">
        <rect x="2" y="2" width="24" height="28" rx="3" />
        <line x1="14" y1="8" x2="14" y2="24" stroke="white" strokeWidth="1" opacity="0.3" />
        <line x1="7" y1="16" x2="21" y2="16" stroke="white" strokeWidth="1" opacity="0.3" />
        <line x1="8" y1="10" x2="20" y2="22" stroke="white" strokeWidth="1" opacity="0.3" />
        <line x1="20" y1="10" x2="8" y2="22" stroke="white" strokeWidth="1" opacity="0.3" />
    </svg>
);

// ─── Category → Shape Mapping ──────────────────────────────────
const CATEGORY_SHAPES = {
    'Beverages': BottleShape,
    'Rice & Grains': BagShape,
    'Dry Rations': BoxShape,
    'Snacks & Confectionery': BarShape,
    'Dairy (Shelf-Stable)': CartonShape,
    'Packaged Bakery': PacketShape,
    'Instant Foods': NoodlePackShape,
    'Tea & Coffee': CanisterShape,
    'Household & Cleaning': CleaningBottleShape,
    'Personal Care': TubeShape,
    'Baby Products': DiaperPackShape,
    'Frozen (Non-Meat)': FrozenPackShape,
};

// ─── Brand → Color Mapping ─────────────────────────────────────
// Curated colors for known Sri Lankan brands. Deterministic hash fallback for unknown brands.
const BRAND_COLORS = {
    // Beverages
    'Coca-Cola': '#E61A27',
    'Sprite': '#008B47',
    'Fanta': '#FF8300',
    'Pepsi': '#004B93',
    '7 Up': '#2E8B57',
    'Mirinda': '#FF6F00',
    'Mountain Dew': '#7CB342',
    'Elephant House': '#1B5E20',
    'Kist': '#F57C00',
    'Red Bull': '#CC0000',
    'Milo': '#2E7D32',
    'Nestomalt': '#6D4C41',
    'Horlicks': '#FF8F00',
    'Aquafina': '#0288D1',
    'MD': '#B71C1C',
    // Rice & Grains
    'Araliya': '#8D6E63',
    'CIC': '#1565C0',
    'Catch': '#E65100',
    'Akshata': '#558B2F',
    'Ariya': '#6A1B9A',
    'India Gate': '#F9A825',
    'Dunar': '#00695C',
    'Tilda': '#283593',
    'Turkey': '#C62828',
    'Prima': '#D32F2F',
    'Foodlink': '#4E342E',
    'Harischandra': '#BF360C',
    'Star Gold': '#F9A825',
    // Dry Rations
    'Anchor': '#0D47A1',
    'Wijaya': '#E65100',
    "MA's": '#4A148C',
    'Mccurrie': '#880E4F',
    'Marina': '#01579B',
    'Fortune': '#1B5E20',
    'Renuka': '#2E7D32',
    'Maggi': '#FDD835',
    // Dairy
    'Kotmale': '#1565C0',
    'Ambewela': '#00838F',
    'Richlife': '#0097A7',
    'Highland': '#1B5E20',
    'Milkmaid': '#FBC02D',
    'Astra': '#FF6F00',
    'Happy Cow': '#E53935',
    // Snacks
    'Ritzbury': '#6A1B9A',
    'Kandos': '#4E342E',
    'Cadbury': '#3F0E7B',
    'M&M': '#D32F2F',
    'Snickers': '#5D4037',
    'Mars': '#C62828',
    'KitKat': '#D32F2F',
    'Ferrero Rocher': '#C6892A',
    'Toblerone': '#F9A825',
    // Bakery
    'Munchee': '#F9A825',
    'Maliban': '#E65100',
    'Little Lion': '#FF6F00',
    // Instant Foods
    'Raigam': '#1B5E20',
    'Sera': '#BF360C',
    'Knorr': '#2E7D32',
    'Cirio': '#C62828',
    // Tea & Coffee
    'Dilmah': '#B71C1C',
    'Lipton': '#FDD835',
    'Zesta': '#1B5E20',
    'Watawala': '#4E342E',
    'Nescafe': '#5D4037',
    // Household
    'Sunlight': '#FDD835',
    'Surf Excel': '#1565C0',
    'Rin': '#1976D2',
    'Diva': '#E91E63',
    'Vim': '#2E7D32',
    'Harpic': '#0D47A1',
    'Domex': '#1B5E20',
    'Dettol': '#2E7D32',
    'Mortein': '#D32F2F',
    'Comfort': '#7B1FA2',
    // Personal Care
    'Signal': '#1565C0',
    'Closeup': '#D32F2F',
    'Colgate': '#D32F2F',
    'Sensodyne': '#0097A7',
    'Sunsilk': '#E91E63',
    'Dove': '#0097A7',
    'Head & Shoulders': '#1565C0',
    'Clear': '#0D47A1',
    'Pantene': '#C6892A',
    'Lifebuoy': '#D32F2F',
    'Lux': '#E91E63',
    'Nivea': '#0D47A1',
    'Vaseline': '#1565C0',
    'Parachute': '#0D47A1',
    // Baby
    'Huggies': '#1565C0',
    'Pampers': '#2E7D32',
    'Baby Cheramy': '#E91E63',
    "Johnson's": '#1976D2',
    'Lactogen': '#0D47A1',
    'Cow & Gate': '#1B5E20',
};

// ─── Deterministic color from string (for unknown brands) ──────
const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 55%, 45%)`;
};

// ─── Unique light background from product name + SKU ───────────
const getProductBgColor = (productName, sku) => {
    const key = (productName || '') + (sku || '');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 40%, 92%)`;
};

// ─── Get brand color ───────────────────────────────────────────
const getBrandColor = (brand) => {
    return BRAND_COLORS[brand] || stringToColor(brand || 'Unknown');
};

// ─── Get shape component for category ─────────────────────────
const getCategoryShape = (category) => {
    return CATEGORY_SHAPES[category] || BoxShape;
};

// ─── Main ProductShape Component ──────────────────────────────
const ProductShape = ({ category, brand, productName, sku }) => {
    const ShapeComponent = getCategoryShape(category);
    const brandColor = getBrandColor(brand);

    return (
        <div className="w-full h-full flex items-center justify-center p-[2px]">
            <ShapeComponent color={brandColor} />
        </div>
    );
};

export { ProductShape, getProductBgColor, getBrandColor, getCategoryShape };
export default ProductShape;
