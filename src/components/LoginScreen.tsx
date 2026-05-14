import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { QrCode, Lock } from 'lucide-react';
import { dataService } from '../dataService';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep input focused automatically for scanner
    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputValue.trim();
    if (code.length === 36) {
      const users = dataService.getUsers();
      const user = users.find(u => u.qrCode === code);
      if (user) {
        onLogin(user);
        setError('');
      } else {
        setError('Geçersiz kullanıcı. (Tanımsız QR)');
      }
    } else if (code.length > 0) {
      setError('Geçersiz QR kodu formatı.');
    }
    setInputValue('');
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 selection:bg-blue-500/30">
      <div className="bg-card border border-border p-8 rounded-3xl shadow-2xl shadow-blue-900/10 max-w-md w-full flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30">
          <QrCode size={40} className="text-blue-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">Sisteme Giriş</h1>
        <p className="text-muted-foreground mb-8 text-sm">Lütfen kullanıcı QR kodunuzu okutun.</p>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-dim-foreground" />
            </div>
            <input
              ref={inputRef}
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-card border border-border-strong rounded-xl py-3 pl-10 pr-4 text-foreground placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-center tracking-[0.5em] font-mono"
              placeholder="QR OKUTUNUZ"
              autoFocus
            />
          </div>
          {error && <p className="text-red-400 text-xs mt-3 bg-red-400/10 py-2 rounded font-bold">{error}</p>}
        </form>

        <div className="mt-8 text-[10px] text-dim-foreground uppercase tracking-widest font-bold">
          MSL TAKİP SİSTEMİ
        </div>
      </div>
    </div>
  );
}
