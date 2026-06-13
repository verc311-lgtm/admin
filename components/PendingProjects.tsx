import React, { useState } from 'react';
import { Search, ChevronRight, Download, X, FileText, FilePlus, Wallet, Anchor, Clock, DollarSign } from 'lucide-react';
import { Project, Invoice, Payment, ExpenseCategory } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PendingProjectsProps {
  projects: Project[];
  invoices: Invoice[];
  payments: Payment[];
  onAddPayment?: (projectId: string, invoiceId?: string) => void;
  onAddExpense?: (projectId: string, expense: { category: ExpenseCategory, amount: number, note: string }) => void;
  onChangeOrder?: (projectId: string, amount: number) => void;
  onGenerateNewInvoice?: (project: Project) => void;
}

const PendingProjects: React.FC<PendingProjectsProps> = ({ 
  projects, 
  invoices, 
  payments,
  onAddPayment,
  onAddExpense,
  onChangeOrder,
  onGenerateNewInvoice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsModal, setDetailsModal] = useState<{ show: boolean; project: Project | null }>({ show: false, project: null });

  // Pending Projects filter: No payments registered (paidAmount === 0)
  const pendingProjectsList = projects
    .filter(p => p.status !== 'Finished' && p.paidAmount === 0)
    .filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getExpensesByCategory = (expenses: { category: ExpenseCategory; amount: number }[]) => {
    if (!expenses) return [];
    const grouped = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped).map(([category, amount]) => ({ category, amount }));
  };

  const handleGeneratePDF = (project: Project) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 25, 47);
    doc.text("COASTAL VA MARINE CONSTRUCTION", pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Project Financial Report — Pending", pageWidth / 2, 28, { align: 'center' });

    doc.setFillColor(248, 250, 252);
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

    let yPos = 75;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Financial Summary", 14, yPos);
    yPos += 5;

    const summaryData = [
      ['Total Contract Value', `$${project.totalAmount.toLocaleString()}`],
      ['Payments Received', `$${project.paidAmount.toLocaleString()}`],
      ['Outstanding Balance', `$${project.balance.toLocaleString()}`],
      ['Total Expenses', `$${(project.totalExpenses || 0).toLocaleString()}`],
      ['Status', project.status]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right' } },
      margin: { left: 14, right: 14 }
    });

    doc.save(`Pending_${project.name.replace(/\s+/g, '_')}.pdf`);
  };

  // Totals
  const totalContract = pendingProjectsList.reduce((s, p) => s + p.totalAmount, 0);
  const avgContract = pendingProjectsList.length > 0 ? totalContract / pendingProjectsList.length : 0;
  const projectCount = pendingProjectsList.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Details Modal */}
      {detailsModal.show && detailsModal.project && (() => {
        const p = detailsModal.project;
        const projectInvoices = invoices.filter(inv => inv.projectId === p.id);
        const expensesByCategory = getExpensesByCategory(p.expensesList || []);

        return (
          <div className="fixed inset-0 bg-[#0a192f]/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6">
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-4xl p-8 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-8 md:mb-10 border-b pb-6">
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-[#0a192f] tracking-tighter uppercase italic">{p.name}</h3>
                  <p className="text-amber-600 font-bold uppercase tracking-widest text-[10px] mt-1">Pending Project — {p.client}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleGeneratePDF(p)} className="bg-red-600 hover:bg-red-500 text-white transition-all flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest shadow-lg px-5 py-2.5 rounded-xl"><Download className="w-4 h-4" /> PDF</button>
                  <button onClick={() => setDetailsModal({ show: false, project: null })} className="text-slate-300 hover:text-red-500 transition-colors"><X className="w-8 h-8" /></button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <div className="bg-slate-50 p-5 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Contract</p>
                  <p className="text-xl font-black">${p.totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Received</p>
                  <p className="text-xl font-black text-emerald-700">${p.paidAmount.toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 p-5 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-amber-600 tracking-widest">Balance Due</p>
                  <p className="text-xl font-black text-amber-700">${p.balance.toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 p-5 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Status</p>
                  <p className="text-xl font-black text-blue-700">{p.status}</p>
                </div>
              </div>

              {/* Action Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 text-amber-800">
                <h5 className="font-black text-xs uppercase tracking-widest mb-1">Pending Invoice / Payment Required</h5>
                <p className="text-sm">This project has no registered payments. To transition this project into Active state, you must issue an invoice and record a first payment.</p>
                {onAddPayment && (
                  <button 
                    onClick={() => { 
                      setDetailsModal({ show: false, project: null }); 
                      onAddPayment(p.id); 
                    }} 
                    className="mt-4 bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase text-[9px] tracking-widest px-4 py-2.5 rounded-xl transition-all"
                  >
                    Record First Payment
                  </button>
                )}
              </div>

              {/* Invoices List */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-black uppercase italic flex items-center gap-2"><FileText className="w-5 h-5 text-amber-600" /> Invoices Issued</h4>
                  {onGenerateNewInvoice && (
                    <button 
                      onClick={() => { 
                        setDetailsModal({ show: false, project: null }); 
                        onGenerateNewInvoice(p); 
                      }} 
                      className="bg-[#0a192f] hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <FilePlus className="w-3.5 h-3.5" /> Generate Invoice
                    </button>
                  )}
                </div>
                {projectInvoices.length > 0 ? (
                  <div className="bg-slate-50 rounded-2xl overflow-hidden border">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/50">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice #</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {projectInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-white transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-slate-500">{inv.date}</td>
                            <td className="px-6 py-4 font-black text-[#0a192f]">{inv.invoiceNumber}</td>
                            <td className="px-6 py-4 text-right font-black text-blue-600">${inv.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-sm bg-slate-50 p-4 rounded-xl border">No invoices issued yet.</p>
                )}
              </div>

              {/* Expenses Breakdown */}
              {expensesByCategory.length > 0 && (
                <div>
                  <h4 className="text-lg font-black uppercase italic flex items-center gap-2 mb-4"><Wallet className="w-5 h-5 text-orange-500" /> Expenses Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {expensesByCategory.map(cat => (
                      <div key={cat.category} className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <p className="text-[8px] font-black uppercase text-orange-400 tracking-widest mb-1">{cat.category}</p>
                        <p className="text-lg font-black text-orange-600">${cat.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Header + Search */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 sticky top-0 z-10">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="bg-amber-100 p-3 rounded-2xl">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-[#0a192f] uppercase tracking-tighter italic leading-none">Pending Projects</h2>
            <p className="text-amber-600 text-[10px] font-bold uppercase tracking-widest mt-0.5">{pendingProjectsList.length} pending project{pendingProjectsList.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by pending project or client..." 
            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 outline-none font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-amber-50 transition-all text-sm" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#0a192f] to-slate-800 p-6 rounded-[2rem] text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">Pending Contract Value</p>
          <p className="text-3xl font-black">${totalContract.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-[2rem] text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100 mb-2">Average Project Value</p>
          <p className="text-3xl font-black">${avgContract.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-[2rem] text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100 mb-2">Total Projects</p>
          <p className="text-3xl font-black">{projectCount}</p>
        </div>
      </div>

      {/* Main Table / Cards */}
      {pendingProjectsList.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] shadow-sm border p-16 text-center">
          <p className="text-slate-300 text-lg font-bold">No pending projects found</p>
          <p className="text-slate-400 text-sm mt-2">Projects without any registered payment will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">

          {/* Mobile Cards */}
          <div className="md:hidden p-4 space-y-3">
            {pendingProjectsList.map(project => {
              return (
                <div 
                  key={project.id} 
                  onClick={() => setDetailsModal({ show: true, project })} 
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="h-1 bg-amber-500" />
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-black text-[#0a192f] uppercase italic text-sm leading-tight truncate">{project.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{project.client}</p>
                      </div>
                      <span className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider flex-shrink-0">Pending</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Contract Value</p>
                        <p className="text-sm font-black text-slate-900">${project.totalAmount.toLocaleString()}</p>
                      </div>
                      <div className="bg-blue-50 p-2.5 rounded-xl">
                        <p className="text-[8px] font-black text-blue-600 uppercase">Start Date</p>
                        <p className="text-xs font-bold text-blue-700">{project.startDate || 'Not Set'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Contract</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. End Date</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingProjectsList.map(project => {
                  return (
                    <tr key={project.id} className="hover:bg-amber-50/20 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></div>
                          <p className="text-sm font-black text-[#0a192f] uppercase italic truncate">{project.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-600">{project.client}</td>
                      <td className="px-6 py-5 text-right font-black text-slate-900">${project.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-700">{project.startDate || '—'}</td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-500">{project.estimatedEndDate || '—'}</td>
                      <td className="px-6 py-5">
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full uppercase tracking-wider">
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => setDetailsModal({ show: true, project })}
                          className="p-2 text-slate-300 hover:text-[#0a192f] transition-colors border rounded-lg hover:bg-slate-100"
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingProjects;
