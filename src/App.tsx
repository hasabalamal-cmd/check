import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { User } from 'firebase/auth';
import { Customer, CheckItem, CustomerInvoice, ReceivedInvoice, AlertNotification } from './types';
import {
  loadStoredData,
  saveCustomers,
  saveChecks,
  saveCustomerInvoices,
  saveReceivedInvoices,
  saveNotifications,
  resetToSeedData,
} from './services/storage';
import {
  getTodayString,
  computeCheckStatus,
  evaluateCheckNotifications,
  formatCurrency,
  formatArabicDate,
} from './utils/checkCalculations';
import { initAuth } from './services/auth';
import {
  isGasConfigured,
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

// Modals
import { CheckFormModal } from './components/CheckFormModal';
import { ReceivedInvoiceFormModal } from './components/ReceivedInvoiceFormModal';
import { CustomerInvoiceFormModal } from './components/CustomerInvoiceFormModal';
import { CustomerFormModal } from './components/CustomerFormModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Main Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<ReceivedInvoice[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Browser Notification Permission
  const [hasBrowserPermission, setHasBrowserPermission] = useState<boolean>(false);

  // Cloud Database States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
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
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Load data from Google Sheets API with fallback to LocalStorage
  const loadData = useCallback(async () => {
    // 1. Initial immediate load from local cache
    const data = loadStoredData();
    setCustomers(data.customers);
    setChecks(data.checks);
    setCustomerInvoices(data.customerInvoices);
    setReceivedInvoices(data.receivedInvoices);
    setNotifications(data.notifications);

    // 2. Fetch fresh data from Google Apps Script if configured
    if (isGasConfigured()) {
      setIsLoadingGas(true);
      try {
        const gasData = await fetchAllDataFromGas();
        if (Array.isArray(gasData.customers)) {
          setCustomers(gasData.customers);
          saveCustomers(gasData.customers);
        }
        if (Array.isArray(gasData.invoices)) {
          setCustomerInvoices(gasData.invoices);
          saveCustomerInvoices(gasData.invoices);
        }
        if (Array.isArray(gasData.checks)) {
          setChecks(gasData.checks);
          saveChecks(gasData.checks);
        }
        if (Array.isArray(gasData.receivedInvoices)) {
          setReceivedInvoices(gasData.receivedInvoices);
          saveReceivedInvoices(gasData.receivedInvoices);
        }
        setGasNotification('تمت مزامنة البيانات بنجاح من Google Sheets');
        setTimeout(() => setGasNotification(null), 4000);
      } catch (err: any) {
        console.warn('Google Apps Script sync offline, using local cache:', err);
      } finally {
        setIsLoadingGas(false);
      }
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    loadData();

    // Check browser notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasBrowserPermission(Notification.permission === 'granted');
    }

    // Initialize Firebase Auth listener
    const unsubscribe = initAuth(
      (user) => setCurrentUser(user),
      () => setCurrentUser(null)
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [loadData]);

  // Run automated check scanner
  const runBotScan = useCallback(
    (showToast: boolean = true) => {
      const today = getTodayString();

      // Recalculate checks with updated status based on today
      const updatedChecks = checks.map((c) => ({
        ...c,
        status: computeCheckStatus(c, today),
      }));

      // Generate alerts according to schedule (7 days, 3 days, 1 day, today, overdue)
      const newAlerts = evaluateCheckNotifications(updatedChecks, today);

      // Merge with existing notifications avoiding duplicates
      const existingIds = new Set(notifications.map((n) => n.id));
      const filteredNew = newAlerts.filter((a) => !existingIds.has(a.id));

      const mergedNotifications = [...filteredNew, ...notifications];

      setChecks(updatedChecks);
      saveChecks(updatedChecks);

      if (filteredNew.length > 0) {
        setNotifications(mergedNotifications);
        saveNotifications(mergedNotifications);

        // Send browser notification if permission granted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          filteredNew.forEach((alert) => {
            try {
              new Notification(`تنبيه شيك ${alert.daysRemaining <= 0 ? 'مستحق' : 'قادم'}: ${alert.storeName}`, {
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
    [checks, notifications]
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
        new Notification('سند - نظام الشيكات والفواتير', {
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
    saveCustomers(updated);
    setCustomerToEdit(null);

    // Sync to Google Apps Script
    if (isGasConfigured()) {
      try {
        if (isEdit) {
          await updateCustomerInGas(targetCustomer);
        } else {
          await createCustomerInGas(targetCustomer);
        }
      } catch (err) {
        console.warn('Error syncing customer to GAS:', err);
      }
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const cust = customers.find((c) => c.id === id);
    if (!cust) return;
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف بيانات المحل "${cust.name}"؟`);
    if (!confirmDelete) return;

    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    saveCustomers(updated);

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
        checkNumber: checkData.checkNumber || '',
        customerId: checkData.customerId || '',
        customerName: checkData.customerName || '',
        amount: checkData.amount || 0,
        dueDate: checkData.dueDate || getTodayString(),
        linkedInvoiceId: checkData.linkedInvoiceId,
        linkedInvoiceNumber: checkData.linkedInvoiceNumber,
        bankName: checkData.bankName,
        notes: checkData.notes,
        image: checkData.image,
        status: checkData.status || 'upcoming',
        manualStatus: checkData.manualStatus,
        cashedDate: checkData.cashedDate,
        createdAt: new Date().toISOString(),
      };
      updated = [targetCheck, ...checks];
    }
    setChecks(updated);
    saveChecks(updated);
    setCheckToEdit(null);

    // Sync to Google Apps Script
    if (isGasConfigured()) {
      try {
        if (isEdit) {
          await updateChequeInGas(targetCheck);
        } else {
          await createChequeInGas(targetCheck);
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
    saveChecks(updated);

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
    saveChecks(updated);

    // Celebration confetti
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
  const handleSaveCustomerInvoice = async (invData: Partial<CustomerInvoice>) => {
    let updated: CustomerInvoice[];
    let targetInv: CustomerInvoice;
    const isEdit = Boolean(customerInvoiceToEdit);

    if (customerInvoiceToEdit) {
      targetInv = { ...customerInvoiceToEdit, ...invData } as CustomerInvoice;
      updated = customerInvoices.map((inv) => (inv.id === customerInvoiceToEdit.id ? targetInv : inv));
    } else {
      targetInv = {
        id: `cinv-${Date.now()}`,
        invoiceNumber: invData.invoiceNumber || '',
        customerId: invData.customerId || '',
        customerName: invData.customerName || '',
        amount: invData.amount || 0,
        invoiceDate: invData.invoiceDate || getTodayString(),
        receiptStatus: invData.receiptStatus || 'مستحق',
        receiptDate: invData.receiptDate,
        notes: invData.notes,
        image: invData.image,
        createdAt: new Date().toISOString(),
      };
      updated = [targetInv, ...customerInvoices];
    }
    setCustomerInvoices(updated);
    saveCustomerInvoices(updated);
    setCustomerInvoiceToEdit(null);

    if (isGasConfigured()) {
      try {
        if (isEdit) {
          await updateInvoiceInGas(targetInv);
        } else {
          await createInvoiceInGas(targetInv);
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
    saveCustomerInvoices(updated);

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
    } as any);
    setIsCheckModalOpen(true);
  };

  // ==================== Received Invoices Handlers (Standalone!) ====================
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
        invoiceNumber: invData.invoiceNumber || '',
        sourceName: invData.sourceName || '',
        amount: invData.amount || 0,
        invoiceDate: invData.invoiceDate || getTodayString(),
        notes: invData.notes,
        image: invData.image,
        receiptStatus: invData.receiptStatus || 'not_received', // Manual only!
        receiptDate: invData.receiptDate,
        createdAt: new Date().toISOString(),
      };
      updated = [targetInv, ...receivedInvoices];
    }
    setReceivedInvoices(updated);
    saveReceivedInvoices(updated);
    setReceivedInvoiceToEdit(null);

    if (isGasConfigured()) {
      try {
        if (isEdit) {
          await updateReceivedInvoiceInGas(targetInv);
        } else {
          await createReceivedInvoiceInGas(targetInv);
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
    saveReceivedInvoices(updated);

    if (isGasConfigured()) {
      try {
        await deleteReceivedInvoiceInGas(id);
      } catch (err) {
        console.warn('Error deleting received invoice in GAS:', err);
      }
    }
  };

  // Direct manual toggle for Received Invoice: strictly manual!
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
    saveReceivedInvoices(updated);

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
    saveNotifications(updated);
  };

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    saveNotifications(updated);
  };

  // Reset to seed data
  const handleResetSeedData = () => {
    const confirmed = window.confirm('هل تريد استعادة البيانات النموذجية الأساسية؟ سيتم تحديث السجلات الحالية.');
    if (!confirmed) return;

    const fresh = resetToSeedData();
    setCustomers(fresh.customers);
    setChecks(fresh.checks);
    setCustomerInvoices(fresh.customerInvoices);
    setReceivedInvoices(fresh.receivedInvoices);
    setNotifications(fresh.notifications);
    runBotScan(true);
  };

  // Badge calculations
  const unreadAlertsCount = notifications.filter((n) => !n.isRead).length;
  const unreceivedInvoicesCount = receivedInvoices.filter((i) => i.receiptStatus === 'not_received').length;
  const dueTodayChecksCount = checks.filter((c) => c.status === 'due_today').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        unreadAlertsCount={unreadAlertsCount}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
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
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onRefreshGasData={loadData}
      />

      {/* Cloud Sync Toast Notification */}
      {gasNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600/90 text-white text-xs font-semibold rounded-full shadow-xl border border-emerald-400/40 backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          {gasNotification}
        </div>
      )}

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          checksCount={checks.length}
          receivedInvoicesCount={receivedInvoices.length}
          unreceivedCount={unreceivedInvoicesCount}
          dueTodayCount={dueTodayChecksCount}
          onResetSeedData={handleResetSeedData}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-x-hidden">
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
            />
          )}
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
      />

      {/* Customer Invoice Form Modal */}
      <CustomerInvoiceFormModal
        isOpen={isCustomerInvoiceModalOpen}
        onClose={() => {
          setIsCustomerInvoiceModalOpen(false);
          setCustomerInvoiceToEdit(null);
        }}
        onSave={handleSaveCustomerInvoice}
        initialData={customerInvoiceToEdit}
        customers={customers}
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
        onRunBotScan={() => runBotScan(true)}
        onCashCheck={handleCashCheck}
        onRequestBrowserPermission={requestBrowserPermission}
        hasBrowserPermission={hasBrowserPermission}
      />

      {/* Google Sheets Direct Sync Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        currentUser={currentUser}
        onAuthChange={setCurrentUser}
        data={{
          customers,
          checks,
          customerInvoices,
          receivedInvoices,
        }}
      />

      {/* Google Apps Script & Database Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onConnectionSuccess={loadData}
        data={{
          customers,
          invoices: customerInvoices,
          checks,
          receivedInvoices,
        }}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.title || 'معاينة المستند'}
      />
    </div>
  );
}
