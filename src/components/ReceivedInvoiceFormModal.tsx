import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, Building2, FileCheck, CheckCircle2, Clock, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ReceivedInvoice, ReceiptStatus } from '../types';
import { getTodayString } from '../utils/checkCalculations';
import { isGasConfigured, uploadFileToDriveApi } from '../services/gasApi';

interface ReceivedInvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: Partial<ReceivedInvoice>) => void;
  initialData?: ReceivedInvoice | null;
}

export const ReceivedInvoiceFormModal: React.FC<ReceivedInvoiceFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [invoiceDate, setInvoiceDate] = useState(getTodayString());
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>('not_received');
  const [receiptDate, setReceiptDate] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDriveUploaded, setIsDriveUploaded] = useState(false);

  useEffect(() => {
    if (initialData) {
      setInvoiceNumber(initialData.invoiceNumber);
      setSourceName(initialData.sourceName);
      setAmount(initialData.amount);
      setInvoiceDate(initialData.invoiceDate);
      setReceiptStatus(
        initialData.receiptStatus === 'received' || initialData.receiptStatus === 'تم الاستلام'
          ? 'received'
          : 'not_received'
      );
      setReceiptDate(initialData.receiptDate || '');
      setNotes(initialData.notes || '');
      setImage(initialData.image || '');
      setIsDriveUploaded(Boolean(initialData.image && initialData.image.includes('drive.google.com')));
    } else {
      setInvoiceNumber(`REC-${Math.floor(1000 + Math.random() * 9000)}`);
      setSourceName('');
      setAmount('');
      setInvoiceDate(getTodayString());
      setReceiptStatus('not_received');
      setReceiptDate('');
      setNotes('');
      setImage('');
      setIsDriveUploaded(false);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      setImage(base64Data);

      if (isGasConfigured()) {
        try {
          setIsUploading(true);
          const uploadRes = await uploadFileToDriveApi(
            base64Data,
            `rec_${Date.now()}_${file.name}`,
            file.type || 'image/jpeg'
          );
          if (uploadRes?.fileUrl) {
            setImage(uploadRes.fileUrl);
            setIsDriveUploaded(true);
          }
        } catch (err) {
          console.warn('Google Drive direct upload skipped or failed, using local file representation', err);
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseSampleInvoiceImage = () => {
    const svgInvoice = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#ffffff" rx="16" stroke="#10b981" stroke-width="4"/>
      <rect x="25" y="25" width="550" height="350" fill="#f8fafc" rx="8" stroke="#cbd5e1"/>
      <text x="540" y="70" font-family="sans-serif" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="end">فاتورة توريد مستلمة</text>
      <text x="540" y="105" font-family="sans-serif" font-size="15" fill="#334155" text-anchor="end">الجهة الموردة: ${sourceName || 'الجهة المصدرة'}</text>
      <text x="60" y="70" font-family="sans-serif" font-size="16" fill="#64748b">رقم الفاتورة: ${invoiceNumber}</text>
      <text x="60" y="100" font-family="sans-serif" font-size="14" fill="#64748b">التاريخ: ${invoiceDate}</text>
      <line x1="50" y1="130" x2="550" y2="130" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="540" y="170" font-family="sans-serif" font-size="15" fill="#475569" text-anchor="end">بيان التوريد والخدمات:</text>
      <text x="540" y="200" font-family="sans-serif" font-size="14" fill="#64748b" text-anchor="end">${notes || 'بضائع ومستلزمات متفق عليها'}</text>
      <rect x="50" y="270" width="500" height="60" fill="#ecfdf5" rx="8" stroke="#34d399"/>
      <text x="520" y="307" font-family="sans-serif" font-size="16" font-weight="bold" fill="#065f46" text-anchor="end">إجمالي الفاتورة المطلوب:</text>
      <text x="80" y="307" font-family="sans-serif" font-size="20" font-weight="bold" fill="#059669">${amount ? amount + ' ر.س' : '0.00'}</text>
    </svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgInvoice)}`;
    setImage(dataUrl);
    setIsDriveUploaded(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || !sourceName || !amount || Number(amount) <= 0 || !invoiceDate) {
      return;
    }

    onSave({
      invoiceNumber,
      sourceName,
      amount: Number(amount),
      invoiceDate,
      receiptStatus,
      receiptDate: receiptStatus === 'received' ? (receiptDate || getTodayString()) : '',
      image: image || undefined,
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
      <div className="relative max-w-xl w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {initialData ? 'تعديل الفاتورة المستلمة' : 'تسجيل فاتورة مستلمة من جهة أخرى'}
              </h3>
              <p className="text-xs text-slate-400">قسم الفواتير المستلمة من الشركات والموردين</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Source/Issuer Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              اسم الجهة المصدرة للفاتورة <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                required
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="مثال: شركة التوزيع الكبرى، مصنع الرياض..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                رقم الفاتورة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="مثال: REC-3001"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Invoice Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                مبلغ الفاتورة (ر.س) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="مثال: 20000"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Invoice Date */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              تاريخ الفاتورة <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Receipt Status: strictly manual toggle! */}
          <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-3">
            <label className="block text-sm font-semibold text-slate-200">
              حالة الاستلام <span className="text-emerald-400 text-xs font-normal">(اختيار يدوي فقط)</span>
            </label>
            <p className="text-xs text-slate-400">
              أنت من يحدد حالة الاستلام حصراً، ولا يتم تغييرها تلقائياً.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setReceiptStatus('received');
                  if (!receiptDate) setReceiptDate(getTodayString());
                }}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border ${
                  receiptStatus === 'received'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تم الاستلام</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptStatus('not_received')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border ${
                  receiptStatus === 'not_received'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>لم يتم الاستلام</span>
              </button>
            </div>

            {receiptStatus === 'received' && (
              <div className="pt-2 border-t border-slate-700/60">
                <label className="block text-xs text-slate-300 mb-1">تاريخ الاستلام:</label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Invoice Image Attachment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-300">
                صورة أو ملف الفاتورة (Google Drive)
              </label>
              {isUploading && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>جاري الرفع إلى Google Drive...</span>
                </span>
              )}
              {isDriveUploaded && !isUploading && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>تم الرفع إلى Google Drive</span>
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <label className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700/80 border border-dashed border-slate-600 rounded-xl cursor-pointer text-slate-300 hover:text-white transition-colors text-sm">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>رفع صورة أو مستند</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={handleUseSampleInvoiceImage}
                className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 hover:text-emerald-300 border border-slate-700 rounded-xl transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                توليد نموذج مستند
              </button>
            </div>
            {image && (
              <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-700 w-36 h-20 bg-slate-950">
                <img src={image} alt="صورة الفاتورة" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImage('');
                    setIsDriveUploaded(false);
                  }}
                  className="absolute top-1 left-1 p-1 bg-rose-600 text-white rounded-full text-xs hover:bg-rose-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              ملاحظات
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل حول الفاتورة أو شروط التسليم..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all"
            >
              {initialData ? 'حفظ التعديلات' : 'تسجيل الفاتورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
