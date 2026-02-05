import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import ProjectSearch from './components/ProjectSearch.tsx';
import NewContract from './components/NewContract.tsx';
import PaymentsMade from './components/PaymentsMade.tsx';
import UserManagement from './components/UserManagement.tsx';
import InvoiceView from './components/InvoiceView.tsx';
import PaymentForm from './components/PaymentForm.tsx';
import { User, Project, Payment, Invoice, View, Expense, ExpenseCategory } from './types.ts';
import { HardDrive, ShieldCheck, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<View>('Home');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // State for synchronization
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Navigation and Selection states
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null);
  const [selectedProjectForInvoice, setSelectedProjectForInvoice] = useState<Project | null>(null);
  const [selectedProjectForPayment, setSelectedProjectForPayment] = useState<{ project: Project, invoiceId?: string } | null>(null);

  // Initial Empty State
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // API Configuration
  const API_URL = import.meta.env.PROD ? '/api.php' : 'http://localhost:8000/api.php';

  // 1. Fetch Data on Load
  useEffect(() => {
    const fetchData = async () => {
      setIsSyncing(true);
      setSyncError(false);
      try {
        const response = await fetch(API_URL);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setProjects(data.projects || []);
            setPayments(data.payments || []);
            setInvoices(data.invoices || []);
            setUsers(data.users || []);
            setLastSync(new Date());
          }
        } else {
          console.error("Failed to fetch data", response.statusText);
          setSyncError(true);
        }
      } catch (error) {
        console.error("Error connecting to API:", error);
        setSyncError(true);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchData();
  }, []);

  // 2. Save Data function
  const saveData = async () => {
    setIsSyncing(true);
    setSyncError(false);
    try {
      const payload = {
        projects,
        payments,
        invoices,
        users
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setLastSync(new Date());
        console.log("Data saved successfully");
      } else {
        console.error("Failed to save data");
        setSyncError(true);
      }
    } catch (error) {
      console.error("Error saving data:", error);
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-save effect (Debounced 2 seconds)
  useEffect(() => {
    if (projects.length === 0 && users.length === 0) return;

    const timer = setTimeout(() => {
      saveData();
    }, 2000);

    return () => clearTimeout(timer);
  }, [projects, payments, invoices, users]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);

    if (user) {
      setIsAuthenticated(true);
    } else {
      alert('Access Denied. Invalid credentials.');
    }
  };

  const handleAddPayment = (paymentData: Omit<Payment, 'id' | 'projectName'>) => {
    const project = projects.find(p => p.id === paymentData.projectId);
    if (!project) return;

    const newPayment: Payment = {
      ...paymentData,
      id: Math.random().toString(36).substring(2, 9),
      projectName: project.name
    };

    const updatedProjects = projects.map(p => {
      if (p.id === paymentData.projectId) {
        const newPaid = p.paidAmount + paymentData.amount;
        const newBalance = p.totalAmount - newPaid;
        return {
          ...p,
          paidAmount: newPaid,
          balance: newBalance,
          status: (newBalance <= 0 ? 'Finished' : p.status) as any
        };
      }
      return p;
    });

    const updatedInvoices = invoices.map(inv => {
      if (paymentData.invoiceId && inv.id === paymentData.invoiceId) {
        return { ...inv, status: 'Paid' as any };
      }
      return inv;
    });

    setPayments([newPayment, ...payments]);
    setProjects(updatedProjects);
    setInvoices(updatedInvoices);
    setSelectedProjectForPayment(null);
    setActiveView('Payments Made');
  };

  const handleAddExpense = (projectId: string, expenseData: { category: ExpenseCategory, amount: number, note: string }) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const newExpense: Expense = {
          id: Math.random().toString(36).substring(2, 9),
          date: new Date().toISOString().split('T')[0],
          ...expenseData
        };
        const currentList = p.expensesList || [];
        const updatedList = [newExpense, ...currentList];
        const newTotalExpenses = updatedList.reduce((sum, item) => sum + item.amount, 0);

        return {
          ...p,
          expensesList: updatedList,
          totalExpenses: newTotalExpenses,
          profit: p.totalAmount - newTotalExpenses
        };
      }
      return p;
    }));
  };

  const handleChangeOrder = (projectId: string, amount: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const newTotal = p.totalAmount + amount;
        return { ...p, totalAmount: newTotal, balance: newTotal - p.paidAmount, profit: newTotal - p.totalExpenses };
      }
      return p;
    }));
  };

  const handleGenerateInvoice = (invoiceData: Omit<Invoice, 'id'>) => {
    const newInvoice: Invoice = { ...invoiceData, id: Math.random().toString(36).substring(2, 9) };
    setInvoices(prev => [newInvoice, ...prev]);
  };

  const navigateToInvoice = (project?: Project, invoice?: Invoice) => {
    setSelectedProjectForInvoice(project || null);
    setSelectedInvoiceForView(invoice || null);
    setActiveView('Invoices');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a192f] flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="p-10 bg-[#0a192f] text-center border-b-4 border-cyan-400">
            <div className="bg-cyan-500 p-3 rounded-2xl inline-block mb-4">
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">COASTAL VA</h1>
            <p className="text-cyan-400 text-[10px] font-bold tracking-[0.4em] uppercase mt-2">Marine Construction System</p>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-4">
            <input
              type="text" required
              className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-cyan-400 rounded-2xl outline-none font-bold text-slate-700"
              placeholder="Username"
              value={loginForm.username}
              onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
            />
            <input
              type="password" required
              className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-cyan-400 rounded-2xl outline-none font-bold text-slate-700"
              placeholder="Password"
              value={loginForm.password}
              onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
            />
            <button type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95">Log In</button>
            <p className="text-[8px] text-slate-400 font-bold uppercase text-center mt-6 tracking-widest">Coastal VA Operations Command</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar
        activeView={activeView}
        onViewChange={(v) => {
          setActiveView(v);
          setSelectedInvoiceForView(null);
          setSelectedProjectForInvoice(null);
        }}
        onLogout={() => setIsAuthenticated(false)}
        userName="Administrator"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="md:ml-64 p-4 md:p-10 min-h-screen transition-all duration-300">
        <header className="flex justify-between items-center mb-8 md:mb-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-white rounded-xl shadow-sm text-slate-600">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[#0a192f] uppercase italic tracking-tighter leading-none">{activeView}</h1>
              <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mt-1 md:mt-2 hidden md:block">Marine Operations Control</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest ${syncError ? 'bg-red-100 border-red-200 text-red-600' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
              <HardDrive className={`w-3 h-3 ${isSyncing ? 'animate-pulse text-yellow-500' : (syncError ? 'text-red-500' : 'text-green-500')}`} />
              {isSyncing ? 'SYNCING...' : (syncError ? 'SYNC ERROR' : 'CLOUD SYNC ACTIVE')}
            </div>
          </div>
        </header>

        {selectedProjectForPayment && (
          <div className="fixed inset-0 bg-[#0a192f]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <PaymentForm
              project={selectedProjectForPayment.project}
              invoiceId={selectedProjectForPayment.invoiceId}
              onSave={handleAddPayment}
              onCancel={() => setSelectedProjectForPayment(null)}
            />
          </div>
        )}

        {activeView === 'Home' && <Dashboard projects={projects} payments={payments} invoices={invoices} />}

        {activeView === 'Invoices' && (
          <InvoiceView
            projects={projects}
            invoices={invoices}
            initialInvoice={selectedInvoiceForView}
            initialProject={selectedProjectForInvoice}
            onGenerateInvoice={handleGenerateInvoice}
            onAddPayment={(pid, invId) => {
              const p = projects.find(proj => proj.id === pid);
              if (p) setSelectedProjectForPayment({ project: p, invoiceId: invId });
            }}
            onClose={() => {
              setSelectedInvoiceForView(null);
              setSelectedProjectForInvoice(null);
              setActiveView('Invoices');
            }}
          />
        )}

        {activeView === 'Project Search' && (
          <ProjectSearch
            projects={projects}
            invoices={invoices}
            onAddPayment={(pid, invId) => {
              const p = projects.find(proj => proj.id === pid);
              if (p) setSelectedProjectForPayment({ project: p, invoiceId: invId });
            }}
            onAddExpense={handleAddExpense}
            onChangeOrder={handleChangeOrder}
            onPrintInvoice={(inv) => navigateToInvoice(undefined, inv)}
            onViewDetails={() => { }}
            onGenerateNewInvoice={(p) => navigateToInvoice(p, undefined)}
          />
        )}

        {activeView === 'New Contract' && (
          <NewContract
            onSave={(p) => {
              setProjects([...projects, { ...p, id: Math.random().toString(36).substring(2, 9), balance: p.totalAmount, paidAmount: 0, totalExpenses: 0, profit: p.totalAmount, originalAmount: p.totalAmount } as any]);
              setActiveView('Project Search');
            }}
            onCancel={() => setActiveView('Home')}
          />
        )}

        {activeView === 'Payments Made' && <PaymentsMade payments={payments} projects={projects} />}

        {activeView === 'User Management' && (
          <UserManagement
            users={users}
            projects={projects}
            payments={payments}
            invoices={invoices}
            onAddUser={(u) => setUsers([...users, { ...u, id: Math.random().toString(36).substring(2, 9), createdAt: new Date().toISOString() }])}
            onDeleteUser={(id) => setUsers(users.filter(u => u.id !== id))}
            onImportData={(data) => {
              if (data.projects) setProjects(data.projects);
              if (data.payments) setPayments(data.payments);
              if (data.invoices) setInvoices(data.invoices);
              alert("Database Restored Successfully.");
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
