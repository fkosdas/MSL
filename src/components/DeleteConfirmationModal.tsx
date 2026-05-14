import React from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  itemIdentifier: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
}

export const DeleteConfirmationModal: React.FC<Props> = ({ title, message, itemIdentifier, onConfirm, onCancel, confirmLabel = "SİLMEYİ ONAYLIYORUM", variant = 'danger' }) => {
  const isDanger = variant === 'danger';
  const headerColor = isDanger ? 'bg-red-500/10' : 'bg-amber-500/10';
  const iconBg = isDanger ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500';
  const Icon = isDanger ? Trash2 : AlertCircle;
  const buttonBg = isDanger ? 'bg-red-600 hover:bg-red-500 shadow-red-900/40' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-background/90 backdrop-blur-md">
      <div className={`bg-card border ${isDanger ? 'border-red-500/20' : 'border-amber-500/20'} rounded-2xl shadow-2xl w-full max-w-[340px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200`}>
        <div className={`px-5 py-4 border-b border-border flex justify-between items-center ${headerColor} shrink-0`}>
          <div className="flex items-center gap-3">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBg}`}>
                <Icon size={16} />
             </div>
             <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">{title}</h3>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors" type="button">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-start gap-3 mb-6">
             <div className="p-2 bg-surface/50 rounded-lg text-muted-foreground shrink-0">
                <AlertTriangle size={20} />
             </div>
             <div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {message}
                </p>
                <div className="mt-3 px-2 py-1 bg-background rounded border border-border">
                   <p className="text-[10px] font-mono text-muted-foreground">Barkod: <span className="text-foreground">{itemIdentifier}</span></p>
                </div>
             </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={onConfirm}
              className={`w-full ${buttonBg} text-foreground font-bold py-3.5 rounded-xl uppercase tracking-[0.2em] text-[11px] transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2`}
            >
              <Icon size={16} />
              {confirmLabel}
            </button>
            <button 
              onClick={onCancel}
              className="w-full bg-surface hover:bg-surface-hover text-muted-foreground font-bold py-3 text-[11px] uppercase tracking-widest rounded-xl transition-all"
            >
              VAZGEÇ
            </button>
          </div>
        </div>

        <div className={`px-6 py-3 ${isDanger ? 'bg-red-500/5' : 'bg-amber-500/5'} border-t border-border flex justify-center shrink-0`}>
           <p className={`text-[8px] ${isDanger ? 'text-red-400/60' : 'text-amber-400/60'} font-bold uppercase tracking-[0.2em]`}>Bu işlem geri alınamaz</p>
        </div>
      </div>
    </div>,
    document.body
  );
};
