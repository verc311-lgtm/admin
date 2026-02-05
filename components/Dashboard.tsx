
import React from 'react';
import { TrendingUp, Briefcase, Clock, Waves, CheckCircle, Wallet, Anchor, BarChart3, Fish, AlertCircle } from 'lucide-react';
import { Project, Payment, Invoice } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  projects: Project[];
  payments: Payment[];
  invoices: Invoice[];
}

const Dashboard: React.FC<DashboardProps> = ({ projects, payments, invoices }) => {
  const totalRevenue = projects.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalPaid = projects.reduce((acc, p) => acc + p.paidAmount, 0);
  const totalExpenses = projects.reduce((acc, p) => acc + (p.totalExpenses || 0), 0);
  const totalProfit = totalPaid - totalExpenses;
  
  // Calculate Accounts Receivable (Unpaid Invoices)
  const pendingReceivables = invoices
    .filter(inv => inv.status !== 'Paid')
    .reduce((acc, inv) => acc + inv.amount, 0);
  
  const finishedProjects = projects.filter(p => p.status === 'Finished');

  const chartData = projects.slice(0, 6).map(p => ({
    name: p.name.length > 12 ? p.name.substring(0, 10) + '..' : p.name,
    paid: p.paidAmount,
    expenses: p.totalExpenses || 0,
    profit: Math.max(0, p.paidAmount - (p.totalExpenses || 0))
  }));

  const stats = [
    { label: 'Total Contracted', value: `$${totalRevenue.toLocaleString()}`, icon: Briefcase, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100' },
    { label: 'Payments Received', value: `$${totalPaid.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Pending Receivables', value: `$${pendingReceivables.toLocaleString()}`, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'Net Profit', value: `$${totalProfit.toLocaleString()}`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ];

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] text-center space-y-8 animate-in fade-in duration-700">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-cyan-50 relative rotate-1">
           <Waves className="w-24 h-24 text-cyan-200 animate-pulse" />
           <Fish className="absolute -bottom-4 -right-4 w-12 h-12 text-cyan-400 rotate-12" />
        </div>
        <div className="space-y-3">
          <h2 className="text-4xl font-black text-[#0a192f] uppercase tracking-tighter italic leading-none">CoastalVA Control System</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs max-w-sm mx-auto leading-relaxed">Welcome to the command center. No projects registered yet. Start a new contract to begin financial tracking.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white p-10 rounded-[3rem] shadow-sm border-2 ${stat.border} flex flex-col gap-6 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group`}>
            <div className={`${stat.bg} ${stat.color} w-16 h-16 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
              <p className="text-3xl font-black text-[#0a192f] leading-none italic tracking-tighter">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-2xl font-black text-[#0a192f] uppercase tracking-tighter italic leading-none">Operations Analysis</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Profitability per Project</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl">
               <BarChart3 className="w-8 h-8 text-[#0a192f]" />
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} dy={15} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#f8fafc', radius: 10}}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 40px 80px -15px rgb(0 0 0 / 0.2)', padding: '20px' }}
                />
                <Bar dataKey="paid" name="Revenue" fill="#0ea5e9" radius={[12, 12, 12, 12]} barSize={35} />
                <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[12, 12, 12, 12]} barSize={35} />
                <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[12, 12, 12, 12]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 flex justify-center gap-8 border-t border-slate-50 pt-8">
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</span></div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expenses</span></div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profit</span></div>
          </div>
        </div>

        <div className="bg-[#0a192f] p-12 rounded-[4rem] shadow-2xl flex flex-col relative overflow-hidden ring-8 ring-white">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <Anchor className="w-48 h-48 text-white rotate-12" />
          </div>
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none mb-10 relative z-10">Completed Jobs</h3>
          
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 relative z-10 custom-scrollbar">
            {finishedProjects.length > 0 ? finishedProjects.map(project => (
              <div key={project.id} className="p-8 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/10 flex flex-col hover:bg-white/10 transition-all group">
                <div className="flex justify-between items-start mb-4">
                   <h4 className="font-black text-white text-base italic uppercase tracking-tighter leading-tight group-hover:text-cyan-400 transition-colors">{project.name}</h4>
                   <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-widest mb-6">
                   <div className="text-white/40">Income: <span className="text-white font-black block mt-1 text-sm">${project.paidAmount.toLocaleString()}</span></div>
                   <div className="text-white/40">Cost: <span className="text-white font-black block mt-1 text-sm">${project.totalExpenses.toLocaleString()}</span></div>
                </div>
                <div className="mt-auto pt-6 border-t border-white/10 flex justify-between items-center">
                   <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Net Gain:</span>
                   <span className="text-2xl font-black text-emerald-400 tracking-tighter italic">
                      ${(project.paidAmount - project.totalExpenses).toLocaleString()}
                   </span>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-30">
                 <Clock className="w-16 h-16 text-white mb-4" />
                 <p className="text-white font-black uppercase tracking-widest text-[10px]">Awaiting active project closure</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
