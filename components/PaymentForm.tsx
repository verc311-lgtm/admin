
import React, { useState } from 'react';
import { DollarSign, Calendar, Hash, Save, X, Waves } from 'lucide-react';
import { Payment, PaymentMethod, Project } from '../types';

interface PaymentFormProps {
  project: Project;
  invoiceId?: string;
  onSave: (payment: Omit<Payment, 'id' | 'projectName'>) => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ project, invoiceId, onSave, onCancel }) => {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('Zelle');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }
    onSave({ projectId: project.id, invoiceId, amount, method, reference, date });
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden max-w-xl mx-auto ring-1 ring-black/5">
      <div className="p-10 bg-gradient-to-br from-[#0a192f] to-[#1a365d] text-white flex justify-between items-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">Receive Payment</h2>
          <p className="text-cyan-400 font-bold text-sm mt-1">{project.name}</p>
        </div>
        <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
      </div>
      <div className="p-8 border-b bg-cyan-50/30">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-cyan-700 uppercase tracking-widest">Total Outstanding</span>
          <span className="text-3xl font-black text-slate-900 font-mono tracking-tighter italic">${project.balance.toLocaleString()}</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-10 space-y-8">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Payment Amount</label>
          <div className="relative">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-600 text-2xl font-black italic">$</span>
            <input type="number" required className="w-full pl-12 pr-6 py-6 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:border-cyan-400 outline-none transition-all text-3xl font-black text-slate-900" placeholder="0.00" value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Payment Method</label>
          <div className="grid grid-cols-3 gap-3">
            {(['Zelle', 'Cash', 'Check', 'Bank Transfer', 'Credit Card'] as PaymentMethod[]).map(m => (
              <button key={m} type="button" onClick={() => setMethod(m)} className={`py-4 px-2 text-[10px] font-black rounded-2xl border-2 transition-all uppercase ${method === m ? 'bg-cyan-600 border-cyan-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>{m}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Date</label>
            <input type="date" required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-cyan-400 outline-none transition-all font-bold text-slate-700" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Reference / TXN ID</label>
            <input type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-cyan-400 outline-none transition-all font-bold text-slate-700" placeholder="TXN Reference" value={reference} onChange={e => setReference(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="w-full py-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-3xl font-black text-xl shadow-2xl transition-all uppercase tracking-widest active:scale-95"><Save className="w-7 h-7 inline-block mr-3" /> REGISTER PAYMENT</button>
      </form>
    </div>
  );
};

export default PaymentForm;
