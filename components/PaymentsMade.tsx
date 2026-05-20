import React from 'react';
import { ArrowUpCircle, Calendar, Download } from 'lucide-react';
import { Payment, Project } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PaymentsMadeProps {
  payments: Payment[];
  projects: Project[];
}

const PaymentsMade: React.FC<PaymentsMadeProps> = ({ payments, projects }) => {

  const generateReceiptPDF = (payment: Payment) => {
    const project = projects.find(p => p.id === payment.projectId) || { name: payment.projectName, client: 'N/A', totalAmount: 0, paidAmount: 0 } as Project;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(10, 25, 47);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("COASTAL VA MARINE CONSTRUCTION", pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(73, 204, 249);
    doc.text("Payment Receipt", pageWidth / 2, 28, { align: 'center' });

    doc.setTextColor(0);
    doc.setFontSize(30);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 200, 200);
    doc.text("RECEIPT", pageWidth - 14, 60, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    const receiptNum = `RCPT-${payment.date.replace(/-/g, '')}-${payment.amount.toFixed(0)}`;
    doc.text(`Receipt #: ${receiptNum}`, pageWidth - 14, 70, { align: 'right' });
    doc.text(`Date: ${payment.date}`, pageWidth - 14, 75, { align: 'right' });
    doc.text(`Method: ${payment.method}`, pageWidth - 14, 80, { align: 'right' });

    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.setFont("helvetica", "bold");
    doc.text(`AMOUNT PAID: $${payment.amount.toLocaleString()}`, pageWidth - 14, 90, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 25, 47);
    doc.text("Received From:", 14, 60);

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(project.client || 'Valued Client', 14, 68);

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Project: ${project.name}`, 14, 75);

    autoTable(doc, {
      startY: 100,
      head: [['Description', 'Reference', 'Amount Received']],
      body: [
        [`Payment for ${project.name}`, payment.reference || 'N/A', `$${payment.amount.toLocaleString()}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [10, 25, 47], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 50 },
        2: { halign: 'right', fontStyle: 'bold', cellWidth: 40, textColor: [22, 163, 74] }
      },
      styles: { cellPadding: 5 },
      margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const summaryWidth = 100;
    const summaryX = pageWidth - 14 - summaryWidth;
    const rightAlignX = pageWidth - 18;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(summaryX, finalY, summaryWidth, 50, 2, 2, 'FD');

    let currentY = finalY + 12;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("ACCOUNT SUMMARY", summaryX + 5, currentY - 5);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Total Contract Value:", summaryX + 5, currentY + 3);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`$${project.totalAmount.toLocaleString()}`, rightAlignX, currentY + 3, { align: "right" });

    currentY += 10;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Total Paid to Date:", summaryX + 5, currentY + 3);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text(`$${project.paidAmount.toLocaleString()}`, rightAlignX, currentY + 3, { align: "right" });

    currentY += 8;
    doc.setDrawColor(226, 232, 240);
    doc.line(summaryX + 5, currentY, pageWidth - 18, currentY);
    currentY += 10;

    const pending = project.totalAmount - project.paidAmount;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Remaining Balance:", summaryX + 5, currentY + 3);

    doc.setFontSize(14);
    if (pending > 0.01) {
      doc.setTextColor(185, 28, 28);
    } else {
      doc.setTextColor(22, 163, 74);
    }
    doc.text(`$${Math.max(0, pending).toLocaleString()}`, rightAlignX, currentY + 3, { align: "right" });

    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.setFont("helvetica", "italic");
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.text("Thank you for your payment.", pageWidth / 2, footerY, { align: 'center' });

    doc.save(`Receipt_${receiptNum}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 px-2 sm:px-4 md:px-6">

      {/* Header */}
      <div className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-50 p-3 md:p-4 rounded-2xl text-cyan-600"><ArrowUpCircle className="w-6 h-6 md:w-8 md:h-8" /></div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-[#0a192f] uppercase tracking-tighter leading-none italic">Incoming Payments</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Detailed transaction history</p>
          </div>
        </div>
        <button className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#0a192f] text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl">
          <Download className="w-4 h-4" /> Export Ledger
        </button>
      </div>

      {/* ── MOBILE: Cards — no scrolling needed ── */}
      <div className="md:hidden space-y-3">
        {payments.length > 0 ? payments.map((payment) => {
          const isDiscount = payment.method === 'Discount';
          return (
            <div key={payment.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Accent top bar: amber for discount, emerald for payment */}
              <div className={`h-1 ${isDiscount ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <div className="p-4">
                {/* Row 1: name + amount */}
                <div className="flex justify-between items-start gap-2 mb-3">
                  <p className="font-black text-[#0a192f] uppercase italic text-sm leading-tight flex-1 min-w-0 pr-2">{payment.projectName}</p>
                  <span className={`text-lg font-black flex-shrink-0 ${isDiscount ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {isDiscount ? '-' : ''}${payment.amount.toLocaleString()}
                  </span>
                </div>
                {/* Row 2: date + method */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">{payment.date}</span>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase border ${
                    isDiscount
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-600 border-transparent'
                  }`}>{payment.method}</span>
                  {payment.reference && <span className="text-[10px] font-mono text-slate-400">{payment.reference}</span>}
                </div>
                {/* Row 3: receipt button (only for real payments) */}
                {!isDiscount && (
                  <div className="flex justify-end border-t border-slate-100 pt-3">
                    <button onClick={() => generateReceiptPDF(payment)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-[#0a192f] border rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
                      <Download className="w-3.5 h-3.5" /> Receipt
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-300 font-black uppercase tracking-widest text-sm">
            No payments recorded yet
          </div>
        )}
      </div>

      {/* ── DESKTOP: Table ── */}
      <div className="hidden md:block bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-left table-fixed min-w-[900px] lg:min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 lg:px-6 xl:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[14%]">Date</th>
              <th className="px-4 lg:px-6 xl:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[38%]">Project Name</th>
              <th className="px-4 lg:px-6 xl:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[12%]">Method</th>
              <th className="px-4 lg:px-6 xl:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[18%]">Reference</th>
              <th className="px-4 lg:px-6 xl:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-[13%]">Amount</th>
              <th className="px-4 lg:px-6 xl:px-8 py-5 w-[5%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payments.length > 0 ? payments.map((payment) => {
              const isDiscount = payment.method === 'Discount';
              return (
              <tr key={payment.id} className={`hover:bg-cyan-50/30 transition-colors group ${isDiscount ? 'bg-amber-50/20' : ''}`}>
                <td className="px-4 lg:px-6 xl:px-8 py-4 lg:py-6 flex items-center gap-3 truncate">
                  <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-bold text-slate-900 truncate">{payment.date}</span>
                </td>
                <td className="px-4 lg:px-6 xl:px-8 py-4 lg:py-6">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black text-[#0a192f] uppercase italic truncate" title={payment.projectName}>{payment.projectName}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">ID: {payment.projectId.toUpperCase()}</span>
                  </div>
                </td>
                <td className="px-4 lg:px-6 xl:px-8 py-4 lg:py-6">
                  <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase inline-block truncate border ${
                    isDiscount
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-600 border-transparent'
                  }`}>{payment.method}</span>
                </td>
                <td className="px-4 lg:px-6 xl:px-8 py-4 lg:py-6 text-xs font-mono font-bold text-slate-400 uppercase truncate" title={payment.reference || 'N/A'}>{payment.reference || 'N/A'}</td>
                <td className={`px-4 lg:px-6 xl:px-8 py-4 lg:py-6 text-right font-black text-base lg:text-lg whitespace-nowrap ${
                  isDiscount ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {isDiscount ? '-' : ''}${payment.amount.toLocaleString()}
                </td>
                <td className="px-4 lg:px-6 xl:px-8 py-4 lg:py-6 text-right">
                  {!isDiscount ? (
                    <button onClick={() => generateReceiptPDF(payment)} className="p-2 text-slate-400 hover:text-[#0a192f] transition-colors border rounded-lg hover:bg-slate-100 inline-flex items-center justify-center" title="Download Receipt">
                      <Download className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider px-2">DCTO</span>
                  )}
                </td>
              </tr>
              );
            }) : (
              <tr><td colSpan={6} className="py-24 text-center text-slate-300 uppercase tracking-widest font-black">No payments recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentsMade;
