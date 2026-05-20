import React, { useState } from 'react';
import { DollarSign, Calendar, Hash, Save, X, Waves, Percent } from 'lucide-react';
import { Payment, PaymentMethod, Project } from '../types';

interface PaymentFormProps {
  project: Project;
  invoiceId?: string;
  onSave: (
    payment: Omit<Payment, 'id' | 'projectName'>,
    discount?: { amount: number; date: string }
  ) => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ project, invoiceId, onSave, onCancel }) => {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('Zelle');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Discount states
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const outstandingBalance = project.balance;

  const discountAmount = hasDiscount
    ? discountType === 'percentage'
      ? Math.round(((outstandingBalance * discountValue) / 100) * 100) / 100
      : discountValue
    : 0;

  const netRemainingBalance = Math.max(0, outstandingBalance - amount - discountAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const totalTransaction = amount + discountAmount;

    if (totalTransaction <= 0) {
      alert("El monto del pago o el descuento debe ser mayor a 0.");
      return;
    }

    if (amount < 0 || discountAmount < 0) {
      alert("Los montos no pueden ser negativos.");
      return;
    }

    if (totalTransaction > outstandingBalance + 0.01) {
      alert("El total registrado (pago + descuento) no puede exceder el saldo pendiente del proyecto.");
      return;
    }

    onSave(
      { projectId: project.id, invoiceId, amount, method, reference, date },
      hasDiscount && discountAmount > 0 ? { amount: discountAmount, date } : undefined
    );
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden w-full max-w-xl mx-auto ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="p-8 md:p-10 bg-gradient-to-br from-[#0a192f] to-[#1a365d] text-white flex justify-between items-center relative overflow-hidden flex-shrink-0">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">Receive Payment</h2>
          <p className="text-cyan-400 font-bold text-xs md:text-sm mt-1">{project.name}</p>
        </div>
        <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors relative z-10">
          <X className="w-7 h-7 md:w-8 md:h-8" />
        </button>
      </div>

      {/* Main Body - Scrollable to prevent overflow */}
      <div className="overflow-y-auto flex-1 p-6 md:p-10 space-y-6 md:space-y-8 animate-in fade-in duration-300">
        {/* Outstanding summary */}
        <div className="p-6 border rounded-3xl bg-cyan-50/30 border-cyan-100/50">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-cyan-700 uppercase tracking-widest">Total Outstanding</span>
            <span className="text-2xl md:text-3xl font-black text-slate-900 font-mono tracking-tighter italic">
              ${outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          {/* Payment amount */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Payment Amount</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-600 text-2xl font-black italic">$</span>
              <input
                type="number"
                step="any"
                className="w-full pl-12 pr-6 py-5 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:border-cyan-400 outline-none transition-all text-2xl md:text-3xl font-black text-slate-900"
                placeholder="0.00"
                value={amount || ''}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Payment Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(['Zelle', 'Cash', 'Check', 'Bank Transfer', 'Credit Card'] as PaymentMethod[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-3.5 px-2 text-[10px] font-black rounded-2xl border-2 transition-all uppercase ${
                    method === m
                      ? 'bg-cyan-600 border-cyan-600 text-white shadow-md'
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Discount option */}
          <div className="bg-slate-50 p-5 md:p-6 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">¿Aplicar Descuento?</span>
                <span className="text-[11px] text-slate-400 font-semibold mt-0.5">Restar un descuento directo del saldo</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHasDiscount(!hasDiscount);
                  if (hasDiscount) {
                    setDiscountValue(0);
                  }
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hasDiscount ? 'bg-cyan-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    hasDiscount ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {hasDiscount && (
              <div className="space-y-4 pt-4 border-t border-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('percentage');
                      setDiscountValue(0);
                    }}
                    className={`flex-1 py-3 text-[10px] font-black rounded-xl border-2 transition-all uppercase ${
                      discountType === 'percentage'
                        ? 'bg-cyan-600 border-cyan-600 text-white shadow-sm'
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    % Porcentaje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('fixed');
                      setDiscountValue(0);
                    }}
                    className={`flex-1 py-3 text-[10px] font-black rounded-xl border-2 transition-all uppercase ${
                      discountType === 'fixed'
                        ? 'bg-cyan-600 border-cyan-600 text-white shadow-sm'
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    $ Efectivo
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-600 font-black italic">
                    {discountType === 'percentage' ? '%' : '$'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={discountType === 'percentage' ? 100 : undefined}
                    className="w-full pl-10 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl focus:border-cyan-400 outline-none transition-all font-bold text-slate-700"
                    placeholder={discountType === 'percentage' ? 'Ej: 10%' : 'Ej: 500'}
                    value={discountValue || ''}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      if (discountType === 'percentage' && val > 100) return;
                      setDiscountValue(val);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Date</label>
              <input
                type="date"
                required
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-cyan-400 outline-none transition-all font-bold text-slate-700"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Reference / TXN ID</label>
              <input
                type="text"
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-cyan-400 outline-none transition-all font-bold text-slate-700"
                placeholder="TXN Reference"
                value={reference}
                onChange={e => setReference(e.target.value)}
              />
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-slate-900 text-slate-100 p-6 rounded-[1.75rem] space-y-3 font-mono text-xs border border-slate-800">
            <div className="flex justify-between text-slate-400">
              <span>SALDO ACTUAL:</span>
              <span>${outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            {hasDiscount && discountAmount > 0 && (
              <div className="flex justify-between text-amber-400 font-bold">
                <span>DESCUENTO ({discountType === 'percentage' ? `${discountValue}%` : 'FIJO'}):</span>
                <span>-${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>PAGO REGISTRADO:</span>
              <span>${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-slate-800 my-2 pt-2.5 flex justify-between font-black text-sm text-white">
              <span>NUEVO SALDO:</span>
              <span className={netRemainingBalance === 0 ? 'text-emerald-400' : 'text-cyan-400'}>
                ${netRemainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Save button */}
          <button
            type="submit"
            className="w-full py-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-3xl font-black text-lg shadow-2xl transition-all uppercase tracking-widest active:scale-95 flex items-center justify-center gap-3"
          >
            <Save className="w-5 h-5" /> REGISTER PAYMENT
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;
