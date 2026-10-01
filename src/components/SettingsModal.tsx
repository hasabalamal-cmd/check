import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudUpload,
  Folder,
  Layers,
  Store,
  Plus,
  Trash2,
  Edit2,
  Check,
  Building,
  User,
  Phone,
  Mail,
  Lock,
  Power,
  RotateCcw,
} from 'lucide-react';
import { Shop } from '../types';
import {
  getGasApiUrl,
  setGasApiUrl,
  testGasConnection,
  runMigrationInGas,
  createShopInGas,
  updateShopInGas,
  deleteShopInGas,
  isGasConfigured,
} from '../services/gasApi';
import { saveStoredShops } from '../services/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess: () => void;
  currentShopName?: string;
  currentShopId?: string;
  shops: Shop[];
  onShopsUpdated: (updatedShops: Shop[]) => void;
  onSelectShop?: (shopId: string) => void;
  initialTab?: 'shops' | 'database';
  isAdmin?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConnectionSuccess,
  currentShopName = 'Bunn',
  currentShopId = 'BUNN',
  shops,
  onShopsUpdated,
  onSelectShop,
  initialTab = 'shops',
  isAdmin = true,
}) => {
  const [activeTab, setActiveTab] = useState<'shops' | 'database'>(initialTab);

  // Database Tab States
  const [url, setUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  // Shop Management Tab States
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isAddingShop, setIsAddingShop] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [shopSuccess, setShopSuccess] = useState<string | null>(null);
  const [isSavingShop, setIsSavingShop] = useState(false);

  // Shop Form Inputs
  const [formShopId, setFormShopId] = useState('');
  const [formShopName, setFormShopName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    if (isOpen && isAdmin) {
      setUrl(getGasApiUrl());
      setTestResult(null);
      setMigrationResult(null);
      setActiveTab(initialTab);
      resetShopForm();
    }
  }, [isOpen, initialTab, isAdmin]);

  if (!isOpen) return null;

  // Strict check: Settings, Shop Management and Google Sheets database are Admin-only
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-500 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">صلاحية محظورة - للمدير فقط</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            إعدادات النظام وإدارة المحلات المتعددة وربط قواعد بيانات Google Sheets و Google Drive متاحة حصرياً للمدير (Admin).
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    );
  }

  // ==================== Database Sync Handlers ====================
  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setGasApiUrl('');
      setTestResult({ success: false, message: 'تم إفراغ الرابط. سيعمل التطبيق بالوضع المحلي (Cache).' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await testGasConnection(url.trim());
    setTestResult(result);
    setIsTesting(false);

    if (result.success) {
      setGasApiUrl(url.trim());
      onConnectionSuccess();
    }
  };

  const handleRunMigration = async () => {
    if (!url.trim()) {
      setMigrationResult('يرجى حفظ واختبار رابط Google Apps Script أولاً.');
      return;
    }
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const res = await runMigrationInGas();
      if (res.success) {
        setMigrationResult(res.message || 'تم تحديث وترحيل الجداول في Google Sheets بنجاح!');
        onConnectionSuccess();
      } else {
        setMigrationResult('فشل في تنفيذ الترحيل.');
      }
    } catch (err: any) {
      setMigrationResult(err.message || 'حدث خطأ أثناء الترحيل.');
    } finally {
      setIsMigrating(false);
    }
  };

  // ==================== Shop Management Handlers ====================
  const resetShopForm = () => {
    setIsAddingShop(false);
    setEditingShop(null);
    setFormShopId('');
    setFormShopName('');
    setFormUsername('');
    setFormPassword('');
    setFormContactName('');
    setFormPhone('');
    setFormEmail('');
    setFormStatus('active');
    setFormNotes('');
    setShopError(null);
    setShopSuccess(null);
  };

  const startAddShop = () => {
    resetShopForm();
    setIsAddingShop(true);
  };

  const startEditShop = (s: Shop) => {
    resetShopForm();
    setEditingShop(s);
    setFormShopId(s.shopId);
    setFormShopName(s.shopName);
    setFormUsername('');
    setFormPassword('');
    setFormContactName(s.contactName || '');
    setFormPhone(s.phone || '');
    setFormEmail(s.email || '');
    setFormStatus(s.status);
    setFormNotes(s.notes || '');
  };

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setShopError(null);
    setShopSuccess(null);

    const cleanShopId = formShopId.trim().toUpperCase();
    if (!cleanShopId) {
      setShopError('يرجى إدخال معرف المحل (ShopID)');
      return;
    }

    if (!formShopName.trim()) {
      setShopError('يرجى إدخال اسم المحل');
      return;
    }
    if (isAddingShop && formPassword.length < 10) {
      setShopError('كلمة المرور مطلوبة ويجب ألا تقل عن 10 أحرف.');
      return;
    }

    // Check duplicate ID when adding
    if (isAddingShop) {
      const exists = shops.some((s) => s.shopId.toUpperCase() === cleanShopId);
      if (exists) {
        setShopError(`معرف المحل "${cleanShopId}" موجود مسبقاً، يرجى اختيار معرف فريد.`);
        return;
      }
    }

    const targetShop: Shop = {
      shopId: cleanShopId,
      shopName: formShopName.trim(),
      contactName: formContactName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      status: formStatus,
      notes: formNotes.trim(),
      createdAt: editingShop ? editingShop.createdAt : new Date().toISOString(),
    };

    setIsSavingShop(true);

    try {
      if (!isGasConfigured()) {
        throw new Error('يلزم ربط Google Apps Script قبل إدارة المحلات.');
      }
      if (editingShop) {
        await updateShopInGas(targetShop);
      } else {
        await createShopInGas(targetShop, formUsername.trim() || cleanShopId.toLowerCase(), formPassword);
      }
      const updated = editingShop
        ? shops.map((s) => (s.shopId === editingShop.shopId ? targetShop : s))
        : [...shops, targetShop];
      onShopsUpdated(updated);
      saveStoredShops(updated);

      setShopSuccess(`تم ${editingShop ? 'تعديل' : 'إضافة'} المحل بنجاح!`);
      resetShopForm();
    } catch (err: any) {
      setShopError(err?.message || 'فشل في حفظ المحل.');
    } finally {
      setIsSavingShop(false);
    }
  };

  const handleToggleShopStatus = async (s: Shop) => {
    const nextStatus: 'active' | 'inactive' = s.status === 'active' ? 'inactive' : 'active';
    const updatedShop: Shop = { ...s, status: nextStatus };
    try {
      await updateShopInGas(updatedShop);
      const updated = shops.map((item) => (item.shopId === s.shopId ? updatedShop : item));
      onShopsUpdated(updated);
      saveStoredShops(updated);
    } catch (err) {
      setShopError(err instanceof Error ? err.message : 'تعذر تحديث حالة المحل.');
    }
  };

  const handleDeleteShop = async (targetId: string) => {
    if (shops.length <= 1) {
      alert('لا يمكن حذف المحل الأخير. يجب الإبقاء على محل واحد على الأقل.');
      return;
    }

    if (targetId === currentShopId) {
      alert('لا يمكن حذف المحل المختار حالياً. يرجى التبديل إلى محل آخر أولاً.');
      return;
    }

    const conf = window.confirm(`سيتم تعطيل المحل "${targetId}" مع الإبقاء على بياناته. هل تريد المتابعة؟`);
    if (!conf) return;

    try {
      await deleteShopInGas(targetId);
      const updated = shops.map((shop) => shop.shopId === targetId ? { ...shop, status: 'inactive' as const } : shop);
      onShopsUpdated(updated);
      saveStoredShops(updated);
    } catch (err) {
      setShopError(err instanceof Error ? err.message : 'تعذر تعطيل المحل.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="relative max-w-4xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">إعدادات النظام (Settings)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إدارة المحلات المتعددة وربط قواعد بيانات Google Sheets و Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 px-6 pt-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('shops')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'shops'
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-emerald-500/10 rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>إدارة المحلات ({shops.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-emerald-500/10 rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>ربط خادم Google Sheets & Drive</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* ==================== TAB 1: SHOP MANAGEMENT ==================== */}
          {activeTab === 'shops' && (
            <div className="space-y-6">
              {shopError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                  <span>{shopError}</span>
                </div>
              )}

              {shopSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                  <span>{shopSuccess}</span>
                </div>
              )}

              {/* Add / Edit Form */}
              {(isAddingShop || editingShop) ? (
                <form onSubmit={handleSaveShop} className="bg-slate-50 dark:bg-slate-800/70 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{isAddingShop ? 'إضافة محل جديد' : `تعديل بيانات المحل (${editingShop?.shopId})`}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={resetShopForm}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* ShopID */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        معرف المحل (ShopID) <span className="text-rose-500">* (فريد ولا يتكرر)</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!!editingShop}
                        value={formShopId}
                        onChange={(e) => setFormShopId(e.target.value.toUpperCase())}
                        placeholder="مثال: BUNN, ABC001"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>

                    {/* ShopName */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        اسم المحل <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formShopName}
                        onChange={(e) => setFormShopName(e.target.value)}
                        placeholder="مثال: متجر Bunn للقهوة"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {isAddingShop && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Username */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        اسم المستخدم للدخول
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                        <input
                          type="text"
                          value={formUsername}
                          onChange={(e) => setFormUsername(e.target.value)}
                          placeholder="مثال: bunn"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        كلمة المرور (10 أحرف على الأقل)
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                        <input
                          type="password"
                          required={isAddingShop}
                          minLength={isAddingShop ? 10 : undefined}
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder="أنشئ كلمة مرور قوية"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Contact Person */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        اسم المسؤول
                      </label>
                      <input
                        type="text"
                        value={formContactName}
                        onChange={(e) => setFormContactName(e.target.value)}
                        placeholder="أبو فهد العتيبي"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        رقم الجوال
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                        <input
                          type="tel"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="05xxxxxxxx"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        البريد الإلكتروني
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                        <input
                          type="email"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder="store@example.com"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        حالة المحل
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option value="active">مفعّل (نشط)</option>
                        <option value="inactive">معطّل (غير نشط)</option>
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        ملاحظات
                      </label>
                      <input
                        type="text"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="أي ملاحظات خاصة بالمحل..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={resetShopForm}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingShop}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-600/20"
                    >
                      {isSavingShop ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>{editingShop ? 'حفظ التعديلات' : 'إضافة المحل'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">قائمة المحلات المسجلة في النظام</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      كل محل له بياناته المستقلة المعزولة تماماً بـ <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">ShopID</span>
                    </p>
                  </div>
                  <button
                    onClick={startAddShop}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة محل جديد</span>
                  </button>
                </div>
              )}

              {/* Shops Cards / List */}
              <div className="grid grid-cols-1 gap-3">
                {shops.map((s) => {
                  const isCurrent = s.shopId === currentShopId;
                  const isActive = s.status === 'active';

                  return (
                    <div
                      key={s.shopId}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-emerald-50/70 dark:bg-slate-800/90 border-emerald-300 dark:border-emerald-500/60 shadow-sm'
                          : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Shop Info */}
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                            isCurrent
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {s.shopName.charAt(0)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                {s.shopName}
                              </span>
                              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-bold">
                                {s.shopId}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold">
                                  المحل الحالي
                                </span>
                              )}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                isActive
                                  ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                                  : 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                              }`}>
                                {isActive ? 'مفعّل' : 'معطّل'}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                              {s.contactName && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span>{s.contactName}</span>
                                </span>
                              )}
                              {s.phone && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{s.phone}</span>
                                </span>
                              )}
                            </div>
                            {s.notes && (
                              <p className="text-[11px] text-slate-500 mt-1 truncate">
                                {s.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {onSelectShop && !isCurrent && isActive && (
                            <button
                              onClick={() => {
                                onSelectShop(s.shopId);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                              title="التبديل إلى هذا المحل"
                            >
                              اختيار
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleShopStatus(s)}
                            className={`p-2 rounded-xl text-xs border transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                            }`}
                            title={isActive ? 'تعطيل المحل' : 'تفعيل المحل'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => startEditShop(s)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                            title="تعديل بيانات المحل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteShop(s.shopId)}
                            disabled={shops.length <= 1 || s.shopId === currentShopId}
                            className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="حذف المحل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: DATABASE & GOOGLE APPS SCRIPT ==================== */}
          {activeTab === 'database' && (
            <form onSubmit={handleTestAndSave} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  رابط تطبيق الويب (Google Apps Script Web App URL)
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  الرابط الذي تحصل عليه بعد النشر (Deploy → New deployment → Web app) بصلاحية الوصول (Anyone).
                </p>
              </div>

              {/* Test connection result */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  )}
                  <div className="space-y-1">
                    <span className="font-semibold">{testResult.message}</span>
                  </div>
                </div>
              )}

              {/* Migration to Multi-Tenant Tool */}
              {url && testResult?.success && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>ترقية وتهيئة جداول Google Sheets لنظام Multi-Tenant</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        إضافة عمود ShopID وإنشاء جدول المحلات Shops دون حذف أو تعديل أي سجلات قديمة.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunMigration}
                      disabled={isMigrating}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/30 dark:hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white border border-emerald-300 dark:border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
                    >
                      {isMigrating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CloudUpload className="w-3.5 h-3.5" />
                      )}
                      <span>تشغيل الترحيل الآمن</span>
                    </button>
                  </div>
                  {migrationResult && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
                      {migrationResult}
                    </div>
                  )}
                </div>
              )}

              {/* Setup Instructions Helper */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>ملف الكود المحدث في المشروع: google-apps-script/Code.gs</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  يدعم الكود الآن عزل بيانات كل محل عبر <code className="text-emerald-600 dark:text-emerald-400 font-bold">ShopID</code>، وتخزين المرفقات في مجلدات مستقلة في Google Drive، ويدعم تسجيل دخول كل محل على حدة.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري اختبار الاتصال...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حفظ واختبار الاتصال</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
