
import React, { useState } from 'react';
import { Search, TrendingUp, X, FileText, Printer, FilePlus, DollarSign, Wallet, ChevronRight, Anchor, Save, Download } from 'lucide-react';
import { Project, Invoice, ExpenseCategory } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProjectSearchProps {
  projects: Project[];
  invoices: Invoice[];
  onAddPayment: (projectId: string, invoiceId?: string) => void;
  onAddExpense: (projectId: string, expense: { category: ExpenseCategory, amount: number, note: string }) => void;
  onChangeOrder: (projectId: string, amount: number) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  onViewDetails: (project: Project) => void;
  onGenerateNewInvoice: (project: Project) => void;
}

const ProjectSearch: React.FC<ProjectSearchProps> = ({ projects, invoices, onAddPayment, onAddExpense, onChangeOrder, onPrintInvoice, onViewDetails, onGenerateNewInvoice }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expenseModal, setExpenseModal] = useState<{ show: boolean, projectId: string, projectName: string, currentTotal: number }>({ show: false, projectId: '', projectName: '', currentTotal: 0 });
  const [changeOrderModal, setChangeOrderModal] = useState<{ show: boolean, projectId: string, projectName: string }>({ show: false, projectId: '', projectName: '' });
  const [detailsModal, setDetailsModal] = useState<{ show: boolean, project: Project | null }>({ show: false, project: null });

  // Expense Form State
  const [tempAmount, setTempAmount] = useState<number>(0);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Miscellaneous');
  const [expenseNote, setExpenseNote] = useState('');

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateProfitPercent = (p: Project) => {
    if (p.totalAmount === 0) return 0;
    return ((p.totalAmount - p.totalExpenses) / p.totalAmount) * 100;
  };

  const getExpensesByCategory = (expenses: { category: ExpenseCategory, amount: number }[]) => {
    if (!expenses) return [];
    const grouped = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([category, amount]) => ({ category, amount }));
  };

  const handleExpenseSave = () => {
    if (tempAmount <= 0) return;
    onAddExpense(expenseModal.projectId, {
      category: expenseCategory,
      amount: tempAmount,
      note: expenseNote
    });
    setExpenseModal({ show: false, projectId: '', projectName: '', currentTotal: 0 });
    setTempAmount(0);
    setExpenseCategory('Miscellaneous');
    setExpenseNote('');
  };

  const handleChangeOrderSave = () => {
    if (tempAmount === 0) return;
    onChangeOrder(changeOrderModal.projectId, tempAmount);
    setChangeOrderModal({ show: false, projectId: '', projectName: '' });
    setTempAmount(0);
  };

  const handleGeneratePDF = (project: Project) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 25, 47); // #0a192f
    doc.text("COASTAL VA MARINE CONSTRUCTION", pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Project Financial Control Report", pageWidth / 2, 28, { align: 'center' });

    // Project Details Block
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, 35, pageWidth - 28, 25, 'F');

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`Project: ${project.name}`, 20, 45);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Client: ${project.client}`, 20, 52);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, pageWidth - 20, 52, { align: 'right' });

    // Financial Summary
    let yPos = 75;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Financial Summary", 14, yPos);
    yPos += 5;

    const summaryData = [
      ['Total Contract Value', `$${project.totalAmount.toLocaleString()}`],
      ['Payments Received', `$${project.paidAmount.toLocaleString()}`],
      ['Total Expenses', `$${(project.totalExpenses || 0).toLocaleString()}`],
      ['Net Profit', `$${project.profit.toLocaleString()}`],
      ['Profit Margin', `${calculateProfitPercent(project).toFixed(2)}%`]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [10, 25, 47], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right' } },
      margin: { left: 14, right: 14 }
    });

    // Expenses Breakdown
    yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Expenses Breakdown by Category", 14, yPos);
    yPos += 5;

    const expensesByCategory = getExpensesByCategory(project.expensesList || []);

    if (expensesByCategory.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Category', 'Total Amount']],
        body: expensesByCategory.map(cat => [cat.category, `$${cat.amount.toLocaleString()}`]),
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74], textColor: 255 }, // Emerald green for expenses
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150);
      doc.text("No expenses recorded for this project.", 14, yPos + 10);
    }

    // Detailed Expenses Log
    if (project.expensesList && project.expensesList.length > 0) {
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Detailed Expense Log", 14, 20);

      autoTable(doc, {
        startY: 25,
        head: [['Date', 'Category', 'Note', 'Amount']],
        body: project.expensesList.map(exp => [
          exp.date,
          exp.category,
          exp.note,
          `$${exp.amount.toLocaleString()}`
        ]),
        theme: 'plain',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right' } },
        margin: { left: 14, right: 14 }
      });
    }

    doc.save(`Report_${project.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleGenerateInvoicePDF = (invoice: Invoice) => {
    const project = projects.find(p => p.id === invoice.projectId) || { name: invoice.projectName, client: 'N/A' } as Project;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

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

    // 2. Invoice Details (Right Side)
    doc.setTextColor(0);
    doc.setFontSize(30);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 200, 200);
    doc.text("INVOICE", pageWidth - 14, 60, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - 14, 70, { align: 'right' });
    doc.text(`Date: ${invoice.date}`, pageWidth - 14, 75, { align: 'right' });
    doc.text(`Status: ${invoice.status}`, pageWidth - 14, 80, { align: 'right' });

    // 3. Bill To (Left Side)
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

    // 4. Line Items Table
    autoTable(doc, {
      startY: 90,
      head: [['Description', 'Amount']],
      body: [
        [`Marine Construction Services - ${project.name}\n(Progress Payment / Contract Services)`, `$${invoice.amount.toLocaleString()}`]
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
    doc.text(`$${invoice.amount.toLocaleString()}`, pageWidth - 20, finalY + 13, { align: 'right' });

    // 6. Footer
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.setFont("helvetica", "italic");
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.text("Thank you for your business. Please make checks payable to Coastal VA Marine Construction.", pageWidth / 2, footerY, { align: 'center' });

    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  };

  const expenseCategories: ExpenseCategory[] = ['Staff Hour', 'Insurance', 'Gas/Fuel', 'Tools', 'Transportation', 'Machines', 'Materials', 'Miscellaneous'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Modal Gastos */}
      {expenseModal.show && (
        <div className="fixed inset-0 bg-[#0a192f]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-[#0a192f] uppercase italic">Add Expense</h3>
              <button onClick={() => setExpenseModal({ show: false, projectId: '', projectName: '', currentTotal: 0 })} className="text-slate-300 hover:text-red-500"><X className="w-8 h-8" /></button>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Project</p>
                <p className="font-bold text-slate-700">{expenseModal.projectName}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Current Total Expenses</p>
                <p className="font-bold text-red-500">${expenseModal.currentTotal.toLocaleString()}</p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Category</label>
                <select
                  className="w-full px-6 py-4 bg-slate-50 border-2 rounded-2xl font-bold text-slate-700 outline-none focus:border-cyan-400"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                >
                  {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-cyan-600 text-xl">$</span>
                  <input type="number" step="0.01" className="w-full pl-10 pr-6 py-5 bg-slate-50 border-2 rounded-2xl text-2xl font-black text-[#0a192f] outline-none focus:border-cyan-400" placeholder="0.00" value={tempAmount || ''} onChange={e => setTempAmount(parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Note (Optional)</label>
                <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 rounded-2xl font-bold text-slate-700 outline-none focus:border-cyan-400" placeholder="Description..." value={expenseNote} onChange={e => setExpenseNote(e.target.value)} />
              </div>

              <button onClick={handleExpenseSave} className="w-full py-5 bg-[#0a192f] text-white rounded-2xl font-black uppercase shadow-xl hover:bg-slate-800 transition-all flex justify-center items-center gap-2">
                <Save className="w-5 h-5" /> Save Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Change Order */}
      {changeOrderModal.show && (
        <div className="fixed inset-0 bg-[#0a192f]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-[#0a192f] uppercase italic">Add Change Order</h3>
              <button onClick={() => setChangeOrderModal({ show: false, projectId: '', projectName: '' })} className="text-slate-300 hover:text-red-500"><X className="w-8 h-8" /></button>
            </div>
            <div className="space-y-6">
              <p className="text-xs font-bold text-slate-500 uppercase">Adding extra scope to: <span className="text-[#0a192f]">{changeOrderModal.projectName}</span></p>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Addition Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-cyan-600 text-xl">$</span>
                  <input type="number" step="0.01" className="w-full pl-10 pr-6 py-5 bg-slate-50 border-2 rounded-2xl text-2xl font-black text-cyan-700 outline-none focus:border-cyan-400" placeholder="Amount to add" value={tempAmount || ''} onChange={e => setTempAmount(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <button onClick={handleChangeOrderSave} className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-cyan-500 transition-all">Apply Change Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModal.show && detailsModal.project && (
        <div className="fixed inset-0 bg-[#0a192f]/95 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] w-full max-w-4xl p-14 shadow-2xl relative max-h-[90vh] overflow-y-auto border-8 border-cyan-50">
            <div className="flex justify-between items-start mb-12 border-b pb-8">
              <div>
                <h3 className="text-4xl font-black text-[#0a192f] tracking-tighter uppercase italic">{detailsModal.project.name}</h3>
                <p className="text-cyan-600 font-bold uppercase tracking-widest text-[10px] mt-2">Financial History & Documents</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => handleGeneratePDF(detailsModal.project!)} className="bg-red-600 hover:bg-red-500 text-white transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest shadow-lg px-6 py-3 rounded-xl"><Download className="w-5 h-5" /> Download PDF</button>
                <button onClick={() => setDetailsModal({ show: false, project: null })} className="text-slate-300 hover:text-red-500 transition-colors"><X className="w-10 h-10" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-slate-50 p-6 rounded-3xl"><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Contract</p><p className="text-xl font-black">${detailsModal.project.totalAmount.toLocaleString()}</p></div>
              <div className="bg-emerald-50 p-6 rounded-3xl"><p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Received</p><p className="text-xl font-black">${detailsModal.project.paidAmount.toLocaleString()}</p></div>
              <div className="bg-orange-50 p-6 rounded-3xl"><p className="text-[9px] font-black uppercase text-orange-600 tracking-widest">Expenses</p><p className="text-xl font-black">${(detailsModal.project.totalExpenses || 0).toLocaleString()}</p></div>
              <div className="bg-blue-50 p-6 rounded-3xl">
                <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Profit Margin</p>
                <p className="text-xl font-black">{calculateProfitPercent(detailsModal.project).toFixed(1)}%</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Invoice Section */}
              <div className="flex justify-between items-center">
                <h4 className="text-xl font-black uppercase italic flex items-center gap-3"><FileText className="w-6 h-6 text-cyan-600" /> Invoices Issued</h4>
                <button onClick={() => { setDetailsModal({ show: false, project: null }); onGenerateNewInvoice(detailsModal.project!); }} className="bg-[#0a192f] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all">
                  <FilePlus className="w-4 h-4" /> Generate New Invoice
                </button>
              </div>
              <div className="bg-slate-50 rounded-[2.5rem] overflow-hidden border">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/50"><tr><th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th><th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice #</th><th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th><th className="px-8 py-5 text-right"></th></tr></thead>
                  <tbody className="divide-y">
                    {invoices.filter(inv => inv.projectId === detailsModal.project?.id).map(inv => (
                      <tr key={inv.id} className="hover:bg-white transition-colors">
                        <td className="px-8 py-6 text-sm font-bold text-slate-500">{inv.date}</td>
                        <td className="px-8 py-6 font-black text-[#0a192f]">{inv.invoiceNumber}</td>
                        <td className="px-8 py-6 font-black text-blue-600">${inv.amount.toLocaleString()}</td>
                        <td className="px-8 py-6 text-right flex justify-end gap-3">
                          <button onClick={() => handleGenerateInvoicePDF(inv)} className="p-3 text-slate-400 hover:text-cyan-600 bg-white rounded-xl shadow-sm border"><Download className="w-4 h-4" /></button>
                          {inv.status !== 'Paid' && <button onClick={() => { setDetailsModal({ show: false, project: null }); onAddPayment(inv.projectId, inv.id); }} className="bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-cyan-600/20">Pay</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Expenses List Section */}
              <div className="pt-8 border-t">
                <h4 className="text-xl font-black uppercase italic flex items-center gap-3 mb-6"><Wallet className="w-6 h-6 text-orange-500" /> Project Expenses</h4>

                {/* Grouped Expenses Summary */}
                {detailsModal.project.expensesList && detailsModal.project.expensesList.length > 0 && (
                  <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {getExpensesByCategory(detailsModal.project.expensesList).map(cat => (
                      <div key={cat.category} className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <p className="text-[8px] font-black uppercase text-orange-400 tracking-widest mb-1">{cat.category}</p>
                        <p className="text-lg font-black text-orange-600">${cat.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  {detailsModal.project.expensesList && detailsModal.project.expensesList.length > 0 ? (
                    detailsModal.project.expensesList.map(exp => (
                      <div key={exp.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div>
                          <p className="font-bold text-[#0a192f]">{exp.category}</p>
                          <p className="text-xs text-slate-400">{exp.note} • {exp.date}</p>
                        </div>
                        <p className="font-black text-orange-600">-${exp.amount.toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic text-sm">No expenses recorded yet.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Barra de Búsqueda */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border flex items-center gap-6 sticky top-0 z-10 w-full mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-600 w-6 h-6" />
          <input type="text" placeholder="Search project, client or status..." className="w-full pl-16 pr-8 py-5 rounded-[1.5rem] bg-slate-50 outline-none font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-cyan-50 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="bg-cyan-50 px-6 py-4 rounded-2xl flex items-center gap-3">
          <Anchor className="text-cyan-600 w-5 h-5" />
          <span className="text-[11px] font-black text-cyan-700 uppercase tracking-widest hidden md:inline">{projects.length} Projects</span>
        </div>
      </div>

      {/* Slider de Proyectos (Horizontal Scroll) */}
      <div className="flex overflow-x-auto snap-x snap-mandatory space-x-6 pb-12 pt-4 px-2 -mx-2 hover:cursor-grab active:cursor-grabbing scrollbar-hide">
        {filteredProjects.map(project => {
          const profitPercent = calculateProfitPercent(project);
          return (
            <div key={project.id} className="snap-center bg-white rounded-[3rem] shadow-sm border-t-[12px] border-[#0a192f] overflow-hidden hover:shadow-2xl transition-all group flex flex-col min-w-[320px] md:min-w-[400px] max-w-[400px]">
              <div className="p-8 flex-1">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-[#0a192f] uppercase italic leading-none group-hover:text-cyan-600 transition-colors truncate max-w-[180px]">{project.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{project.client}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${project.status === 'Finished' ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'}`}>{project.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Total Contract</p>
                    <p className="text-lg font-black text-slate-900 leading-none">${project.totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100">
                    <p className="text-[8px] font-black uppercase text-blue-600 mb-1">Margin %</p>
                    <p className="text-lg font-black text-blue-700 leading-none">{profitPercent.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="text-slate-400">Progress Tracking</span>
                    <span className="text-cyan-600 italic">{((project.paidAmount / project.totalAmount) * 100).toFixed(0)}% Received</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${(project.paidAmount / project.totalAmount) * 100}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => onAddPayment(project.id)} className="flex items-center justify-center gap-2 py-4 bg-[#0a192f] text-white rounded-2xl font-black uppercase text-[9px] hover:bg-slate-800 transition-all"><TrendingUp className="w-3 h-3 text-cyan-400" /> Payment</button>
                  <button onClick={() => onGenerateNewInvoice(project)} className="flex items-center justify-center gap-2 py-4 bg-cyan-600 text-white rounded-2xl font-black uppercase text-[9px] hover:bg-cyan-500 shadow-lg shadow-cyan-600/20"><FilePlus className="w-3 h-3" /> Invoice</button>

                  <button onClick={() => setExpenseModal({ show: true, projectId: project.id, projectName: project.name, currentTotal: project.totalExpenses })} className="flex items-center justify-center gap-2 py-4 border-2 border-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[9px] hover:bg-slate-50 transition-all"><Wallet className="w-3 h-3" /> Expenses</button>
                  <button onClick={() => setChangeOrderModal({ show: true, projectId: project.id, projectName: project.name })} className="flex items-center justify-center gap-2 py-4 border-2 border-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[9px] hover:bg-slate-50 transition-all"><DollarSign className="w-3 h-3" /> Change Order</button>

                  <button onClick={() => setDetailsModal({ show: true, project })} className="col-span-2 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[8px] tracking-[0.2em] hover:text-[#0a192f] transition-all">
                    Full Project Records <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Helper text for horizontal scrolling */}
        <div className="flex flex-col justify-center items-center text-slate-300 min-w-[200px] px-8">
          <span className="text-2xl font-black">&rarr;</span>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-2">Scroll for more</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectSearch;
