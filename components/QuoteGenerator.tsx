import React, { useState, useEffect } from 'react';
import { Bot, FileText, Send, Save, Download, Loader2, Settings, X, Plus, Trash2, CheckSquare, Square, Calculator, Check, Layout, Edit, Layers } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { DOCK_ITEMS, DECKING_OPTIONS, RIP_RAP_ITEMS, FLOATING_DOCK_ITEMS, BULKHEAD_ITEMS, BOATLIFT_ITEMS, calculateInteractivePrice } from '../utils/pricingCalculator';

const PROJECT_TYPES = ["Pier / Dock", "Floating Dock", "Bulkhead", "Boat Lift", "Rip-Rap / Erosion Control", "Other / Custom Project"];

interface QuoteSection {
    id: string;
    type: string;
    dimensions: string;
    selectedItems: string[];
    deckingType?: string;
    description?: string; // User note for this section
    price: number;
}

const QuoteGenerator: React.FC = () => {
    // API & Settings
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
    const [showSettings, setShowSettings] = useState(false);

    // Client Info
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');

    // Multi-Section State
    const [sections, setSections] = useState<QuoteSection[]>([]);

    // Current Section Form State
    const [currentType, setCurrentType] = useState(PROJECT_TYPES[0]);
    const [currentDimensions, setCurrentDimensions] = useState('');
    const [currentDecking, setCurrentDecking] = useState(DECKING_OPTIONS[0].id);
    const [currentSelectedItems, setCurrentSelectedItems] = useState<string[]>([]);
    const [currentDescription, setCurrentDescription] = useState(''); // e.g. "Main Dock"

    // Global Adjustments
    const [otherWorkCost, setOtherWorkCost] = useState('');
    const [otherWorkDescription, setOtherWorkDescription] = useState('');

    // AI Results
    const [isGenerating, setIsGenerating] = useState(false);
    const [scopeOfWork, setScopeOfWork] = useState('');
    const [aiEstimatedTotal, setAiEstimatedTotal] = useState<number>(0); // Allows override
    const [errorMsg, setErrorMsg] = useState('');

    // Initialize default items when type changes
    useEffect(() => {
        const defaults = getItemsForType(currentType).filter(i => i.isDefault).map(i => i.id);
        setCurrentSelectedItems(defaults);
    }, [currentType]);

    // Helpers
    const getItemsForType = (type: string) => {
        switch (type) {
            case "Pier / Dock": return DOCK_ITEMS;
            case "Floating Dock": return FLOATING_DOCK_ITEMS;
            case "Bulkhead": return BULKHEAD_ITEMS;
            case "Boat Lift": return BOATLIFT_ITEMS;
            case "Rip-Rap / Erosion Control": return RIP_RAP_ITEMS;
            default: return [];
        }
    };

    const calculateSectionPrice = (type: string, dims: string, items: string[], decking?: string) => {
        if (type === "Other / Custom Project") return 0; // Handled manually or via adjustments

        const qty = parseFloat(dims) || 0;
        // Map type string to calculator keys
        let calcType: 'dock' | 'riprap' | 'floating_dock' | 'bulkhead' | 'boat_lift' = 'dock';
        if (type === 'Floating Dock') calcType = 'floating_dock';
        else if (type === 'Bulkhead') calcType = 'bulkhead';
        else if (type === 'Boat Lift') calcType = 'boat_lift';
        else if (type === 'Rip-Rap / Erosion Control') calcType = 'riprap';

        // For Boat Lift, quantity might be 1 if fixed items
        const effectiveQty = (calcType === 'boat_lift' && qty === 0) ? 1 : qty;

        return calculateInteractivePrice(calcType, effectiveQty, items, decking, 0);
    };

    // Form Handlers
    const handleSaveKey = () => {
        localStorage.setItem('openai_api_key', apiKey);
        setShowSettings(false);
    };

    const toggleCurrentItem = (id: string) => {
        setCurrentSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const addSection = () => {
        const price = calculateSectionPrice(currentType, currentDimensions, currentSelectedItems, currentDecking);
        const newSection: QuoteSection = {
            id: Date.now().toString(),
            type: currentType,
            dimensions: currentDimensions,
            selectedItems: currentSelectedItems,
            deckingType: currentType === "Pier / Dock" ? currentDecking : undefined,
            description: currentDescription,
            price
        };

        setSections([...sections, newSection]);

        // Reset Form
        setCurrentDimensions('');
        setCurrentDescription('');
        // Keep type same for convenience or reset? Let's keep type.
        // Reset selection to defaults
        const defaults = getItemsForType(currentType).filter(i => i.isDefault).map(i => i.id);
        setCurrentSelectedItems(defaults);
    };

    const removeSection = (id: string) => {
        setSections(sections.filter(s => s.id !== id));
    };

    // Total Calculation
    const sectionsTotal = sections.reduce((sum, s) => sum + s.price, 0);
    const adjustments = parseFloat(otherWorkCost) || 0;
    const grandTotal = sectionsTotal + adjustments;

    // AI Generation
    const handleGenerateQuote = async () => {
        setErrorMsg('');
        if (!apiKey) {
            setErrorMsg("Please enter OpenAI API Key.");
            setShowSettings(true);
            return;
        }

        // Auto-Add Pending Section Logic
        let activeSections = [...sections];
        if (currentDimensions && parseFloat(currentDimensions) > 0) {
            if (window.confirm(`Did you mean to include the current "${currentType}" section in the proposal?`)) {
                const price = calculateSectionPrice(currentType, currentDimensions, currentSelectedItems, currentDecking);
                const newSection: QuoteSection = {
                    id: Date.now().toString(),
                    type: currentType,
                    dimensions: currentDimensions,
                    selectedItems: currentSelectedItems,
                    deckingType: currentType === "Pier / Dock" ? currentDecking : undefined,
                    description: currentDescription,
                    price
                };
                activeSections.push(newSection);
                setSections(activeSections); // Update State

                // Clear Form
                setCurrentDimensions('');
                setCurrentDescription('');
                const defaults = getItemsForType(currentType).filter(i => i.isDefault).map(i => i.id);
                setCurrentSelectedItems(defaults);
            }
        }

        if (activeSections.length === 0) {
            setErrorMsg("Please add at least one section.");
            return;
        }

        setIsGenerating(true);
        // Recalculate total with potential new section
        const newSectionsTotal = activeSections.reduce((sum, s) => sum + s.price, 0);
        const newGrandTotal = newSectionsTotal + adjustments;
        setAiEstimatedTotal(newGrandTotal);

        try {
            // Build Prompt
            let projectDesc = "";
            activeSections.forEach((s, idx) => {
                const items = getItemsForType(s.type).filter(i => s.selectedItems.includes(i.id)).map(i => i.label);
                if (s.type === "Pier / Dock") {
                    const deck = DECKING_OPTIONS.find(d => d.id === s.deckingType)?.label;
                    if (deck) items.push(`Decking: ${deck}`);
                }

                projectDesc += `\nSECTION ${idx + 1}: ${s.type.toUpperCase()}\n`;
                if (s.description) projectDesc += `Note: ${s.description}\n`;
                projectDesc += `- Dimensions: ${s.dimensions} ${s.type.includes('Dock') ? 'SQF' : 'Linear Feet/Units'}\n`;
                projectDesc += `- Inclusions: ${items.join(', ')}\n`;
            });

            if (adjustments > 0) {
                projectDesc += `\nOTHER WORK: ${otherWorkDescription} ($${adjustments})\n`;
            }

            const prompt = `Role: Senior Estimator for "Coastal VA Marine Construction".
Task: Write a detailed "Preliminary Construction Proposal".

Client: ${clientName || 'Valued Client'}
Address: ${clientAddress || 'N/A'}

Scope of Work (Multiple Sections):
${projectDesc}

Directives:
1. **Professional Tone**: Authoritative, high-value, clear.
2. **Structure**: 
   - Write a master "Scope of Work" that describes the entire project cohesively.
   - Use clear headings for each section (e.g., "## Pier Construction", "## Boat Lift Installation").
   - Bullet points for materials/specs.
   - Use a clean layout.
3. **Exclusions**: Must include a standard exclusions section (Permits, Engineering, Soil Tests, Hidden Obstructions).
4. **Format**: Return valid JSON only.

Output JSON:
{
    "scopeOfWork": "The full detailed text...",
    "exclusions": "Permits, Engineering..."
}`;

            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "system", content: "You are a senior estimator. Output JSON only." }, { role: "user", content: prompt }],
                    temperature: 0.3
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error.message);

            const content = data.choices[0].message.content;
            const jsonStart = content.indexOf('{');
            const jsonEnd = content.lastIndexOf('}') + 1;
            const parsed = JSON.parse(content.substring(jsonStart, jsonEnd));

            setScopeOfWork(parsed.scopeOfWork + "\n\n**STANDARD EXCLUSIONS**:\n" + (parsed.exclusions || "Permits, Engineering, Soil Tests."));

        } catch (err: any) {
            console.error(err);
            setErrorMsg("Error: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // PDF Generation
    const generatePDF = () => {
        const doc = new jsPDF({ format: 'letter', unit: 'mm' });
        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();
        const margin = 15;
        let y = 0;

        // Colors
        const primaryColor = [10, 25, 47]; // #0a192f
        const accentColor = [73, 204, 249]; // Cyan
        const grayColor = [100, 116, 139];

        // --- Header Function ---
        const drawHeader = () => {
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, width, 40, 'F');

            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.text("COASTAL VA MARINE CONSTRUCTION", width / 2, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.text("PRELIMINARY CONSTRUCTION PROPOSAL", width / 2, 28, { align: 'center' });

            y = 55;
        };

        // --- Start Page 1 ---
        drawHeader();

        // Client Block
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("PREPARED FOR:", margin, y);
        doc.text("DATE:", width - margin - 30, y);

        y += 6;
        doc.setFont("helvetica", "normal");
        doc.text(clientName || "Valued Client", margin, y);
        doc.text(new Date().toLocaleDateString(), width - margin - 30, y);

        y += 6;
        if (clientAddress) {
            doc.text(clientAddress, margin, y);
        }

        y += 15;

        // --- Project Summary (Table-like) ---
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, width - margin, y);
        y += 8;

        doc.setFont("helvetica", "bold");
        doc.text("PROJECT SUMMARY", margin, y);
        y += 8;

        sections.forEach(s => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(`• ${s.type}`, margin + 5, y);

            doc.setFont("helvetica", "normal");
            let desc = `${s.dimensions} ${s.type.includes('Dock') ? 'sqf' : 'units/lf'}`;
            if (s.description) desc += ` - ${s.description}`;
            doc.text(desc, margin + 50, y);

            doc.text(`$${s.price.toLocaleString()}`, width - margin, y, { align: 'right' });
            y += 6;
        });

        if (otherWorkDescription) {
            doc.text(`• Other: ${otherWorkDescription}`, margin + 5, y);
            doc.text(`$${adjustments.toLocaleString()}`, width - margin, y, { align: 'right' });
            y += 6;
        }

        y += 5;
        doc.line(margin, y, width - margin, y);
        y += 10;

        // --- Scope of Work (Flowing Text) ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("SCOPE OF WORK & SPECIFICATIONS", margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);

        const splitText = doc.splitTextToSize(scopeOfWork, width - (margin * 2));

        // Print lines with page break check
        for (let i = 0; i < splitText.length; i++) {
            if (y > height - 60) { // Leave space for footer
                doc.addPage();
                drawHeader();
            }
            doc.text(splitText[i], margin, y);
            y += 5;
        }

        // --- Investment Summary Page (Force New Page for Drama) ---
        doc.addPage();
        drawHeader();
        y = 60;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("INVESTMENT SUMMARY", width / 2, y, { align: 'center' });
        y += 20;

        // Total Box
        doc.setFillColor(245, 247, 250);
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.roundedRect(width / 2 - 60, y, 120, 50, 3, 3, 'FD');

        y += 15;
        doc.setFontSize(12);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text("TOTAL PROPOSED INVESTMENT", width / 2, y, { align: 'center' });

        y += 15;
        doc.setFontSize(26);
        doc.setTextColor(0, 100, 0); // Money Green
        doc.text(`$${aiEstimatedTotal.toLocaleString()}`, width / 2, y, { align: 'center' });

        // Footer / Signatures
        y += 50;
        doc.setDrawColor(0);
        doc.line(margin, y, margin + 80, y); // Client Line
        doc.line(width - margin - 80, y, width - margin, y); // Contractor Line

        y += 5;
        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text("CLIENT SIGNATURE", margin, y);
        doc.text("DATE", margin + 60, y);

        doc.text("COASTAL VA REP", width - margin - 80, y);
        doc.text("DATE", width - margin - 20, y);

        // Save
        doc.save(`Proposal_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

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
                <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-slate-100 rounded-lg"><Settings className="w-5 h-5 text-slate-400" /></button>
            </div>

            {showSettings && (
                <div className="bg-slate-800 p-6 rounded-2xl text-white mb-6">
                    <label className="text-xs font-bold uppercase mb-2 block text-slate-400">OpenAI API Key</label>
                    <div className="flex gap-2">
                        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg" />
                        <button onClick={handleSaveKey} className="bg-cyan-600 px-4 py-2 rounded-lg font-bold text-xs uppercase">Save</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT COLUMN: Builder */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Client Info */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400">Client Name</label>
                            <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-700" placeholder="John Doe" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400">Project Address</label>
                            <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-700" placeholder="123 Ocean Dr" />
                        </div>
                    </div>

                    {/* Added Sections List */}
                    {sections.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Current Sections</h3>
                                <button onClick={() => setSections([])} className="text-[10px] text-red-500 font-bold hover:underline">Clear All</button>
                            </div>
                            {sections.map((section, idx) => (
                                <div key={section.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center group hover:border-cyan-200 transition-all">
                                    <div className="flex gap-4 items-center">
                                        <div className="bg-cyan-50 text-cyan-700 font-bold w-8 h-8 flex items-center justify-center rounded-lg text-xs">{idx + 1}</div>
                                        <div>
                                            <h4 className="font-bold text-slate-700">{section.type}</h4>
                                            <p className="text-xs text-slate-500">{section.dimensions} units • {section.description || 'No description'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono font-bold text-slate-700">${section.price.toLocaleString()}</span>
                                        <button onClick={() => removeSection(section.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add New Section Form */}
                    <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 relative">
                        <div className="absolute -top-3 left-6 bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Step 1: Build Proposal
                        </div>
                        <h3 className="flex items-center gap-2 font-black text-slate-600 uppercase tracking-widest text-sm mb-6 mt-2">
                            <Plus className="w-4 h-4 text-cyan-500" /> Add Project Section
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Section Type</label>
                                <select value={currentType} onChange={e => setCurrentType(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400">
                                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400">Dimensions / Qty</label>
                                <input value={currentDimensions} onChange={e => setCurrentDimensions(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder="e.g. 100" />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Description / Note (Optional)</label>
                            <input value={currentDescription} onChange={e => setCurrentDescription(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder="e.g. Main Dock on Left Side" />
                        </div>

                        {/* Item Selector */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 max-h-60 overflow-y-auto">
                            <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Specifications & Materials</label>

                            {currentType === "Pier / Dock" && (
                                <div className="mb-4 grid grid-cols-2 gap-2">
                                    {DECKING_OPTIONS.map(d => (
                                        <div key={d.id} onClick={() => setCurrentDecking(d.id)} className={`cursor-pointer p-2 rounded-lg border text-center text-xs font-bold transition-all ${currentDecking === d.id ? 'bg-cyan-50 border-cyan-500 text-cyan-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                            {d.label}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {getItemsForType(currentType).map(item => {
                                    const isSelected = currentSelectedItems.includes(item.id);
                                    return (
                                        <div key={item.id} onClick={() => toggleCurrentItem(item.id)} className={`cursor-pointer p-2 rounded-lg border flex items-center gap-3 transition-all ${isSelected ? 'bg-cyan-50 border-cyan-200' : 'hover:bg-slate-50 border-transparent'}`}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'bg-white border-slate-300'}`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700">{item.label}</p>
                                                <p className="text-[9px] text-slate-400">${item.price}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <button onClick={addSection} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg transition-all">
                            <Plus className="w-4 h-4 text-cyan-400" /> Add to Proposal
                        </button>
                    </div>

                    {/* Global Adjustments */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Adjustments</h3>
                        <div className="flex gap-4">
                            <input value={otherWorkDescription} onChange={e => setOtherWorkDescription(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm" placeholder="Misc / Other Work" />
                            <div className="relative w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                <input type="number" value={otherWorkCost} onChange={e => setOtherWorkCost(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-4 py-2 text-sm font-bold" placeholder="0.00" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Output */}
                <div className="lg:col-span-5 flex flex-col h-full space-y-6">

                    {/* Live Total */}
                    <div className="bg-[#0a192f] p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-1">Total Estimated Investment</p>
                        <h2 className="text-5xl font-black tracking-tighter mb-2">${grandTotal.toLocaleString()}</h2>
                        <p className="text-slate-400 text-xs italic opacity-70">Includes all sections & adjustments</p>
                    </div>

                    {/* AI Actions */}
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex-1 flex flex-col relative">
                        <div className="absolute -top-3 left-6 bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Step 2: Generate & Export
                        </div>
                        <div className="flex justify-between items-center mb-6 mt-4">
                            <h3 className="font-black text-slate-700 uppercase tracking-widest text-sm flex items-center gap-2">
                                <Bot className="w-4 h-4 text-cyan-600" /> Proposal Output
                            </h3>
                            {scopeOfWork && (
                                <button onClick={generatePDF} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all">
                                    <FileText className="w-4 h-4" /> PDF
                                </button>
                            )}
                        </div>

                        {scopeOfWork ? (
                            <div className="flex-1 flex flex-col gap-4">
                                <textarea
                                    value={scopeOfWork}
                                    onChange={e => setScopeOfWork(e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-600 outline-none focus:border-cyan-400 resize-none leading-relaxed"
                                />
                                {/* Price Override */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Final Price (Editable)</label>
                                    <input
                                        type="number"
                                        value={aiEstimatedTotal}
                                        onChange={e => setAiEstimatedTotal(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-100 border-2 border-slate-200 text-slate-800 rounded-xl px-4 py-3 font-black text-xl"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                <Layers className="w-12 h-12 text-slate-200 mb-4" />
                                <p className="text-slate-400 font-bold text-sm">Add sections to generate proposal</p>
                            </div>
                        )}

                        <button
                            onClick={handleGenerateQuote}
                            disabled={isGenerating || (sections.length === 0 && (!currentDimensions || parseFloat(currentDimensions) === 0))}
                            className="w-full mt-6 py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-cyan-600/20 transition-all"
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                            {isGenerating ? 'Drafting Proposal...' : 'Generate with AI'}
                        </button>

                        {errorMsg && <p className="text-center text-red-500 text-xs font-bold mt-4">{errorMsg}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteGenerator;
