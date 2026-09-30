import React, { useState } from 'react';
import {
  Bell,
  FileSpreadsheet,
  Plus,
  ShieldCheck,
  ChevronDown,
  CreditCard,
  FileCheck,
  Store,
  Sparkles,
  Calendar,
  Layers,
  Database,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  currentUser: User | null;
  unreadAlertsCount: number;
  onOpenNotifications: () => void;
  onOpenGoogleSheets: () => void;
  onOpenAddCheck: () => void;
  onOpenAddReceivedInvoice: () => void;
  onOpenAddCustomerInvoice: () => void;
  onOpenAddCustomer: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isGasConnected?: boolean;
  isLoadingGas?: boolean;
  onOpenSettings?: () => void;
  onRefreshGasData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  unreadAlertsCount,
  onOpenNotifications,
  onOpenGoogleSheets,
  onOpenAddCheck,
  onOpenAddReceivedInvoice,
  onOpenAddCustomerInvoice,
  onOpenAddCustomer,
  isGasConnected,
  isLoadingGas,
  onOpenSettings,
  onRefreshGasData,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const todayArabic = new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-xl">
            س
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-wide">سَنَد</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                مالي
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">إدارة الشيكات والفواتير</p>
          </div>
        </div>

        {/* Current Date & Cloud Status Badge */}
        <div className="hidden md:flex items-center gap-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
                isGasConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              }`}
              title="إعدادات قاعدة بيانات Google Sheets"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isGasConnected ? 'قاعدة بيانات Google Sheets' : 'ربط Google Sheets'}</span>
              <span className={`w-2 h-2 rounded-full ${isGasConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </button>
          )}

          {onRefreshGasData && isGasConnected && (
            <button
              onClick={onRefreshGasData}
              disabled={isLoadingGas}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
              title="تحديث البيانات من Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGas ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{todayArabic}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Add Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {showAddMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAddMenu(false)}
                />
                <div className="absolute left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-right animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      onOpenAddCheck();
                    }}
                    className="w-full px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-2.5 transition-colors"
                  >
                    <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span>تسجيل شيك عميل جديد</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      onOpenAddReceivedInvoice();
                    }}
                    className="w-full px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-2.5 transition-colors"
                  >
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <span>تسجيل فاتورة مستلمة</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      onOpenAddCustomerInvoice();
                    }}
                    className="w-full px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-2.5 transition-colors"
                  >
                    <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span>إصدار فاتورة لعميل</span>
                  </button>

                  <div className="my-1 border-t border-slate-700/60" />

                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      onOpenAddCustomer();
                    }}
                    className="w-full px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-2.5 transition-colors"
                  >
                    <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                      <Store className="w-4 h-4" />
                    </div>
                    <span>إضافة محل / عميل جديد</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Google Sheets Sync Button */}
          <button
            onClick={onOpenGoogleSheets}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentUser
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="مزامنة Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Google Sheets</span>
            {currentUser && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />}
          </button>

          {/* Notification Bell Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/70 transition-colors"
            title="التنبيهات والأتمتة"
          >
            <Bell className="w-5 h-5 text-amber-400" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
