
import React from 'react';
import {
  Home,
  Calculator,
  FileText,
  ArrowUpCircle,
  Search,
  Plus,
  Fish,
  Users,
  LogOut,
  ExternalLink,
  X,
  CalendarDays
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: any) => void;
  onLogout: () => void;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, onLogout, userName, isOpen, onClose }) => {
  const menuItems = [
    { id: 'Home', label: 'Dashboard', icon: Home },
    { id: 'Quotes', label: 'AI Estimator', icon: Calculator },
    { id: 'Invoices', label: 'Invoices', icon: FileText },
    { id: 'Payments Made', label: 'Payment History', icon: ArrowUpCircle },
    { id: 'Schedule', label: 'Schedule', icon: CalendarDays },
  ];

  const adminActions = [
    { id: 'New Contract', label: 'New Contract', icon: Plus },
    { id: 'Project Search', label: 'Project Control', icon: Search },
    { id: 'User Management', label: 'User Settings', icon: Users },
  ];

  const getInitials = (name: string) => {
    return (name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={`w-64 bg-[#0a192f] h-screen flex flex-col text-white fixed left-0 top-0 shadow-2xl border-r border-cyan-900/30 overflow-y-auto z-50 print:hidden transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex items-center justify-between border-b border-cyan-900/30">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500 p-1.5 rounded-lg">
              <Fish className="w-5 h-5 text-[#0a192f]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight leading-none text-cyan-400 uppercase">COASTAL VA</span>
              <span className="text-[10px] font-medium text-gray-400 tracking-widest uppercase">Marine Construction</span>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-white/50 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center text-xl font-bold mb-4 shadow-xl shadow-cyan-500/20 ring-2 ring-cyan-400/30">
            {getInitials(userName)}
          </div>
          <h3 className="text-lg font-semibold text-white">{userName}</h3>
          <p className="text-xs text-cyan-400/70 font-medium uppercase tracking-widest">Administrator</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-4 mb-2">Main Menu</div>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onViewChange(item.id); onClose(); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${activeView === item.id
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                : 'text-gray-400 hover:bg-white/5 hover:text-cyan-400'
                }`}
            >
              <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-white' : 'text-gray-400'}`} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}

          <div className="pt-8 pb-2">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-4 mb-2">Administration</div>
            {adminActions.map((item) => (
              <button
                key={item.id}
                onClick={() => { onViewChange(item.id); onClose(); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${activeView === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-blue-400'
                  }`}
              >
                <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-white' : 'text-gray-400'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 mt-auto border-t border-cyan-900/30 bg-black/10">
          <div className="mb-4 px-4 text-center">
            <a href="https://covamarineconstruction.com" target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-cyan-500 hover:text-cyan-300 uppercase tracking-widest flex items-center justify-center gap-1 transition-colors">
              covamarineconstruction.com <ExternalLink className="w-2 h-2" />
            </a>
          </div>
          <button
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            onClick={onLogout}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
