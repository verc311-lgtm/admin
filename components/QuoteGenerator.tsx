import React, { useState, useEffect } from 'react';
import { Bot, FileText, Send, Save, Download, Loader2, Settings, X, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { PRICING_CONTEXT } from '../data/pricing_data';
import { jsPDF } from 'jspdf';
import { DOCK_ITEMS, DECKING_OPTIONS, calculateInteractiveDockPrice } from '../utils/pricingCalculator';

const PROJECT_TYPES = [
    "Pier / Dock"
];

const QuoteGenerator: React.FC = () => {
    // API Key State
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
    const [showSettings, setShowSettings] = useState(!localStorage.getItem('openai_api_key'));

    // Form Inputs
    const [clientName, setClientName] = useState('');
    const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
    const [dimensions, setDimensions] = useState('');

    // Interactive Dock State
    const [deckingType, setDeckingType] = useState(DECKING_OPTIONS[0].id);
    const [selectedDockItems, setSelectedDockItems] = useState<string[]>(DOCK_ITEMS.filter(i => i.isDefault).map(i => i.id));

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

    const toggleDockItem = (id: string) => {
        if (selectedDockItems.includes(id)) {
            setSelectedDockItems(selectedDockItems.filter(i => i !== id));
        } else {
            setSelectedDockItems([...selectedDockItems, id]);
        }
    };

    // Auto-calculate for display
    const currentCalculatedTotal = !isNaN(parseFloat(dimensions))
        ? calculateInteractiveDockPrice(parseFloat(dimensions), selectedDockItems, deckingType)
        : 0;

    useEffect(() => {
        if (!isGenerating) {
            setEstimatedTotal(currentCalculatedTotal);
        }
    }, [dimensions, selectedDockItems, deckingType]);

    const handleGenerateQuote = async () => {
        setErrorMsg('');
        if (!apiKey) {
            setErrorMsg("Please enter your OpenAI API Key in settings.");
            setShowSettings(true);
            return;
        }
        if (!dimensions) {
            setErrorMsg("Please enter the dimensions (e.g. 100 SQF).");
            return;
        }

        setIsGenerating(true);
        let finalPrice = 0;
        let finalMaterials: string[] = [];

        try {
            const sqf = parseFloat(dimensions);
            if (isNaN(sqf)) {
                throw new Error("Dimensions must be a valid number.");
            }
            finalPrice = calculateInteractiveDockPrice(sqf, selectedDockItems, deckingType);

            // Gather names of selected items for AI context
            finalMaterials = DOCK_ITEMS
                .filter(i => selectedDockItems.includes(i.id))
                .map(i => i.label);

            // Add Decking Name
            const deckName = DECKING_OPTIONS.find(d => d.id === deckingType)?.label;
            if (deckName) finalMaterials.push(deckName);

            const prompt = `
          Role: You are a Senior Estimator for "Coastal VA Marine Construction". Write a formal "Preliminary Construction Proposal".
          
          Project Details:
          - Client: ${clientName || 'Valued Client'}
          - Type: ${projectType}
          - Size: ${dimensions} SQF
          - Materials Included: ${finalMaterials.join(', ')}
          
          Directives:
          1. **Tone**: Professional, authoritative, legalistic, and high-value.
          2. **Exclusions Section**: You MUST include a distinct section titled "STANDARD EXCLUSIONS" listing: Permits, Engineering, Soil Tests, Hazardous Material Removal, Hidden Obstructions.
          3. **Scope Entry**: Write a single, comprehensive paragraph describing the work to be performed based on the materials listed.
          
          Return JSON ONLY:
          {
            "scopeOfWork": "The detailed professional scope...",
            "exclusions": "Permits, Engineering, Soil Tests, Hidden Obstructions...",
            "totalPrice": ${finalPrice}
          }
        `;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
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
            setErrorMsg(`Error: ${error.message || "Unknown error occurred"}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Header
        doc.setFillColor(10, 25, 47);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("COASTAL VA MARINE CONSTRUCTION", pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(73, 204, 249);
        doc.text("Preliminary Construction Proposal", pageWidth / 2, 28, { align: 'center' });

        // Client & Date
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text(`Client: ${clientName || 'Valued Client'}`, 14, 50);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 50, { align: 'right' });
        doc.text(`Project Type: ${projectType}`, 14, 58);
        doc.text(`Dimensions: ${dimensions} SQF`, 14, 66);

        // Scope of Work
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Scope of Work & Approach", 14, 85);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50);
        const splitScope = doc.splitTextToSize(scopeOfWork, pageWidth - 28);
        doc.text(splitScope, 14, 95);

        // Total Price
        const priceY = 95 + (splitScope.length * 6) + 20;
        doc.setFillColor(240, 248, 255);
        doc.setDrawColor(73, 204, 249);
        doc.roundedRect(14, priceY, pageWidth - 28, 40, 3, 3, 'FD');

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(10, 25, 47);
        doc.text("Total Proposed Investment", pageWidth / 2, priceY + 15, { align: 'center' });

        doc.setFontSize(24);
        doc.setTextColor(0, 100, 0); // Green
        doc.text(`$${estimatedTotal.toLocaleString()}`, pageWidth / 2, priceY + 30, { align: 'center' });

        // Disclaimer
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont("helvetica", "italic");
        doc.text("NOTE: This proposal is preliminary. Final price subject to site inspection and engineering.", pageWidth / 2, pageHeight - 20, { align: 'center' });
        doc.text("Permits and Engineering are excluded unless explicitly itemized.", pageWidth / 2, pageHeight - 15, { align: 'center' });

        doc.save(`Proposal_${clientName || 'Project'}.pdf`);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header & Settings */}
            <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-5">
                    <div className="bg-[#0a192f] p-4 rounded-2xl text-cyan-400"><Bot className="w-8 h-8" /></div>
                    <div>
                        <h2 className="text-3xl font-black text-[#0a192f] uppercase italic tracking-tighter">Proposal Generator</h2>
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
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                    <h3 className="font-black text-[#0a192f] uppercase tracking-widest text-sm mb-4">Project Parameters</h3>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Client Name</label>
                        <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder="Client Name" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Project Type</label>
                            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400">
                                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Dimensions (SQF)</label>
                            <input value={dimensions} onChange={(e) => setDimensions(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder="e.g. 500" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-2 block">
                            Itemized Costs / Inclusions
                        </label>

                        <div className="space-y-4">
                            {/* Decking Selector */}
                            <div className="space-y-2">
                                <h4 className="text-[10px] uppercase font-bold text-slate-400">Decking Material</h4>
                                <div className="space-y-2">
                                    {DECKING_OPTIONS.map(dt => (
                                        <div
                                            key={dt.id}
                                            onClick={() => setDeckingType(dt.id)}
                                            className={`cursor-pointer px-4 py-3 rounded-xl flex items-center justify-between border-2 transition-all ${deckingType === dt.id ? 'bg-cyan-50 border-cyan-400' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${deckingType === dt.id ? 'border-cyan-500' : 'border-slate-300'}`}>
                                                    {deckingType === dt.id && <div className="w-2 h-2 rounded-full bg-cyan-500" />}
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">{dt.label}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400 font-bold">+${dt.price}/sqf</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Item List */}
                            <div className="space-y-2">
                                <h4 className="text-[10px] uppercase font-bold text-slate-400">Construction Items</h4>
                                <div className="max-h-64 overflow-y-auto pr-2 space-y-2">
                                    {DOCK_ITEMS.map(item => {
                                        const isSelected = selectedDockItems.includes(item.id);
                                        const sqfVal = parseFloat(dimensions) || 0;
                                        const lineTotal = item.unit === 'fixed' ? item.price : item.price * sqfVal;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => toggleDockItem(item.id)}
                                                className={`cursor-pointer px-4 py-3 rounded-xl flex items-center justify-between border transition-all ${isSelected ? 'bg-white border-cyan-100 shadow-sm' : 'bg-slate-50 border-transparent opacity-60'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300 bg-white'}`}>
                                                        {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-700">{item.label}</div>
                                                        <div className="text-[10px] text-slate-400">${item.price.toLocaleString()}{item.unit === 'sqf' ? '/sqf' : ''}</div>
                                                    </div>
                                                </div>
                                                <div className="text-xs font-mono font-bold text-slate-600">${lineTotal.toLocaleString()}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-900 rounded-xl flex justify-between items-center text-white">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Project Investment</span>
                                    <span className="text-[10px] text-slate-500 italic">Includes 10% Misc/Overhead</span>
                                </div>
                                <span className="text-xl font-black text-cyan-400">${currentCalculatedTotal.toLocaleString()}</span>
                            </div>
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
