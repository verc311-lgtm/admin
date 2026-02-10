export interface PricingItem {
    id: string;
    label: string;
    price: number;
    category: 'material' | 'labor' | 'fee' | 'decking';
    isDefault: boolean;
    unit?: string; // e.g. 'sqf', 'fixed'
}

export const DOCK_ITEMS: PricingItem[] = [
    // Base Materials
    { id: 'piles', label: 'Piles 8" (8\' OC)', price: 18.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'stringers', label: 'Stringers 2"x8"x16\'', price: 1.50, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'joists', label: 'Joists 2"x8"x16\'', price: 3.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'timberbolt16', label: 'Timberbolt 5/8 x 16"', price: 1.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'oggea', label: 'Ogge Washer 5/8', price: 1.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'nuts', label: 'Nuts 5/8', price: 1.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'timberbolt12', label: 'Timberbolt 5/8 x 12"', price: 1.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'screws', label: 'SS Screws / Fasteners', price: 3.00, category: 'material', isDefault: true, unit: 'sqf' },

    // Labor
    { id: 'labor', label: 'Installation Labor', price: 20.00, category: 'labor', isDefault: true, unit: 'sqf' },

    // Fixed Fees
    { id: 'equipment', label: 'Mobilization & Equipment', price: 5000.00, category: 'fee', isDefault: true, unit: 'fixed' },
];

export const DECKING_OPTIONS = [
    { id: 'pine', label: 'Yellow Pine Deck', price: 3.00 },
    { id: 'topselect', label: 'Top Deck (0.31 CA-C)', price: 4.00 },
    { id: 'composite', label: 'WearDeck (Composite)', price: 13.00 },
];

export const calculateInteractiveDockPrice = (
    sqf: number,
    selectedItemIds: string[],
    deckingType: string
): number => {
    let total = 0;

    // 1. Sum Selected Standard Items
    DOCK_ITEMS.forEach(item => {
        if (selectedItemIds.includes(item.id)) {
            if (item.unit === 'fixed') {
                total += item.price;
            } else {
                total += (item.price * sqf);
            }
        }
    });

    // 2. Add Decking (Selected Type)
    const deckOption = DECKING_OPTIONS.find(d => d.id === deckingType);
    if (deckOption) {
        total += (deckOption.price * sqf);
    }

    return total;
};
