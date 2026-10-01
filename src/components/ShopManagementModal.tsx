import React, { useState } from 'react';
import {
  X,
  Store,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Phone,
  Mail,
  Lock,
} from 'lucide-react';
import { Shop } from '../types';
import { createShopInGas, updateShopInGas, deleteShopInGas, isGasConfigured } from '../services/gasApi';
import { saveStoredShops } from '../services/auth';

interface ShopManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  shops: Shop[];
  onShopsUpdated: (updatedShops: Shop[]) => void;
  isAdmin?: boolean;
}

export const ShopManagementModal: React.FC<ShopManagementModalProps> = ({
  isOpen,
  onClose,
  shops,
  onShopsUpdated,
  isAdmin = true,
}) => {
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form inputs
  const [shopId, setShopId] = useState('');
  const [shopName, setShopName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-500 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">صلاحية محظورة - للمدير فقط</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            إدارة المحلات والحسابات متاحة حصرياً للمدير (Admin).
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

  const startAddShop = () => {
    setIsAdding(true);
    setEditingShop(null);
    setShopId('');
    setShopName('');
    setUsername('');
    setPassword('');
    setContactName('');
    setPhone('');
    setEmail('');
    setStatus('active');
    setNotes('');
    setError(null);
    setSuccess(null);
  };

  const startEditShop = (s: Shop) => {
    setEditingShop(s);
    setIsAdding(false);
    setShopId(s.shopId);
    setShopName(s.shopName);
    setUsername('');
    setPassword('');
    setContactName(s.contactName || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setStatus(s.status);
    setNotes(s.notes || '');
    setError(null);
    setSuccess(null);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingShop(null);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanShopId = shopId.trim().toUpperCase();
    if (!cleanShopId) {
      setError('يرجى إدخال معرف المحل (ShopID)');
      return;
    }

    if (!shopName.trim()) {
      setError('يرجى إدخال اسم المحل');
      return;
    }
    if (isAdding && password.length < 10) {
      setError('كلمة المرور مطلوبة ويجب ألا تقل عن 10 أحرف.');
      return;
    }

    // Check duplicate ID when adding
    if (isAdding) {
      const exists = shops.some((s) => s.shopId.toUpperCase() === cleanShopId);
      if (exists) {
        setError(`معرف المحل "${cleanShopId}" موجود مسبقاً، يرجى اختيار معرف فريد.`);
        return;
      }
    }

    const targetShop: Shop = {
      shopId: cleanShopId,
      shopName: shopName.trim(),
      contactName: contactName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      status,
      notes: notes.trim(),
      createdAt: editingShop ? editingShop.createdAt : new Date().toISOString(),
    };

    setIsLoading(true);

    try {
      if (!isGasConfigured()) throw new Error('يلزم ربط Google Apps Script قبل إدارة المحلات.');
      if (editingShop) {
        await updateShopInGas(targetShop);
      } else {
        await createShopInGas(targetShop, username.trim() || cleanShopId.toLowerCase(), password);
      }
      const updated = editingShop
        ? shops.map((s) => (s.shopId === editingShop.shopId ? targetShop : s))
        : [...shops, targetShop];
      onShopsUpdated(updated);
      saveStoredShops(updated);

      setSuccess(`تم حفظ المحل "${targetShop.shopName}" بنجاح!`);
      cancelForm();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ المحل.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (s: Shop) => {
    const newStatus = s.status === 'active' ? 'inactive' : 'active';
    const updatedShop: Shop = { ...s, status: newStatus };
    try {
      await updateShopInGas(updatedShop);
      const updated = shops.map((item) => (item.shopId === s.shopId ? updatedShop : item));
      onShopsUpdated(updated);
      saveStoredShops(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث حالة المحل.');
    }
  };

  const handleDelete = async (targetId: string) => {
    if (shops.length <= 1) {
      alert('لا يمكن حذف المحل الأخير. يجب الإبقاء على محل واحد على الأقل.');
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
      setError(err instanceof Error ? err.message : 'تعذر تعطيل المحل.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="relative max-w-3xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">إدارة المحلات والحسابات (Multi-Tenant)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إضافة محلات جديدة وتعديل بياناتها والتحكم بصلاحيات الدخول
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Form Modal Sub-section */}
          {isAdding || editingShop ? (
            <form onSubmit={handleSave} className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {isAdding ? 'إضافة محل جديد إلى النظام' : `تعديل بيانات المحل (${editingShop?.shopId})`}
                </h4>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  إلغاء النموذج
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    معرف المحل (ShopID فريد) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingShop)}
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value.toUpperCase())}
                    placeholder="مثال: BUNN أو ABC001"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs font-mono disabled:opacity-50 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">حروف إنجليزية وأرقام فقط دون مسافات</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المحل بالعربية أو الإنجليزية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="مثال: Bunn Cafe & Roastery"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {isAdding && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المستخدم للدخول
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="اسم المستخدم للدخول للمحل"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    كلمة المرور (10 أحرف على الأقل)
                  </label>
                  <input
                    type="password"
                    required={isAdding}
                    minLength={isAdding ? 10 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أنشئ كلمة مرور قوية"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              }

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المسؤول
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="الشخص المسؤول"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الجوال
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    حالة المحل
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="active">مفعّل (Active)</option>
                    <option value="inactive">معطّل (Inactive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات إضافية
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات أو تفاصيل الفرع..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? 'جاري الحفظ...' : 'حفظ بيانات المحل'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                المحلات المسجلة في النظام ({shops.length})
              </span>
              <button
                type="button"
                onClick={startAddShop}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة محل جديد</span>
              </button>
            </div>
          )}

          {/* List of Shops */}
          <div className="grid grid-cols-1 gap-3">
            {shops.map((s) => {
              const isActive = s.status === 'active';
              return (
                <div
                  key={s.shopId}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-sm shrink-0">
                      {s.shopId.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{s.shopName}</h4>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-cyan-700 dark:text-cyan-300">
                          {s.shopId}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                          }`}
                        >
                          {isActive ? 'مفعّل' : 'معطّل'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {s.contactName && <span>المسؤول: {s.contactName}</span>}
                        {s.phone && <span>الجوال: {s.phone}</span>}
                      </div>
                      {s.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">"{s.notes}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                          : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                      }`}
                      title={isActive ? 'تعطيل المحل' : 'تفعيل المحل'}
                    >
                      {isActive ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditShop(s)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors text-xs cursor-pointer"
                      title="تعديل المحل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.shopId)}
                      className="p-2 bg-slate-100 hover:bg-rose-100 dark:bg-slate-700 dark:hover:bg-rose-900/60 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 rounded-xl transition-colors text-xs cursor-pointer"
                      title="حذف المحل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
