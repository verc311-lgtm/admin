
import React, { useState, useEffect } from 'react';
import { Bot, FileText, Send, Save, Download, Loader2, Settings, X, Plus, Trash2, CheckSquare, Square, Calculator, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { DOCK_ITEMS, DECKING_OPTIONS, RIP_RAP_ITEMS, FLOATING_DOCK_ITEMS, BULKHEAD_ITEMS, BOATLIFT_ITEMS, calculateInteractivePrice } from '../utils/pricingCalculator';

const PROJECT_TYPES = ["Pier / Dock", "Floating Dock", "Bulkhead", "Boat Lift", "Rip-Rap / Erosion Control"];

const QuoteGenerator: React.FC = () => {
    // API Key State
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
    const [showSettings, setShowSettings] = useState(false);

    // Form Inputs
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
    const [dimensions, setDimensions] = useState('');
    const [otherWorkCost, setOtherWorkCost] = useState('');
    const [otherWorkDescription, setOtherWorkDescription] = useState('');

    // Interactive State
    const [deckingType, setDeckingType] = useState(DECKING_OPTIONS[0].id);
    const [selectedDockItems, setSelectedDockItems] = useState<string[]>(DOCK_ITEMS.filter(i => i.isDefault).map(i => i.id));
    const [selectedRipRapItems, setSelectedRipRapItems] = useState<string[]>(RIP_RAP_ITEMS.filter(i => i.isDefault).map(i => i.id));
    const [selectedFloatingDockItems, setSelectedFloatingDockItems] = useState<string[]>(FLOATING_DOCK_ITEMS.filter(i => i.isDefault).map(i => i.id));
    const [selectedBulkheadItems, setSelectedBulkheadItems] = useState<string[]>(BULKHEAD_ITEMS.filter(i => i.isDefault).map(i => i.id));
    const [selectedBoatLiftItems, setSelectedBoatLiftItems] = useState<string[]>(BOATLIFT_ITEMS.filter(i => i.isDefault).map(i => i.id));

    // AI Results
    const [isGenerating, setIsGenerating] = useState(false);
    const [scopeOfWork, setScopeOfWork] = useState('');
    const [estimatedTotal, setEstimatedTotal] = useState<number>(0);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSaveKey = () => {
        localStorage.setItem('openai_api_key', apiKey);
        setShowSettings(false);
        setErrorMsg('');
    };

    const toggleItem = (id: string, type: 'dock' | 'riprap' | 'floating_dock' | 'bulkhead' | 'boat_lift') => {
        if (type === 'dock') {
            setSelectedDockItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else if (type === 'riprap') {
            setSelectedRipRapItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else if (type === 'floating_dock') {
            setSelectedFloatingDockItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else if (type === 'bulkhead') {
            setSelectedBulkheadItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        } else {
            setSelectedBoatLiftItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        }
    };

    // Auto-calculate for display
    const isDock = projectType === "Pier / Dock";
    const isFloatingDock = projectType === "Floating Dock";
    const isBulkhead = projectType === "Bulkhead";
    const isBoatLift = projectType === "Boat Lift";
    const qty = parseFloat(dimensions);
    const expenses = parseFloat(otherWorkCost) || 0;

    const currentCalculatedTotal = (!isNaN(qty) || isBoatLift)
        ? calculateInteractivePrice(
            isDock ? 'dock' : (isFloatingDock ? 'floating_dock' : (isBulkhead ? 'bulkhead' : (isBoatLift ? 'boat_lift' : 'riprap'))),
            qty || 1, // Default to 1 for Boat Lift if dimensions not provided
            isDock ? selectedDockItems : (isFloatingDock ? selectedFloatingDockItems : (isBulkhead ? selectedBulkheadItems : (isBoatLift ? selectedBoatLiftItems : selectedRipRapItems))),
            isDock ? deckingType : undefined,
            expenses
        )
        : 0;

    useEffect(() => {
        if (!isGenerating) {
            setEstimatedTotal(currentCalculatedTotal);
        }
    }, [dimensions, otherWorkCost, selectedDockItems, selectedRipRapItems, selectedFloatingDockItems, selectedBulkheadItems, selectedBoatLiftItems, deckingType, projectType]);

    const handleGenerateQuote = async () => {
        setErrorMsg('');
        if (!apiKey) {
            setErrorMsg("Please enter your OpenAI API Key in settings.");
            setShowSettings(true);
            return;
        }
        if (!dimensions && !isBoatLift) { // Boat lift might not need dimensions if fixed
            // Actually currently logic uses dimensions for all calculations mostly, 
            // but boat lift items are fixed. 
            // However, let's keep it required for consistency or set to 1.
            // If user leaves blank, dimensions is NaN.
        }

        setIsGenerating(true);
        let finalPrice = 0;
        let finalMaterials: string[] = [];
        const expenses = parseFloat(otherWorkCost) || 0;

        try {
            const qty = parseFloat(dimensions);
            // Relax dimension requirement for boat lift if all items are fixed?
            // But let's assume they might enter '1' unit.
            if (isNaN(qty) && !isBoatLift) {
                throw new Error("Dimensions must be a valid number.");
            }

            finalPrice = currentCalculatedTotal;

            if (isDock) {
                finalMaterials = DOCK_ITEMS
                    .filter(i => selectedDockItems.includes(i.id))
                    .map(i => i.label);
                const deckName = DECKING_OPTIONS.find(d => d.id === deckingType)?.label;
                if (deckName) finalMaterials.push(deckName);
            } else if (isFloatingDock) {
                finalMaterials = FLOATING_DOCK_ITEMS
                    .filter(i => selectedFloatingDockItems.includes(i.id))
                    .map(i => i.label);
            } else if (isBulkhead) {
                finalMaterials = BULKHEAD_ITEMS
                    .filter(i => selectedBulkheadItems.includes(i.id))
                    .map(i => i.label);
            } else if (isBoatLift) {
                finalMaterials = BOATLIFT_ITEMS
                    .filter(i => selectedBoatLiftItems.includes(i.id))
                    .map(i => i.label);
            } else {
                finalMaterials = RIP_RAP_ITEMS
                    .filter(i => selectedRipRapItems.includes(i.id))
                    .map(i => i.label);
            }

            if (expenses > 0) {
                finalMaterials.push('Other Work: ' + (otherWorkDescription || 'Misc') + ' ($' + expenses.toLocaleString() + ')');
            }

            const prompt = "Role: You are a Senior Estimator for \"Coastal VA Marine Construction\". Write a formal \"Preliminary Construction Proposal\".\n\n" +
                "Project Details:\n" +
                "- Client: " + (clientName || 'Valued Client') + "\n" +
                "- Address: " + (clientAddress || 'N/A') + "\n" +
                "- Type: " + projectType + "\n" +
                "- Size: " + dimensions + " " + ((isDock || isFloatingDock) ? 'SQF' : 'Linear Feet') + "\n" +
                "- Materials Included: " + finalMaterials.join(', ') + "\n" +
                (expenses > 0 ? "- Other Work Included: " + otherWorkDescription + " ($" + expenses.toLocaleString() + ")\n" : "") +
                "\nDirectives:\n" +
                "1. **Tone**: Professional, authoritative, legalistic, and high-value.\n" +
                "2. **Exclusions Section**: You MUST include a distinct section titled \"STANDARD EXCLUSIONS\" listing: Permits, Engineering, Soil Tests, Hazardous Material Removal, Hidden Obstructions.\n" +
                "3. **Scope Entry**: Write a comprehensive, detailed, and professionally formatted scope of work. Use distinct paragraphs or distinct bullet points for clarity. Do not bunch text together.\n" +
                "4. **Formatting**: Ensure the output is clean and readable. Use markdown lists if appropriate.\n" +
                "\nReturn JSON ONLY:\n" +
                "{\n" +
                "    \"scopeOfWork\": \"The detailed professional scope...\\n\\n- Item 1\\n- Item 2\",\n" +
                "    \"exclusions\": \"Permits, Engineering, Soil Tests, Hidden Obstructions...\",\n" +
                "    \"totalPrice\": " + finalPrice + "\n" +
                "}";

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: "You are a senior construction estimator. Output JSON only." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.3
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                setScopeOfWork(parsed.scopeOfWork + "\n\n**STANDARD EXCLUSIONS**:\n" + (parsed.exclusions || "Permits, Engineering, Soil Tests."));
                setEstimatedTotal(finalPrice);
            } else {
                throw new Error("Failed to parse AI response JSON.");
            }

        } catch (error: any) {
            console.error("OpenAI Error:", error);
            setErrorMsg('Error: ' + (error.message || "Unknown error occurred"));
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePDF = () => {
        // Use Letter size (8.5 x 11 in) by default in jsPDF ('letter')
        const doc = new jsPDF({
            format: 'letter',
            unit: 'mm'
        });

        const pageWidth = doc.internal.pageSize.getWidth(); // ~215.9mm
        const pageHeight = doc.internal.pageSize.getHeight(); // ~279.4mm
        const margin = 14;

        // Header
        doc.setFillColor(10, 25, 47);
        doc.rect(0, 0, pageWidth, 35, 'F'); // Compact header

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("COASTAL VA MARINE CONSTRUCTION", pageWidth / 2, 18, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(73, 204, 249);
        doc.text("Preliminary Construction Proposal", pageWidth / 2, 26, { align: 'center' });

        // Client Info Block
        let currentY = 50;
        doc.setTextColor(0);
        doc.setFontSize(11);

        doc.text('Client: ' + (clientName || 'Valued Client'), margin, currentY);
        doc.text('Date: ' + new Date().toLocaleDateString(), pageWidth - margin, currentY, { align: 'right' });
        currentY += 6;
        doc.text('Address: ' + (clientAddress || 'N/A'), margin, currentY);
        currentY += 8;
        doc.text('Project: ' + projectType, margin, currentY);
        currentY += 6;
        doc.text('Size: ' + dimensions + ' ' + (isDock || isFloatingDock ? 'SQF' : 'Linear Feet'), margin, currentY);

        currentY += 12;

        // Scope of Work
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("Scope of Work & Approach", margin, currentY);
        currentY += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50);

        // Calculate available height for text to avoid pushing total off page
        // Reserve space for Total block (~50mm) and Footer (~20mm)
        // Max text height = pageHeight - currentY - 70mm
        const splitScope = doc.splitTextToSize(scopeOfWork, pageWidth - (margin * 2));
        doc.text(splitScope, margin, currentY);

        currentY += (splitScope.length * 5) + 10;

        // "Other Work" Section if applicable
        const expenses = parseFloat(otherWorkCost) || 0;
        if (expenses > 0) {
            // Check if we need a new page
            if (currentY > pageHeight - 60) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFont("helvetica", "bold");
            doc.setTextColor(0);
            doc.text("Other Work Included:", margin, currentY);
            currentY += 5;

            doc.setFont("helvetica", "normal");
            doc.text((otherWorkDescription || 'Misc. Items'), margin, currentY);
            doc.text('$' + expenses.toLocaleString(), pageWidth - margin, currentY, { align: 'right' });
            currentY += 10;
        }

        // Check space for total block
        if (currentY > pageHeight - 50) {
            doc.addPage();
            currentY = 20;
        }

        // Total Price Block
        doc.setFillColor(240, 248, 255);
        doc.setDrawColor(73, 204, 249);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 35, 3, 3, 'FD');

        const boxCenter = currentY + 17.5;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(10, 25, 47);
        doc.text("Total Proposed Investment", pageWidth / 2, boxCenter - 5, { align: 'center' });

        doc.setFontSize(20);
        doc.setTextColor(0, 100, 0); // Green
        doc.text('$' + estimatedTotal.toLocaleString(), pageWidth / 2, boxCenter + 8, { align: 'center' });

        // Disclaimer (Footer)
        const footerY = pageHeight - 15;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.setFont("helvetica", "italic");
        doc.text("NOTE: This proposal is preliminary. Final price subject to site inspection and engineering.", pageWidth / 2, footerY, { align: 'center' });
        doc.text("Permits and Engineering are excluded unless explicitly itemized.", pageWidth / 2, footerY + 4, { align: 'center' });

        doc.save('Proposal_' + (clientName || 'Project') + '.pdf');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header & Settings */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
                <div className="flex items-center gap-5">
                    <div className="bg-[#0a192f] p-4 rounded-2xl text-cyan-400"><Bot className="w-8 h-8" /></div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-[#0a192f] uppercase italic tracking-tighter">Proposal Generator</h2>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">
                            Preliminary Construction Proposal
                        </p>
                    </div>
                </div>
                <button onClick={() => setShowSettings(!showSettings)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors">
                    <Settings className="w-6 h-6" />
                </button>
            </div>

            {showSettings && (
                <div className="bg-slate-800 text-white p-8 rounded-[2rem] shadow-xl animate-in slide-in-from-top-4">
                    <h3 className="font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><Settings className="w-4 h-4" /> AI Configuration</h3>
                    <p className="text-slate-400 text-sm mb-4">Enter your OpenAI API Key to enable automatic estimating.</p>
                    <div className="flex gap-4">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400 font-mono"
                        />
                        <button onClick={handleSaveKey} className="bg-cyan-600 hover:bg-cyan-500 px-6 py-3 rounded-xl font-bold uppercase text-xs">Save Key</button>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                {/* INPUTS */}
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                    <h3 className="font-black text-[#0a192f] uppercase tracking-widest text-sm mb-4">Project Parameters</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Client Name</label>
                            <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder="Client Name" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Address</label>
                            <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder="123 Ocean Dr..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Project Type</label>
                            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400">
                                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">{isDock || isFloatingDock ? 'Dimensions (SQF)' : 'Dimensions (Lin. Ft.)'}</label>
                            <input value={dimensions} onChange={(e) => setDimensions(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder="e.g. 100" />
                        </div>
                    </div>

                    {/* Other Work / Adjustments */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 flex items-center gap-2">
                            <Plus className="w-3 h-3" /> Other Work / Adjustments
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <input
                                    type="text"
                                    value={otherWorkDescription}
                                    onChange={(e) => setOtherWorkDescription(e.target.value)}
                                    className="w-full bg-white border-2 border-transparent rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 outline-none focus:border-cyan-400 transition-all placeholder:font-normal"
                                    placeholder="Description (e.g. Demolition)"
                                />
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                <input
                                    type="number"
                                    value={otherWorkCost}
                                    onChange={(e) => setOtherWorkCost(e.target.value)}
                                    className="w-full bg-white border-2 border-transparent rounded-xl pl-6 pr-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-cyan-400 transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold ml-2">Applies to total before markup.</p>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-2 block">
                            Itemized Costs / Inclusions
                        </label>
                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                            {/* Decking Selector - Only for Docks */}
                            {isDock && (
                                <div className="col-span-2 mb-4 bg-slate-100/50 p-3 rounded-2xl">
                                    <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2">Decking Material</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {DECKING_OPTIONS.map(dt => (
                                            <div
                                                key={dt.id}
                                                onClick={() => setDeckingType(dt.id)}
                                                className={"cursor-pointer p-3 rounded-xl border-2 text-center transition-all " + (deckingType === dt.id ? 'bg-cyan-50 border-cyan-400' : 'bg-slate-50 border-slate-100')}
                                            >
                                                <p className="font-bold text-xs">{dt.label}</p>
                                                <p className="text-[9px] text-slate-400">${dt.price}/sqf</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Items List */}
                            {(isDock ? DOCK_ITEMS : (isFloatingDock ? FLOATING_DOCK_ITEMS : (isBulkhead ? BULKHEAD_ITEMS : (projectType === "Boat Lift" ? BOATLIFT_ITEMS : RIP_RAP_ITEMS)))).map(item => {
                                const isSelected = isDock
                                    ? selectedDockItems.includes(item.id)
                                    : (isFloatingDock ? selectedFloatingDockItems.includes(item.id) : (isBulkhead ? selectedBulkheadItems.includes(item.id) : (projectType === "Boat Lift" ? selectedBoatLiftItems.includes(item.id) : selectedRipRapItems.includes(item.id))));

                                const quantity = parseFloat(dimensions) || 0;
                                const lineTotal = item.unit === 'fixed' ? item.price : item.price * quantity;

                                return (
                                    <div key={item.id} onClick={() => toggleItem(item.id, isDock ? 'dock' : (isFloatingDock ? 'floating_dock' : (isBulkhead ? 'bulkhead' : (projectType === "Boat Lift" ? 'boat_lift' : 'riprap'))))} className={"cursor-pointer px-4 py-3 rounded-xl flex items-center justify-between border transition-all " + (isSelected ? 'bg-white border-cyan-100 shadow-sm' : 'bg-slate-50 border-transparent opacity-60')}>
                                        <div className="flex items-center gap-3">
                                            <div className={"w-4 h-4 rounded flex items-center justify-center border " + (isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300 bg-white')}>
                                                {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-700">{item.label}</div>
                                                <div className="text-[10px] text-slate-400">{'$' + item.price.toLocaleString() + (item.unit === 'sqf' || item.unit === 'lf' ? ' / ' + item.unit : '')}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-mono font-bold text-slate-600">{'$' + lineTotal.toLocaleString()}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 bg-slate-900 rounded-xl flex justify-between items-center text-white mt-4">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Project Investment</span>
                                <span className="text-[10px] text-slate-500 italic">Includes 10% Misc/Overhead</span>
                            </div>
                            <span className="text-xl font-black text-cyan-400">{'$' + currentCalculatedTotal.toLocaleString()}</span>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-xs font-bold">
                            {errorMsg}
                        </div>
                    )}

                    <button onClick={handleGenerateQuote} disabled={isGenerating || !apiKey} className="w-full py-4 bg-[#0a192f] text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl mt-4">
                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5 text-cyan-400" />}
                        {isGenerating ? 'Calculating...' : 'Generate Preliminary Proposal'}
                    </button>
                </div>

                {/* OUTPUTS */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-[#0a192f] uppercase tracking-widest text-sm">Proposal Results</h3>
                        <button onClick={generatePDF} disabled={!scopeOfWork} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg disabled:opacity-50">
                            <Download className="w-4 h-4" /> Export Proposal
                        </button>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Scope of Work & Exclusions</label>
                            <textarea
                                value={scopeOfWork}
                                onChange={(e) => setScopeOfWork(e.target.value)}
                                className="w-full h-64 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-medium text-slate-600 outline-none focus:border-cyan-400 resize-none leading-relaxed"
                                placeholder="Generated proposal text will appear here..."
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Final Proposed Price (Incl. Overlay)</label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    value={estimatedTotal}
                                    onChange={(e) => setEstimatedTotal(parseFloat(e.target.value))}
                                    className="w-full bg-cyan-50/50 border-2 border-cyan-100 text-cyan-700 border-2 rounded-2xl pl-10 pr-5 py-4 font-black text-3xl outline-none focus:border-cyan-400"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold mt-2 ml-2">Includes Materials, Labor, Equipment, and Misc/Overhead.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteGenerator;
