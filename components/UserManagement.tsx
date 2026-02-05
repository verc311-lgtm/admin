
import React, { useState, useRef } from 'react';
import { Users, UserPlus, Shield, Mail, Trash2, X, Save, Key, Lock, Database, Download, Upload, FileJson } from 'lucide-react';
import { User, Project, Payment, Invoice } from '../types';

interface UserManagementProps {
  users: User[];
  projects: Project[];
  payments: Payment[];
  invoices: Invoice[];
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onDeleteUser: (userId: string) => void;
  onImportData: (data: any) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, projects, payments, invoices, onAddUser, onDeleteUser, onImportData }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<{ name: string, username: string, password: string, role: 'Admin' | 'Editor' | 'Viewer' }>({
    name: '',
    username: '',
    password: '',
    role: 'Editor'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) {
      alert("All fields are required.");
      return;
    }
    if (formData.password.length < 4) {
      alert("Password must be at least 4 characters.");
      return;
    }
    onAddUser(formData);
    setFormData({ name: '', username: '', password: '', role: 'Editor' });
    setShowModal(false);
  };

  const handleExport = () => {
    const database = {
      projects,
      payments,
      invoices,
      users,
      exportDate: new Date().toISOString(),
      version: "6.0"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(database));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `CoastalVA_DB_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportData(json);
      } catch (err) {
        alert("Invalid file format. Please upload a valid CoastalVA JSON backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleSync = async () => {
    const database = {
      projects,
      payments,
      invoices,
      users,
      exportDate: new Date().toISOString()
    };

    try {
      const response = await fetch('/api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(database),
      });

      const result = await response.json();
      if (response.ok) {
        alert("Sync Successful: " + (result.message || "Data saved to Cloud (Supabase)."));
      } else {
        alert("Sync Failed: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      alert("Sync Error: Could not reach backend. Make sure the PHP server is running.");
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {showModal && (
        <div className="fixed inset-0 bg-[#0a192f]/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[4rem] w-full max-w-xl p-16 shadow-2xl relative">
            <div className="flex justify-between items-center mb-12">
              <div>
                <h3 className="text-4xl font-black text-[#0a192f] uppercase italic">Add Operator</h3>
                <p className="text-cyan-600 font-black text-xs uppercase tracking-widest mt-2">Security Credentials</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-red-500 transition-all"><X className="w-10 h-10" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <Users className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-600 w-6 h-6" />
                  <input type="text" required className="w-full pl-16 pr-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-[2rem] focus:border-cyan-400 outline-none font-black text-xl text-slate-700" placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">User ID</label>
                  <input type="text" required className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-[2rem] focus:border-cyan-400 outline-none font-black text-xl text-slate-700" placeholder="jdoe" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input type="password" required className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-[2rem] focus:border-cyan-400 outline-none font-black text-xl text-slate-700" placeholder="••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Role</label>
                <select className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-50 rounded-[2rem] focus:border-cyan-400 outline-none font-black text-xl text-slate-700 appearance-none" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}>
                  <option value="Admin">Admin (Full Access)</option>
                  <option value="Editor">Editor (Project Manager)</option>
                  <option value="Viewer">Viewer (Read Only)</option>
                </select>
              </div>
              <button type="submit" className="w-full py-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95"><Save className="w-7 h-7 inline-block mr-3" /> CREATE USER</button>
            </form>
          </div>
        </div>
      )}

      {/* Database Management Section */}
      <div className="bg-[#0a192f] p-12 rounded-[3.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden ring-8 ring-white">
        <div className="absolute top-0 left-0 p-10 opacity-5 pointer-events-none">
          <Database className="w-40 h-40 text-cyan-400" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-tight">Database Management</h2>
          <p className="text-cyan-400/60 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Export, Import or Backup all company records</p>
        </div>
        <div className="flex flex-wrap gap-4 relative z-10">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <button
            onClick={handleExport}
            className="flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black rounded-[1.5rem] text-[10px] uppercase tracking-widest transition-all shadow-xl"
          >
            <Download className="w-4 h-4 text-cyan-400" /> Export All Data
          </button>
          <button
            onClick={handleImportClick}
            className="flex items-center gap-3 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-[1.5rem] text-[10px] uppercase tracking-widest transition-all shadow-xl"
          >
            <Upload className="w-4 h-4" /> Import Backup
          </button>
          <button
            onClick={handleSync}
            className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-[1.5rem] text-[10px] uppercase tracking-widest transition-all shadow-xl"
          >
            <Database className="w-4 h-4" /> Sync to Cloud
          </button>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="bg-blue-50 p-6 rounded-3xl text-blue-600"><Users className="w-10 h-10" /></div>
          <div>
            <h2 className="text-3xl font-black text-[#0a192f] uppercase tracking-tighter italic">Administrative Access</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">CoastalVA security levels</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-4 px-10 py-5 bg-[#0a192f] text-white font-black rounded-[2rem] text-xs uppercase shadow-2xl active:scale-95"><UserPlus className="w-6 h-6 text-cyan-400" /> ADD USER</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {users.map(user => (
          <div key={user.id} className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 relative group hover:shadow-2xl transition-all duration-500">
            <button onClick={() => onDeleteUser(user.id)} className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 p-3 text-slate-300 hover:text-red-500 transition-all"><Trash2 className="w-6 h-6" /></button>
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8"><Shield className={`w-12 h-12 ${user.role === 'Admin' ? 'text-cyan-600' : 'text-slate-300'}`} /></div>
            <h3 className="text-2xl font-black text-[#0a192f] tracking-tighter uppercase italic leading-tight">{user.name}</h3>
            <p className="text-sm font-black text-cyan-600 uppercase tracking-widest mb-6">{user.role}</p>
            <div className="pt-6 border-t border-slate-50 space-y-4">
              <div className="flex items-center gap-4 text-slate-400 font-black uppercase text-[10px]">
                <Mail className="w-4 h-4" /> <span>{user.username}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-400 font-black uppercase text-[10px]">
                <Key className="w-4 h-4" /> <span>••••••••</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
