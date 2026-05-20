import React, { useState, useEffect } from 'react';
import { Bot, FileText, Loader2, Settings, Plus, Trash2, Check, Layers, MessageSquare, Edit3 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { DOCK_ITEMS, RIP_RAP_ITEMS, FLOATING_DOCK_ITEMS, BULKHEAD_ITEMS, BOATLIFT_ITEMS, calculateInteractivePrice } from '../utils/pricingCalculator';

const PROJECT_TYPES = ["Pier / Dock", "Floating Dock", "Bulkhead", "Boat Lift", "Rip-Rap / Erosion Control", "Other / Custom Project"];

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

    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');

    const [sections, setSections] = useState<QuoteSection[]>([]);
    const [currentType, setCurrentType] = useState(PROJECT_TYPES[0]);
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

    useEffect(() => {
        const defaults = getItemsForType(currentType).filter(i => i.isDefault).map(i => i.id);
        setCurrentSelectedItems(defaults);
        if (currentType !== "Other / Custom Project") {
            setCustomMaterialPrice('');
            setCustomLaborPrice('');
        }
    }, [currentType]);

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

    const calculateSectionPrice = (type: string, dims: string, items: string[], decking?: string, customMat?: string, customLab?: string) => {
        const qty = parseFloat(dims) || 0;
        if (type === "Other / Custom Project") {
            return (qty * (parseFloat(customMat || '0'))) + (qty * (parseFloat(customLab || '0')));
        }
        let calcType: 'dock' | 'riprap' | 'floating_dock' | 'bulkhead' | 'boat_lift' = 'dock';
        if (type === 'Floating Dock') calcType = 'floating_dock';
        else if (type === 'Bulkhead') calcType = 'bulkhead';
        else if (type === 'Boat Lift') calcType = 'boat_lift';
        else if (type === 'Rip-Rap / Erosion Control') calcType = 'riprap';
        const effectiveQty = (calcType === 'boat_lift' && qty === 0) ? 1 : qty;
        return calculateInteractivePrice(calcType, effectiveQty, items, decking, 0);
    };

    const handleSaveKey = () => {
        localStorage.setItem('openai_api_key', apiKey);
        setShowSettings(false);
    };

    const toggleCurrentItem = (id: string) => {
        setCurrentSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const addSection = () => {
        const price = calculateSectionPrice(currentType, currentDimensions, currentSelectedItems, undefined, customMaterialPrice, customLaborPrice);
        setSections([...sections, {
            id: Date.now().toString(), type: currentType, dimensions: currentDimensions,
            selectedItems: currentSelectedItems,
            description: currentDescription, price,
            customMaterialPrice: parseFloat(customMaterialPrice) || undefined,
            customLaborPrice: parseFloat(customLaborPrice) || undefined
        }]);
        setCurrentDimensions('');
        setCurrentDescription('');
        setCustomMaterialPrice('');
        setCustomLaborPrice('');
        const defaults = getItemsForType(currentType).filter(i => i.isDefault).map(i => i.id);
        setCurrentSelectedItems(defaults);
    };

    const removeSection = (id: string) => setSections(sections.filter(s => s.id !== id));

    const sectionsTotal = sections.reduce((sum, s) => sum + s.price, 0);
    const adjustments = parseFloat(otherWorkCost) || 0;
    const grandTotal = sectionsTotal + adjustments;

    // Activate manual mode: prefills textarea with a blank template and lets user write from scratch
    const activateManualMode = () => {
        setManualMode(true);
        setAiEstimatedTotal(grandTotal);
        if (!scopeOfWork) {
            setScopeOfWork(
                `SCOPE OF WORK\n\n` +
                sections.map((s, i) => `Section ${i + 1}: ${s.type}\n- Dimensions: ${s.dimensions}\n- ${s.description || ''}\n`).join('\n') +
                `\n\nSTANDARD EXCLUSIONS:\nPermits, Engineering, Soil Tests, Hidden Obstructions, Electrical Work.`
            );
        }
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
                if (s.type === "Other / Custom Project") {
                    projectDesc += `\nSECTION ${idx + 1}: CUSTOM PROJECT\n`;
                    projectDesc += `Description: ${s.description || 'Custom Work'}\n`;
                    projectDesc += `Quantity: ${s.dimensions}\n`;
                    if (s.customMaterialPrice) projectDesc += `Material Rate: $${s.customMaterialPrice}/unit\n`;
                    if (s.customLaborPrice) projectDesc += `Labor Rate: $${s.customLaborPrice}/unit\n`;
                } else {
                    const items = getItemsForType(s.type).filter(i => s.selectedItems.includes(i.id)).map(i => i.label);
                    projectDesc += `\nSECTION ${idx + 1}: ${s.type}\n`;
                    if (s.description) projectDesc += `Note: ${s.description}\n`;
                    projectDesc += `Dimensions: ${s.dimensions} ${s.type.includes('Dock') ? 'SQF' : 'Linear Feet'}\n`;
                    projectDesc += `Components: ${items.join(', ')}\n`;
                }
            });
            if (adjustments > 0) projectDesc += `\nADDITIONAL WORK: ${otherWorkDescription}\n`;

            const prompt = `You are a senior estimator writing a formal construction proposal for "Coastal VA Marine Construction".

Client: ${clientName || 'Valued Client'}
Address: ${clientAddress || 'N/A'}

Project Sections:
${projectDesc}

CRITICAL FORMATTING RULES - YOU MUST FOLLOW THESE EXACTLY:
- Write in PLAIN TEXT only. NO markdown. NO asterisks (*). NO hash symbols (#). NO dashes (---) as dividers. NO bold markers.
- Use section headings in ALL CAPS followed by a colon, like: SCOPE OF WORK:
- Use a simple hyphen and space for bullet points ONLY when listing items: "- Item here"
- Write in complete, professional sentences. Formal business language.
- DO NOT mention specific dollar amounts in the scope text.
- Keep each section focused and clear.

Write the following sections:
1. A brief introduction paragraph about the project.
2. For each section listed, write a heading and 3-5 bullet points describing materials, methods, and specifications.
3. A STANDARD EXCLUSIONS section listing: Permits, Engineering Drawings, Soil Tests, Utility Locating, Hidden Obstructions.

Return ONLY valid JSON with no other text:
{
  "scopeOfWork": "...",
  "exclusions": "Permits, Engineering Drawings, Soil Tests, Utility Locating, Hidden Obstructions."
}`;

            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: prompt }], temperature: 0.2 })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            const content = data.choices[0].message.content;
            const parsed = JSON.parse(content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1));
            setScopeOfWork(parsed.scopeOfWork + "\n\nSTANDARD EXCLUSIONS:\n" + (parsed.exclusions || "Permits, Engineering, Soil Tests."));
        } catch (err: any) {
            setErrorMsg("Error: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // PDF Generation - all text is forced to black, header colors are isolated
    const generatePDF = () => {
        const doc = new jsPDF({ format: 'letter', unit: 'mm' });
        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();
        const margin = 15;
        let y = 0;

        const DARK_NAVY = [10, 25, 47];
        const CYAN = [73, 204, 249];
        const BLACK: [number, number, number] = [0, 0, 0];
        const DARK_GRAY: [number, number, number] = [50, 50, 50];
        const MONEY_GREEN: [number, number, number] = [0, 110, 0];
        const LIGHT_GRAY: [number, number, number] = [120, 120, 120];

        // Draws header and ALWAYS resets to black text before returning
        const drawHeader = () => {
            doc.setFillColor(DARK_NAVY[0], DARK_NAVY[1], DARK_NAVY[2]);
            doc.rect(0, 0, width, 40, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(20);
            doc.setTextColor(255, 255, 255);
            doc.text("COASTAL VA MARINE CONSTRUCTION", width / 2, 18, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(CYAN[0], CYAN[1], CYAN[2]);
            doc.text("PRELIMINARY CONSTRUCTION PROPOSAL", width / 2, 27, { align: 'center' });
            // ALWAYS reset to black immediately after header
            doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            y = 52;
        };

        // ---- PAGE 1 ----
        drawHeader();

        // Client info block
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
        doc.text("PREPARED FOR", margin, y);
        doc.text("DATE", width - margin - 28, y);
        y += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
        doc.text(clientName || "Valued Client", margin, y);
        doc.text(new Date().toLocaleDateString(), width - margin - 28, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
        if (clientAddress) doc.text(clientAddress, margin, y);
        y += 12;

        // Divider
        doc.setDrawColor(210, 210, 210);
        doc.line(margin, y, width - margin, y);
        y += 8;

        // ---- PROJECT SUMMARY (optional) ----
        if (showProjectSummary) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
            doc.text("PROJECT SUMMARY", margin, y);
            y += 6;

            sections.forEach(s => {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
                doc.text(`${s.type}`, margin + 4, y);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
                let desc = s.type === "Other / Custom Project"
                    ? `${s.dimensions} units${s.description ? ' - ' + s.description : ''}`
                    : `${s.dimensions} ${s.type.includes('Dock') ? 'sqft' : 'lf'}${s.description ? ' - ' + s.description : ''}`;
                if (desc.length > 60) desc = desc.substring(0, 57) + '...';
                doc.text(desc, margin + 55, y);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
                doc.text(`$${s.price.toLocaleString()}`, width - margin, y, { align: 'right' });
                y += 6;
            });

            if (otherWorkDescription && adjustments > 0) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
                doc.text(`Other: ${otherWorkDescription}`, margin + 4, y);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
                doc.text(`$${adjustments.toLocaleString()}`, width - margin, y, { align: 'right' });
                y += 6;
            }
            y += 4;
            doc.setDrawColor(210, 210, 210);
            doc.line(margin, y, width - margin, y);
            y += 10;
        }

        // ---- SCOPE OF WORK ----
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
        doc.text("SCOPE OF WORK & SPECIFICATIONS", margin, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);

        const lines = doc.splitTextToSize(scopeOfWork, width - margin * 2);
        for (let i = 0; i < lines.length; i++) {
            if (y > height - 35) {
                doc.addPage();
                drawHeader();
                // Force all text settings to body style after header
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
            }
            doc.text(lines[i], margin, y);
            y += 5;
        }

        // ---- INVESTMENT SUMMARY PAGE ----
        doc.addPage();
        drawHeader();
        // After header, force black
        doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
        y = 65;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
        doc.text("INVESTMENT SUMMARY", width / 2, y, { align: 'center' });
        y += 6;
        doc.setDrawColor(CYAN[0], CYAN[1], CYAN[2]);
        doc.setLineWidth(0.5);
        doc.line(width / 2 - 40, y, width / 2 + 40, y);
        doc.setLineWidth(0.2);
        y += 18;

        // Section breakdown table (always shown on this page)
        if (sections.length > 0) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
            doc.text("DESCRIPTION", margin, y);
            doc.text("AMOUNT", width - margin, y, { align: 'right' });
            y += 4;
            doc.setDrawColor(210, 210, 210);
            doc.line(margin, y, width - margin, y);
            y += 6;

            sections.forEach(s => {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
                doc.text(s.type, margin, y);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
                doc.text(`$${s.price.toLocaleString()}`, width - margin, y, { align: 'right' });
                y += 7;
            });

            if (adjustments > 0) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
                doc.text(otherWorkDescription || 'Other', margin, y);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
                doc.text(`$${adjustments.toLocaleString()}`, width - margin, y, { align: 'right' });
                y += 7;
            }
            y += 3;
            doc.setDrawColor(DARK_NAVY[0], DARK_NAVY[1], DARK_NAVY[2]);
            doc.line(margin, y, width - margin, y);
            y += 10;
        }

        // Total Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(CYAN[0], CYAN[1], CYAN[2]);
        doc.roundedRect(width / 2 - 55, y, 110, 45, 3, 3, 'FD');
        y += 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
        doc.text("TOTAL PROPOSED INVESTMENT", width / 2, y, { align: 'center' });
        y += 12;
        doc.setFontSize(28);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(MONEY_GREEN[0], MONEY_GREEN[1], MONEY_GREEN[2]);
        doc.text(`$${aiEstimatedTotal.toLocaleString()}`, width / 2, y, { align: 'center' });
        y += 25;

        // Validity note
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
        doc.text("This proposal is valid for 30 days from the date of issue.", width / 2, y, { align: 'center' });
        y += 25;

        // Signature lines
        doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
        doc.setLineWidth(0.3);
        doc.line(margin, y, margin + 75, y);
        doc.line(width - margin - 75, y, width - margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(DARK_GRAY[0], DARK_GRAY[1], DARK_GRAY[2]);
        doc.text("CLIENT SIGNATURE & DATE", margin, y);
        doc.text("COASTAL VA REPRESENTATIVE & DATE", width - margin - 75, y);

        doc.save(`Proposal_${(clientName || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const currentLivePrice = calculateSectionPrice(currentType, currentDimensions, currentSelectedItems, undefined, customMaterialPrice, customLaborPrice);
    const proposalReady = scopeOfWork.trim().length > 0;

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
                <div className="bg-slate-800 p-6 rounded-2xl text-white animate-in slide-in-from-top duration-200">
                    <label className="text-xs font-bold uppercase mb-2 block text-slate-400">OpenAI API Key</label>
                    <div className="flex gap-2">
                        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg focus:border-cyan-500 outline-none" />
                        <button onClick={handleSaveKey} className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg font-bold text-xs uppercase transition-colors">Save</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Builder */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Client Info */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Client Name</label>
                            <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-700 focus:border-cyan-400 outline-none" placeholder="John Doe" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Project Address</label>
                            <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-700 focus:border-cyan-400 outline-none" placeholder="123 Ocean Dr" />
                        </div>
                    </div>

                    {/* Sections List */}
                    {sections.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Sections Added</h3>
                                <button onClick={() => setSections([])} className="text-[10px] text-red-400 font-bold hover:underline">Clear All</button>
                            </div>
                            {sections.map((s, idx) => (
                                <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center hover:border-cyan-200 transition-all">
                                    <div className="flex gap-4 items-center">
                                        <div className="bg-cyan-50 text-cyan-700 font-black w-8 h-8 flex items-center justify-center rounded-lg text-xs">{idx + 1}</div>
                                        <div>
                                            <h4 className="font-bold text-slate-700">{s.type}</h4>
                                            <p className="text-xs text-slate-400">{s.dimensions} units{s.description ? ` · ${s.description}` : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono font-bold text-slate-700">${s.price.toLocaleString()}</span>
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
                                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Section Type</label>
                                <select value={currentType} onChange={e => setCurrentType(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400">
                                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
                            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 max-h-56 overflow-y-auto">
                                <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Specifications & Materials</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {getItemsForType(currentType).map(item => {
                                        const sel = currentSelectedItems.includes(item.id);
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
                            <span className="text-xl font-black text-slate-700">${currentLivePrice.toLocaleString()}</span>
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
        </div>
    );
};

export default QuoteGenerator;
