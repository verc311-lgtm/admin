export interface PricingItem {
    id: string;
    label: string;
    price: number;
    category: 'material' | 'labor' | 'fee' | 'decking';
    isDefault: boolean;
    unit?: string; // e.g. 'sqf', 'lf', 'fixed'
}

// --- DOCK ITEMS (SQF) ---
export const DOCK_ITEMS: PricingItem[] = [
    { id: 'piles', label: 'Piles 8" (8\' OC)', price: 18.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'stringers', label: 'Stringers 2"x8"x16\'', price: 1.50, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'joists', label: 'Joists 2"x8"x16\'', price: 3.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'timberbolt16', label: 'Timberbolt 5/8 x 16"', price: 1.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'oggea', label: 'Ogge Washer 5/8', price: 1.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'nuts', label: 'Nuts 5/8', price: 1.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'timberbolt12', label: 'Timberbolt 5/8 x 12"', price: 1.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'screws', label: 'SS Screws / Fasteners', price: 3.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'labor', label: 'Installation Labor', price: 20.00, category: 'labor', isDefault: true, unit: 'sqf' },
    { id: 'equipment', label: 'Mobilization & Equipment', price: 5000.00, category: 'fee', isDefault: true, unit: 'fixed' },
];

export const DECKING_OPTIONS = [
    { id: 'pine', label: 'Yellow Pine Deck', price: 3.00 },
    { id: 'topselect', label: 'Top Deck (0.31 CA-C)', price: 4.00 },
    { id: 'composite', label: 'WearDeck (Composite)', price: 13.00 },
];

// --- RIP-RAP ITEMS (Linear Feet) ---
export const RIP_RAP_ITEMS: PricingItem[] = [
    { id: 'riprap', label: 'Rip-Rap Class I', price: 140.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'filter', label: 'Filter Cloth', price: 3.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'gravel', label: 'Gravel (Tons)', price: 18.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'pins', label: 'Anchor Pins', price: 6.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'labor_rr', label: 'Installation Labor', price: 100.00, category: 'labor', isDefault: true, unit: 'lf' },
    // Optionally add Mobilization if needed, assuming shared or same as dock for now if user didn't specify. 
    // User didn't specify mob fee for RipRap, so I'll leave it out or add it as an option. 
    // I will add the standard Mobilization fee as an option but default to unchecked just in case.
    { id: 'equipment_rr', label: 'Mobilization & Equipment', price: 2500.00, category: 'fee', isDefault: false, unit: 'fixed' },
];

export const calculateInteractivePrice = (
    type: 'dock' | 'riprap',
    quantity: number, // sqf or lf
    selectedItemIds: string[],
    deckingType?: string
): number => {
    let subtotal = 0;
    const items = type === 'dock' ? DOCK_ITEMS : RIP_RAP_ITEMS;

    // 1. Sum Selected Standard Items
    items.forEach(item => {
        if (selectedItemIds.includes(item.id)) {
            if (item.unit === 'fixed') {
                subtotal += item.price;
            } else {
                subtotal += (item.price * quantity);
            }
        }
    });

    // 2. Add Decking (Only for Docks)
    if (type === 'dock' && deckingType) {
        const deckOption = DECKING_OPTIONS.find(d => d.id === deckingType);
        if (deckOption) {
            subtotal += (deckOption.price * quantity);
        }
    }

    // 3. Apply 10% Markup (Overhead / Misc)
    const totalWithMarkup = subtotal * 1.10;

    return Math.ceil(totalWithMarkup);
};
