import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  FileCheck,
  FileSpreadsheet,
  Store,
  Bot,
  FileUp,
  RotateCcw,
  Sparkles,
  Database,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  checksCount: number;
  receivedInvoicesCount: number;
  unreceivedCount: number;
  dueTodayCount: number;
  onResetSeedData: () => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  checksCount,
  receivedInvoicesCount,
  unreceivedCount,
  dueTodayCount,
  onResetSeedData,
  onOpenSettings,
}) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'checks',
      label: 'شيكات العملاء',
      icon: CreditCard,
      badge: dueTodayCount > 0 ? `${dueTodayCount} اليوم` : `${checksCount}`,
      badgeColor: dueTodayCount > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400',
    },
    {
      id: 'received_invoices',
      label: 'الفواتير المستلمة',
      icon: FileCheck,
      badge: unreceivedCount > 0 ? `${unreceivedCount} معلقة` : `${receivedInvoicesCount}`,
      badgeColor: unreceivedCount > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400',
    },
    {
      id: 'customer_invoices',
      label: 'فواتير العملاء',
      icon: FileSpreadsheet,
      badge: null,
    },
    {
      id: 'customers',
      label: 'العملاء والمحلات',
      icon: Store,
      badge: null,
    },
    {
      id: 'automation',
      label: 'التنبيهات والأتمتة',
      icon: Bot,
      badge: 'آلي',
      badgeColor: 'bg-emerald-500/20 text-emerald-400',
    },
  ];

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900/60 border-l border-slate-800 shrink-0 p-4 justify-between h-[calc(100vh-4rem)] sticky top-16">
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            الأقسام المالية
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Utility Box */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/30 transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              <span>إعدادات قاعدة البيانات</span>
            </button>
          )}
          <button
            onClick={onResetSeedData}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-medium border border-slate-700/60 transition-colors"
            title="إعادة تحميل البيانات النموذجية الأصلية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة البيانات النموذجية</span>
          </button>
          <div className="text-[10px] text-center text-slate-500">
            سند المالي • إصدار المتجر 2026
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {menuItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors relative ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] whitespace-nowrap">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
