import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import ProjectSearch from './components/ProjectSearch.tsx';
import NewContract from './components/NewContract.tsx';
import PaymentsMade from './components/PaymentsMade.tsx';
import QuoteGenerator from './components/QuoteGenerator';
import UserManagement from './components/UserManagement.tsx';
import InvoiceView from './components/InvoiceView.tsx';
import PaymentForm from './components/PaymentForm.tsx';
import Schedule from './components/Schedule.tsx';
import { User, Project, Payment, Invoice, View, Expense, ExpenseCategory, Crew, Assignment } from './types.ts';
import { HardDrive, ShieldCheck, Menu } from 'lucide-react';
import { supabase } from './src/supabaseClient';

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
  const [crews, setCrews] = useState<Crew[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // 1. Fetch Data on Load (Real-time from Supabase)
  const fetchData = async () => {
    setIsSyncing(true);
    setSyncError(false);
    try {
      console.log("Fetching from Supabase...");

      const { data: projectsData, error: projError } = await supabase.from('cva_projects').select('*');
      if (projError) throw projError;

      const { data: paymentsData, error: payError } = await supabase.from('cva_payments').select('*');
      if (payError) throw payError;

      const { data: invoicesData, error: invError } = await supabase.from('cva_invoices').select('*');
      if (invError) throw invError;

      const { data: usersData, error: userError } = await supabase.from('cva_users').select('*');
      if (userError) throw userError;

      const { data: expensesData, error: expError } = await supabase.from('cva_expenses').select('*');
      // If expenses table missing, expError might occur, treat as empty
      const safeExpenses = expensesData || [];

      // Process Projects to attach expenses and recalculate totals dynamically
      const processedProjects = (projectsData || []).map((p: any) => {
        const projectExpenses = safeExpenses.filter((e: any) => e.projectId === p.id);
        const calculatedTotalExpenses = projectExpenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);

        return {
          ...p,
          totalAmount: parseFloat(p.totalAmount),
          balance: parseFloat(p.balance),
          paidAmount: parseFloat(p.paidAmount),
          totalExpenses: calculatedTotalExpenses, // Use calculated sum instead of potentially stale DB column
          profit: parseFloat(p.totalAmount) - calculatedTotalExpenses, // Recalculate profit
          expensesList: projectExpenses
        };
      });

      setProjects(processedProjects);
      setPayments(paymentsData || []);
      setInvoices(invoicesData || []);
      setUsers(usersData || []);

      const { data: crewsData } = await supabase.from('cva_crews').select('*');
      setCrews(crewsData || []);

      const { data: assignData } = await supabase.from('cva_assignments').select('*');
      setAssignments(assignData || []);

      setLastSync(new Date());

    } catch (error) {
      console.error("Error connecting to Supabase:", error);
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple local check against fetched users (or hardcode admin for recovery)
    // Ideally use Supabase Auth, but keep simple migration for now
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);

    if (user || (loginForm.username === 'admin' && loginForm.password === '1234')) {
      setIsAuthenticated(true);
    } else {
      alert('Access Denied. Invalid credentials.');
    }
  };

  // --- CRUD ACTIONS (Direct to Supabase) ---

  const handleAddPayment = async (paymentData: Omit<Payment, 'id' | 'projectName'>) => {
    setIsSyncing(true);
    const project = projects.find(p => p.id === paymentData.projectId);
    if (!project) return;

    const newPayment = {
      ...paymentData,
      id: Math.random().toString(36).substring(2, 9),
      projectName: project.name
    };

    try {
      // 1. Insert Payment
      const { error: payError } = await supabase.from('cva_payments').insert([newPayment]);
      if (payError) throw payError;

      // 2. Update Project Balances
      const newPaid = project.paidAmount + paymentData.amount;
      const newBalance = project.totalAmount - newPaid;
      const newStatus = newBalance <= 0 ? 'Finished' : project.status;

      const { error: projError } = await supabase.from('cva_projects').update({
        paidAmount: newPaid,
        balance: newBalance,
        status: newStatus
      }).eq('id', project.id);

      if (projError) throw projError;

      // 3. Update Invoice Status if linked
      if (paymentData.invoiceId) {
        const { error: invError } = await supabase.from('cva_invoices').update({ status: 'Paid' }).eq('id', paymentData.invoiceId);
        if (invError) throw invError;
      }

      // Refresh Data
      await fetchData();
      setSelectedProjectForPayment(null);
      setActiveView('Payments Made');

    } catch (err: any) {
      alert("Error saving payment: " + err.message);
      setSyncError(true);
      setIsSyncing(false);
    }
  };

  const handleAddExpense = async (projectId: string, expenseData: { category: ExpenseCategory, amount: number, note: string }) => {
    setIsSyncing(true);
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newExpense = {
      id: Math.random().toString(36).substring(2, 9),
      projectId: projectId,
      date: new Date().toISOString().split('T')[0],
      ...expenseData
    };

    try {
      // 1. Insert Expense
      const { error: expError } = await supabase.from('cva_expenses').insert([newExpense]);
      if (expError) throw expError;

      // 2. Update Project Totals
      const newTotalExpenses = project.totalExpenses + expenseData.amount;
      const newProfit = project.totalAmount - newTotalExpenses;

      const { error: projError } = await supabase.from('cva_projects').update({
        totalExpenses: newTotalExpenses,
        profit: newProfit
      }).eq('id', projectId);

      if (projError) throw projError;

      await fetchData();

    } catch (err: any) {
      alert("Error saving expense: " + err.message);
      setSyncError(true);
      setIsSyncing(false);
    }
  };

  const handleChangeOrder = async (projectId: string, amount: number) => {
    setIsSyncing(true);
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      const newTotal = project.totalAmount + amount;
      const newBalance = newTotal - project.paidAmount;
      const newProfit = newTotal - project.totalExpenses;

      const { error } = await supabase.from('cva_projects').update({
        totalAmount: newTotal,
        balance: newBalance,
        profit: newProfit
      }).eq('id', projectId);

      if (error) throw error;
      await fetchData();

    } catch (err: any) {
      alert("Error updating Change Order: " + err.message);
      setSyncError(true);
      setIsSyncing(false);
    }
  };

  const handleGenerateInvoice = async (invoiceData: Omit<Invoice, 'id'>) => {
    setIsSyncing(true);
    const newInvoice = { ...invoiceData, id: Math.random().toString(36).substring(2, 9) };

    try {
      const { error } = await supabase.from('cva_invoices').insert([newInvoice]);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      console.error("Critical Error creating invoice:", err);
      alert("Error creating invoice: " + (err.message || JSON.stringify(err)));
      setSyncError(true);
      setIsSyncing(false);
    }
  };

  const handleSaveNewContract = async (project: Project) => {
    setIsSyncing(true);
    const newProject = {
      ...project,
      id: Math.random().toString(36).substring(2, 9),
      balance: project.totalAmount,
      paidAmount: 0,
      totalExpenses: 0,
      profit: project.totalAmount,
      // Remove client-only props if needed, but Supabase ignores extra fields usually if not in schema? 
      // Better to be safe. Project type matches schema mostly.
    };
    // remove originalAmount if not in DB schema or ensure schema has it. 
    // Schema in db_setup.sql doesn't have originalAmount.
    const { originalAmount, expensesList, ...dbProject } = newProject as any;

    try {
      const { error } = await supabase.from('cva_projects').insert([dbProject]);
      if (error) throw error;
      await fetchData();
      setActiveView('Project Search');
    } catch (err: any) {
      alert("Error saving contract: " + err.message);
      setSyncError(true);
      setIsSyncing(false);
    }
  };

  const handleUpdateProjectDates = async (projectId: string, startDate: string, estimatedEndDate: string | undefined) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('cva_projects').update({
        startDate,
        estimatedEndDate
      }).eq('id', projectId);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Error updating schedule: " + err.message);
      setSyncError(true);
      setIsSyncing(false);
    }
  };

  const handleAddCrew = async (name: string) => {
    setIsSyncing(true);
    try {
      const newCrew = { id: Math.random().toString(36).substring(2, 9), name, color: 'bg-blue-500' };
      const { error } = await supabase.from('cva_crews').insert([newCrew]);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Error creating crew: " + err.message);
      setIsSyncing(false);
    }
  };

  const handleAddAssignment = async (assignment: Omit<Assignment, 'id'>) => {
    setIsSyncing(true);
    try {
      const newAssign = { ...assignment, id: Math.random().toString(36).substring(2, 9) };
      const { error } = await supabase.from('cva_assignments').insert([newAssign]);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Error creating assignment: " + err.message);
      setIsSyncing(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('cva_assignments').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert("Error deleting assignment: " + err.message);
      setIsSyncing(false);
    }
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
              {isSyncing ? 'SYNCING...' : (syncError ? 'SYNC ERROR' : 'SUPABASE CONNECTED')}
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
            onSave={handleSaveNewContract}
            onCancel={() => setActiveView('Home')}
          />
        )}

        {activeView === 'Payments Made' && <PaymentsMade payments={payments} projects={projects} />}

        {activeView === 'Quotes' && <QuoteGenerator />}

        {activeView === 'User Management' && (
          <UserManagement
            users={users}
            projects={projects}
            payments={payments}
            invoices={invoices}
            onAddUser={async (u) => {
              const newUser = { ...u, id: Math.random().toString(36).substring(2, 9), createdAt: new Date().toISOString() };
              await supabase.from('cva_users').insert([newUser]);
              fetchData();
            }}
            onDeleteUser={async (id) => {
              await supabase.from('cva_users').delete().eq('id', id);
              fetchData();
            }}
            onImportData={(data) => {
              // Not implemented for direct supabase yet
              alert("Import not supported in Direct Mode.");
            }}
          />
        )}

        {activeView === 'Schedule' && (
          <Schedule
            projects={projects}
            crews={crews}
            assignments={assignments}
            onUpdateDates={handleUpdateProjectDates}
            onAddCrew={handleAddCrew}
            onAddAssignment={handleAddAssignment}
            onDeleteAssignment={handleDeleteAssignment}
          />
        )}
      </main>
    </div>
  );
};

export default App;
