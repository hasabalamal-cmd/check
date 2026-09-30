import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, Building, FileSpreadsheet, Image as ImageIcon, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { CustomerInvoice, Customer } from '../types';
import { getTodayString } from '../utils/checkCalculations';
import { isGasConfigured, uploadFileToDriveApi } from '../services/gasApi';

interface CustomerInvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: Partial<CustomerInvoice>) => void;
  initialData?: CustomerInvoice | null;
  customers: Customer[];
}

export const CustomerInvoiceFormModal: React.FC<CustomerInvoiceFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  customers,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [invoiceDate, setInvoiceDate] = useState(getTodayString());
  const [receiptStatus, setReceiptStatus] = useState<'مستحق' | 'مستلم'>('مستحق');
  const [receiptDate, setReceiptDate] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDriveUploaded, setIsDriveUploaded] = useState(false);

  useEffect(() => {
    if (initialData) {
      setInvoiceNumber(initialData.invoiceNumber);
      setCustomerId(initialData.customerId);
      setAmount(initialData.amount);
      setInvoiceDate(initialData.invoiceDate);
      setReceiptStatus(initialData.receiptStatus === 'مستلم' || initialData.receiptStatus === 'received' ? 'مستلم' : 'مستحق');
      setReceiptDate(initialData.receiptDate || '');
      setNotes(initialData.notes || '');
      setImage(initialData.image || '');
      setIsDriveUploaded(Boolean(initialData.image && initialData.image.includes('drive.google.com')));
    } else {
      setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setCustomerId(customers[0]?.id || '');
      setAmount('');
      setInvoiceDate(getTodayString());
      setReceiptStatus('مستحق');
      setReceiptDate('');
      setNotes('');
      setImage('');
      setIsDriveUploaded(false);
    }
  }, [initialData, isOpen, customers]);

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
            `inv_${Date.now()}_${file.name}`,
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
    const customer = customers.find((c) => c.id === customerId);
    const svgInvoice = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#ffffff" rx="16" stroke="#3b82f6" stroke-width="4"/>
      <rect x="25" y="25" width="550" height="350" fill="#f8fafc" rx="8" stroke="#cbd5e1"/>
      <text x="540" y="70" font-family="sans-serif" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="end">فاتورة بيع وتوريد بضاعة</text>
      <text x="540" y="105" font-family="sans-serif" font-size="15" fill="#334155" text-anchor="end">المحل العميل: ${customer?.name || 'اسم المحل'}</text>
      <text x="60" y="70" font-family="sans-serif" font-size="16" fill="#64748b">رقم الفاتورة: ${invoiceNumber}</text>
      <text x="60" y="100" font-family="sans-serif" font-size="14" fill="#64748b">التاريخ: ${invoiceDate}</text>
      <line x1="50" y1="130" x2="550" y2="130" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="540" y="170" font-family="sans-serif" font-size="15" fill="#475569" text-anchor="end">تفاصيل البضاعة المسلّمة:</text>
      <text x="540" y="200" font-family="sans-serif" font-size="14" fill="#64748b" text-anchor="end">${notes || 'بضائع ومستلزمات متفق عليها'}</text>
      <rect x="50" y="270" width="500" height="60" fill="#eff6ff" rx="8" stroke="#60a5fa"/>
      <text x="520" y="307" font-family="sans-serif" font-size="16" font-weight="bold" fill="#1e3a8a" text-anchor="end">إجمالي قيمة الفاتورة المستحق:</text>
      <text x="80" y="307" font-family="sans-serif" font-size="20" font-weight="bold" fill="#2563eb">${amount ? amount + ' ر.س' : '0.00'}</text>
    </svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgInvoice)}`;
    setImage(dataUrl);
    setIsDriveUploaded(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || !customerId || !amount || Number(amount) <= 0 || !invoiceDate) {
      return;
    }

    const customer = customers.find((c) => c.id === customerId);

    onSave({
      invoiceNumber,
      customerId,
      customerName: customer ? customer.name : '',
      amount: Number(amount),
      invoiceDate,
      receiptStatus,
      receiptDate: receiptStatus === 'مستلم' ? (receiptDate || getTodayString()) : '',
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
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {initialData ? 'تعديل فاتورة العميل' : 'إصدار فاتورة جديدة للعميل'}
              </h3>
              <p className="text-xs text-slate-400">تسجيل الفواتير الصادرة للمحلات وربطها بالشيكات</p>
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
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              اسم المحل / العميل <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- اختر المحل --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
                placeholder="مثال: INV-2026-001"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
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
                placeholder="مثال: 15000"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Invoice Date & Receipt Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                حالة الفاتورة
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReceiptStatus('مستحق')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    receiptStatus === 'مستحق'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
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
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    receiptStatus === 'مستلم'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>مستلمة</span>
                </button>
              </div>
            </div>
          </div>

          {receiptStatus === 'مستلم' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                تاريخ الاستلام
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* Invoice Image Attachment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-300">
                صورة أو ملف الفاتورة (Google Drive)
              </label>
              {isUploading && (
                <span className="text-xs text-cyan-400 flex items-center gap-1">
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
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>رفع صورة من الجهاز</span>
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
                className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 hover:text-cyan-300 border border-slate-700 rounded-xl transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                توليد نموذج فاتورة
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
              placeholder="وصف البضاعة الموردة، رقم الشحنة، المستودع..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
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
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-cyan-500/20 transition-all"
            >
              {initialData ? 'حفظ التعديلات' : 'إصدار الفاتورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
