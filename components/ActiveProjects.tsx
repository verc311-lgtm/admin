import React, { useState } from 'react';
import { Search, ChevronRight, Download, X, FileText, FilePlus, Wallet, Anchor, TrendingUp, DollarSign } from 'lucide-react';
import { Project, Invoice, Payment, ExpenseCategory } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ActiveProjectsProps {
  projects: Project[];
  invoices: Invoice[];
  payments: Payment[];
  onAddPayment?: (projectId: string, invoiceId?: string) => void;
  onAddExpense?: (projectId: string, expense: { category: ExpenseCategory, amount: number, note: string }) => void;
  onChangeOrder?: (projectId: string, amount: number) => void;
  onGenerateNewInvoice?: (project: Project) => void;
}

const ActiveProjects: React.FC<ActiveProjectsProps> = ({ 
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

  // Active Projects filter: Received first payment (paidAmount > 0) AND has outstanding balance (balance > 0)
  const activeProjectsList = projects
    .filter(p => p.status !== 'Finished' && p.paidAmount > 0 && p.balance > 0)
    .filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getLastPayment = (projectId: string) => {
    const projectPayments = payments.filter(pay => pay.projectId === projectId && pay.method !== 'Discount');
    if (projectPayments.length === 0) return null;
    return projectPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  const getProfitPercent = (p: Project) => {
    if (p.totalAmount === 0) return 0;
    return ((p.totalAmount - p.totalExpenses) / p.totalAmount) * 100;
  };

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
    doc.text("Project Financial Report — Active", pageWidth / 2, 28, { align: 'center' });

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

    const profitPercent = getProfitPercent(project);
    const summaryData = [
      ['Total Contract Value', `$${project.totalAmount.toLocaleString()}`],
      ['Payments Received', `$${project.paidAmount.toLocaleString()}`],
      ['Outstanding Balance', `$${project.balance.toLocaleString()}`],
      ['Total Expenses', `$${(project.totalExpenses || 0).toLocaleString()}`],
      ['Estimated Net Profit', `$${project.profit.toLocaleString()}`],
      ['Profit Margin', `${profitPercent.toFixed(2)}%`]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [14, 116, 144], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right' } },
      margin: { left: 14, right: 14 }
    });

    // Payment History
    const projectPayments = payments.filter(pay => pay.projectId === project.id);
    if (projectPayments.length > 0) {
      yPos = (doc as any).lastAutoTable.finalY + 15;
      doc.text("Payment History", 14, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Method', 'Amount']],
        body: projectPayments.map(p => [p.date, p.method, `$${p.amount.toLocaleString()}`]),
        theme: 'striped',
        headStyles: { fillColor: [10, 25, 47], textColor: 255 },
        columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
      });
    }

    doc.save(`Active_${project.name.replace(/\s+/g, '_')}.pdf`);
  };

  // Totals
  const totalContract = activeProjectsList.reduce((s, p) => s + p.totalAmount, 0);
  const totalReceived = activeProjectsList.reduce((s, p) => s + p.paidAmount, 0);
  const totalBalance = activeProjectsList.reduce((s, p) => s + p.balance, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Details Modal */}
      {detailsModal.show && detailsModal.project && (() => {
        const p = detailsModal.project;
        const projectPayments = payments.filter(pay => pay.projectId === p.id);
        const projectInvoices = invoices.filter(inv => inv.projectId === p.id);
        const profitPercent = getProfitPercent(p);
        const expensesByCategory = getExpensesByCategory(p.expensesList || []);

        return (
          <div className="fixed inset-0 bg-[#0a192f]/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6">
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-4xl p-8 md:p-12 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-8 md:mb-10 border-b pb-6">
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-[#0a192f] tracking-tighter uppercase italic">{p.name}</h3>
                  <p className="text-cyan-600 font-bold uppercase tracking-widest text-[10px] mt-1">Active Project — {p.client}</p>
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
                <div className="bg-cyan-50 p-5 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-cyan-600 tracking-widest">Balance Due</p>
                  <p className="text-xl font-black text-cyan-700">${p.balance.toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 p-5 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Profit Margin</p>
                  <p className="text-xl font-black">{profitPercent.toFixed(1)}%</p>
                </div>
              </div>

              {/* Payment Actions & History */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-black uppercase italic flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-600" /> Payment History</h4>
                  {onAddPayment && (
                    <button 
                      onClick={() => { 
                        setDetailsModal({ show: false, project: null }); 
                        onAddPayment(p.id); 
                      }} 
                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Record Payment
                    </button>
                  )}
                </div>
                {projectPayments.length > 0 ? (
                  <div className="bg-slate-50 rounded-2xl overflow-hidden border">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/50">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Method</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {projectPayments.map(pay => (
                          <tr key={pay.id} className="hover:bg-white transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-slate-500">{pay.date}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase ${pay.method === 'Discount' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                {pay.method}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-right font-black ${pay.method === 'Discount' ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {pay.method === 'Discount' ? '-' : ''}${pay.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-sm bg-slate-50 p-4 rounded-xl border">No payments recorded yet.</p>
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
          <div className="bg-cyan-100 p-3 rounded-2xl">
            <TrendingUp className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-[#0a192f] uppercase tracking-tighter italic leading-none">Active Projects</h2>
            <p className="text-cyan-600 text-[10px] font-bold uppercase tracking-widest mt-0.5">{activeProjectsList.length} active project{activeProjectsList.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-cyan-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by active project or client..." 
            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 outline-none font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-cyan-50 transition-all text-sm" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#0a192f] to-slate-800 p-6 rounded-[2rem] text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-2">Active Contract Value</p>
          <p className="text-3xl font-black">${totalContract.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-[2rem] text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 mb-2">Total Received</p>
          <p className="text-3xl font-black">${totalReceived.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 rounded-[2rem] text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-100 mb-2">Outstanding Balance</p>
          <p className="text-3xl font-black">${totalBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Main Table / Cards */}
      {activeProjectsList.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] shadow-sm border p-16 text-center">
          <p className="text-slate-300 text-lg font-bold">No active projects found</p>
          <p className="text-slate-400 text-sm mt-2">Projects that received a first payment and have an outstanding balance will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">

          {/* Mobile Cards */}
          <div className="md:hidden p-4 space-y-3">
            {activeProjectsList.map(project => {
              const lastPayment = getLastPayment(project.id);
              const profitPercent = getProfitPercent(project);

              return (
                <div 
                  key={project.id} 
                  onClick={() => setDetailsModal({ show: true, project })} 
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="h-1 bg-cyan-500" />
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-black text-[#0a192f] uppercase italic text-sm leading-tight truncate">{project.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{project.client}</p>
                      </div>
                      <span className="bg-cyan-100 text-cyan-700 text-[8px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider flex-shrink-0">Active</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Contract</p>
                        <p className="text-sm font-black text-slate-900">${project.totalAmount.toLocaleString()}</p>
                      </div>
                      <div className="bg-emerald-50 p-2.5 rounded-xl">
                        <p className="text-[8px] font-black text-emerald-600 uppercase">Received</p>
                        <p className="text-sm font-black text-emerald-700">${project.paidAmount.toLocaleString()}</p>
                      </div>
                      <div className="bg-cyan-50 p-2.5 rounded-xl">
                        <p className="text-[8px] font-black text-cyan-600 uppercase">Balance</p>
                        <p className="text-sm font-black text-cyan-700">${project.balance.toLocaleString()}</p>
                      </div>
                    </div>
                    {lastPayment && (
                      <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase">Last Payment</p>
                          <p className="text-xs font-bold text-slate-600">{lastPayment.date} · <span className="text-blue-600">{lastPayment.method}</span></p>
                        </div>
                        <p className="text-sm font-black text-emerald-600">${lastPayment.amount.toLocaleString()}</p>
                      </div>
                    )}
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
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Paid</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Profit Margin</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Payment</th>
                  <th className="px-6 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeProjectsList.map(project => {
                  const lastPayment = getLastPayment(project.id);
                  const profitPercent = getProfitPercent(project);

                  return (
                    <tr key={project.id} className="hover:bg-cyan-50/20 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0"></div>
                          <p className="text-sm font-black text-[#0a192f] uppercase italic truncate">{project.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-600">{project.client}</td>
                      <td className="px-6 py-5 text-right font-black text-slate-900">${project.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-5 text-right font-black text-emerald-600">${project.paidAmount.toLocaleString()}</td>
                      <td className="px-6 py-5 text-right font-black text-cyan-600">${project.balance.toLocaleString()}</td>
                      <td className="px-6 py-5 text-right">
                        <span className={`font-black ${profitPercent >= 30 ? 'text-emerald-600' : profitPercent >= 15 ? 'text-amber-600' : 'text-red-500'}`}>
                          {profitPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {lastPayment ? (
                          <div>
                            <p className="text-sm font-bold text-slate-700">{lastPayment.date}</p>
                            <p className="text-[10px] text-emerald-600 font-black">${lastPayment.amount.toLocaleString()}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
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

export default ActiveProjects;
