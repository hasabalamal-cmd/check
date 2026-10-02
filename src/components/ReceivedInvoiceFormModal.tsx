import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Building2,
  FileCheck,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react';
import { ReceivedInvoice, ReceiptStatus, Attachment } from '../types';
import { getTodayString } from '../utils/checkCalculations';
import { MultipleFileUploader } from './MultipleFileUploader';
import { parseAttachments, serializeAttachments } from '../utils/imageUrl';
import { getActiveShopId } from '../services/auth';
import { isReceiptReceived } from '../utils/receiptStatus';

interface ReceivedInvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: Partial<ReceivedInvoice>) => void;
  initialData?: ReceivedInvoice | null;
  onPreviewImage?: (url: string, title: string) => void;
  currentShopName?: string;
}

export const ReceivedInvoiceFormModal: React.FC<ReceivedInvoiceFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  onPreviewImage,
  currentShopName,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [invoiceDate, setInvoiceDate] = useState(getTodayString());
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>('not_received');
  const [receiptDate, setReceiptDate] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (initialData) {
      setInvoiceNumber(initialData.invoiceNumber || '');
      setSourceName(initialData.sourceName || '');
      setAmount(initialData.amount || '');
      setInvoiceDate(initialData.invoiceDate || getTodayString());
      setReceiptStatus(initialData.receiptStatus || 'not_received');
      setReceiptDate(initialData.receiptDate || '');
      setNotes(initialData.notes || '');

      if (initialData.attachments && initialData.attachments.length > 0) {
        setAttachments(initialData.attachments);
      } else if (initialData.image) {
        setAttachments(parseAttachments(initialData.image));
      } else {
        setAttachments([]);
      }
    } else {
      setInvoiceNumber(`REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setSourceName('');
      setAmount('');
      setInvoiceDate(getTodayString());
      setReceiptStatus('not_received');
      setReceiptDate('');
      setNotes('');
      setAttachments([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !sourceName.trim() || !amount || Number(amount) <= 0) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const serializedImage = serializeAttachments(attachments);

    onSave({
      invoiceNumber: invoiceNumber.trim(),
      sourceName: sourceName.trim(),
      amount: Number(amount),
      invoiceDate,
      receiptStatus,
      receiptDate: isReceiptReceived(receiptStatus) ? (receiptDate || getTodayString()) : undefined,
      notes: notes.trim(),
      image: serializedImage,
      attachments,
    });

    onClose();
  };

  const isReceived = isReceiptReceived(receiptStatus);

  return (
    <div className="mobile-entry-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="mobile-entry-dialog relative max-w-2xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {initialData ? 'تعديل الفاتورة المستلمة' : 'إضافة فاتورة مورد'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                المحل الحالي: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentShopName || getActiveShopId()}</span>
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
          {/* Source Entity Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              اسم الجهة / المورد المصدر للفاتورة <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                required
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="مثال: شركة التوريدات اللوجستية"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                رقم الفاتورة المستلمة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="مثال: REC-3001"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Amount in DOLLARS */}
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
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Invoice Date */}
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
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Receipt Status: strictly manual toggle! */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              حالة الاستلام (اختيار يدوي فقط):
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setReceiptStatus('not_received');
                  setReceiptDate('');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !isReceived
                    ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>لم يتم الاستلام</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReceiptStatus('received');
                  if (!receiptDate) setReceiptDate(getTodayString());
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isReceived
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>تم الاستلام</span>
              </button>
            </div>

            {isReceived && (
              <div className="pt-2 animate-in fade-in">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ الاستلام الفعلي
                </label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Multiple Attachments & Files */}
          <MultipleFileUploader
            attachments={attachments}
            onChange={setAttachments}
            label="مرفقات الفاتورة المستلمة (صور متعددة أو مستندات PDF)"
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
              placeholder="أي تفاصيل حول الفاتورة أو شروط التسليم..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {initialData ? 'حفظ التعديلات' : 'تسجيل الفاتورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
