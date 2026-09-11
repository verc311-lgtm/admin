import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  viewName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in view:", error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('cva_pricing_catalog');
      localStorage.removeItem('cva_project_types');
    } catch (e) {
      console.error(e);
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-rose-100 text-center animate-in fade-in">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">
            Ha ocurrido un problema al cargar {this.props.viewName || 'esta sección'}
          </h2>
          <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed max-w-md mx-auto">
            Puede deberse a datos cacheados en el navegador o configuración previa. Presione el botón abajo para restaurar los valores y reintentar de inmediato.
          </p>
          {this.state.error && (
            <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-500 font-mono text-left mb-6 border border-slate-200 overflow-x-auto max-h-32">
              {this.state.error.message}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Reintentar
            </button>
            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-cyan-600/20 flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Restaurar y Recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
