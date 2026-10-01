import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  FileCheck,
  FileSpreadsheet,
  Store,
  Bot,
  Settings,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  checksCount: number;
  receivedInvoicesCount: number;
  unreceivedCount: number;
  dueTodayCount: number;
  onOpenSettings?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  currentShopName?: string;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  checksCount,
  receivedInvoicesCount,
  unreceivedCount,
  dueTodayCount,
  onOpenSettings,
  isMobileOpen,
  onCloseMobile,
  currentShopName = 'Bunn',
  isAdmin = true,
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
      label: 'الشيكات المستحقة',
      icon: CreditCard,
      badge: checksCount > 0 ? checksCount : null,
      badgeColor: dueTodayCount > 0
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      id: 'received_invoices',
      label: 'الفواتير المستلمة',
      icon: FileCheck,
      badge: unreceivedCount > 0 ? `${unreceivedCount} معلقة` : null,
      badgeColor: unreceivedCount > 0
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
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
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
    },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Content (Desktop Sticky + Mobile Drawer) */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 z-50 lg:z-10 h-screen lg:h-[calc(100vh-4rem)] w-72 lg:w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-3">
          {/* Mobile Drawer Header */}
          <div className="lg:hidden flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white font-black flex items-center justify-center text-sm shadow-xs">
                {currentShopName.charAt(0)}
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[170px]">
                {currentShopName}
              </span>
            </div>
            <button
              onClick={onCloseMobile}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3">
            الأقسام المالية
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
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
          </nav>
        </div>

        {/* Bottom Utility Box */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          {isAdmin && onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>الإعدادات وإدارة المحلات</span>
            </button>
          )}
          <div className="text-[10px] text-center text-slate-500 dark:text-slate-500">
            {currentShopName} • نظام مالي متعدد المحلات
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200/90 dark:border-slate-800/90 px-1.5 py-1 safe-pb flex items-center justify-around shadow-2xl">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          // Determine micro-badge for mobile icon
          let mobileBadge: { text: string; bg: string } | null = null;
          if (item.id === 'checks' && dueTodayCount > 0) {
            mobileBadge = { text: `${dueTodayCount}`, bg: 'bg-amber-500 text-white animate-pulse' };
          } else if (item.id === 'received_invoices' && unreceivedCount > 0) {
            mobileBadge = { text: `${unreceivedCount}`, bg: 'bg-amber-500 text-white' };
          }

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all relative cursor-pointer min-w-0 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/15'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <div className="relative mb-0.5">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {mobileBadge && (
                  <span className={`absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-mono font-bold flex items-center justify-center shadow-xs ${mobileBadge.bg}`}>
                    {mobileBadge.text}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] whitespace-nowrap truncate max-w-full">
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
