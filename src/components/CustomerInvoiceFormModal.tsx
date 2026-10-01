import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Building,
  FileSpreadsheet,
  Clock,
  Plus,
  DollarSign,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { CustomerInvoice, Customer, Attachment } from '../types';
import { getTodayString } from '../utils/checkCalculations';
import { MultipleFileUploader } from './MultipleFileUploader';
import { parseAttachments, serializeAttachments } from '../utils/imageUrl';
import { getActiveShopId } from '../services/auth';

interface CustomerInvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: Partial<CustomerInvoice>, newCustomerData?: Partial<Customer>) => void;
  initialData?: CustomerInvoice | null;
  customers: Customer[];
  onPreviewImage?: (url: string, title: string) => void;
  currentShopName?: string;
}

export const CustomerInvoiceFormModal: React.FC<CustomerInvoiceFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  customers,
  onPreviewImage,
  currentShopName,
}) => {
  // Mode: existing customer vs new customer
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');

  // Existing customer selection
  const [customerId, setCustomerId] = useState('');

  // New customer fields
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Invoice fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [invoiceDate, setInvoiceDate] = useState(getTodayString());
  const [receiptStatus, setReceiptStatus] = useState<CustomerInvoice['receiptStatus']>('مستحق');
  const [receiptDate, setReceiptDate] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (initialData) {
      setInvoiceNumber(initialData.invoiceNumber || '');
      setCustomerId(initialData.customerId || '');
      setAmount(initialData.amount || '');
      setInvoiceDate(initialData.invoiceDate || getTodayString());
      setReceiptStatus(initialData.receiptStatus || 'مستحق');
      setReceiptDate(initialData.receiptDate || '');
      setNotes(initialData.notes || '');
      setCustomerMode('existing');

      if (initialData.attachments && initialData.attachments.length > 0) {
        setAttachments(initialData.attachments);
      } else if (initialData.image) {
        setAttachments(parseAttachments(initialData.image));
      } else {
        setAttachments([]);
      }
    } else {
      setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setCustomerId('');
      setAmount('');
      setInvoiceDate(getTodayString());
      setReceiptStatus('مستحق');
      setReceiptDate('');
      setNotes('');
      setAttachments([]);
      setCustomerMode('existing');
      setNewCustomerName('');
      setNewShopName('');
      setNewPhone('');
      setNewAddress('');
      setNewNotes('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceNumber.trim()) {
      alert('يرجى إدخال رقم الفاتورة');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح للفاتورة');
      return;
    }

    let finalCustomerId = customerId;
    let customerObj = customers.find((c) => c.id === customerId);
    let newCustomerPayload: Partial<Customer> | undefined = undefined;

    if (customerMode === 'new') {
      if (!newCustomerName.trim() && !newShopName.trim()) {
        alert('يرجى إدخال اسم العميل أو اسم المحل التجاري للعميل الجديد');
        return;
      }

      finalCustomerId = `cust-${Date.now()}`;
      newCustomerPayload = {
        id: finalCustomerId,
        name: (newShopName.trim() || newCustomerName.trim()),
        contactPerson: newCustomerName.trim() || newShopName.trim(),
        phone: newPhone.trim(),
        address: newAddress.trim(),
        notes: newNotes.trim(),
        createdAt: new Date().toISOString(),
      };
    } else {
      if (!finalCustomerId) {
        alert('يرجى اختيار العميل / المحل');
        return;
      }
    }

    const serializedImage = serializeAttachments(attachments);

    onSave(
      {
        invoiceNumber: invoiceNumber.trim(),
        customerId: finalCustomerId,
        customerName: customerMode === 'new'
          ? (newShopName.trim() || newCustomerName.trim())
          : (customerObj ? customerObj.name : ''),
        amount: Number(amount),
        invoiceDate,
        receiptStatus,
        receiptDate: receiptStatus === 'مستلم' ? (receiptDate || getTodayString()) : '',
        image: serializedImage,
        attachments,
        notes: notes.trim(),
      },
      newCustomerPayload
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="relative max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {initialData ? 'تعديل فاتورة العميل' : 'إصدار فاتورة جديدة'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                المحل الحالي: <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{currentShopName || getActiveShopId()}</span>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Customer Mode Selection */}
          {!initialData && (
            <div className="bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setCustomerMode('existing')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  customerMode === 'existing'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>اختيار عميل موجود ({customers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode('new')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  customerMode === 'new'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ عميل جديد</span>
              </button>
            </div>
          )}

          {/* Existing Customer Dropdown */}
          {customerMode === 'existing' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                اسم المحل / العميل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <select
                  required={customerMode === 'existing'}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="">-- اختر المحل أو العميل --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.contactPerson ? `(${c.contactPerson})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* New Customer Inline Creation Fields */
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-cyan-300 dark:border-cyan-500/30 space-y-3">
              <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 text-xs font-bold">
                <UserPlus className="w-4 h-4" />
                <span>بيانات العميل / المحل الجديد</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المحل / المتجر <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={customerMode === 'new'}
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    placeholder="مثال: Bunn Store أو متجر الأمل"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المسؤول / الشخص
                  </label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الجوال
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    العنوان / الموقع
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="المدينة والحي..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                رقم الفاتورة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="مثال: INV-2026-001"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Invoice Amount in DOLLARS */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                مبلغ الفاتورة بالدولار ($) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-emerald-500 absolute right-3 top-3" />
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Invoice Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                تاريخ الفاتورة <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                حالة الفاتورة
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReceiptStatus('مستحق')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    receiptStatus === 'مستحق'
                      ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-300 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>مستحقة</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptStatus('مستلم');
                    if (!receiptDate) setReceiptDate(getTodayString());
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    receiptStatus === 'مستلم'
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تم التحصيل</span>
                </button>
              </div>
            </div>
          </div>

          {/* Multiple Attachments & Files */}
          <MultipleFileUploader
            attachments={attachments}
            onChange={setAttachments}
            label="مرفقات الفاتورة (صور متعددة أو ملفات PDF)"
            onPreview={onPreviewImage}
          />

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="وصف البضاعة الموردة، رقم الشحنة، المستودع..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              {initialData ? 'حفظ تعديلات الفاتورة' : 'إصدار الفاتورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
