import React from 'react';
import { ArrowUp } from 'lucide-react';

interface FooterProps {
  currentShopName?: string;
  currentShopId?: string;
  isGasConnected?: boolean;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  onOpenShopManagement?: () => void;
  onOpenSettings?: () => void;
  checksCount?: number;
  unreceivedCount?: number;
  customersCount?: number;
  isAdmin?: boolean;
}

export const Footer: React.FC<FooterProps> = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-12 py-6 border-t border-slate-800 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-400">
          <span>© 2026 <strong className="text-white font-semibold">Ayman Dammag</strong></span>
          <span className="text-slate-600">•</span>
          <span className="font-bold text-emerald-400 tracking-wider">AZAT</span>
          <span className="text-slate-600">•</span>
          <span>جميع الحقوق محفوظة</span>
        </div>

        <button
          onClick={scrollToTop}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all text-xs font-medium cursor-pointer shadow-2xs"
          title="العودة لأعلى الصفحة"
        >
          <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
          <span>العودة لأعلى الصفحة</span>
        </button>
      </div>
    </footer>
  );
};
