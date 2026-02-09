import React, { useState, useEffect } from 'react';
import { Bot, FileText, Send, Save, Download, Loader2, Settings, X, Plus, Trash2 } from 'lucide-react';
import { PRICING_CONTEXT } from '../data/pricing_data';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface QuoteItem {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
}

interface Quote {
    clientName: string;
    projectDescription: string;
    items: QuoteItem[];
    total: number;
    date: string;
}

const QuoteGenerator: React.FC = () => {
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
    const [showSettings, setShowSettings] = useState(!localStorage.getItem('openai_api_key'));
    const [clientName, setClientName] = useState('');
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
    const [aiResponseText, setAiResponseText] = useState('');

    const handleSaveKey = () => {
        localStorage.setItem('openai_api_key', apiKey);
        setShowSettings(false);
    };

    const handleGenerateQuote = async () => {
        if (!apiKey) {
            alert("Please enter your OpenAI API Key in settings.");
            setShowSettings(true);
            return;
        }
        if (!description) {
            alert("Please describe the project.");
            return;
        }

        setIsGenerating(true);
        setQuoteItems([]);

        const prompt = `
      Role: You are an expert Marine Construction Estimator for "Coastal VA Marine Construction".
      Task: Generate a detailed cost estimate (quote) based on the user's project description and the provided PRICING_CONTEXT.
      
      User Description: "${description}"
      
      Instructions:
      1. Analyze the description to identify necessary materials, labor, and equipment (piles, lumber, hardware, mobilization, etc.).
      2. Use the exact prices from the PRICING_CONTEXT where available. If a price is missing, estimate it reasonably and mark as "(Est)".
      3. Always include "Mobilization" if it seems like a new site project.
      4. Output strictly in JSON format with this structure:
      {
        "items": [
          { "description": "Item Name", "quantity": 1, "unit": "each/LF/SQF", "unitPrice": 100.00, "total": 100.00 }
        ],
        "summary": "Brief explanation of the estimation logic."
      }
      
      PRICING_CONTEXT:
      ${PRICING_CONTEXT}
    `;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o", // or gpt-3.5-turbo if preferred
                    messages: [
                        { role: "system", content: "You are a helpful construction estimator. Output JSON only." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.3
                })
            });

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }

            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/); // Find JSON object
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                setQuoteItems(parsed.items);
                setAiResponseText(parsed.summary || "Estimate generated based on pricing list.");
            } else {
                setAiResponseText("Failed to parse AI response. Please try again.");
            }

        } catch (error: any) {
            alert(`Error generating quote: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const calculateTotal = () => quoteItems.reduce((sum, item) => sum + item.total, 0);

    const generatePDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

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
        doc.text("Project Estimate / Quote", pageWidth / 2, 28, { align: 'center' });

        // Client Info
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.text(`Client: ${clientName || 'Valued Client'}`, 14, 50);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 50, { align: 'right' });

        doc.setFontSize(10);
        doc.text("Project Description:", 14, 60);
        doc.setFont("helvetica", "italic");
        const splitDesc = doc.splitTextToSize(description, pageWidth - 28);
        doc.text(splitDesc, 14, 65);

        // Table
        const startY = 65 + (splitDesc.length * 5) + 5;

        autoTable(doc, {
            startY: startY,
            head: [['Description', 'Qty', 'Unit', 'Price', 'Total']],
            body: quoteItems.map(item => [
                item.description,
                item.quantity,
                item.unit,
                `$${item.unitPrice.toLocaleString()}`,
                `$${item.total.toLocaleString()}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [10, 25, 47] },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'center' },
                3: { halign: 'right' },
                4: { halign: 'right', fontStyle: 'bold' }
            }
        });

        // Total
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Estimated Total: $${calculateTotal().toLocaleString()}`, pageWidth - 14, finalY, { align: 'right' });

        // Footer
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150);
        doc.text("This is an estimate based on current material costs. Final price subject to site inspection.", pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

        doc.save(`Quote_${clientName || 'Draft'}.pdf`);
    };

    const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...quoteItems];
        (newItems[index] as any)[field] = value;
        if (field === 'quantity' || field === 'unitPrice') {
            newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
        }
        setQuoteItems(newItems);
    };

    const deleteItem = (index: number) => {
        setQuoteItems(quoteItems.filter((_, i) => i !== index));
    };

    const addItem = () => {
        setQuoteItems([...quoteItems, { description: 'New Item', quantity: 1, unit: 'ea', unitPrice: 0, total: 0 }]);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">

            {/* Header & Settings */}
            <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-5">
                    <div className="bg-[#0a192f] p-4 rounded-2xl text-cyan-400"><Bot className="w-8 h-8" /></div>
                    <div>
                        <h2 className="text-3xl font-black text-[#0a192f] uppercase italic tracking-tighter">AI Estimator</h2>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Powered by Coastal VA Pricing Data</p>
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

            {/* Input Section */}
            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
                        <h3 className="font-black text-[#0a192f] uppercase tracking-widest text-sm mb-6">Project Details</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Client Name</label>
                                <input
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-cyan-400"
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Description / Requirements</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full h-64 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-cyan-400 resize-none"
                                    placeholder="Describe the project in detail... e.g. Build a 20x20 floating dock with pine decking, requiring 10 piles and a boat lift."
                                />
                            </div>

                            <button
                                onClick={handleGenerateQuote}
                                disabled={isGenerating || !apiKey}
                                className="w-full py-5 bg-[#0a192f] text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl"
                            >
                                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5 text-cyan-400" />}
                                {isGenerating ? 'Analyzing Cost Data...' : 'Generate Estimate'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="md:col-span-2">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[600px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-black text-[#0a192f] uppercase tracking-widest text-sm">Estimated Items</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1 max-w-md truncate">{aiResponseText}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={addItem} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"><Plus className="w-5 h-5" /></button>
                                <button onClick={generatePDF} disabled={quoteItems.length === 0} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg disabled:opacity-50">
                                    <Download className="w-4 h-4" /> Export PDF
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                            {quoteItems.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-[#0a192f] text-white sticky top-0">
                                        <tr>
                                            <th className="p-4 text-[10px] uppercase tracking-widest font-black">Description</th>
                                            <th className="p-4 text-[10px] uppercase tracking-widest font-black w-20">Qty</th>
                                            <th className="p-4 text-[10px] uppercase tracking-widest font-black w-20">Unit</th>
                                            <th className="p-4 text-[10px] uppercase tracking-widest font-black w-32 text-right">Price</th>
                                            <th className="p-4 text-[10px] uppercase tracking-widest font-black w-32 text-right">Total</th>
                                            <th className="p-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {quoteItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white">
                                                <td className="p-2"><input value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-700" /></td>
                                                <td className="p-2"><input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value))} className="w-full bg-transparent outline-none font-bold text-slate-700 text-center" /></td>
                                                <td className="p-2"><input value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-700 text-center" /></td>
                                                <td className="p-2"><input type="number" value={item.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))} className="w-full bg-transparent outline-none font-bold text-slate-700 text-right" /></td>
                                                <td className="p-4 text-right font-black text-[#0a192f]">${item.total.toLocaleString()}</td>
                                                <td className="p-2 text-center"><button onClick={() => deleteItem(idx)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                    <Bot className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-bold text-sm uppercase tracking-widest">Ready to generate</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end items-center gap-4 p-4 bg-[#0a192f] text-white rounded-2xl">
                            <span className="text-xs font-black uppercase tracking-widest text-cyan-400">Total Estimate</span>
                            <span className="text-4xl font-black italic tracking-tighter">${calculateTotal().toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuoteGenerator;
