import React, { useState } from 'react';
import {
  Bell,
  Plus,
  ChevronDown,
  CreditCard,
  Store,
  Layers,
  Database,
  RefreshCw,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Menu,
  Check,
  Settings,
  X,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { Shop, UserSession } from '../types';

interface NavbarProps {
  currentSession: UserSession | null;
  currentShop: Shop | null;
  availableShops: Shop[];
  onSelectShop: (shopId: string) => void;
  unreadAlertsCount: number;
  onOpenNotifications: () => void;
  onOpenGoogleSheets: () => void;
  onOpenAddCheck: () => void;
  onOpenAddCustomerInvoice: () => void;
  onOpenAddCustomer: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isGasConnected?: boolean;
  isLoadingGas?: boolean;
  onOpenSettings?: () => void;
  onOpenShopManagement?: () => void;
  onRefreshGasData?: () => void;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  isAdmin?: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSession,
  currentShop,
  availableShops,
  onSelectShop,
  unreadAlertsCount,
  onOpenNotifications,
  onOpenAddCheck,
  onOpenAddCustomerInvoice,
  onOpenAddCustomer,
  isGasConnected,
  isLoadingGas,
  onOpenSettings,
  onOpenShopManagement,
  onRefreshGasData,
  onLogout,
  onToggleSidebar,
  isAdmin,
  theme,
  onToggleTheme,
}) => {
  const isAdminUser = isAdmin ?? (currentSession?.role === 'admin');

  // Dropdowns / Sheets state
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayShopName = currentShop?.shopName || 'Bunn Cafe & Roastery';
  const displayShopId = currentShop?.shopId || 'BUNN';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/90 dark:border-slate-800/90 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* ========================================================
              RIGHT SECTION (RTL): Drawer Menu Toggle + Shop Selector
             ======================================================== */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Drawer Menu Toggle (Hamburger) */}
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-2xl bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/70 transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs"
                title="فتح القائمة الجانبية"
                aria-label="القائمة الجانبية"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </button>
            )}

            {/* Shop Brand & Switcher Button */}
            <div className="relative min-w-0">
              <button
                onClick={() => setShowShopDropdown(!showShopDropdown)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-right transition-all border border-slate-200/90 dark:border-slate-700/80 min-w-0 group cursor-pointer active:scale-98 shadow-2xs"
                title="تغيير المحل أو الحساب النشط"
                aria-label="اختيار المحل الحالي"
              >
                {/* Active Shop Initial Avatar */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-500 text-white font-black text-sm sm:text-base flex items-center justify-center shadow-xs shadow-emerald-500/25 shrink-0">
                  {displayShopName.trim().charAt(0) || 'A'}
                </div>

                {/* Shop Name & ID */}
                <div className="min-w-0 pr-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[105px] xs:max-w-[145px] sm:max-w-[190px] md:max-w-[240px]">
                      {displayShopName}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20 shrink-0 hidden xs:inline-block">
                      {displayShopId}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate hidden sm:flex">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>حساب المحل النشط</span>
                  </div>
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-transform duration-200 shrink-0 mr-0.5 ${
                    showShopDropdown ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                />
              </button>

              {/* Desktop Shop Dropdown Popover */}
              {showShopDropdown && (
                <div className="hidden sm:block">
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setShowShopDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-right animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span>اختيار المحل / الحساب النشط</span>
                      <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {availableShops.length} محلات
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                      {availableShops.map((shop) => {
                        const isCurrent = shop.shopId === currentShop?.shopId;
                        return (
                          <button
                            key={shop.shopId}
                            onClick={() => {
                              onSelectShop(shop.shopId);
                              setShowShopDropdown(false);
                            }}
                            className={`w-full px-4 py-2.5 text-xs text-right flex items-center justify-between transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isCurrent
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {shop.shopName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{shop.shopName}</p>
                                {shop.contactName && (
                                  <p className="text-[10px] text-slate-400 truncate">{shop.contactName}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 mr-2">
                              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                                {shop.shopId}
                              </span>
                              {isCurrent && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {isAdminUser && onOpenShopManagement && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 px-3">
                        <button
                          onClick={() => {
                            setShowShopDropdown(false);
                            onOpenShopManagement();
                          }}
                          className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/15 dark:hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Store className="w-3.5 h-3.5" />
                          <span>إدارة وإضافة المحلات (الإعدادات)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              LEFT SECTION: Actions (Add, Notifications, User)
             ======================================================== */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Quick Add Action Button */}
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="h-10 px-2.5 sm:px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer shrink-0"
                title="إضافة عنصر مالي جديد"
                aria-label="إجراء جديد"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline font-bold">إضافة</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80 hidden sm:inline" />
              </button>

              {/* Desktop Quick Add Popover */}
              {showAddMenu && (
                <div className="hidden sm:block">
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setShowAddMenu(false)}
                  />
                  <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-right animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      إجراء سريع جديد
                    </div>

                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        onOpenAddCheck();
                      }}
                      className="w-full px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="text-right min-w-0">
                        <p className="font-bold">تسجيل شيك جديد</p>
                        <p className="text-[10px] text-slate-400">شيك صادر للعميل أو المورد</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        onOpenAddCustomerInvoice();
                      }}
                      className="w-full px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="text-right min-w-0">
                        <p className="font-bold">إصدار فاتورة عميل</p>
                        <p className="text-[10px] text-slate-400">فاتورة صادرة لعميل المحل</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        onOpenAddCustomer();
                      }}
                      className="w-full px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div className="text-right min-w-0">
                        <p className="font-bold">إضافة عميل أو متجر</p>
                        <p className="text-[10px] text-slate-400">تسجيل بيانات جهة جديدة</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className="w-10 h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/70 rounded-2xl transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
              title={theme === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
              aria-label={theme === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Button */}
            <button
              onClick={onOpenNotifications}
              className="relative w-10 h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/70 rounded-2xl transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
              title="التنبيهات والإشعارات"
              aria-label="التنبيهات"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs shadow-rose-500/50">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* User Profile / Menu Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="h-10 px-2 sm:px-2.5 bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/70 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                title="الملف الشخصي والحساب"
                aria-label="حساب المستخدم"
              >
                <div className="w-6 h-6 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentSession?.role === 'admin' ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="hidden md:inline font-semibold">
                  {currentSession?.name || 'المستخدم'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
              </button>

              {/* Desktop User Menu Popover */}
              {showUserMenu && (
                <div className="hidden sm:block">
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute left-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-right animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {currentSession?.name || 'المستخدم'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {currentSession?.role === 'admin' ? 'مدير النظام الكامل' : 'مستخدم المحل'}
                      </p>
                    </div>

                    {isAdminUser && onOpenShopManagement && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenShopManagement();
                        }}
                        className="w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>إدارة المحلات</span>
                      </button>
                    )}

                    {isAdminUser && onOpenSettings && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenSettings();
                        }}
                        className="w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>إعدادات قاعدة البيانات</span>
                      </button>
                    )}

                    <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 font-semibold transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ========================================================
          MOBILE BOTTOM SHEET: SHOP SWITCHER
         ======================================================== */}
      {showShopDropdown && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowShopDropdown(false)}
          />

          {/* Slide-Up Bottom Sheet */}
          <div className="relative z-10 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl p-4 safe-pb animate-slide-up max-h-[85vh] flex flex-col">
            {/* Drag Handle Bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  اختيار المحل أو الحساب النشط
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  حدد المحل لعرض وعزل شيكاته وفواتيره
                </p>
              </div>
              <button
                onClick={() => setShowShopDropdown(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shops List */}
            <div className="overflow-y-auto my-3 divide-y divide-slate-100 dark:divide-slate-800/80 space-y-1">
              {availableShops.map((shop) => {
                const isCurrent = shop.shopId === currentShop?.shopId;
                return (
                  <button
                    key={shop.shopId}
                    onClick={() => {
                      onSelectShop(shop.shopId);
                      setShowShopDropdown(false);
                    }}
                    className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-right transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                          isCurrent
                            ? 'bg-gradient-to-br from-emerald-600 to-teal-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {shop.shopName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate">{shop.shopName}</p>
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                            {shop.shopId}
                          </span>
                        </div>
                        {shop.contactName && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{shop.contactName}</p>
                        )}
                      </div>
                    </div>

                    {isCurrent && (
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Manage Shops Action (Admin only) */}
            {isAdminUser && onOpenShopManagement && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setShowShopDropdown(false);
                    onOpenShopManagement();
                  }}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <Store className="w-4 h-4" />
                  <span>إدارة المحلات وتعديلها (Settings)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MOBILE BOTTOM SHEET: QUICK ADD ACTIONS
         ======================================================== */}
      {showAddMenu && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowAddMenu(false)}
          />

          {/* Slide-Up Bottom Sheet */}
          <div className="relative z-10 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl p-4 safe-pb animate-slide-up">
            {/* Drag Handle Bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>إضافة معاملة مالية جديدة</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  اختر نوع العملية المالية للمحل: {displayShopName}
                </p>
              </div>
              <button
                onClick={() => setShowAddMenu(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Grid / Cards */}
            <div className="grid grid-cols-1 gap-2.5 my-4">
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  onOpenAddCheck();
                }}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3.5 transition-all cursor-pointer text-right group active:scale-98"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">تسجيل شيك جديد</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">شيك صادر للعميل أو المورد مع التنبيهات</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowAddMenu(false);
                  onOpenAddCustomerInvoice();
                }}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-teal-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3.5 transition-all cursor-pointer text-right group active:scale-98"
              >
                <div className="w-11 h-11 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">إصدار فاتورة عميل</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">فاتورة صادرة لعميل المحل مع تفاصيل الشيكات</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowAddMenu(false);
                  onOpenAddCustomer();
                }}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3.5 transition-all cursor-pointer text-right group active:scale-98"
              >
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Store className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">إضافة عميل أو متجر</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">تسجيل بيانات جهة جديدة أو هاتف للتواصل</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MOBILE BOTTOM SHEET: USER PROFILE & SETTINGS MENU
         ======================================================== */}
      {showUserMenu && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowUserMenu(false)}
          />

          {/* Slide-Up Bottom Sheet */}
          <div className="relative z-10 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl p-4 safe-pb animate-slide-up">
            {/* Drag Handle Bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />

            {/* User Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  {currentSession?.role === 'admin' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <UserIcon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {currentSession?.name || 'المستخدم'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {currentSession?.role === 'admin' ? 'مدير النظام الكامل' : 'مستخدم المحل'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUserMenu(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions List */}
            <div className="space-y-2 my-3">
              {/* Shop Management (Admin only) */}
              {isAdminUser && onOpenShopManagement && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenShopManagement();
                  }}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/70 flex items-center gap-2.5 text-xs transition-colors text-right"
                >
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">إدارة وتعديل المحلات</p>
                    <p className="text-[10px] text-slate-400">إضافة محلات جديدة وتعيين حسابات الدخول</p>
                  </div>
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout();
                }}
                className="w-full p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-400 font-bold transition-colors text-right"
              >
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>تسجيل الخروج من النظام</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
