
import React, { useState } from 'react';
import { Save, X, DollarSign, User, Briefcase, Anchor } from 'lucide-react';

const NewContract = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    totalAmount: 0,
    startDate: new Date().toISOString().split('T')[0],
    status: 'In Progress'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.client || formData.totalAmount <= 0) {
      alert("Please fill in all required fields.");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden max-w-3xl mx-auto">
      <div className="p-8 border-b border-gray-50 bg-[#0a192f] text-white flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-400 p-3 rounded-2xl">
            <Anchor className="w-7 h-7 text-[#0a192f]" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight uppercase">New Service Contract</h2>
            <p className="text-cyan-400 text-[10px] font-bold tracking-[0.3em] uppercase">CoastalVA Marine Construction</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors">
          <X className="w-8 h-8" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-600 w-5 h-5" />
              <input type="text" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-cyan-400 transition-all outline-none font-semibold text-slate-700" placeholder="e.g. Virginia Beach Dock" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-600 w-5 h-5" />
              <input type="text" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-cyan-400 transition-all outline-none font-semibold text-slate-700" placeholder="Client Name" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contract Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-600 w-5 h-5" />
              <input type="number" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-cyan-400 transition-all outline-none font-bold text-slate-900 text-xl" placeholder="0.00" value={formData.totalAmount || ''} onChange={e => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Signing Date</label>
            <input type="date" required className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:bg-white focus:border-cyan-400 transition-all outline-none font-semibold text-slate-700" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
          </div>
        </div>
        <div className="pt-10 flex gap-4">
          <button type="button" onClick={onCancel} className="flex-1 px-8 py-4 border-2 border-slate-100 text-slate-400 rounded-2xl hover:bg-slate-50 transition-colors font-black uppercase tracking-widest">Discard</button>
          <button type="submit" className="flex-1 px-8 py-4 bg-cyan-600 text-white rounded-2xl hover:bg-cyan-500 shadow-2xl transition-all font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95"><Save className="w-6 h-6" /> Save Contract</button>
        </div>
      </form>
    </div>
  );
};

export default NewContract;
