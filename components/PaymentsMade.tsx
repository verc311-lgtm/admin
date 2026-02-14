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

    // 1. Header
    doc.setFillColor(10, 25, 47); // Navy Blue
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("COASTAL VA MARINE CONSTRUCTION", pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(73, 204, 249);
    doc.text("Payment Receipt", pageWidth / 2, 28, { align: 'center' });

    // 2. Receipt Details
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

    // Highlight Payment Amount clearly
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74); // Green
    doc.setFont("helvetica", "bold");
    doc.text(`AMOUNT PAID: $${payment.amount.toLocaleString()}`, pageWidth - 14, 90, { align: 'right' });

    // 3. Client Info
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

    // 4. Payment Table
    autoTable(doc, {
      startY: 100, // Moved down to accommodate Amount Paid
      head: [['Description', 'Reference', 'Amount Received']],
      body: [
        [`Payment for ${project.name}`, payment.reference || 'N/A', `$${payment.amount.toLocaleString()}`]
      ],
      theme: 'grid', // Changed to grid for better definition
      headStyles: { fillColor: [10, 25, 47], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 50 },
        2: { halign: 'right', fontStyle: 'bold', cellWidth: 40, textColor: [22, 163, 74] }
      },
      styles: { cellPadding: 5 },
      margin: { left: 14, right: 14 }
    });

    // 5. Balance Summary
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const summaryWidth = 100;
    const summaryX = pageWidth - 14 - summaryWidth;
    const rightAlignX = pageWidth - 18;

    // Background for summary
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.roundedRect(summaryX, finalY, summaryWidth, 50, 2, 2, 'FD');

    let currentY = finalY + 12;

    // Header for Summary
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("ACCOUNT SUMMARY", summaryX + 5, currentY - 5);

    // Contract Value
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Total Contract Value:", summaryX + 5, currentY + 3);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`$${project.totalAmount.toLocaleString()}`, rightAlignX, currentY + 3, { align: "right" });

    currentY += 10;

    // Total Paid
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Total Paid to Date:", summaryX + 5, currentY + 3);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74); // Green
    doc.text(`$${project.paidAmount.toLocaleString()}`, rightAlignX, currentY + 3, { align: "right" });

    // Divider line
    currentY += 8;
    doc.setDrawColor(226, 232, 240);
    doc.line(summaryX + 5, currentY, pageWidth - 18, currentY);
    currentY += 10;

    // Remaining Balance
    const pending = project.totalAmount - project.paidAmount;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Remaining Balance:", summaryX + 5, currentY + 3);

    doc.setFontSize(14);
    if (pending > 0.01) { // Tolerance for float errors
      doc.setTextColor(185, 28, 28); // Red
    } else {
      doc.setTextColor(22, 163, 74); // Green
    }
    doc.text(`$${Math.max(0, pending).toLocaleString()}`, rightAlignX, currentY + 3, { align: "right" });

    // 6. Footer
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.setFont("helvetica", "italic");
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.text("Thank you for your payment.", pageWidth / 2, footerY, { align: 'center' });

    doc.save(`Receipt_${receiptNum}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-cyan-50 p-4 rounded-2xl text-cyan-600"><ArrowUpCircle className="w-8 h-8" /></div>
          <div>
            <h2 className="text-2xl font-black text-[#0a192f] uppercase tracking-tighter leading-none italic">Incoming Payments</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Detailed transaction history</p>
          </div>
        </div>
        <button className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-[#0a192f] text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl"><Download className="w-4 h-4" /> Export Ledger</button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.length > 0 ? payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-cyan-50/30 transition-colors group">
                  <td className="px-8 py-6 flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-900">{payment.date}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-[#0a192f] uppercase italic">{payment.projectName}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {payment.projectId.toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6"><span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase">{payment.method}</span></td>
                  <td className="px-8 py-6 text-xs font-mono font-bold text-slate-400 uppercase">{payment.reference || 'N/A'}</td>
                  <td className="px-8 py-6 text-right font-black text-emerald-600 text-lg">${payment.amount.toLocaleString()}</td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => generateReceiptPDF(payment)} className="p-2 text-slate-400 hover:text-[#0a192f] transition-colors border rounded-lg hover:bg-slate-100" title="Download Receipt">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="py-24 text-center text-slate-300 uppercase tracking-widest font-black">No payments recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentsMade;
