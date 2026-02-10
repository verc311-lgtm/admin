
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Check' | 'Credit Card' | 'Zelle';

export interface Payment {
  id: string;
  projectId: string;
  projectName: string;
  invoiceId?: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference: string;
}

export interface Invoice {
  id: string;
  projectId: string;
  projectName: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  status: 'Draft' | 'Sent' | 'Paid';
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  createdAt: string;
}


export type ExpenseCategory = 'Staff Hour' | 'Insurance' | 'Gas/Fuel' | 'Tools' | 'Equipment' | 'Materials' | 'Miscellaneous';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  note: string;
  amount: number;
  date: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  totalAmount: number;     // Monto base + Change Orders
  originalAmount: number;  // Monto inicial sin CO
  balance: number;         // Lo que falta por cobrar
  paidAmount: number;      // Lo ya recibido
  totalExpenses: number;   // Costos de materiales/labor
  expensesList?: Expense[]; // Lista detallada de gastos
  profit: number;          // totalAmount - totalExpenses
  startDate: string;
  status: 'Draft' | 'In Progress' | 'Finished';
}

export type View = 'Home' | 'Quotes' | 'Invoices' | 'Payments Made' | 'New Contract' | 'Project Search' | 'User Management';
