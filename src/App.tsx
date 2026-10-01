import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Customer, CheckItem, CustomerInvoice, ReceivedInvoice, AlertNotification, Shop, UserSession } from './types';
import {
  saveCustomers,
  saveChecks,
  saveCustomerInvoices,
  saveReceivedInvoices,
  saveNotifications,
} from './services/storage';
import {
  getTodayString,
  computeCheckStatus,
  evaluateCheckNotifications,
  formatCurrency,
  formatArabicDate,
  sortAlertsByClosest,
} from './utils/checkCalculations';
import {
  getCurrentSession,
  getStoredShops,
  saveStoredShops,
  getActiveShopId,
  setActiveShopId,
  getAvailableShops,
  setCurrentSession,
} from './services/auth';
import {
  isGasConfigured,
  logout,
  fetchAllDataFromGas,
  createCustomerInGas,
  updateCustomerInGas,
  deleteCustomerInGas,
  createInvoiceInGas,
  updateInvoiceInGas,
  deleteInvoiceInGas,
  createChequeInGas,
  updateChequeInGas,
  deleteChequeInGas,
  updateChequeStatusInGas,
  createReceivedInvoiceInGas,
  updateReceivedInvoiceInGas,
  deleteReceivedInvoiceInGas,
  updateReceivedInvoiceStatusInGas,
} from './services/gasApi';

// Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChecksView } from './components/ChecksView';
import { ReceivedInvoicesView } from './components/ReceivedInvoicesView';
import { CustomerInvoicesView } from './components/CustomerInvoicesView';
import { CustomersView } from './components/CustomersView';
import { AutomationBotView } from './components/AutomationBotView';
import { Footer } from './components/Footer';

// Modals
import { CheckFormModal } from './components/CheckFormModal';
import { ReceivedInvoiceFormModal } from './components/ReceivedInvoiceFormModal';
import { CustomerInvoiceFormModal } from './components/CustomerInvoiceFormModal';
import { CustomerFormModal } from './components/CustomerFormModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { ShopManagementModal } from './components/ShopManagementModal';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (
    localStorage.getItem('sanad_theme') === 'light' ? 'light' : 'dark'
  ));

  // Multi-Tenant Session & Shops State
  const [shops, setShops] = useState<Shop[]>(() => getAvailableShops(getStoredShops()));
  const [currentSession, setSession] = useState<UserSession | null>(() => getCurrentSession());
  const [currentShopId, setCurrentShopIdState] = useState<string>(() => getActiveShopId());

  // Main Data States (Partitioned by currentShopId)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<ReceivedInvoice[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Browser Notification Permission
  const [hasBrowserPermission, setHasBrowserPermission] = useState<boolean>(false);

  // Cloud Database States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'shops' | 'database'>('shops');
  const [isShopManagementOpen, setIsShopManagementOpen] = useState(false);
  const [isLoadingGas, setIsLoadingGas] = useState(false);
  const [gasNotification, setGasNotification] = useState<string | null>(null);

  // Modal Open States
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [checkToEdit, setCheckToEdit] = useState<CheckItem | null>(null);

  const [isReceivedInvoiceModalOpen, setIsReceivedInvoiceModalOpen] = useState(false);
  const [receivedInvoiceToEdit, setReceivedInvoiceToEdit] = useState<ReceivedInvoice | null>(null);

  const [isCustomerInvoiceModalOpen, setIsCustomerInvoiceModalOpen] = useState(false);
  const [customerInvoiceToEdit, setCustomerInvoiceToEdit] = useState<CustomerInvoice | null>(null);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Active Shop details
  const currentShop = shops.find((s) => s.shopId === currentShopId) || shops[0] || null;
  const currentShopName = currentShop?.shopName || 'Bunn Cafe & Roastery';

  // Available shops for current user
  const availableShops = getAvailableShops(shops);

  // Check if current authenticated user has Admin master role
  const isAdmin = currentSession?.role === 'admin';

  // Ensure settings modals are automatically closed if role is non-admin
  useEffect(() => {
    if (!isAdmin) {
      if (isSettingsModalOpen) setIsSettingsModalOpen(false);
      if (isShopManagementOpen) setIsShopManagementOpen(false);
    }
  }, [isAdmin, isSettingsModalOpen, isShopManagementOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('sanad_theme', theme);
  }, [theme]);

  // Switch Active Shop Handler
  const handleSelectShop = (shopId: string) => {
    if (shopId === currentShopId) return;

    setActiveShopId(shopId);
    setCurrentShopIdState(shopId);
    fetchShopData(shopId);
  };

  // Load data for a specific shop
  const fetchShopData = useCallback(async (shopId: string) => {
    const session = getCurrentSession();
    if (!session || !session.allowedShopIds.includes(shopId)) {
      setCustomers([]);
      setChecks([]);
      setCustomerInvoices([]);
      setReceivedInvoices([]);
      setNotifications([]);
      return;
    }

    setCustomers([]);
    setChecks([]);
    setCustomerInvoices([]);
    setReceivedInvoices([]);
    setNotifications([]);

    if (isGasConfigured()) {
      setIsLoadingGas(true);
      try {
        const gasData = await fetchAllDataFromGas(shopId);

        if (Array.isArray(gasData.shops) && gasData.shops.length > 0) {
          setShops(gasData.shops);
        }

        if (Array.isArray(gasData.customers)) {
          setCustomers(gasData.customers);
          saveCustomers(gasData.customers, shopId);
        }
        if (Array.isArray(gasData.invoices)) {
          setCustomerInvoices(gasData.invoices);
          saveCustomerInvoices(gasData.invoices, shopId);
        }
        if (Array.isArray(gasData.checks)) {
          setChecks(gasData.checks);
          saveChecks(gasData.checks, shopId);
        }
        if (Array.isArray(gasData.receivedInvoices)) {
          setReceivedInvoices(gasData.receivedInvoices);
          saveReceivedInvoices(gasData.receivedInvoices, shopId);
        }

        setGasNotification(`تمت مزامنة بيانات ${gasData.shops?.find(s => s.shopId === shopId)?.shopName || shopId} بنجاح`);
        setTimeout(() => setGasNotification(null), 3500);
      } catch (err: any) {
        console.error('Google Apps Script data request failed:', err);
      } finally {
        setIsLoadingGas(false);
      }
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    fetchShopData(currentShopId);

    // Check browser notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasBrowserPermission(Notification.permission === 'granted');
    }
  }, [currentShopId, currentSession, fetchShopData]);

  useEffect(() => {
    const expireSession = () => {
      setSession(null);
      setShops([]);
      setCustomers([]);
      setChecks([]);
      setCustomerInvoices([]);
      setReceivedInvoices([]);
      setNotifications([]);
    };
    const showApiError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail || 'تعذر تنفيذ الطلب على Google Apps Script.';
      setGasNotification(message);
      window.setTimeout(() => {
        setGasNotification((current) => current === message ? null : current);
      }, 8000);
    };
    window.addEventListener('sanad:session-expired', expireSession);
    window.addEventListener('sanad:api-error', showApiError);
    return () => {
      window.removeEventListener('sanad:session-expired', expireSession);
      window.removeEventListener('sanad:api-error', showApiError);
    };
  }, []);

  // Run automated check scanner
  const runBotScan = useCallback(
    (showToast: boolean = true) => {
      const today = getTodayString();

      // Recalculate checks with updated status based on today
      const updatedChecks = checks.map((c) => ({
        ...c,
        status: computeCheckStatus(c, today),
      }));

      // Generate alerts according to schedule
      const newAlerts = evaluateCheckNotifications(updatedChecks, today);

      // Merge with existing notifications avoiding duplicates and sort closest first
      const existingIds = new Set(notifications.map((n) => n.id));
      const filteredNew = newAlerts.filter((a) => !existingIds.has(a.id));

      const mergedNotifications = sortAlertsByClosest([...filteredNew, ...notifications]);

      setChecks(updatedChecks);
      saveChecks(updatedChecks, currentShopId);

      if (filteredNew.length > 0) {
        setNotifications(mergedNotifications);
        saveNotifications(mergedNotifications, currentShopId);

        // Send browser notification if permission granted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          filteredNew.forEach((alert) => {
            try {
              new Notification(`[${currentShopName}] تنبيه شيك ${alert.daysRemaining <= 0 ? 'مستحق' : 'قادم'}: ${alert.storeName}`, {
                body: `المبلغ: ${formatCurrency(alert.amount)}\nتاريخ الاستحقاق: ${formatArabicDate(alert.dueDate)}\n${
                  alert.daysRemaining > 0 ? `متبقي ${alert.daysRemaining} أيام` : 'مستحق اليوم أو متأخر'
                }`,
                icon: '/favicon.ico',
              });
            } catch (err) {
              console.error('Notification dispatch error:', err);
            }
          });
        }
      }

      if (showToast && filteredNew.length > 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      }
    },
    [checks, notifications, currentShopId, currentShopName]
  );

  // Run bot scan once when checks are loaded
  useEffect(() => {
    if (checks.length > 0) {
      runBotScan(false);
    }
  }, [checks.length]);

  // Request browser notification permission
  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setHasBrowserPermission(permission === 'granted');
      if (permission === 'granted') {
        new Notification(`AZAT - ${currentShopName}`, {
          body: 'تم تفعيل التنبيهات بنجاح! ستصلك إشعارات الشيكات في المواعيد المحددة.',
        });
      }
    }
  };

  // ==================== Customer Handlers ====================
  const handleSaveCustomer = async (customerData: Partial<Customer>) => {
    let updated: Customer[];
    let targetCustomer: Customer;
    const isEdit = Boolean(customerToEdit);

    if (customerToEdit) {
      targetCustomer = { ...customerToEdit, ...customerData } as Customer;
      updated = customers.map((c) => (c.id === customerToEdit.id ? targetCustomer : c));
    } else {
      targetCustomer = {
        id: `cust-${Date.now()}`,
        shopId: currentShopId,
        name: customerData.name || '',
        contactPerson: customerData.contactPerson || '',
        phone: customerData.phone || '',
        address: customerData.address || '',
        notes: customerData.notes || '',
        createdAt: new Date().toISOString(),
      };
      updated = [targetCustomer, ...customers];
    }
    setCustomers(updated);
    saveCustomers(updated, currentShopId);
    setCustomerToEdit(null);

    // Sync to Google Apps Script
    if (isGasConfigured()) {
      try {
        if (isEdit) {
          await updateCustomerInGas(targetCustomer);
        } else {
          await createCustomerInGas(targetCustomer, currentShopId);
        }
      } catch (err) {
        console.warn('Error syncing customer to GAS:', err);
      }
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const cust = customers.find((c) => c.id === id);
    if (!cust) return;
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف بيانات العميل "${cust.name}"؟`);
    if (!confirmDelete) return;

    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    saveCustomers(updated, currentShopId);

    if (isGasConfigured()) {
      try {
        await deleteCustomerInGas(id);
      } catch (err) {
        console.warn('Error deleting customer in GAS:', err);
      }
    }
  };

  // ==================== Check Handlers ====================
  const handleSaveCheck = async (checkData: Partial<CheckItem>) => {
    let updated: CheckItem[];
    let targetCheck: CheckItem;
    const isEdit = Boolean(checkToEdit);

    if (checkToEdit) {
      targetCheck = { ...checkToEdit, ...checkData } as CheckItem;
      updated = checks.map((chk) => (chk.id === checkToEdit.id ? targetCheck : chk));
    } else {
      targetCheck = {
        id: `chk-${Date.now()}`,
        shopId: currentShopId,
        checkNumber: checkData.checkNumber || '',
        customerId: checkData.customerId || '',
        customerName: checkData.customerName || '',
        amount: checkData.amount || 0,
        dueDate: checkData.dueDate || getTodayString(),
        linkedInvoiceId: checkData.linkedInvoiceId,
        linkedInvoiceNumber: checkData.linkedInvoiceNumber,
        notes: checkData.notes,
        image: checkData.image,
        attachments: checkData.attachments,
        status: checkData.status || 'upcoming',
        manualStatus: checkData.manualStatus,
        cashedDate: checkData.cashedDate,
        createdAt: new Date().toISOString(),
      };
      updated = [targetCheck, ...checks];
    }
    setChecks(updated);
    saveChecks(updated, currentShopId);
    setCheckToEdit(null);

    // Sync to Google Apps Script
    if (isGasConfigured()) {
      try {
        if (isEdit) {
          await updateChequeInGas(targetCheck);
        } else {
          await createChequeInGas(targetCheck, currentShopId);
        }
      } catch (err) {
        console.warn('Error syncing cheque to GAS:', err);
      }
    }
  };

  const handleDeleteCheck = async (id: string) => {
    const chk = checks.find((c) => c.id === id);
    if (!chk) return;
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف الشيك رقم "${chk.checkNumber}"؟`);
    if (!confirmDelete) return;

    const updated = checks.filter((c) => c.id !== id);
    setChecks(updated);
    saveChecks(updated, currentShopId);

    if (isGasConfigured()) {
      try {
        await deleteChequeInGas(id);
      } catch (err) {
        console.warn('Error deleting cheque in GAS:', err);
      }
    }
  };

  // One-click cash check action
  const handleCashCheck = async (checkId: string) => {
    const today = getTodayString();
    const updated = checks.map((c) => {
      if (c.id === checkId) {
        return {
          ...c,
          status: 'cashed' as const,
          manualStatus: 'cashed' as const,
          cashedDate: today,
        };
      }
      return c;
    });

    setChecks(updated);
    saveChecks(updated, currentShopId);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#10b981', '#3b82f6', '#f59e0b'],
    });

    if (isGasConfigured()) {
      try {
        await updateChequeStatusInGas(checkId, 'مدفوع', today);
      } catch (err) {
        console.warn('Error updating cheque status in GAS:', err);
      }
    }
  };

  // ==================== Customer Invoice Handlers ====================
  const handleSaveCustomerInvoice = async (
    invData: Partial<CustomerInvoice>,
    newCustomerData?: Partial<Customer>
  ) => {
    // If a new customer was created simultaneously inside invoice modal
    if (newCustomerData) {
      const freshCustomer: Customer = {
        id: newCustomerData.id || `cust-${Date.now()}`,
        shopId: currentShopId,
        name: newCustomerData.name || '',
        contactPerson: newCustomerData.contactPerson || '',
        phone: newCustomerData.phone || '',
        address: newCustomerData.address || '',
        notes: newCustomerData.notes || '',
        createdAt: new Date().toISOString(),
      };
      const updatedCustomers = [freshCustomer, ...customers];
      setCustomers(updatedCustomers);
      saveCustomers(updatedCustomers, currentShopId);

      if (isGasConfigured()) {
        createCustomerInGas(freshCustomer, currentShopId).catch(console.warn);
      }
    }

    let updated: CustomerInvoice[];
    let targetInv: CustomerInvoice;
    const isEdit = Boolean(customerInvoiceToEdit);

    if (customerInvoiceToEdit) {
      targetInv = { ...customerInvoiceToEdit, ...invData } as CustomerInvoice;
      updated = customerInvoices.map((inv) => (inv.id === customerInvoiceToEdit.id ? targetInv : inv));
    } else {
      targetInv = {
        id: `cinv-${Date.now()}`,
        shopId: currentShopId,
        invoiceNumber: invData.invoiceNumber || '',
        customerId: invData.customerId || '',
        customerName: invData.customerName || '',
        amount: invData.amount || 0,
        invoiceDate: invData.invoiceDate || getTodayString(),
        receiptStatus: invData.receiptStatus || 'مستحق',
        receiptDate: invData.receiptDate,
        notes: invData.notes,
        image: invData.image,
        attachments: invData.attachments,
        createdAt: new Date().toISOString(),
      };
      updated = [targetInv, ...customerInvoices];
    }
    setCustomerInvoices(updated);
    saveCustomerInvoices(updated, currentShopId);
    setCustomerInvoiceToEdit(null);

    if (isGasConfigured()) {
      try {
        if (isEdit) {
          await updateInvoiceInGas(targetInv);
        } else {
          await createInvoiceInGas(targetInv, currentShopId);
        }
      } catch (err) {
        console.warn('Error syncing customer invoice to GAS:', err);
      }
    }
  };

  const handleDeleteCustomerInvoice = async (id: string) => {
    const inv = customerInvoices.find((i) => i.id === id);
    if (!inv) return;
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف فاتورة العميل رقم "${inv.invoiceNumber}"؟`);
    if (!confirmDelete) return;

    const updated = customerInvoices.filter((i) => i.id !== id);
    setCustomerInvoices(updated);
    saveCustomerInvoices(updated, currentShopId);

    if (isGasConfigured()) {
      try {
        await deleteInvoiceInGas(id);
      } catch (err) {
        console.warn('Error deleting invoice in GAS:', err);
      }
    }
  };

  const handleAddCheckForInvoice = (inv: CustomerInvoice) => {
    setCheckToEdit({
      customerId: inv.customerId,
      customerName: inv.customerName,
      linkedInvoiceId: inv.id,
      linkedInvoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      checkNumber: '',
    } as any);
    setIsCheckModalOpen(true);
  };

  // ==================== Received Invoices Handlers ====================
  const handleSaveReceivedInvoice = async (invData: Partial<ReceivedInvoice>) => {
    let updated: ReceivedInvoice[];
    let targetInv: ReceivedInvoice;
    const isEdit = Boolean(receivedInvoiceToEdit);

    if (receivedInvoiceToEdit) {
      targetInv = { ...receivedInvoiceToEdit, ...invData } as ReceivedInvoice;
      updated = receivedInvoices.map((inv) => (inv.id === receivedInvoiceToEdit.id ? targetInv : inv));
    } else {
      targetInv = {
        id: `rinv-${Date.now()}`,
        shopId: currentShopId,
        invoiceNumber: invData.invoiceNumber || '',
        sourceName: invData.sourceName || '',
        amount: invData.amount || 0,
        invoiceDate: invData.invoiceDate || getTodayString(),
        notes: invData.notes,
        image: invData.image,
        attachments: invData.attachments,
        receiptStatus: invData.receiptStatus || 'not_received',
        receiptDate: invData.receiptDate,
        createdAt: new Date().toISOString(),
      };
      updated = [targetInv, ...receivedInvoices];
    }
    setReceivedInvoices(updated);
    saveReceivedInvoices(updated, currentShopId);
    setReceivedInvoiceToEdit(null);

    if (isGasConfigured()) {
      try {
        if (isEdit) {
          await updateReceivedInvoiceInGas(targetInv);
        } else {
          await createReceivedInvoiceInGas(targetInv, currentShopId);
        }
      } catch (err) {
        console.warn('Error syncing received invoice to GAS:', err);
      }
    }
  };

  const handleDeleteReceivedInvoice = async (id: string) => {
    const inv = receivedInvoices.find((i) => i.id === id);
    if (!inv) return;
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف الفاتورة المستلمة "${inv.invoiceNumber}"؟`);
    if (!confirmDelete) return;

    const updated = receivedInvoices.filter((i) => i.id !== id);
    setReceivedInvoices(updated);
    saveReceivedInvoices(updated, currentShopId);

    if (isGasConfigured()) {
      try {
        await deleteReceivedInvoiceInGas(id);
      } catch (err) {
        console.warn('Error deleting received invoice in GAS:', err);
      }
    }
  };

  // Direct manual toggle for Received Invoice
  const handleToggleReceiptStatus = async (id: string) => {
    let nextStatusArabic = 'لم يتم الاستلام';
    let targetDate = '';
    const updated = receivedInvoices.map((inv) => {
      if (inv.id === id) {
        const isCurrentReceived = inv.receiptStatus === 'received' || inv.receiptStatus === 'تم الاستلام';
        const nextStatus = isCurrentReceived ? ('not_received' as const) : ('received' as const);
        nextStatusArabic = nextStatus === 'received' ? 'تم الاستلام' : 'لم يتم الاستلام';
        targetDate = nextStatus === 'received' ? getTodayString() : '';
        if (nextStatus === 'received') {
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.6 },
          });
        }
        return {
          ...inv,
          receiptStatus: nextStatus,
          receiptDate: targetDate,
        };
      }
      return inv;
    });

    setReceivedInvoices(updated);
    saveReceivedInvoices(updated, currentShopId);

    if (isGasConfigured()) {
      try {
        await updateReceivedInvoiceStatusInGas(id, nextStatusArabic, targetDate);
      } catch (err) {
        console.warn('Error updating received invoice status in GAS:', err);
      }
    }
  };

  // ==================== Notifications Handlers ====================
  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    saveNotifications(updated, currentShopId);
  };

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    saveNotifications(updated, currentShopId);
  };

  const handleDeleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated, currentShopId);
  };

  const handleClearAllNotifications = () => {
    if (notifications.length === 0) return;
    const confirmed = window.confirm('هل أنت متأكد من حذف جميع الإشعارات من القائمة؟');
    if (!confirmed) return;
    setNotifications([]);
    saveNotifications([], currentShopId);
  };

  // Logout Handler
  const handleLogout = async () => {
    await logout();
    setSession(null);
    setShops([]);
    setCustomers([]);
    setChecks([]);
    setCustomerInvoices([]);
    setReceivedInvoices([]);
    setNotifications([]);
  };

  // Login Success Handler
  const handleLoginSuccess = (session: UserSession) => {
    setSession(session);
    setCurrentShopIdState(session.currentShopId);
    setActiveShopId(session.currentShopId);
  };

  // Badge calculations
  const unreadAlertsCount = notifications.filter((n) => !n.isRead).length;
  const unreceivedInvoicesCount = receivedInvoices.filter(
    (i) => i.receiptStatus === 'not_received' || i.receiptStatus === 'لم يتم الاستلام'
  ).length;
  const dueTodayChecksCount = checks.filter(
    (c) => c.status === 'due_today' || c.status === 'مستحق اليوم'
  ).length;

  return (
    <div className="min-h-screen flex flex-col font-['Cairo',sans-serif] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-emerald-200 selection:text-emerald-900 dark:selection:bg-emerald-500/30 dark:selection:text-emerald-200">
      {gasNotification && (
        <div
          role="status"
          className="fixed bottom-5 left-5 z-[100] max-w-md rounded-xl border border-amber-500/30 bg-slate-900 px-4 py-3 text-xs text-amber-100 shadow-xl"
        >
          {gasNotification}
        </div>
      )}
      {/* Login Modal Overlay (Required if not authenticated) */}
      <LoginModal
        isOpen={!currentSession}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Top Navigation Bar with Shop Selector & Cloud Status */}
      <Navbar
        currentSession={currentSession}
        currentShop={currentShop}
        availableShops={availableShops}
        onSelectShop={handleSelectShop}
        unreadAlertsCount={unreadAlertsCount}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onOpenGoogleSheets={() => setIsSettingsModalOpen(true)}
        onOpenAddCheck={() => {
          setCheckToEdit(null);
          setIsCheckModalOpen(true);
        }}
        onOpenAddReceivedInvoice={() => {
          setReceivedInvoiceToEdit(null);
          setIsReceivedInvoiceModalOpen(true);
        }}
        onOpenAddCustomerInvoice={() => {
          setCustomerInvoiceToEdit(null);
          setIsCustomerInvoiceModalOpen(true);
        }}
        onOpenAddCustomer={() => {
          setCustomerToEdit(null);
          setIsCustomerModalOpen(true);
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isGasConnected={isGasConfigured()}
        isLoadingGas={isLoadingGas}
        onOpenSettings={isAdmin ? () => {
          setSettingsInitialTab('database');
          setIsSettingsModalOpen(true);
        } : undefined}
        onOpenShopManagement={isAdmin ? () => {
          setSettingsInitialTab('shops');
          setIsSettingsModalOpen(true);
        } : undefined}
        onRefreshGasData={() => fetchShopData(currentShopId)}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsMobileSidebarOpen(true)}
        isAdmin={isAdmin}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar (Responsive Drawer on Mobile) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          checksCount={checks.length}
          receivedInvoicesCount={receivedInvoices.length}
          unreceivedCount={unreceivedInvoicesCount}
          dueTodayCount={dueTodayChecksCount}
          onOpenSettings={isAdmin ? () => {
            setSettingsInitialTab('shops');
            setIsSettingsModalOpen(true);
          } : undefined}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          currentShopName={currentShopName}
          isAdmin={isAdmin}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-28 sm:pb-24 lg:pb-8 overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <Dashboard
              checks={checks}
              receivedInvoices={receivedInvoices}
              customerInvoices={customerInvoices}
              customers={customers}
              onToggleReceiptStatus={handleToggleReceiptStatus}
              onCashCheck={handleCashCheck}
              onOpenCheckModal={() => {
                setCheckToEdit(null);
                setIsCheckModalOpen(true);
              }}
              onOpenReceivedInvoiceModal={() => {
                setReceivedInvoiceToEdit(null);
                setIsReceivedInvoiceModalOpen(true);
              }}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onPreviewImage={(url, title) => setPreviewImage({ url, title })}
              currentShopName={currentShopName}
            />
          )}

          {activeTab === 'checks' && (
            <ChecksView
              checks={checks}
              customers={customers}
              customerInvoices={customerInvoices}
              onAddCheck={() => {
                setCheckToEdit(null);
                setIsCheckModalOpen(true);
              }}
              onEditCheck={(chk) => {
                setCheckToEdit(chk);
                setIsCheckModalOpen(true);
              }}
              onDeleteCheck={handleDeleteCheck}
              onCashCheck={handleCashCheck}
              onPreviewImage={(url, title) => setPreviewImage({ url, title })}
            />
          )}

          {activeTab === 'received_invoices' && (
            <ReceivedInvoicesView
              invoices={receivedInvoices}
              onAddInvoice={() => {
                setReceivedInvoiceToEdit(null);
                setIsReceivedInvoiceModalOpen(true);
              }}
              onEditInvoice={(inv) => {
                setReceivedInvoiceToEdit(inv);
                setIsReceivedInvoiceModalOpen(true);
              }}
              onDeleteInvoice={handleDeleteReceivedInvoice}
              onToggleReceiptStatus={handleToggleReceiptStatus}
              onPreviewImage={(url, title) => setPreviewImage({ url, title })}
            />
          )}

          {activeTab === 'customer_invoices' && (
            <CustomerInvoicesView
              invoices={customerInvoices}
              customers={customers}
              checks={checks}
              onAddInvoice={() => {
                setCustomerInvoiceToEdit(null);
                setIsCustomerInvoiceModalOpen(true);
              }}
              onEditInvoice={(inv) => {
                setCustomerInvoiceToEdit(inv);
                setIsCustomerInvoiceModalOpen(true);
              }}
              onDeleteInvoice={handleDeleteCustomerInvoice}
              onAddCheckForInvoice={handleAddCheckForInvoice}
              onPreviewImage={(url, title) => setPreviewImage({ url, title })}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              checks={checks}
              customerInvoices={customerInvoices}
              onAddCustomer={() => {
                setCustomerToEdit(null);
                setIsCustomerModalOpen(true);
              }}
              onEditCustomer={(cust) => {
                setCustomerToEdit(cust);
                setIsCustomerModalOpen(true);
              }}
              onDeleteCustomer={handleDeleteCustomer}
              onSelectCustomer={(customerId) => {
                setActiveTab('checks');
              }}
              onCashCheck={handleCashCheck}
              onPreviewImage={(url, title) => setPreviewImage({ url, title })}
              onAddCheckForCustomer={(cust) => {
                setCheckToEdit({
                  customerId: cust.id,
                  customerName: cust.name,
                  checkNumber: '',
                } as any);
                setIsCheckModalOpen(true);
              }}
              onAddInvoiceForCustomer={(cust) => {
                setCustomerInvoiceToEdit({
                  customerId: cust.id,
                  customerName: cust.name,
                } as any);
                setIsCustomerInvoiceModalOpen(true);
              }}
            />
          )}

          {activeTab === 'automation' && (
            <AutomationBotView
              checks={checks}
              notifications={notifications}
              onRunBotScan={() => runBotScan(true)}
              onCashCheck={handleCashCheck}
              onRequestBrowserPermission={requestBrowserPermission}
              hasBrowserPermission={hasBrowserPermission}
              onMarkAllAsRead={handleMarkAllAsRead}
              onDeleteNotification={handleDeleteNotification}
              onClearAllNotifications={handleClearAllNotifications}
            />
          )}

          {/* Main System Footer */}
          <Footer
            currentShopName={currentShopName}
            currentShopId={currentShopId}
            isGasConnected={isGasConfigured()}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onOpenShopManagement={isAdmin ? () => {
              setSettingsInitialTab('shops');
              setIsSettingsModalOpen(true);
            } : undefined}
            onOpenSettings={isAdmin ? () => {
              setSettingsInitialTab('database');
              setIsSettingsModalOpen(true);
            } : undefined}
            checksCount={checks.length}
            unreceivedCount={unreceivedInvoicesCount}
            customersCount={customers.length}
            isAdmin={isAdmin}
          />
        </main>
      </div>

      {/* ==================== Modals ==================== */}

      {/* Check Form Modal */}
      <CheckFormModal
        isOpen={isCheckModalOpen}
        onClose={() => {
          setIsCheckModalOpen(false);
          setCheckToEdit(null);
        }}
        onSave={handleSaveCheck}
        initialData={checkToEdit}
        customers={customers}
        customerInvoices={customerInvoices}
        onPreviewImage={(url, title) => setPreviewImage({ url, title })}
        currentShopName={currentShopName}
      />

      {/* Received Invoice Form Modal (Standalone) */}
      <ReceivedInvoiceFormModal
        isOpen={isReceivedInvoiceModalOpen}
        onClose={() => {
          setIsReceivedInvoiceModalOpen(false);
          setReceivedInvoiceToEdit(null);
        }}
        onSave={handleSaveReceivedInvoice}
        initialData={receivedInvoiceToEdit}
        onPreviewImage={(url, title) => setPreviewImage({ url, title })}
        currentShopName={currentShopName}
      />

      {/* Customer Invoice Form Modal (Supports Inline New Customer) */}
      <CustomerInvoiceFormModal
        isOpen={isCustomerInvoiceModalOpen}
        onClose={() => {
          setIsCustomerInvoiceModalOpen(false);
          setCustomerInvoiceToEdit(null);
        }}
        onSave={handleSaveCustomerInvoice}
        initialData={customerInvoiceToEdit}
        customers={customers}
        onPreviewImage={(url, title) => setPreviewImage({ url, title })}
        currentShopName={currentShopName}
      />

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setCustomerToEdit(null);
        }}
        onSave={handleSaveCustomer}
        initialData={customerToEdit}
      />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllAsRead}
        onMarkAsRead={handleMarkAsRead}
        onDeleteNotification={handleDeleteNotification}
        onClearAllNotifications={handleClearAllNotifications}
        onRunBotScan={() => runBotScan(true)}
        onCashCheck={handleCashCheck}
        onRequestBrowserPermission={requestBrowserPermission}
        hasBrowserPermission={hasBrowserPermission}
      />

      {/* Shop Management Modal (Multi-Tenant Management - Admin Only) */}
      <ShopManagementModal
        isOpen={isShopManagementOpen && isAdmin}
        onClose={() => setIsShopManagementOpen(false)}
        shops={shops}
        onShopsUpdated={(updatedShops) => setShops(updatedShops)}
        isAdmin={isAdmin}
      />

      {/* Google Apps Script & Database & Shop Management Settings Modal (Admin Only) */}
      <SettingsModal
        isOpen={isSettingsModalOpen && isAdmin}
        onClose={() => setIsSettingsModalOpen(false)}
        onConnectionSuccess={() => fetchShopData(currentShopId)}
        currentShopName={currentShopName}
        currentShopId={currentShopId}
        shops={shops}
        onShopsUpdated={(updatedShops) => setShops(updatedShops)}
        onSelectShop={handleSelectShop}
        initialTab={settingsInitialTab}
        isAdmin={isAdmin}
      />

      {/* Image & Gallery Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.title || 'معاينة المستند'}
      />
    </div>
  );
}
