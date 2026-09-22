import React, { useState, useEffect } from 'react';
import { Bot, FileText, Loader2, Settings, Plus, Trash2, Check, Layers, MessageSquare, Edit3, X, RotateCcw, DollarSign, Save, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { PricingItem, DEFAULT_CATALOG, getDefaultCatalog, calculateInteractivePrice } from '../utils/pricingCalculator';
import { supabase } from '../src/supabaseClient';

const DEFAULT_PROJECT_TYPES = ["Pier / Dock", "Floating Dock", "Bulkhead", "Boat Lift", "Rip-Rap / Erosion Control", "Other / Custom Project"];

interface QuoteSection {
    id: string;
    type: string;
    dimensions: string;
    selectedItems: string[];
    deckingType?: string;
    description?: string;
    price: number;
    customMaterialPrice?: number;
    customLaborPrice?: number;
}

const QuoteGenerator: React.FC = () => {
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
    const [showSettings, setShowSettings] = useState(false);

    // Dynamic Project Types State
    const [projectTypes, setProjectTypes] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('cva_project_types');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Error loading project types:', e);
        }
        return DEFAULT_PROJECT_TYPES;
    });

    const [showNewTypeModal, setShowNewTypeModal] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');

    // Dynamic Pricing & Materials Catalog State
    const [catalog, setCatalog] = useState<Record<string, PricingItem[]>>(() => {
        try {
            const saved = localStorage.getItem('cva_pricing_catalog');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Error loading local catalog:', e);
        }
        return getDefaultCatalog();
    });

    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [catalogActiveType, setCatalogActiveType] = useState<string>("Bulkhead");
    const [catalogSaveSuccess, setCatalogSaveSuccess] = useState(false);
    const [isSavingCatalog, setIsSavingCatalog] = useState(false);

    // New item form state
    const [newItemLabel, setNewItemLabel] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemUnit, setNewItemUnit] = useState('lf');
    const [newItemCategory, setNewItemCategory] = useState<'material' | 'labor' | 'fee' | 'decking'>('material');
    const [newItemIsDefault, setNewItemIsDefault] = useState(false);

    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [projectTitle, setProjectTitle] = useState('');

    const [sections, setSections] = useState<QuoteSection[]>([]);
    const [currentType, setCurrentType] = useState(DEFAULT_PROJECT_TYPES[0]);
    const [currentDimensions, setCurrentDimensions] = useState('');
    const [currentSelectedItems, setCurrentSelectedItems] = useState<string[]>([]);
    const [currentDescription, setCurrentDescription] = useState('');
    const [customMaterialPrice, setCustomMaterialPrice] = useState('');
    const [customLaborPrice, setCustomLaborPrice] = useState('');

    const [otherWorkCost, setOtherWorkCost] = useState('');
    const [otherWorkDescription, setOtherWorkDescription] = useState('');

    const [isGenerating, setIsGenerating] = useState(false);
    const [scopeOfWork, setScopeOfWork] = useState('');
    const [aiEstimatedTotal, setAiEstimatedTotal] = useState<number>(0);
    const [errorMsg, setErrorMsg] = useState('');

    // Manual mode: user types scope directly without AI
    const [manualMode, setManualMode] = useState(false);
    const [showProjectSummary, setShowProjectSummary] = useState(true);

    // Fetch remote catalog and project types from Supabase on mount
    useEffect(() => {
        const fetchCatalogFromDB = async () => {
            try {
                const { data } = await supabase.from('cva_settings').select('value').eq('key', 'ai_estimator_pricing_catalog').single();
                if (data && data.value) {
                    const parsed = JSON.parse(data.value);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
                        setCatalog(parsed);
                        localStorage.setItem('cva_pricing_catalog', data.value);
                    }
                }

                const { data: typesData } = await supabase.from('cva_settings').select('value').eq('key', 'ai_estimator_project_types').single();
                if (typesData && typesData.value) {
                    const parsedTypes = JSON.parse(typesData.value);
                    if (Array.isArray(parsedTypes) && parsedTypes.length > 0) {
                        setProjectTypes(parsedTypes);
                        localStorage.setItem('cva_project_types', typesData.value);
                    }
                }
            } catch (err) {
                // Settings key might not exist yet; ignore and keep local
            }
        };
        fetchCatalogFromDB();
    }, []);

    useEffect(() => {
        const items = getItemsForType(currentType);
        const defaults = Array.isArray(items) ? items.filter(i => i && i.isDefault).map(i => i.id) : [];
        setCurrentSelectedItems(defaults);
        if (currentType !== "Other / Custom Project") {
            setCustomMaterialPrice('');
            setCustomLaborPrice('');
        }
    }, [currentType, catalog]);

    const getItemsForType = (type: string): PricingItem[] => {
        if (!catalog || typeof catalog !== 'object') return [];
        const items = catalog[type];
        return Array.isArray(items) ? items : [];
    };

    const calculateSectionPrice = (type: string, dims: string, items: string[] = [], decking?: string, customMat?: string, customLab?: string) => {
        const qty = parseFloat(dims) || 0;
        if (type === "Other / Custom Project") {
            return (qty * (parseFloat(customMat || '0') || 0)) + (qty * (parseFloat(customLab || '0') || 0));
        }
        let calcType: 'dock' | 'riprap' | 'floating_dock' | 'bulkhead' | 'boat_lift' = 'dock';
        if (type === 'Floating Dock') calcType = 'floating_dock';
        else if (type === 'Bulkhead') calcType = 'bulkhead';
        else if (type === 'Boat Lift') calcType = 'boat_lift';
        else if (type === 'Rip-Rap / Erosion Control') calcType = 'riprap';
        const effectiveQty = (calcType === 'boat_lift' && qty === 0) ? 1 : qty;
        
        const catalogItems = getItemsForType(type);
        const safeItems = Array.isArray(items) ? items : [];
        return calculateInteractivePrice(calcType, effectiveQty, safeItems, decking, 0, catalogItems);
    };

    const handleSaveKey = () => {
        localStorage.setItem('openai_api_key', apiKey);
        setShowSettings(false);
    };

    // Catalog item modifications
    const handleUpdateCatalogItem = (sectionType: string, itemId: string, field: keyof PricingItem, value: any) => {
        setCatalog(prev => {
            const list = prev[sectionType] || [];
            const updated = list.map(item => {
                if (item.id === itemId) {
                    return {
                        ...item,
                        [field]: field === 'price' ? (parseFloat(value) || 0) : value
                    };
                }
                return item;
            });
            return { ...prev, [sectionType]: updated };
        });
    };

    const handleAddCatalogItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemLabel.trim()) {
            alert('Please enter a name for the material or option.');
            return;
        }
        const priceNum = parseFloat(newItemPrice) || 0;
        const newItem: PricingItem = {
            id: 'custom_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            label: newItemLabel.trim(),
            price: priceNum,
            unit: newItemUnit,
            category: newItemCategory,
            isDefault: newItemIsDefault
        };

        setCatalog(prev => {
            const currentList = prev[catalogActiveType] || [];
            return {
                ...prev,
                [catalogActiveType]: [...currentList, newItem]
            };
        });

        // Reset add form
        setNewItemLabel('');
        setNewItemPrice('');
        setNewItemIsDefault(false);
    };

    const handleDeleteCatalogItem = (sectionType: string, itemId: string) => {
        if (!window.confirm('Are you sure you want to remove this item from the catalog?')) return;
        setCatalog(prev => {
            const list = prev[sectionType] || [];
            return {
                ...prev,
                [sectionType]: list.filter(i => i.id !== itemId)
            };
        });
        setCurrentSelectedItems(prev => prev.filter(id => id !== itemId));
    };

    const handleAddSectionType = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newTypeName.trim();
        if (!trimmed) return;

        if (projectTypes.map(t => t.toLowerCase()).includes(trimmed.toLowerCase())) {
            alert('Este tipo de sección ya existe.');
            return;
        }

        const updatedTypes = [...projectTypes];
        const otherIndex = updatedTypes.indexOf("Other / Custom Project");
        if (otherIndex !== -1) {
            updatedTypes.splice(otherIndex, 0, trimmed);
        } else {
            updatedTypes.push(trimmed);
        }

        const updatedCatalog = {
            ...catalog,
            [trimmed]: catalog[trimmed] || []
        };

        setProjectTypes(updatedTypes);
        setCatalog(updatedCatalog);
        setCatalogActiveType(trimmed);
        setCurrentType(trimmed);
        setNewTypeName('');
        setShowNewTypeModal(false);

        await saveCatalogToCloud(updatedCatalog, updatedTypes);
    };

    const handleDeleteSectionType = async (typeToDelete: string) => {
        if (DEFAULT_PROJECT_TYPES.includes(typeToDelete)) {
            alert('No se pueden eliminar los tipos de sección base predeterminados.');
            return;
        }

        if (!window.confirm(`¿Está seguro de eliminar el tipo de trabajo "${typeToDelete}" y todas sus opciones configuradas?`)) {
            return;
        }

        const updatedTypes = projectTypes.filter(t => t !== typeToDelete);
        const updatedCatalog = { ...catalog };
        delete updatedCatalog[typeToDelete];

        setProjectTypes(updatedTypes);
        setCatalog(updatedCatalog);

        const nextActive = updatedTypes[0] || "Pier / Dock";
        setCatalogActiveType(nextActive);
        if (currentType === typeToDelete) {
            setCurrentType(nextActive);
        }

        await saveCatalogToCloud(updatedCatalog, updatedTypes);
    };

    const handleResetCatalogDefaults = async () => {
        if (!window.confirm('¿Desea restablecer todos los tipos de sección, precios y materiales a los valores de fábrica originales de Coastal VA?')) return;
        const defaultCat = getDefaultCatalog();
        setCatalog(defaultCat);
        setProjectTypes(DEFAULT_PROJECT_TYPES);
        setCatalogActiveType("Bulkhead");
        setCurrentType(DEFAULT_PROJECT_TYPES[0]);
        localStorage.removeItem('cva_pricing_catalog');
        localStorage.removeItem('cva_project_types');
        await saveCatalogToCloud(defaultCat, DEFAULT_PROJECT_TYPES);
    };

    const saveCatalogToCloud = async (catToSave = catalog, typesToSave = projectTypes) => {
        setIsSavingCatalog(true);
        try {
            localStorage.setItem('cva_pricing_catalog', JSON.stringify(catToSave));
            localStorage.setItem('cva_project_types', JSON.stringify(typesToSave));
            await supabase.from('cva_settings').upsert([
                { key: 'ai_estimator_pricing_catalog', value: JSON.stringify(catToSave) },
                { key: 'ai_estimator_project_types', value: JSON.stringify(typesToSave) }
            ]);
            setCatalogSaveSuccess(true);
            setTimeout(() => setCatalogSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving catalog to Supabase:', err);
        } finally {
            setIsSavingCatalog(false);
        }
    };

    const toggleCurrentItem = (id: string) => {
        setCurrentSelectedItems(prev => {
            const list = Array.isArray(prev) ? prev : [];
            return list.includes(id) ? list.filter(i => i !== id) : [...list, id];
        });
    };

    const addSection = () => {
        const price = calculateSectionPrice(currentType, currentDimensions, currentSelectedItems, undefined, customMaterialPrice, customLaborPrice);
        setSections([...(Array.isArray(sections) ? sections : []), {
            id: Date.now().toString(), type: currentType, dimensions: currentDimensions,
            selectedItems: Array.isArray(currentSelectedItems) ? currentSelectedItems : [],
            description: currentDescription, price: Number(price) || 0,
            customMaterialPrice: parseFloat(customMaterialPrice) || undefined,
            customLaborPrice: parseFloat(customLaborPrice) || undefined
        }]);
        setCurrentDimensions('');
        setCurrentDescription('');
        setCustomMaterialPrice('');
        setCustomLaborPrice('');
        const items = getItemsForType(currentType);
        const defaults = Array.isArray(items) ? items.filter(i => i && i.isDefault).map(i => i.id) : [];
        setCurrentSelectedItems(defaults);
    };

    const removeSection = (id: string) => setSections((Array.isArray(sections) ? sections : []).filter(s => s.id !== id));

    const sectionsTotal = (Array.isArray(sections) ? sections : []).reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const adjustments = parseFloat(otherWorkCost) || 0;
    const grandTotal = sectionsTotal + adjustments;

    // Activate manual mode: prefills textarea with a blank template and lets user write from scratch
    const activateManualMode = () => {
        setManualMode(true);
        setAiEstimatedTotal(grandTotal);
        if (!scopeOfWork) {
            setScopeOfWork(
                (projectTitle.trim() ? `PROJECT: ${projectTitle.trim().toUpperCase()}\n\n` : '') +
                `SCOPE OF WORK:\nCoastal VA Marine Construction is pleased to present this proposal for marine construction and installation services.\n\n` +
                sections.map((s, i) => `OPTION ${i + 1} - ${s.type.toUpperCase()}:\n- Quantity / Dimensions: ${s.dimensions} ${s.type.toLowerCase().includes('dock') ? 'SQF' : (s.type.toLowerCase().includes('bulkhead') || s.type.toLowerCase().includes('rip-rap')) ? 'Linear Feet' : 'Units'}\n- Description / Materials: ${s.description || 'Standard installation'}\n- Fasteners & Hardware: Marine-grade corrosion-resistant hardware\n`).join('\n') +
                `\nSTANDARD EXCLUSIONS:\n- Permits, regulatory filings, and engineering drawings (unless specifically noted)\n- Geotechnical soil testing or environmental surveys\n- Hidden subsurface or underwater obstructions\n- Electrical service connection / high-voltage utility tie-ins beyond rough-in`
            );
        }
    };

    // Helper to build robust fallback bullets for a section if AI omits it
    const buildFallbackSection = (s: QuoteSection, idx: number): string => {
        const items = getItemsForType(s.type).filter(i => s.selectedItems.includes(i.id)).map(i => i.label);
        const unitLabel = s.type.toLowerCase().includes('dock') ? 'SQF' : (s.type.toLowerCase().includes('bulkhead') || s.type.toLowerCase().includes('rip-rap') || s.type.toLowerCase().includes('handrail')) ? 'Linear Feet' : 'Units';
        const bullets: string[] = [];

        if (s.description && s.description.trim()) {
            bullets.push(`Furnish and install according to custom specifications: ${s.description.trim()}.`);
        } else if (items.length > 0) {
            bullets.push(`Supply and complete installation of specified marine components: ${items.join(', ')}.`);
        } else {
            bullets.push(`Complete installation and craftsmanship of ${s.type} covering approximately ${s.dimensions} ${unitLabel}.`);
        }

        if (items.length > 0 && s.description) {
            bullets.push(`Incorporate selected materials and components: ${items.join(', ')}.`);
        }

        const lower = s.type.toLowerCase();
        if (lower.includes('pwc') || lower.includes('floating')) {
            bullets.push(`Anchor securely utilizing heavy-duty marine-grade pile mounting brackets, guide piles or stiff arms, and corrosion-resistant fasteners.`);
            bullets.push(`Calibrate flotation, roller alignment, and ensure smooth vessel drive-on/launch docking functionality.`);
        } else if (lower.includes('aluminum') || lower.includes('walk') || lower.includes('gangway')) {
            bullets.push(`Fabricated from heavy-duty marine-grade aluminum alloy with integrated non-skid ribbed surface and reinforced transition brackets.`);
            bullets.push(`Secured to existing dock framing using marine 316 stainless steel through-bolts and high-strength mounting hardware.`);
        } else if (lower.includes('dock') || lower.includes('pier')) {
            bullets.push(`Substructure framing with heavy-duty marine-treated timbers and stringers secured with hot-dipped galvanized through-bolts.`);
            bullets.push(`Decking installed with uniform spacing and high-strength marine-grade corrosion-resistant deck screws.`);
        } else if (lower.includes('bulkhead')) {
            bullets.push(`Heavy-duty marine sheet piling and timber support piles driven to engineer-specified penetration depth.`);
            bullets.push(`Installation of heavy timber walers, galvanized tieback rods anchored to deadmen, and non-woven geotextile filter fabric with backfill.`);
        } else if (lower.includes('lift')) {
            bullets.push(`High-capacity marine boat lift system installed on heavy-duty timber or steel support piles.`);
            bullets.push(`Marine-duty motors, grooved cable winders, stainless steel cables, and heavy-duty bunk brackets positioned to hull specifications.`);
        } else if (lower.includes('rip-rap') || lower.includes('erosion')) {
            bullets.push(`Excavation and shoreline grading with commercial-grade non-woven geotextile filter cloth and rip-rap stone armor layer.`);
        } else {
            bullets.push(`All framing, structural joints, and hardware engineered for marine environment using corrosion-resistant fasteners.`);
            bullets.push(`Precision alignment, clean finished detailing, and rigorous final inspection adhering to coastal marine building standards.`);
        }

        return `OPTION ${idx + 1} - ${s.type.toUpperCase()}:\n` + bullets.map(b => `- ${b}`).join('\n');
    };

    const handleGenerateQuote = async () => {
        setErrorMsg('');
        if (!apiKey) { setErrorMsg("Please enter OpenAI API Key."); setShowSettings(true); return; }

        let activeSections = [...sections];
        if (currentDimensions && parseFloat(currentDimensions) > 0) {
            if (window.confirm(`Did you mean to include the current "${currentType}" section in the proposal?`)) {
                const price = calculateSectionPrice(currentType, currentDimensions, currentSelectedItems, undefined, customMaterialPrice, customLaborPrice);
                activeSections.push({
                    id: Date.now().toString(), type: currentType, dimensions: currentDimensions,
                    selectedItems: currentSelectedItems,
                    description: currentDescription, price,
                    customMaterialPrice: parseFloat(customMaterialPrice) || undefined,
                    customLaborPrice: parseFloat(customLaborPrice) || undefined
                });
                setSections(activeSections);
                setCurrentDimensions(''); setCurrentDescription('');
                setCustomMaterialPrice(''); setCustomLaborPrice('');
            }
        }
        if (activeSections.length === 0) { setErrorMsg("Please add at least one section."); return; }

        setIsGenerating(true);
        const total = activeSections.reduce((s, x) => s + x.price, 0) + adjustments;
        setAiEstimatedTotal(total);

        try {
            let projectDesc = "";
            activeSections.forEach((s, idx) => {
                const items = getItemsForType(s.type).filter(i => s.selectedItems.includes(i.id)).map(i => i.label);
                projectDesc += `\n--- OPTION ${idx + 1}: ${s.type.toUpperCase()} ---\n`;
                projectDesc += `Work / Option Type: ${s.type}\n`;
                projectDesc += `Dimensions / Qty: ${s.dimensions} ${s.type.toLowerCase().includes('dock') ? 'SQF (Square Feet)' : (s.type.toLowerCase().includes('bulkhead') || s.type.toLowerCase().includes('rip-rap') || s.type.toLowerCase().includes('handrail')) ? 'Linear Feet' : 'Units'}\n`;
                if (s.description) {
                    projectDesc += `Specified Details / Materials / Hardware: "${s.description}"\n`;
                }
                if (items.length > 0) {
                    projectDesc += `Configured Components & Options: ${items.join(', ')}\n`;
                }
                if (s.customMaterialPrice || s.customLaborPrice) {
                    projectDesc += `Rates: Material $${s.customMaterialPrice || 0}/unit, Labor $${s.customLaborPrice || 0}/unit\n`;
                }
            });
            if (adjustments > 0) {
                projectDesc += `\n--- ADDITIONAL WORK / ADJUSTMENTS ---\n`;
                projectDesc += `Description: ${otherWorkDescription}\n`;
            }

            const prompt = `You are a licensed master marine construction estimator preparing a comprehensive, highly professional construction proposal for "Coastal VA Marine Construction".

Proposal Title: ${projectTitle.trim() ? projectTitle.trim() : '(None provided - please generate an accurate, professional project title)'}
Client Name: ${clientName || 'Valued Client'}
Project Address: ${clientAddress || 'Client Site Location'}

PROJECT OPTIONS & SPECIFICATIONS:
${projectDesc}

CRITICAL PROPOSAL INSTRUCTIONS:
1. TITLE:
   - If the user specified a Proposal Title ("${projectTitle.trim()}"), use it.
   - If no title was specified, generate an accurate, formal, descriptive title based on the sections/options (e.g. "Bulkhead Wood, Vinyl or Rip Rap Installation").

2. MANDATORY ITEMIZED OPTIONS BREAKDOWN (EXTREMELY IMPORTANT):
   - You MUST generate an item in the "sections" array for EVERY SINGLE option listed above.
   - Total options to generate: ${activeSections.length}. It is strictly forbidden to skip or omit any option.
   - For EACH option listed, provide at least 3 to 4 comprehensive, technical bullet points specifying:
     * Specific materials, models, equipment, decking, and kits according to the user's input (e.g. Bulkhead T&G Wood, TW-95 vinyl sheeting, Class I rip-rap, HydroPort Epic PWC, etc.).
     * Substructure framing, stringers, joists, pile specifications (e.g. 10" x 20' marine-treated pilings driven to refusal, 6x6x16 walers, tie rods), brackets, and marine-grade corrosion-resistant hardware.
     * Anchoring, erosion prevention, filter cloth, alignment, code-compliant spacing, safety features, non-skid surface treatments, and marine craftsmanship.
   - Every single detail provided in "Specified Details / Materials / Hardware" and "Configured Components & Options" MUST be explicitly included in that option's bullet points.
   - Do NOT give generic or brief one-liners. Detail the exact components being utilized based on the user's input.

3. SCOPE OF WORK INTRODUCTION:
   - Provide a 2 to 3 sentence introductory statement summarizing the project scope, coastal site preparation, and dedication to premium marine engineering and durability.

4. STANDARD EXCLUSIONS:
   - Include standard marine industry exclusions.

5. FORMATTING RULES (STRICT):
   - Output PLAIN TEXT ONLY within the JSON fields. NO markdown bolding (**), NO asterisks (*), NO markdown hashes (#), NO backticks.
   - DO NOT mention dollar amounts or prices in the proposal text.

Return ONLY a valid JSON object matching this schema:
{
  "title": "Descriptive Project Title",
  "introduction": "Professional 2-3 sentence introductory overview paragraph.",
  "sections": [
    {
      "name": "OPTION TITLE (e.g. BULKHEAD - WOOD, BULKHEAD - VINYL, or RIP-RAP / EROSION CONTROL)",
      "bullets": [
        "Comprehensive bullet detailing materials, models, dimensions, and specifications...",
        "Comprehensive bullet detailing structural framing, pilings, brackets, anchoring, and marine fasteners...",
        "Comprehensive bullet detailing alignment, safety standards, non-skid finishing, and coastal durability..."
      ]
    }
  ],
  "exclusions": [
    "Permits, regulatory filings, and engineering drawings (unless specifically noted)",
    "Geotechnical soil testing or environmental surveys",
    "Hidden subsurface or underwater obstructions",
    "Electrical service connection / high-voltage utility tie-ins beyond rough-in"
  ]
}`;

            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.2,
                    response_format: { type: "json_object" }
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            const content = data.choices[0].message.content;
            
            let parsed: any = {};
            try {
                const firstBrace = content.indexOf('{');
                const lastBrace = content.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    parsed = JSON.parse(content.substring(firstBrace, lastBrace + 1));
                } else {
                    parsed = JSON.parse(content);
                }
            } catch (pErr) {
                console.warn("Could not parse JSON directly from OpenAI response:", pErr);
            }

            const resolvedTitle = projectTitle.trim() || parsed.title || '';
            if (!projectTitle.trim() && parsed.title) {
                setProjectTitle(parsed.title);
            }

            // Assemble the comprehensive Scope of Work
            let fullScope = "";
            if (resolvedTitle) {
                const cleanTitle = resolvedTitle.replace(/^PROJECT:\s*/i, '').trim();
                fullScope += `PROJECT: ${cleanTitle.toUpperCase()}\n\n`;
            }

            // Introduction / Scope of Work header
            const intro = (parsed.introduction || parsed.intro || (typeof parsed.scopeOfWork === 'string' && !parsed.scopeOfWork.toUpperCase().includes('OPTION') && !parsed.scopeOfWork.toUpperCase().includes('SECTION') ? parsed.scopeOfWork : '') || '').trim();
            fullScope += `SCOPE OF WORK:\n${intro || 'Coastal VA Marine Construction is pleased to present this comprehensive proposal. All work will be executed with premium marine-grade materials, proven craftsmanship, and strict adherence to coastal building standards.'}\n\n`;

            // Render Options
            let renderedSectionsCount = 0;
            if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
                parsed.sections.forEach((sec: any, idx: number) => {
                    const fallbackName = activeSections[idx] ? activeSections[idx].type : `Option ${idx + 1}`;
                    const rawName = sec.name || sec.title || sec.heading || fallbackName;
                    const cleanName = rawName.replace(/^(OPTION|SECTION)\s*\d+\s*[-:]*\s*/i, '').trim();

                    let bullets: string[] = [];
                    if (Array.isArray(sec.bullets)) bullets = sec.bullets;
                    else if (typeof sec.bullets === 'string') bullets = sec.bullets.split('\n');
                    else if (Array.isArray(sec.details)) bullets = sec.details;
                    else if (typeof sec.details === 'string') bullets = sec.details.split('\n');

                    const cleanBullets = bullets
                        .map((b: string) => b.replace(/^[-*•\d\.)\s]+/, '').trim())
                        .filter((b: string) => b.length > 0);

                    if (cleanBullets.length > 0) {
                        fullScope += `OPTION ${idx + 1} - ${cleanName.toUpperCase()}:\n`;
                        cleanBullets.forEach(b => {
                            fullScope += `- ${b}\n`;
                        });
                        fullScope += '\n';
                        renderedSectionsCount++;
                    } else if (activeSections[idx]) {
                        fullScope += buildFallbackSection(activeSections[idx], idx) + '\n\n';
                        renderedSectionsCount++;
                    }
                });
            }

            // If parsed.sections didn't render or was missing sections completely:
            if (renderedSectionsCount === 0) {
                if (typeof parsed.scopeOfWork === 'string' && /(OPTION|SECTION)\s+\d+/i.test(parsed.scopeOfWork)) {
                    // OpenAI returned plain text with sections in scopeOfWork
                    fullScope = parsed.scopeOfWork.trim().replace(/\bSECTION\s+(\d+)/gi, 'OPTION $1');
                    if (resolvedTitle && !fullScope.toUpperCase().startsWith('PROJECT:')) {
                        fullScope = `PROJECT: ${resolvedTitle.toUpperCase()}\n\n` + fullScope;
                    }
                } else {
                    // Fallback to activeSections
                    activeSections.forEach((s, idx) => {
                        fullScope += buildFallbackSection(s, idx) + '\n\n';
                    });
                }
            }

            // Standard Exclusions
            if (!fullScope.includes("STANDARD EXCLUSIONS:")) {
                fullScope += `STANDARD EXCLUSIONS:\n`;
                if (Array.isArray(parsed.exclusions) && parsed.exclusions.length > 0) {
                    parsed.exclusions.forEach((e: string) => {
                        const clean = e.replace(/^[-*•\d\.)\s]+/, '').trim();
                        if (clean) fullScope += `- ${clean}\n`;
                    });
                } else if (typeof parsed.exclusions === 'string' && parsed.exclusions.trim()) {
                    const exclLines = parsed.exclusions
                        .split('\n')
                        .map((l: string) => l.replace(/^[-*•\d\.)\s]+/, '').trim())
                        .filter((l: string) => l.length > 0);
                    if (exclLines.length > 0) {
                        exclLines.forEach((l: string) => { fullScope += `- ${l}\n`; });
                    } else {
                        fullScope += `- Permits, regulatory filings, and engineering drawings (unless specifically noted)\n`;
                        fullScope += `- Geotechnical soil testing or environmental surveys\n`;
                        fullScope += `- Hidden subsurface or underwater obstructions\n`;
                        fullScope += `- Electrical service connection / high-voltage utility tie-ins beyond rough-in\n`;
                    }
                } else {
                    fullScope += `- Permits, regulatory filings, and engineering drawings (unless specifically noted)\n`;
                    fullScope += `- Geotechnical soil testing or environmental surveys\n`;
                    fullScope += `- Hidden subsurface or underwater obstructions\n`;
                    fullScope += `- Electrical service connection / high-voltage utility tie-ins beyond rough-in\n`;
                }
            }

            // Normalize any remaining SECTION to OPTION
            fullScope = fullScope.replace(/\bSECTION\s+(\d+)/gi, 'OPTION $1');
            setScopeOfWork(fullScope.trim());
        } catch (err: any) {
            setErrorMsg("Error: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // PDF Generation - Premium Modern Formal Design
    const generatePDF = () => {
        const doc = new jsPDF({ format: 'letter', unit: 'mm' });
        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();
        const margin = 18;
        let y = 0;

        const NAVY: [number, number, number] = [10, 25, 47];
        const CYAN: [number, number, number] = [0, 180, 216];
        const BLACK: [number, number, number] = [15, 23, 42];
        const BODY: [number, number, number] = [55, 65, 81];
        const LABEL: [number, number, number] = [148, 163, 184];
        const LINE: [number, number, number] = [226, 232, 240];
        const ACCENT_GREEN: [number, number, number] = [16, 185, 129];

        // ── Draws compact header band ──
        const drawHeader = () => {
            // Dark navy band
            doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
            doc.rect(0, 0, width, 32, 'F');
            // Cyan accent strip at bottom of band
            doc.setFillColor(CYAN[0], CYAN[1], CYAN[2]);
            doc.rect(0, 32, width, 1.2, 'F');

            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.text("COASTAL VA MARINE CONSTRUCTION", margin, 15);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(CYAN[0], CYAN[1], CYAN[2]);
            doc.text(projectTitle.trim() ? `CONSTRUCTION PROPOSAL • ${projectTitle.trim().toUpperCase().substring(0, 48)}` : "CONSTRUCTION PROPOSAL", margin, 22);

            // Date on right
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), width - margin, 15, { align: 'right' });

            // Reset
            doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            y = 44;
        };

        // ── Draws page footer ──
        const drawFooter = () => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(LABEL[0], LABEL[1], LABEL[2]);
            doc.text("Coastal VA Marine Construction  •  Preliminary Proposal  •  Confidential", width / 2, height - 8, { align: 'center' });
        };

        // ════════════════════════════════════
        //  PAGE 1 - COVER & SCOPE
        // ════════════════════════════════════
        drawHeader();

        // ── Client Info ──
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(LABEL[0], LABEL[1], LABEL[2]);
        doc.text("PREPARED FOR", margin, y);
        y += 5;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
        doc.text(clientName || "Valued Client", margin, y);
        y += 6;

        if (clientAddress) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(BODY[0], BODY[1], BODY[2]);
            doc.text(clientAddress, margin, y);
            y += 5;
        }

        if (projectTitle.trim()) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(CYAN[0], CYAN[1], CYAN[2]);
            const titleLines = doc.splitTextToSize(`PROJECT: ${projectTitle.trim().toUpperCase()}`, width - margin * 2);
            doc.text(titleLines, margin, y + 1);
            y += (titleLines.length * 4.5) + 3;
        } else {
            y += 3;
        }

        // Thin separator
        doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
        doc.setLineWidth(0.3);
        doc.line(margin, y, width - margin, y);
        y += 8;

        // ── Scope of Work ──
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
        doc.text("SCOPE OF WORK & SPECIFICATIONS", margin, y);
        y += 3;
        // Cyan underline for section heading
        doc.setDrawColor(CYAN[0], CYAN[1], CYAN[2]);
        doc.setLineWidth(0.6);
        doc.line(margin, y, margin + 60, y);
        doc.setLineWidth(0.2);
        y += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(BODY[0], BODY[1], BODY[2]);

        const displayScope = (scopeOfWork || '').replace(/\bSECTION\s+(\d+)/gi, 'OPTION $1');
        const lines = doc.splitTextToSize(displayScope, width - margin * 2);
        for (let i = 0; i < lines.length; i++) {
            if (y > height - 25) {
                drawFooter();
                doc.addPage();
                drawHeader();
            }
            const line = lines[i];
            const isHeading = /^(PROJECT:|SCOPE OF WORK:|OPTION\s+\d+|SECTION\s+\d+|STANDARD EXCLUSIONS:)/i.test(line.trim());
            if (isHeading) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
            } else {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8.5);
                doc.setTextColor(BODY[0], BODY[1], BODY[2]);
            }
            doc.text(line, margin, y);
            y += 4.5;
        }

        drawFooter();

        // ════════════════════════════════════
        //  PAGE 2 - INVESTMENT SUMMARY
        // ════════════════════════════════════
        doc.addPage();
        drawHeader();
        doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

        // Center title
        y = 54;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
        doc.text("INVESTMENT SUMMARY", width / 2, y, { align: 'center' });
        y += 4;
        doc.setDrawColor(CYAN[0], CYAN[1], CYAN[2]);
        doc.setLineWidth(0.6);
        doc.line(width / 2 - 30, y, width / 2 + 30, y);
        doc.setLineWidth(0.2);
        y += 12;

        // ── Itemized breakdown (conditional) ──
        if (showProjectSummary && sections.length > 0) {
            const cbSize = 6; // mm square checkbox
            const cbX = width - margin - cbSize; // right-aligned at margin
            const amountRight = cbX - 4; // price right-aligned with 4mm gap before checkbox

            // Table header
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(LABEL[0], LABEL[1], LABEL[2]);
            doc.text("OPTION / DESCRIPTION", margin, y);
            doc.text("AMOUNT", amountRight, y, { align: 'right' });
            y += 3;
            doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
            doc.line(margin, y, width - margin, y);
            y += 6;

            // Rows with Option title, detailed description, amount, and checkbox
            sections.forEach((s, idx) => {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.5);
                doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
                doc.text(`Option ${idx + 1}: ${s.type}`, margin, y);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.5);
                doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
                doc.text(`$${(Number(s.price) || 0).toLocaleString()}`, amountRight, y, { align: 'right' });

                // Checkbox box next to amount
                doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
                doc.setLineWidth(0.6);
                doc.rect(cbX, y - 4.5, cbSize, cbSize);
                doc.setLineWidth(0.2);

                // Construct detailed subtitle so user knows what this option corresponds to
                const unitLabel = s.type.toLowerCase().includes('dock') 
                    ? 'SQF' 
                    : (s.type.toLowerCase().includes('bulkhead') || s.type.toLowerCase().includes('rip-rap') || s.type.toLowerCase().includes('handrail')) 
                        ? 'LF' 
                        : 'Units';
                const rawDims = (s.dimensions || '').trim();
                let dimsStr = '';
                if (rawDims) {
                    const lowerDims = rawDims.toLowerCase();
                    const lowerUnit = unitLabel.toLowerCase();
                    if (lowerDims.includes(lowerUnit) || lowerDims.includes('sqf') || lowerDims.includes('sq ft') || lowerDims.includes('lf') || lowerDims.includes('feet') || lowerDims.includes('unit') || lowerDims.includes('qty')) {
                        dimsStr = rawDims;
                    } else {
                        dimsStr = `${rawDims} ${unitLabel}`;
                    }
                }
                let detailStr = '';

                if (s.description && s.description.trim()) {
                    detailStr = dimsStr ? `${dimsStr} — ${s.description.trim()}` : s.description.trim();
                } else {
                    const items = getItemsForType(s.type).filter(i => s.selectedItems.includes(i.id)).map(i => i.label);
                    if (items.length > 0) {
                        detailStr = dimsStr ? `${dimsStr} — ${items.slice(0, 3).join(', ')}` : items.slice(0, 3).join(', ');
                    } else {
                        detailStr = dimsStr;
                    }
                }

                if (detailStr) {
                    y += 4.5;
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.setTextColor(BODY[0], BODY[1], BODY[2]);
                    const descLines = doc.splitTextToSize(detailStr, width - margin * 2 - 40);
                    doc.text(descLines, margin + 3, y);
                    y += (descLines.length * 3.8) + 4.5;
                } else {
                    y += 7.5;
                }
            });

            if (adjustments > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.5);
                doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
                doc.text("Additional Work / Adjustments", margin, y);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.5);
                doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
                doc.text(`$${adjustments.toLocaleString()}`, amountRight, y, { align: 'right' });

                doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
                doc.setLineWidth(0.6);
                doc.rect(cbX, y - 4.5, cbSize, cbSize);
                doc.setLineWidth(0.2);

                if (otherWorkDescription && otherWorkDescription.trim()) {
                    y += 4.5;
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.setTextColor(BODY[0], BODY[1], BODY[2]);
                    const otherLines = doc.splitTextToSize(otherWorkDescription.trim(), width - margin * 2 - 40);
                    doc.text(otherLines, margin + 3, y);
                    y += (otherLines.length * 3.8) + 4.5;
                } else {
                    y += 7.5;
                }
            }

            // Solid divider line below options
            y += 2;
            doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
            doc.setLineWidth(0.6);
            doc.line(margin, y, width - margin, y);
            doc.setLineWidth(0.2);
            y += 18;

            // Selected Option Total line with handwritten line
            const totalLineEnd = width - margin;
            const totalLineStart = width / 2 - 2;
            const dollarX = totalLineStart - 8;
            const labelX = dollarX - 8;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11.5);
            doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
            doc.text("SELECTED OPTION TOTAL", labelX, y, { align: 'right' });
            doc.text("$", dollarX, y);

            doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
            doc.setLineWidth(0.7);
            doc.line(totalLineStart, y + 1, totalLineEnd, y + 1);
            doc.setLineWidth(0.2);

            y += 22;
        } else {
            // ── Total Box — shown when proposal is lump sum (not itemized options) ──
            const boxW = 130;
            const boxH = 52;
            const boxX = (width - boxW) / 2;

            // Navy background
            doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
            doc.roundedRect(boxX, y, boxW, boxH, 4, 4, 'F');

            // Cyan accent line at top
            doc.setFillColor(CYAN[0], CYAN[1], CYAN[2]);
            doc.roundedRect(boxX, y, boxW, 2, 4, 4, 'F');
            // Cover bottom rounding of accent
            doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
            doc.rect(boxX, y + 1.5, boxW, 3, 'F');

            // Label
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(CYAN[0], CYAN[1], CYAN[2]);
            doc.text("TOTAL PROPOSED INVESTMENT", width / 2, y + 16, { align: 'center' });

            // Amount
            doc.setFont("helvetica", "bold");
            doc.setFontSize(32);
            doc.setTextColor(255, 255, 255);
            doc.text(`$${aiEstimatedTotal.toLocaleString()}`, width / 2, y + 35, { align: 'center' });

            // Small note under amount
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text("All materials, labor & equipment included", width / 2, y + 43, { align: 'center' });

            y += boxH + 16;
        }

        // ── Validity ──
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(LABEL[0], LABEL[1], LABEL[2]);
        doc.text("This proposal is valid for 30 days from the date of issue.", width / 2, y, { align: 'center' });
        y += 6;
        doc.text("Prices are subject to change based on material availability and site conditions.", width / 2, y, { align: 'center' });
        y += 20;

        // ── Signature Block ──
        const sigLineLen = 72;
        const sigLeftX = margin + 5;
        const sigRightX = width - margin - sigLineLen - 5;

        doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
        doc.setLineWidth(0.4);
        doc.line(sigLeftX, y, sigLeftX + sigLineLen, y);
        doc.line(sigRightX, y, sigRightX + sigLineLen, y);
        y += 5;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(LABEL[0], LABEL[1], LABEL[2]);
        doc.text("CLIENT SIGNATURE & DATE", sigLeftX, y);
        doc.text("COASTAL VA REPRESENTATIVE & DATE", sigRightX, y);

        drawFooter();

        const safeTitle = (projectTitle.trim() || clientName || 'Proposal').replace(/[^a-zA-Z0-9_-]/g, '_');
        doc.save(`Proposal_${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const currentLivePrice = Number(calculateSectionPrice(currentType, currentDimensions, currentSelectedItems, undefined, customMaterialPrice, customLaborPrice)) || 0;
    const proposalReady = (scopeOfWork || '').trim().length > 0;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="bg-[#0a192f] p-3 rounded-xl text-cyan-400"><Bot className="w-6 h-6" /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#0a192f]">Proposal Generator <span className="text-cyan-600">PRO</span></h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Multi-Section AI Estimator</p>
                    </div>
                </div>
                <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Settings className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            {showSettings && (
                <div className="bg-slate-800 p-6 rounded-2xl text-white animate-in slide-in-from-top duration-200 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Settings & Pricing Catalog</span>
                        <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase mb-2 block text-slate-400">OpenAI API Key</label>
                        <div className="flex gap-2">
                            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg focus:border-cyan-500 outline-none text-xs" />
                            <button onClick={handleSaveKey} className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg font-bold text-xs uppercase transition-colors">Save Key</button>
                        </div>
                    </div>
                    <div className="pt-2">
                        <button 
                            type="button" 
                            onClick={() => {
                                setCatalogActiveType(currentType);
                                setShowCatalogModal(true);
                                setShowSettings(false);
                            }}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-cyan-300 font-bold px-4 py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-cyan-500/30 shadow-md"
                        >
                            <Edit3 className="w-4 h-4" /> Modificar Catálogo de Precios y Materiales
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Builder */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Client Info & Project Title */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Client Name</label>
                                <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-700 focus:border-cyan-400 outline-none" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Project Address</label>
                                <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-700 focus:border-cyan-400 outline-none" placeholder="123 Ocean Dr" />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400 block">
                                    Proposal / Project Title (Título del Proyecto)
                                </label>
                                {projectTitle ? (
                                    <button
                                        type="button"
                                        onClick={() => setProjectTitle('')}
                                        className="text-[10px] text-slate-400 hover:text-rose-500 font-bold transition-colors cursor-pointer"
                                    >
                                        Limpiar
                                    </button>
                                ) : (
                                    <span className="text-[10px] text-slate-400 font-medium italic">
                                        (Opcional · La IA lo generará si está vacío)
                                    </span>
                                )}
                            </div>
                            <input
                                type="text"
                                value={projectTitle}
                                onChange={e => setProjectTitle(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-cyan-400 rounded-xl px-4 py-2.5 font-bold text-slate-800 outline-none placeholder:text-slate-400 text-xs transition-colors shadow-inner"
                                placeholder="e.g. Handrail, Hip Metal Roof & Boathouse Lighting Installation"
                            />
                        </div>
                    </div>

                    {/* Sections / Options List */}
                    {Array.isArray(sections) && sections.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Options / Sections Added</h3>
                                <button onClick={() => setSections([])} className="text-[10px] text-red-400 font-bold hover:underline">Clear All</button>
                            </div>
                            {sections.map((s, idx) => (
                                <div key={s.id || idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center hover:border-cyan-200 transition-all">
                                    <div className="flex gap-4 items-center">
                                        <div className="bg-cyan-50 text-cyan-700 font-black px-2.5 h-8 flex items-center justify-center rounded-lg text-xs whitespace-nowrap">
                                            Opt {idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-700">Option {idx + 1}: {s.type}</h4>
                                            <p className="text-xs text-slate-400">{s.dimensions} units{s.description ? ` · ${s.description}` : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono font-bold text-slate-700">${(Number(s?.price) || 0).toLocaleString()}</span>
                                        <button onClick={() => removeSection(s.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Section Form */}
                    <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 relative">
                        <div className="absolute -top-3 left-6 bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Step 1: Build Proposal</div>
                        <h3 className="flex items-center gap-2 font-black text-slate-600 uppercase tracking-widest text-sm mb-6 mt-2">
                            <Plus className="w-4 h-4 text-cyan-500" /> Add Project Section
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 block">Section Type</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewTypeModal(true)}
                                        className="text-[10px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> + Nuevo Tipo
                                    </button>
                                </div>
                                <select value={currentType} onChange={e => setCurrentType(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400">
                                    {(Array.isArray(projectTypes) ? projectTypes : DEFAULT_PROJECT_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Dimensions / Qty</label>
                                <input value={currentDimensions} onChange={e => setCurrentDimensions(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder="e.g. 100" />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                                {currentType === "Other / Custom Project" ? "Concept / Description" : "Description / Note (Optional)"}
                            </label>
                            <input value={currentDescription} onChange={e => setCurrentDescription(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder={currentType === "Other / Custom Project" ? "e.g. Gazebo Construction" : "e.g. Main Dock on Left Side"} />
                        </div>

                        {currentType === "Other / Custom Project" ? (
                            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
                                <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Custom Pricing (Per Unit)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-400">Material ($)</label>
                                        <input type="number" value={customMaterialPrice} onChange={e => setCustomMaterialPrice(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-400">Labor ($)</label>
                                        <input type="number" value={customLaborPrice} onChange={e => setCustomLaborPrice(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder="0.00" />
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-slate-400 italic">Total = (Qty x Material) + (Qty x Labor)</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 max-h-64 overflow-y-auto">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 block">Specifications & Materials</label>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setCatalogActiveType(currentType);
                                            setShowCatalogModal(true);
                                        }}
                                        className="text-[11px] font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 hover:border-cyan-300 border border-cyan-200 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                    >
                                        <Edit3 className="w-3.5 h-3.5 text-cyan-600" /> Modificar Precios y Opciones
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {(getItemsForType(currentType) || []).map(item => {
                                        const sel = Array.isArray(currentSelectedItems) && currentSelectedItems.includes(item.id);
                                        return (
                                            <div key={item.id} onClick={() => toggleCurrentItem(item.id)} className={`cursor-pointer p-2 rounded-lg border flex items-center gap-3 transition-all ${sel ? 'bg-cyan-50 border-cyan-200' : 'hover:bg-slate-50 border-transparent'}`}>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-cyan-500 border-cyan-500' : 'bg-white border-slate-300'}`}>
                                                    {sel && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">{item.label}</p>
                                                    <p className="text-[9px] text-slate-400">${item.price}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-4 px-1">
                            <span className="text-xs font-bold text-slate-400 uppercase">Section Total:</span>
                            <span className="text-xl font-black text-slate-700">${(Number(currentLivePrice) || 0).toLocaleString()}</span>
                        </div>
                        <button onClick={addSection} className="w-full py-4 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white font-bold rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition-all">
                            <Plus className="w-4 h-4 text-cyan-400" /> Add to Proposal
                        </button>
                    </div>

                    {/* Adjustments */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Adjustments / Other</h3>
                        <div className="flex gap-4">
                            <input value={otherWorkDescription} onChange={e => setOtherWorkDescription(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-cyan-400 outline-none" placeholder="Misc / Other Work" />
                            <div className="relative w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                <input type="number" value={otherWorkCost} onChange={e => setOtherWorkCost(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-4 py-2 text-sm font-bold focus:border-cyan-400 outline-none" placeholder="0.00" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Output */}
                <div className="lg:col-span-5 flex flex-col space-y-6">
                    {/* Total */}
                    <div className="bg-[#0a192f] p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-1">Total Estimated Investment</p>
                        <h2 className="text-5xl font-black tracking-tighter mb-2">${grandTotal.toLocaleString()}</h2>
                        <p className="text-slate-500 text-xs italic">Includes all sections & adjustments</p>
                    </div>

                    {/* Step 2 Panel */}
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col relative">
                        <div className="absolute -top-3 left-6 bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Step 2: Scope & Export</div>

                        <div className="flex justify-between items-center mb-5 mt-4">
                            <h3 className="font-black text-slate-700 uppercase tracking-widest text-sm flex items-center gap-2">
                                <Bot className="w-4 h-4 text-cyan-600" /> Proposal Scope
                            </h3>
                            {proposalReady && (
                                <button onClick={generatePDF} className="bg-red-500 hover:bg-red-600 active:scale-95 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all">
                                    <FileText className="w-4 h-4" /> Export PDF
                                </button>
                            )}
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setManualMode(false)}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all border ${!manualMode ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-600/20' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-cyan-300'}`}
                            >
                                <Bot className="w-3 h-3" /> AI Generate
                            </button>
                            <button
                                onClick={activateManualMode}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all border ${manualMode ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400'}`}
                            >
                                <Edit3 className="w-3 h-3" /> Write Manually
                            </button>
                        </div>

                        {proposalReady ? (
                            <div className="flex flex-col gap-4">
                                <textarea
                                    value={scopeOfWork}
                                    onChange={e => setScopeOfWork(e.target.value)}
                                    rows={16}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 outline-none focus:border-cyan-400 resize-none leading-relaxed font-mono shadow-inner"
                                />
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Final Price (Editable)</label>
                                    <input
                                        type="number"
                                        value={aiEstimatedTotal}
                                        onChange={e => setAiEstimatedTotal(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-100 border-2 border-slate-200 text-slate-800 rounded-xl px-4 py-3 font-black text-xl focus:border-cyan-400 outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="showSummary" checked={showProjectSummary} onChange={e => setShowProjectSummary(e.target.checked)} className="w-4 h-4 cursor-pointer" />
                                    <label htmlFor="showSummary" className="text-xs font-bold text-slate-400 uppercase cursor-pointer select-none">Include Itemized Summary in PDF</label>
                                </div>
                            </div>
                        ) : manualMode ? (
                            <div className="flex flex-col gap-4">
                                <p className="text-xs text-slate-400 italic">Write your scope of work below. This text will appear exactly as typed in the PDF.</p>
                                <textarea
                                    value={scopeOfWork}
                                    onChange={e => setScopeOfWork(e.target.value)}
                                    rows={16}
                                    placeholder={"SCOPE OF WORK:\n\nSection 1: Pier Construction\n- Install treated wood piling, 12\" diameter\n- Frame with 2x10 stringers\n...\n\nSTANDARD EXCLUSIONS:\nPermits, Engineering..."}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 outline-none focus:border-cyan-400 resize-none leading-relaxed font-mono shadow-inner"
                                />
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Final Price</label>
                                    <input
                                        type="number"
                                        value={aiEstimatedTotal || grandTotal}
                                        onChange={e => setAiEstimatedTotal(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-100 border-2 border-slate-200 text-slate-800 rounded-xl px-4 py-3 font-black text-xl focus:border-cyan-400 outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="showSummary2" checked={showProjectSummary} onChange={e => setShowProjectSummary(e.target.checked)} className="w-4 h-4 cursor-pointer" />
                                    <label htmlFor="showSummary2" className="text-xs font-bold text-slate-400 uppercase cursor-pointer select-none">Include Itemized Summary in PDF</label>
                                </div>
                                <button onClick={generatePDF} disabled={scopeOfWork.trim().length < 10} className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all">
                                    <FileText className="w-4 h-4" /> Export PDF
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                <Layers className="w-12 h-12 text-slate-200 mb-4" />
                                <p className="text-slate-400 font-bold text-sm">Ready to generate</p>
                                <p className="text-slate-300 text-xs mt-1 px-6">Add sections then use AI or write manually</p>
                            </div>
                        )}

                        {!manualMode && (
                            <button
                                onClick={handleGenerateQuote}
                                disabled={isGenerating || (sections.length === 0 && (!currentDimensions || parseFloat(currentDimensions) === 0))}
                                className="w-full mt-5 py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-cyan-600/20 transition-all active:scale-[0.98]"
                            >
                                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                                {isGenerating ? 'Drafting Proposal...' : 'Generate with AI'}
                            </button>
                        )}

                        {errorMsg && <p className="text-center text-red-500 text-xs font-bold mt-4">{errorMsg}</p>}
                    </div>
                </div>
            </div>

            {/* ── MODAL: PRICING & MATERIALS CATALOG MANAGER ── */}
            {showCatalogModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="bg-[#0a192f] p-6 text-white flex justify-between items-center border-b border-slate-800">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 p-1.5 rounded-lg">
                                        <DollarSign className="w-5 h-5" />
                                    </span>
                                    <h3 className="font-extrabold text-lg tracking-tight">Catálogo de Precios y Opciones</h3>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 font-medium">
                                    Modifique los precios base por unidad o agregue nuevos materiales para cada tipo de proyecto.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowCatalogModal(false)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Section Type Tabs */}
                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-2 overflow-x-auto">
                            {(Array.isArray(projectTypes) ? projectTypes : DEFAULT_PROJECT_TYPES).filter(t => t !== "Other / Custom Project").map(type => {
                                const isActive = catalogActiveType === type;
                                const count = (catalog && typeof catalog === 'object' && Array.isArray(catalog[type])) ? catalog[type].length : 0;
                                const isCustom = !DEFAULT_PROJECT_TYPES.includes(type);
                                return (
                                    <div key={type} className="flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => setCatalogActiveType(type)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                                                isActive 
                                                    ? 'bg-[#0a192f] text-cyan-400 shadow-sm' 
                                                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                                            }`}
                                        >
                                            <span>{type}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${isActive ? 'bg-cyan-900/60 text-cyan-300' : 'bg-slate-100 text-slate-500'}`}>
                                                {count}
                                            </span>
                                            {isCustom && (
                                                <span
                                                    role="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteSectionType(type);
                                                    }}
                                                    className="ml-1 text-slate-400 hover:text-red-500 p-0.5 rounded hover:bg-slate-200/50"
                                                    title={`Eliminar tipo ${type}`}
                                                >
                                                    <X className="w-3 h-3" />
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setShowNewTypeModal(true)}
                                className="px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-300 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ml-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Agregar Tipo de Trabajo
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Section info banner */}
                            <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-2xl p-4 text-xs text-cyan-900 flex justify-between items-center">
                                <div>
                                    <span className="font-bold uppercase tracking-wide text-[10px] text-cyan-700 block mb-0.5">Tipo de Sección Activa: {catalogActiveType}</span>
                                    <p className="text-slate-600 font-medium">
                                        {catalogActiveType === 'Pier / Dock' && 'Unidad principal: SQF (Pies cuadrados). Las cotizaciones aplican 10% de margen operativo.'}
                                        {catalogActiveType === 'Floating Dock' && 'Unidad principal: SQF (Pies cuadrados). Las cotizaciones aplican 10% de margen operativo.'}
                                        {catalogActiveType === 'Bulkhead' && 'Unidad principal: LF (Pies lineales). Las cotizaciones aplican 10% de margen operativo.'}
                                        {catalogActiveType === 'Boat Lift' && 'Unidad principal: Fixed (Precio fijo por elevador). Las cotizaciones aplican 10% de margen operativo.'}
                                        {catalogActiveType === 'Rip-Rap / Erosion Control' && 'Unidad principal: LF (Pies lineales). Las cotizaciones aplican 10% de margen operativo.'}
                                        {!DEFAULT_PROJECT_TYPES.includes(catalogActiveType) && 'Tipo de trabajo personalizado. Agregue abajo los materiales, mano de obra o equipos necesarios para esta sección.'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!DEFAULT_PROJECT_TYPES.includes(catalogActiveType) && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSectionType(catalogActiveType)}
                                            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Eliminar Este Tipo
                                        </button>
                                    )}
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-white px-3 py-1.5 rounded-lg border border-cyan-200 text-cyan-800 shadow-sm">
                                        {((catalog && typeof catalog === 'object' && Array.isArray(catalog[catalogActiveType])) ? catalog[catalogActiveType] : []).length} Opciones
                                    </span>
                                </div>
                            </div>

                            {/* Existing Materials List */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                    Materiales y Tarifas Actuales ({catalogActiveType})
                                </h4>
                                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white shadow-sm">
                                    {((catalog && typeof catalog === 'object' && Array.isArray(catalog[catalogActiveType])) ? catalog[catalogActiveType] : []).map((item, idx) => (
                                        <div key={item.id} className="p-3.5 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                                            {/* Item Label & Default toggle */}
                                            <div className="flex items-center gap-3 flex-1">
                                                <input 
                                                    type="checkbox"
                                                    checked={item.isDefault}
                                                    onChange={e => handleUpdateCatalogItem(catalogActiveType, item.id, 'isDefault', e.target.checked)}
                                                    title="Seleccionar por defecto al añadir este tipo de sección"
                                                    className="w-4 h-4 text-cyan-600 rounded cursor-pointer flex-shrink-0"
                                                />
                                                <input 
                                                    type="text"
                                                    value={item.label}
                                                    onChange={e => handleUpdateCatalogItem(catalogActiveType, item.id, 'label', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                                                />
                                            </div>

                                            {/* Pricing & Unit controls */}
                                            <div className="flex items-center gap-2">
                                                <div className="relative w-28">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                                                    <input 
                                                        type="number"
                                                        step="0.01"
                                                        value={item.price}
                                                        onChange={e => handleUpdateCatalogItem(catalogActiveType, item.id, 'price', e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-200 focus:border-cyan-400 rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-black text-slate-800 outline-none"
                                                    />
                                                </div>

                                                <select
                                                    value={item.unit || 'lf'}
                                                    onChange={e => handleUpdateCatalogItem(catalogActiveType, item.id, 'unit', e.target.value)}
                                                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-600 outline-none"
                                                >
                                                    <option value="lf">/ LF</option>
                                                    <option value="sqf">/ SQF</option>
                                                    <option value="fixed">Fixed</option>
                                                    <option value="unit">Unit</option>
                                                </select>

                                                <span className="text-[10px] font-extrabold uppercase px-2 py-1 bg-slate-100 text-slate-500 rounded-md">
                                                    {item.category}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCatalogItem(catalogActiveType, item.id)}
                                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                    title="Eliminar opción"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Form to Add New Item */}
                            <form onSubmit={handleAddCatalogItem} className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 space-y-4">
                                <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                                    <Plus className="w-4 h-4 text-cyan-600" /> Agregar Nueva Opción o Material a {catalogActiveType}
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nombre / Descripción del Material *</label>
                                        <input 
                                            type="text"
                                            required
                                            placeholder="ej. Heavy Duty Filter Fabric 300g"
                                            value={newItemLabel}
                                            onChange={e => setNewItemLabel(e.target.value)}
                                            className="w-full bg-white border border-slate-200 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Precio Unitario ($) *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                required
                                                placeholder="0.00"
                                                value={newItemPrice}
                                                onChange={e => setNewItemPrice(e.target.value)}
                                                className="w-full bg-white border border-slate-200 focus:border-cyan-400 rounded-xl pl-6 pr-3 py-2 text-xs font-black text-slate-800 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Unidad</label>
                                        <select
                                            value={newItemUnit}
                                            onChange={e => setNewItemUnit(e.target.value)}
                                            className="w-full bg-white border border-slate-200 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                                        >
                                            <option value="lf">Linear Feet (LF)</option>
                                            <option value="sqf">Square Feet (SQF)</option>
                                            <option value="fixed">Fixed / Monto Fijo</option>
                                            <option value="unit">Por Unidad</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Categoría</label>
                                            <select
                                                value={newItemCategory}
                                                onChange={e => setNewItemCategory(e.target.value as any)}
                                                className="bg-white border border-slate-200 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                                            >
                                                <option value="material">Material</option>
                                                <option value="labor">Mano de Obra (Labor)</option>
                                                <option value="fee">Cuota / Equipo (Fee)</option>
                                                <option value="decking">Decking / Tablado</option>
                                            </select>
                                        </div>

                                        <label className="flex items-center gap-2 cursor-pointer mt-4 select-none">
                                            <input 
                                                type="checkbox"
                                                checked={newItemIsDefault}
                                                onChange={e => setNewItemIsDefault(e.target.checked)}
                                                className="w-4 h-4 text-cyan-600 rounded cursor-pointer"
                                            />
                                            <span className="text-xs font-bold text-slate-600">Incluir seleccionado por defecto</span>
                                        </label>
                                    </div>

                                    <button 
                                        type="submit"
                                        className="bg-slate-800 hover:bg-slate-700 text-cyan-400 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                                    >
                                        <Plus className="w-4 h-4" /> Agregar Opción
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleResetCatalogDefaults}
                                    className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" /> Restablecer Fábrica
                                </button>
                                {catalogSaveSuccess && (
                                    <span className="text-emerald-600 text-xs font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg animate-in fade-in">
                                        <Check className="w-4 h-4 text-emerald-500" /> ¡Guardado con éxito en la nube!
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCatalogModal(false)}
                                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="button"
                                    disabled={isSavingCatalog}
                                    onClick={() => saveCatalogToCloud()}
                                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
                                >
                                    {isSavingCatalog ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    <span>{isSavingCatalog ? 'Guardando...' : 'Guardar y Sincronizar'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: ADD NEW SECTION TYPE ── */}
            {showNewTypeModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                            <h4 className="font-extrabold text-base text-[#0a192f] flex items-center gap-2">
                                <Plus className="w-5 h-5 text-cyan-600" />
                                Agregar Tipo de Trabajo / Sección
                            </h4>
                            <button onClick={() => setShowNewTypeModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
                            Ingrese el nombre del nuevo tipo de proyecto o sección de trabajo para el estimador (ej. Seawall, Retaining Wall, Boat Ramp, Deck Repair, Pergola).
                        </p>
                        <form onSubmit={handleAddSectionType} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nombre del Tipo de Trabajo *</label>
                                <input 
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="ej. Seawall, Retaining Wall..."
                                    value={newTypeName}
                                    onChange={e => setNewTypeName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none shadow-inner"
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowNewTypeModal(false)}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-cyan-600/20 active:scale-95 flex items-center gap-1.5"
                                >
                                    <Plus className="w-4 h-4" /> Crear Tipo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuoteGenerator;
