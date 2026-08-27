
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
  const [invoiceDescription, setInvoiceDescription] = useState<string>('Marine construction services and progress implementation.');
  const [showPreview, setShowPreview] = useState(false);
  const [historicalInvoice, setHistoricalInvoice] = useState<Invoice | null>(initialInvoice || null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedInvoiceNumber, setSavedInvoiceNumber] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'Pending' | 'Paid' | 'All'>('Pending');

  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialInvoice) {
      const project = projects.find(p => p.id === initialInvoice.projectId);
      if (project) {
        setSelectedProject(project);
        setInvoiceAmount(initialInvoice.amount);
        setInvoiceDescription(initialInvoice.description || 'Marine construction services and progress implementation.');
        setHistoricalInvoice(initialInvoice);
        setSavedInvoiceNumber(initialInvoice.invoiceNumber);
        setShowPreview(true);
        setIsSaved(true);
      }
    } else if (initialProject) {
      setSelectedProject(initialProject);
      setInvoiceAmount(initialProject.balance);
      setInvoiceDescription('Marine construction services and progress implementation.');
      setSavedInvoiceNumber('');
      setShowPreview(false);
      setHistoricalInvoice(null);
      setIsSaved(false);
    }
  }, [initialInvoice, initialProject, projects]);

  useEffect(() => {
    if (historicalInvoice) {
      const project = projects.find(p => p.id === historicalInvoice.projectId);
      if (project) {
        setSelectedProject(project);
        setInvoiceAmount(historicalInvoice.amount);
        setInvoiceDescription(historicalInvoice.description || 'Marine construction services and progress implementation.');
        setSavedInvoiceNumber(historicalInvoice.invoiceNumber);
        setShowPreview(true);
        setIsSaved(true);
      }
    }
  }, [historicalInvoice, projects]);

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
      status: 'Sent',
      description: invoiceDescription
    });
    setIsSaved(true);
    setSavedInvoiceNumber(invNum);
    return invNum;
  };

  const handleSaveInvoiceAndDownload = async () => {
    if (!selectedProject || isSaved) return;
    const invNum = handleSaveInvoice();
    if (invNum) {
      await downloadPDF(invNum);
    }
  };
  const downloadPDF = async (forcedInvNum?: string) => {
    const isDraft = !historicalInvoice && !isSaved && !forcedInvNum;
    const invNumber = forcedInvNum || savedInvoiceNumber || historicalInvoice?.invoiceNumber || (isSaved ? 'REGISTERED' : 'DRAFT');

    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const project = selectedProject || projects.find(p => p.id === historicalInvoice?.projectId) || { name: 'Unknown Project', client: 'Unknown Client' } as Project;

      // Calculate invoice sequence number dynamically
      const projectInvoices = invoices
        .filter(inv => inv.projectId === project.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let invoiceIndexText = '';
      if (historicalInvoice) {
        const idx = projectInvoices.findIndex(inv => inv.id === historicalInvoice.id);
        const num = idx !== -1 ? idx + 1 : 1;
        invoiceIndexText = num === 1 ? 'First Progress Payment' : (num === 2 ? 'Second Progress Payment' : (num === 3 ? 'Third Progress Payment' : `${num}th Progress Payment`));
      } else {
        const num = projectInvoices.length + 1;
        invoiceIndexText = num === 1 ? 'First Progress Payment' : (num === 2 ? 'Second Progress Payment' : (num === 3 ? 'Third Progress Payment' : `${num}th Progress Payment`));
      }

      // --- NEW LOGO HEADER DESIGN ---
      // Logo Text (Navy/Bold)
      doc.setTextColor(10, 25, 47); // #0a192f
      doc.setFontSize(26);
      doc.setFont("helvetica", "bold");
      doc.text("COASTAL VA", 20, 24);

      // Sub-logo Text (Cyan/Uppercase)
      doc.setTextColor(14, 165, 233); // cyan-500
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("MARINE CONSTRUCTION", 20, 29);

      // Company info details below logo (Y = 36)
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("CHESAPEAKE, VIRGINIA", 20, 36);
      doc.text("MARINE CONSTRUCTION", 20, 40);
      doc.text("WWW.COVAMARINECONSTRUCTION.COM", 20, 44);

      // --- INVOICE INFO (Right aligned) ---
      doc.setTextColor(241, 245, 249); // slate-100/200 for watermarked big title
      doc.setFontSize(36);
      doc.setFont("helvetica", "bolditalic");
      doc.text("INVOICE", pageWidth - 20, 26, { align: 'right' });

      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE #", pageWidth - 20, 34, { align: 'right' });

      doc.setTextColor(10, 25, 47); // Navy
      doc.setFontSize(16);
      doc.setFont("helvetica", "bolditalic");
      doc.text(invNumber, pageWidth - 20, 40, { align: 'right' });

      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("DATE", pageWidth - 20, 48, { align: 'right' });

      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const dateText = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(dateText, pageWidth - 20, 53, { align: 'right' });

      // --- BILL TO ACCENT SECTION ---
      // Accent cyan block
      doc.setFillColor(14, 165, 233);
      doc.rect(20, 68, 2, 22, 'F');

      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("BILL TO:", 26, 72);

      doc.setTextColor(10, 25, 47); // Navy
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(project.client.toUpperCase(), 26, 80);

      doc.setTextColor(100);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bolditalic");
      doc.text(`Project: ${project.name}`, 26, 86);

      // --- LINE ITEMS TABLE ---
      autoTable(doc, {
        startY: 98,
        head: [['BILLING PHASE', 'WORK DESCRIPTION & SCOPE DETAILS', 'TOTAL']],
        body: [
          [
            invoiceIndexText.toUpperCase(),
            `${invoiceDescription}\n\nInfrastructure installation, marine labor, and material procurement for project "${project.name}".\nProfessional execution adhering to marine engineering safety standards.`, 
            `$${invoiceAmount.toLocaleString()}`
          ]
        ],
        theme: 'plain',
        headStyles: { 
          textColor: [148, 163, 184], 
          fontSize: 8, 
          fontStyle: 'bold', 
          cellPadding: { top: 8, bottom: 8, left: 0, right: 0 },
          lineColor: [15, 23, 42], 
          lineWidth: { bottom: 2 } 
        },
        bodyStyles: {
          cellPadding: { top: 14, bottom: 14, left: 0, right: 0 },
          fontSize: 9.5,
          textColor: [71, 85, 105] // slate-600
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 45 },
          1: { cellWidth: 'auto' },
          2: { halign: 'right', fontStyle: 'bolditalic', textColor: [10, 25, 47], cellWidth: 32, fontSize: 18 }
        },
        margin: { left: 20, right: 20 }
      });

      // --- TOTALS & NOTE ---
      const finalY = (doc as any).lastAutoTable.finalY;
      const cardY = finalY + 12;

      // Note text (Left side)
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(148, 163, 184); // slate-400
      const noteText = "PLEASE REFERENCE THE INVOICE NUMBER IN YOUR PAYMENT. COASTAL VA APPRECIATES YOUR BUSINESS AND TRUST IN OUR ENGINEERING.";
      const lines = doc.splitTextToSize(noteText, 85);
      doc.text(lines, 20, cardY + 6);

      // Total Due Card (Right side)
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(pageWidth - 85, cardY, 65, 22, 'F');
      
      doc.setDrawColor(241, 245, 249); // slate-100 border
      doc.setLineWidth(0.5);
      doc.rect(pageWidth - 85, cardY, 65, 22, 'S');

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(14, 165, 233); // cyan-600
      doc.text("TOTAL DUE", pageWidth - 80, cardY + 9);

      doc.setFontSize(20);
      doc.setFont("helvetica", "bolditalic");
      doc.setTextColor(10, 25, 47); // Navy
      doc.text(`$${invoiceAmount.toLocaleString()}`, pageWidth - 25, cardY + 16, { align: 'right' });

      // --- FOOTER ---
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "italic");
      const footerY = doc.internal.pageSize.getHeight() - 15;
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
        <div className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-5">
            <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><FileText className="w-8 h-8" /></div>
            <div>
              <h2 className="text-2xl font-black text-[#0a192f] uppercase tracking-tighter leading-none italic">Invoices Ledger</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Pending Receivables: <span className="text-amber-600 font-black">${pendingTotal.toLocaleString()}</span></p>
            </div>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl self-start">
            {(['Pending', 'Paid', 'All'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-[#0a192f] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
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

        <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 600 }}>
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
      </div>
    );
  }

  // RENDER PREVIEW / CREATION VIEW
  if (showPreview && (selectedProject || historicalInvoice)) {
    const currentProject = selectedProject || projects.find(p => p.id === historicalInvoice?.projectId);

    // Calculate invoice sequence number dynamically
    const projectInvoices = invoices
      .filter(inv => inv.projectId === currentProject?.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let invoiceIndexText = '';
    if (historicalInvoice) {
      const idx = projectInvoices.findIndex(inv => inv.id === historicalInvoice.id);
      const num = idx !== -1 ? idx + 1 : 1;
      invoiceIndexText = num === 1 ? 'First Progress Payment' : (num === 2 ? 'Second Progress Payment' : (num === 3 ? 'Third Progress Payment' : `${num}th Progress Payment`));
    } else {
      const num = projectInvoices.length + 1;
      invoiceIndexText = num === 1 ? 'First Progress Payment' : (num === 2 ? 'Second Progress Payment' : (num === 3 ? 'Third Progress Payment' : `${num}th Progress Payment`));
    }

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
              <div className="mb-6">
                <h1 className="text-4xl font-black text-[#0a192f] italic uppercase tracking-tighter leading-none">COASTAL VA</h1>
                <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mt-1">Marine Construction</p>
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
              <p className="text-2xl font-black text-[#0a192f] italic">{historicalInvoice?.invoiceNumber || savedInvoiceNumber || (isSaved ? 'REGISTERED' : 'DRAFT')}</p>
              <p className="text-[10px] font-black uppercase text-slate-400 pt-3">Date</p>
              <p className="text-sm font-bold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="border-l-8 border-cyan-500 pl-8 py-2 mb-20">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Bill To:</h3>
            <p className="text-3xl font-black text-[#0a192f] uppercase leading-tight">{currentProject?.client}</p>
            <p className="text-xs font-bold text-slate-500 mt-2 italic">Project: {currentProject?.name}</p>
          </div>

          <table className="w-full mb-24 text-xs">
            <thead>
              <tr className="border-b-4 border-slate-900">
                <th className="text-left py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-1/4">Billing Phase</th>
                <th className="text-left py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-1/2">Work Description & Scope Details</th>
                <th className="text-right py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-1/4">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-14 font-black text-slate-900 uppercase align-top">{invoiceIndexText}</td>
                <td className="py-14 pr-12 align-top text-slate-600">
                  <p className="font-bold text-slate-900 text-sm whitespace-pre-line mb-3">
                    {invoiceDescription}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Infrastructure installation, marine labor, and material procurement for project "{currentProject?.name}".
                    Professional execution adhering to marine engineering safety standards.
                  </p>
                </td>
                <td className="py-14 text-right align-top">
                  <span className="text-3xl font-black italic text-[#0a192f] tracking-tighter">${invoiceAmount.toLocaleString()}</span>
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
              onClick={handleSaveInvoiceAndDownload}
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

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Detailed Invoice Description / Scope Details *</label>
            <textarea
              rows={3}
              required
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-cyan-400 outline-none text-xs font-bold text-slate-700 shadow-inner resize-none"
              placeholder="Describe what work this invoice covers (e.g. Deposit Payment, Materials Delivered, Framing Complete)..."
              value={invoiceDescription}
              onChange={e => setInvoiceDescription(e.target.value)}
            />
          </div>

          <button type="submit" className="w-full py-7 bg-cyan-600 text-white rounded-[2.5rem] font-black uppercase text-xs shadow-2xl hover:bg-cyan-500 transition-all active:scale-95 shadow-cyan-600/20">Preview Invoice Document</button>
        </form>
      </div>
    </div>
  );
};

export default InvoiceView;
