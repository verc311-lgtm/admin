
import React, { useState, useEffect, useRef } from 'react';
import { FileText, ArrowLeft, Printer, Anchor, X, FileDown, Loader2, Save, CheckCircle2, Search, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { Project, Invoice } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceViewProps {
  projects: Project[];
  invoices: Invoice[];
  initialInvoice?: Invoice | null;
  initialProject?: Project | null;
  onGenerateInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  onAddPayment: (projectId: string, invoiceId: string) => void;
  onClose?: () => void;
}

const InvoiceView: React.FC<InvoiceViewProps> = ({ projects, invoices, initialInvoice, initialProject, onGenerateInvoice, onAddPayment, onClose }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(initialProject || null);
  const [invoiceAmount, setInvoiceAmount] = useState<number>(initialProject ? initialProject.balance : 0);
  const [showPreview, setShowPreview] = useState(false);
  const [historicalInvoice, setHistoricalInvoice] = useState<Invoice | null>(initialInvoice || null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'Pending' | 'Paid' | 'All'>('Pending');

  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialInvoice) {
      const project = projects.find(p => p.id === initialInvoice.projectId);
      if (project) {
        setSelectedProject(project);
        setInvoiceAmount(initialInvoice.amount);
        setHistoricalInvoice(initialInvoice);
        setShowPreview(true);
        setIsSaved(true);
      }
    } else if (initialProject) {
      setSelectedProject(initialProject);
      setInvoiceAmount(initialProject.balance);
      setShowPreview(false);
      setHistoricalInvoice(null);
      setIsSaved(false);
    }
  }, [initialInvoice, initialProject, projects]);

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceAmount <= 0) {
      alert("Invalid Amount.");
      return;
    }
    setShowPreview(true);
  };

  const handleSaveInvoice = () => {
    if (!selectedProject || isSaved) return;

    // Sequential Invoice Number Logic
    const existingNumbers = invoices
      .map(inv => {
        const match = inv.invoiceNumber.match(/CVA-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => !isNaN(num));

    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 10000;
    const nextNum = maxNum + 1;
    const invNum = `CVA-${nextNum}`;

    onGenerateInvoice({
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      invoiceNumber: invNum,
      amount: invoiceAmount,
      date: new Date().toISOString().split('T')[0],
      status: 'Sent'
    });
    setIsSaved(true);
    return invNum;
  };

  const downloadPDF = async () => {
    // Auto-save if not already saved to ensure tracking (except if just previewing before saving)
    // Note: User can "Export PDF" without saving if they want a draft, but typically we want a record.
    // However, keeping logic simple: If it has an ID/Number, use it. If not, mark as "DRAFT".

    // We don't force save here to allow printing drafts, but we'll use the current state.
    const isDraft = !historicalInvoice && !isSaved;
    const invNumber = historicalInvoice?.invoiceNumber || (isSaved ? invoiceRef.current?.innerText.match(/CVA-\d+/) || 'REGISTERED' : 'DRAFT');

    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const project = selectedProject || { name: 'Unknown Project', client: 'Unknown Client' } as Project;

      // 1. Header (Company Info)
      doc.setFillColor(10, 25, 47); // Navy Blue Header
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("COASTAL VA MARINE CONSTRUCTION", pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(73, 204, 249); // Cyan accent
      doc.text("Marine Operations & Engineering", pageWidth / 2, 28, { align: 'center' });

      // 2. Invoice Details
      doc.setTextColor(0);
      doc.setFontSize(30);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(200, 200, 200);
      doc.text("INVOICE", pageWidth - 14, 60, { align: 'right' });

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Invoice #: ${invNumber}`, pageWidth - 14, 70, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 75, { align: 'right' });
      doc.text(`Status: ${isDraft ? 'Draft' : 'Sent'}`, pageWidth - 14, 80, { align: 'right' });

      // 3. Bill To
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 25, 47);
      doc.text("Bill To:", 14, 60);

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(project.client, 14, 68);

      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Project: ${project.name}`, 14, 75);

      // 4. Line Items
      autoTable(doc, {
        startY: 90,
        head: [['Description', 'Amount']],
        body: [
          [`Marine Construction Services - ${project.name}\n(Progress Payment / Contract Services)\n\nInfrastructure installation, marine labor, and material procurement.\nProfessional implementation adhering to marine safety standards.`, `$${invoiceAmount.toLocaleString()}`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [10, 25, 47], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 50 }
        },
        styles: { cellPadding: 5 },
        margin: { left: 14, right: 14 }
      });

      // 5. Total
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(pageWidth - 80, finalY, 66, 20, 'F');

      doc.setFontSize(12);
      doc.setTextColor(10, 25, 47);
      doc.text("Total Due:", pageWidth - 75, finalY + 13);

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`$${invoiceAmount.toLocaleString()}`, pageWidth - 20, finalY + 13, { align: 'right' });

      // 6. Footer
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.setFont("helvetica", "italic");
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.text("Thank you for your business. Please make checks payable to Coastal VA Marine Construction.", pageWidth / 2, footerY, { align: 'center' });

      doc.save(`CoastalVA_Invoice_${invNumber}.pdf`);
    } catch (error) {
      alert("Error generating PDF.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Filter logic for the invoice ledger
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'All' ||
      (activeTab === 'Pending' && inv.status !== 'Paid') ||
      (activeTab === 'Paid' && inv.status === 'Paid');
    return matchesSearch && matchesTab;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // RENDER LEDGER VIEW
  if (!selectedProject && !historicalInvoice && !showPreview) {
    const pendingTotal = invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><FileText className="w-8 h-8" /></div>
            <div>
              <h2 className="text-2xl font-black text-[#0a192f] uppercase tracking-tighter leading-none italic">Invoices Ledger</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Pending Receivables: <span className="text-amber-600 font-black">${pendingTotal.toLocaleString()}</span></p>
            </div>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            {(['Pending', 'Paid', 'All'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-[#0a192f] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-4">
          <Search className="text-slate-300 w-5 h-5 ml-4" />
          <input
            type="text"
            placeholder="Search by invoice number or project name..."
            className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 placeholder:text-slate-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Name</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Date</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-10 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInvoices.length > 0 ? filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-8 font-black text-[#0a192f] italic tracking-tight">{inv.invoiceNumber}</td>
                  <td className="px-10 py-8">
                    <p className="font-bold text-slate-700 uppercase text-xs">{inv.projectName}</p>
                  </td>
                  <td className="px-10 py-8 text-center text-sm font-bold text-slate-500">{inv.date}</td>
                  <td className="px-10 py-8">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {inv.status === 'Paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {inv.status === 'Paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right font-black text-[#0a192f] text-xl tracking-tighter">${inv.amount.toLocaleString()}</td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setHistoricalInvoice(inv)} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:text-cyan-600"><FileText className="w-4 h-4" /></button>
                      {inv.status !== 'Paid' && (
                        <button
                          onClick={() => onAddPayment(inv.projectId, inv.id)}
                          className="bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-cyan-600/20"
                        >
                          Receive Payment
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="py-32 text-center text-slate-300 uppercase tracking-widest font-black text-sm">No {activeTab.toLowerCase()} records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // RENDER PREVIEW / CREATION VIEW
  if (showPreview && (selectedProject || historicalInvoice)) {
    const currentProject = selectedProject || projects.find(p => p.id === historicalInvoice?.projectId);

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center print:hidden bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
          <button onClick={() => { setShowPreview(false); if (historicalInvoice && !initialProject) setHistoricalInvoice(null); if (onClose) onClose(); }} className="flex items-center gap-2 text-slate-400 font-black uppercase text-[10px] hover:text-[#0a192f] transition-all"><ArrowLeft className="w-4 h-4" /> Back</button>
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-slate-100 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all"><Printer className="w-4 h-4" /> Print</button>
            <button onClick={downloadPDF} disabled={isGeneratingPDF} className="flex items-center gap-2 px-6 py-3 bg-[#0a192f] text-white rounded-2xl font-black text-[10px] uppercase hover:bg-slate-800 disabled:opacity-50 shadow-xl shadow-slate-900/10">
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} {isSaved ? 'Export PDF' : 'Save & Export PDF'}
            </button>
          </div>
        </div>

        <div ref={invoiceRef} className="bg-white p-16 rounded-sm shadow-xl border min-h-[1056px] relative overflow-hidden font-sans text-slate-900 mx-auto" style={{ width: '8.5in' }}>
          <div className="absolute top-0 left-0 w-full h-5 bg-[#0a192f]"></div>
          <div className="flex justify-between items-start mb-16 mt-10">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#0a192f] p-3 rounded-xl"><Anchor className="text-cyan-400 w-10 h-10" /></div>
                <div>
                  <h1 className="text-4xl font-black text-[#0a192f] italic uppercase tracking-tighter leading-none">COASTAL VA</h1>
                  <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mt-1">Marine Construction</p>
                </div>
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Chesapeake, Virginia<br />
                Marine Construction<br />
                www.covamarineconstruction.com
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-6xl font-black text-slate-100 uppercase italic tracking-tighter mb-4">INVOICE</h2>
              <p className="text-[10px] font-black uppercase text-slate-400">Invoice #</p>
              <p className="text-2xl font-black text-[#0a192f] italic">{historicalInvoice?.invoiceNumber || (isSaved ? 'REGISTERED' : 'DRAFT')}</p>
              <p className="text-[10px] font-black uppercase text-slate-400 pt-3">Date</p>
              <p className="text-sm font-bold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="border-l-8 border-cyan-500 pl-8 py-2 mb-20">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Bill To:</h3>
            <p className="text-3xl font-black text-[#0a192f] uppercase leading-tight">{currentProject?.client}</p>
            <p className="text-xs font-bold text-slate-500 mt-2 italic">Project: {currentProject?.name}</p>
          </div>

          <table className="w-full mb-24">
            <thead>
              <tr className="border-b-4 border-slate-900">
                <th className="text-left py-6 text-xs font-black uppercase tracking-widest text-slate-400">Professional Marine Services</th>
                <th className="text-right py-6 text-xs font-black uppercase tracking-widest text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-14 pr-12">
                  <p className="font-black text-2xl text-[#0a192f] italic mb-4 uppercase tracking-tight">Marine Construction</p>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                    Infrastructure installation, marine labor, and material procurement for project "{currentProject?.name}".
                    Professional implementation adhering to marine safety standards.
                  </p>
                </td>
                <td className="py-14 text-right align-top">
                  <span className="text-4xl font-black italic text-[#0a192f] tracking-tighter">${invoiceAmount.toLocaleString()}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between items-end mt-auto pt-24 border-t border-slate-50">
            <div className="max-w-xs">
              <p className="text-[10px] text-slate-400 leading-relaxed uppercase font-bold">
                Please reference the invoice number in your payment. Coastal VA appreciates your business and trust in our engineering.
              </p>
            </div>
            <div className="w-80 bg-slate-50 p-10 rounded-[2.5rem] border-2 border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-cyan-600">Total Due</span>
                <span className="text-4xl font-black text-[#0a192f] italic tracking-tighter leading-none">${invoiceAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {!isSaved && (
          <div className="pb-20 print:hidden">
            <button
              onClick={handleSaveInvoice}
              className="w-full bg-cyan-600 text-white py-7 rounded-[2.5rem] font-black uppercase text-sm shadow-2xl hover:bg-cyan-500 transition-all flex items-center justify-center gap-3 shadow-cyan-600/20 active:scale-95"
            >
              <Save className="w-6 h-6" /> Save Invoice & Register Debt
            </button>
          </div>
        )}

        {isSaved && !initialInvoice && (
          <div className="pb-20 print:hidden flex flex-col items-center justify-center gap-3 bg-emerald-50 p-8 rounded-[2rem] border-2 border-emerald-100">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <p className="font-black text-emerald-700 uppercase text-xs tracking-widest">Invoice registered in ledger</p>
            </div>
            <p className="text-[10px] text-emerald-600 font-bold uppercase">Status: Pending Payment</p>
          </div>
        )}
      </div>
    );
  }

  // RENDER CREATION FORM
  return (
    <div className="max-w-xl mx-auto pt-10 animate-in fade-in duration-500">
      <div className="bg-white rounded-[3.5rem] shadow-2xl border overflow-hidden ring-8 ring-white">
        <div className="p-12 bg-[#0a192f] text-white flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black uppercase italic leading-none tracking-tighter">Draft Invoice</h2>
            <p className="text-cyan-400 text-[10px] font-black tracking-widest uppercase mt-4">{selectedProject?.name || 'Creation Tool'}</p>
          </div>
          <button onClick={() => onClose?.()} className="text-white/20 hover:text-white"><X className="w-10 h-10" /></button>
        </div>

        <form onSubmit={handlePreview} className="p-12 space-y-10">
          <div className="p-8 bg-cyan-50 rounded-[2rem] border-2 border-cyan-100 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-cyan-700 tracking-widest">Available Balance</span>
            <span className="text-3xl font-black font-mono text-[#0a192f] italic">${selectedProject?.balance.toLocaleString()}</span>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Billing Amount</label>
            <div className="relative">
              <span className="absolute left-8 top-1/2 -translate-y-1/2 text-cyan-600 text-5xl font-black italic tracking-tighter">$</span>
              <input
                type="number" step="0.01" required autoFocus
                className="w-full pl-20 pr-10 py-10 bg-slate-50 rounded-[2.5rem] border-4 border-transparent focus:border-cyan-400 outline-none text-6xl font-black italic shadow-inner tracking-tighter text-[#0a192f]"
                value={invoiceAmount || ''}
                onChange={e => setInvoiceAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <button type="submit" className="w-full py-7 bg-cyan-600 text-white rounded-[2.5rem] font-black uppercase text-xs shadow-2xl hover:bg-cyan-500 transition-all active:scale-95 shadow-cyan-600/20">Preview Invoice Document</button>
        </form>
      </div>
    </div>
  );
};

export default InvoiceView;
