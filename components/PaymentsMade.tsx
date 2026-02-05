
import React from 'react';
import { ArrowUpCircle, Calendar, Hash, Waves, Download } from 'lucide-react';
import { Payment } from '../types';

interface PaymentsMadeProps {
  payments: Payment[];
}

const PaymentsMade: React.FC<PaymentsMadeProps> = ({ payments }) => {
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
                </tr>
              )) : (
                <tr><td colSpan={5} className="py-24 text-center text-slate-300 uppercase tracking-widest font-black">No payments recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentsMade;
