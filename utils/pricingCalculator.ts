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
    { id: 'deck_pine', label: 'Yellow Pine Deck', price: 3.00, category: 'decking', isDefault: false, unit: 'sqf' },
    { id: 'deck_topselect', label: 'Top Deck (0.31 CA-C)', price: 4.00, category: 'decking', isDefault: false, unit: 'sqf' },
    { id: 'deck_composite', label: 'WearDeck (Composite)', price: 13.00, category: 'decking', isDefault: false, unit: 'sqf' },
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
    { id: 'riprap', label: 'Rip-Rap Class I', price: 185.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'filter', label: 'Filter Cloth', price: 3.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'gravel', label: 'Gravel (Tons)', price: 23.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'pins', label: 'Anchor Pins', price: 6.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'labor_rr', label: 'Installation Labor', price: 200.00, category: 'labor', isDefault: true, unit: 'lf' },
    // Optionally add Mobilization if needed, assuming shared or same as dock for now if user didn't specify. 
    // User didn't specify mob fee for RipRap, so I'll leave it out or add it as an option. 
    // I will add the standard Mobilization fee as an option but default to unchecked just in case.
    { id: 'equipment_rr', label: 'Mobilization & Equipment', price: 5000.00, category: 'fee', isDefault: false, unit: 'fixed' },
];

// --- FLOATING DOCK ITEMS (SQF) ---
export const FLOATING_DOCK_ITEMS: PricingItem[] = [
    { id: 'end_stringer', label: 'End Stringer 3"x10"x6\'', price: 2.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'joins', label: 'Joists 3"x10"x16\'', price: 5.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'center_stringer', label: 'Center Stringer 3"x10"x16\'', price: 3.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'top_deck', label: 'Top Deck 0.31 CA-C', price: 5.00, category: 'decking', isDefault: false, unit: 'sqf' },
    { id: 'deck_screws', label: 'Deck Screws', price: 5.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'inside_corner', label: 'Inside Corner', price: 2.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'outside_corner', label: 'Outside Corner', price: 1.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'float', label: 'Float', price: 14.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'carriage_bolts', label: 'Carriage Bolts', price: 4.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'lag_bolts', label: 'Lag Bolts', price: 0.50, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'l_plates', label: 'L Plates', price: 1.25, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'pile_guide', label: 'Pile Guide', price: 6.25, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'pile', label: 'Pile', price: 6.00, category: 'material', isDefault: true, unit: 'sqf' },
    { id: 'yp_deck', label: 'Yellow Pine Deck', price: 3.00, category: 'decking', isDefault: false, unit: 'sqf' },
    { id: 'weardeck', label: 'WearDeck', price: 13.00, category: 'decking', isDefault: false, unit: 'sqf' },
    { id: 'labor_fd', label: 'Installation Labor', price: 20.00, category: 'labor', isDefault: true, unit: 'sqf' },
    { id: 'machinery_fd', label: 'Mobilization & Equipment', price: 5000.00, category: 'fee', isDefault: true, unit: 'fixed' },
];

// --- BULKHEAD ITEMS (LF) ---
export const BULKHEAD_ITEMS: PricingItem[] = [
    { id: 'tw95', label: 'TW-95', price: 210.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'piles_10x20', label: 'Piles 10" x 20\'', price: 52.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'bulkhead_boards', label: 'Bulkhead Boards 2"x10"x16\' T&G 2.5cca', price: 86.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'mantaray', label: 'MantaRay', price: 40.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'walers', label: 'Walers 6"x6"x16\'', price: 9.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'filter_cloth', label: 'Filter Cloth', price: 4.75, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'top_soil_sand', label: 'Top Soil / Sand', price: 50.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'gravel', label: 'Gravel (Tons)', price: 50.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'cap', label: 'Cap 2"x10"', price: 6.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'jet_filter', label: 'Jet Filter', price: 10.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'deadmens', label: 'DeadMens 8"x10\'', price: 15.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'tie_rod', label: 'Tie Rod 5/8"x10\'', price: 15.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'timber_bolts', label: 'Timber Bolts', price: 2.00, category: 'material', isDefault: true, unit: 'lf' },
    { id: 'labor_bh', label: 'Installation Labor', price: 185.00, category: 'labor', isDefault: true, unit: 'lf' },
    { id: 'machinery_bh', label: 'Mobilization & Equipment', price: 6000.00, category: 'fee', isDefault: true, unit: 'fixed' },
];

export const BOATLIFT_ITEMS: PricingItem[] = [
    { id: '5k_lift', label: '5k Boat Lift', price: 8989.00, category: 'material', isDefault: false, unit: 'fixed' },
    { id: '8k_lift', label: '8k Boat Lift', price: 9265.00, category: 'material', isDefault: false, unit: 'fixed' },
    { id: '10k_lift', label: '10k Boat Lift', price: 9800.00, category: 'material', isDefault: true, unit: 'fixed' },
    { id: '12k_lift', label: '12k Boat Lift', price: 10605.00, category: 'material', isDefault: false, unit: 'fixed' },
    { id: '16k_lift', label: '16k Boat Lift', price: 12540.00, category: 'material', isDefault: false, unit: 'fixed' },
    { id: 'piles_10x40', label: '4 Piles 10"x40\'', price: 4160.00, category: 'material', isDefault: true, unit: 'fixed' },
    { id: 'labor_lift', label: 'Installation Labor', price: 4000.00, category: 'labor', isDefault: true, unit: 'fixed' },
    { id: 'machinery_lift', label: 'Mobilization & Equipment', price: 3000.00, category: 'fee', isDefault: true, unit: 'fixed' },
];

export const DEFAULT_CATALOG: Record<string, PricingItem[]> = {
    "Pier / Dock": DOCK_ITEMS,
    "Floating Dock": FLOATING_DOCK_ITEMS,
    "Bulkhead": BULKHEAD_ITEMS,
    "Boat Lift": BOATLIFT_ITEMS,
    "Rip-Rap / Erosion Control": RIP_RAP_ITEMS
};

export const getDefaultCatalog = (): Record<string, PricingItem[]> => {
    return JSON.parse(JSON.stringify(DEFAULT_CATALOG));
};

export const calculateInteractivePrice = (
    type: 'dock' | 'riprap' | 'floating_dock' | 'bulkhead' | 'boat_lift',
    quantity: number, // sqf or lf or 1 for lift
    selectedItemIds: string[],
    deckingType?: string,
    additionalExpenses: number = 0,
    customItems?: PricingItem[]
): number => {
    let subtotal = 0;
    let items: PricingItem[] = (customItems && customItems.length > 0) ? customItems : [];

    if (items.length === 0) {
        if (type === 'dock') items = DOCK_ITEMS;
        else if (type === 'riprap') items = RIP_RAP_ITEMS;
        else if (type === 'floating_dock') items = FLOATING_DOCK_ITEMS;
        else if (type === 'bulkhead') items = BULKHEAD_ITEMS;
        else if (type === 'boat_lift') items = BOATLIFT_ITEMS;
    }

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

    // 2. Decking is now included in the items list for all types

    // 3. Add Additional Expenses
    subtotal += additionalExpenses;

    // 4. Apply 10% Markup (Overhead / Misc)
    const totalWithMarkup = subtotal * 1.10;

    return Math.ceil(totalWithMarkup);
};
