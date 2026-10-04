import React, { useState, useEffect } from 'react';
import { translate } from '../utils/i18n';
import {
  X,
  Calendar,
  Building,
  CreditCard,
  FileText,
  DollarSign,
} from 'lucide-react';
import { CheckItem, Customer, CustomerInvoice, Attachment } from '../types';
import { computeCheckStatus, getTodayString } from '../utils/checkCalculations';
import { MultipleFileUploader } from './MultipleFileUploader';
import { parseAttachments, serializeAttachments } from '../utils/imageUrl';
import { getActiveShopId } from '../services/auth';

interface CheckFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (checkData: Partial<CheckItem>) => void;
  initialData?: CheckItem | null;
  customers: Customer[];
  customerInvoices: CustomerInvoice[];
  onPreviewImage?: (url: string, title: string) => void;
  currentShopName?: string;
}

export const CheckFormModal: React.FC<CheckFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  customers,
  customerInvoices,
  onPreviewImage,
  currentShopName,
}) => {
  // Empty default check number as strictly requested
  const [checkNumber, setCheckNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState(getTodayString());
  const [linkedInvoiceId, setLinkedInvoiceId] = useState('');
  const [notes, setNotes] = useState('');
  const [manualStatus, setManualStatus] = useState<CheckItem['manualStatus']>(undefined);
  const [cashedDate, setCashedDate] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (initialData) {
      setCheckNumber(initialData.checkNumber || '');
      setCustomerId(initialData.customerId || '');
      setAmount(initialData.amount || '');
      setDueDate(initialData.dueDate || getTodayString());
      setLinkedInvoiceId(initialData.linkedInvoiceId || '');
      setNotes(initialData.notes || '');
      setManualStatus(initialData.manualStatus);
      setCashedDate(initialData.cashedDate || '');

      // Load attachments
      if (initialData.attachments && initialData.attachments.length > 0) {
        setAttachments(initialData.attachments);
      } else if (initialData.image) {
        setAttachments(parseAttachments(initialData.image));
      } else {
        setAttachments([]);
      }
    } else {
      // Empty default check number as requested!
      setCheckNumber('');
      setCustomerId('');
      setAmount('');
      setDueDate(getTodayString());
      setLinkedInvoiceId('');
      setNotes('');
      setManualStatus(undefined);
      setCashedDate('');
      setAttachments([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkNumber.trim()) {
      alert('يرجى إدخال رقم الشيك');
      return;
    }

    if (!customerId || !amount || Number(amount) <= 0 || !dueDate) {
      return;
    }

    const customer = customers.find((c) => c.id === customerId);
    const invoice = customerInvoices.find((i) => i.id === linkedInvoiceId);

    const serializedImage = serializeAttachments(attachments);

    // Compute automatic status unless manual
    const computedStatus = computeCheckStatus({
      dueDate,
      manualStatus,
      status: initialData?.status,
    });

    onSave({
      checkNumber: checkNumber.trim(),
      customerId,
      customerName: customer ? customer.name : '',
      amount: Number(amount),
      dueDate,
      linkedInvoiceId: linkedInvoiceId || undefined,
      linkedInvoiceNumber: invoice ? invoice.invoiceNumber : undefined,
      notes,
      image: serializedImage,
      attachments,
      status: computedStatus,
      manualStatus,
      cashedDate: manualStatus === 'cashed' ? (cashedDate || getTodayString()) : undefined,
    });

    onClose();
  };

  const customerRelatedInvoices = customerInvoices.filter(
    (inv) => inv.customerId === customerId
  );
  const isEditing = Boolean(initialData?.id);

  return (
    <div className="mobile-entry-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="mobile-entry-dialog relative max-w-2xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {translate(isEditing ? 'تعديل بيانات الشيك' : 'تسجيل شيك صادر جديد')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {translate('المحل الحالي:')} <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentShopName || getActiveShopId()}</span>
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
        <form onSubmit={handleSubmit} className="mobile-entry-form p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              اسم المحل / العميل المستلم منه الشيك <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <select
                required
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setLinkedInvoiceId('');
                }}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">{translate("-- اختر العميل / المحل --")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.contactPerson ? `(${c.contactPerson})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Check Number: MUST BE EMPTY BY DEFAULT AS REQUESTED */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                رقم الشيك <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder={translate("أدخل رقم الشيك هنا يدويًا...")}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                autoFocus
              />
            </div>

            {/* Check Amount in DOLLARS */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                مبلغ الشيك بالدولار ($) <span className="text-rose-500">*</span>
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
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              تاريخ استحقاق/صرف الشيك <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Linked Invoice */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {translate("الفاتورة المرتبطة بالشيك (اختياري)")}
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <select
                value={linkedInvoiceId}
                onChange={(e) => setLinkedInvoiceId(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">{translate("-- بدون ربط بفاتورة محددة --")}</option>
                {customerRelatedInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} - بمبلغ ${inv.amount.toLocaleString()} ({inv.invoiceDate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Override */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {translate("حالة الشيك:")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setManualStatus(undefined);
                  setCashedDate('');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  manualStatus === undefined
                    ? 'bg-blue-100 dark:bg-blue-600/25 border-blue-300 dark:border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {translate("حساب تلقائي")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualStatus('cashed');
                  if (!cashedDate) setCashedDate(getTodayString());
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  manualStatus === 'cashed'
                    ? 'bg-emerald-100 dark:bg-emerald-600/25 border-emerald-300 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {translate("تم صرفه")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualStatus('cancelled');
                  setCashedDate('');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  manualStatus === 'cancelled'
                    ? 'bg-rose-100 dark:bg-rose-600/25 border-rose-300 dark:border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {translate("ملغي")}
              </button>
            </div>

            {manualStatus === 'cashed' && (
              <div className="pt-2">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {translate("تاريخ الصرف الفعلي")}
                </label>
                <input
                  type="date"
                  value={cashedDate}
                  onChange={(e) => setCashedDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Multiple Attachments & Google Drive */}
          <MultipleFileUploader
            attachments={attachments}
            onChange={setAttachments}
            label={translate("مرفقات الشيك (صور متعددة أو مستندات)")}
            onPreview={onPreviewImage}
          />

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {translate("ملاحظات")}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={translate("أي ملاحظات حول استلام الشيك أو شروط الدفع...")}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              {translate("إلغاء")}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {translate(isEditing ? 'حفظ تعديلات الشيك' : 'تسجيل الشيك')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
