import React, { useState, useMemo } from 'react';
import {
  Store,
  Plus,
  Search,
  Phone,
  MapPin,
  FileText,
  User,
  Trash2,
  Edit2,
  CreditCard,
  MessageCircle,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { Customer, CheckItem, CustomerInvoice } from '../types';
import { formatCurrency } from '../utils/checkCalculations';
import { CustomerDetailModal } from './CustomerDetailModal';

interface CustomersViewProps {
  customers: Customer[];
  checks: CheckItem[];
  customerInvoices: CustomerInvoice[];
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onSelectCustomer: (customerId: string) => void;
  onCashCheck?: (checkId: string) => void;
  onPreviewImage?: (url: string, title: string) => void;
  onAddCheckForCustomer?: (customer: Customer) => void;
  onAddInvoiceForCustomer?: (customer: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  checks,
  customerInvoices,
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onSelectCustomer,
  onCashCheck,
  onPreviewImage,
  onAddCheckForCustomer,
  onAddInvoiceForCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = cust.name.toLowerCase().includes(term);
        const matchPerson = cust.contactPerson.toLowerCase().includes(term);
        const matchPhone = cust.phone.includes(term);
        const matchAddress = cust.address?.toLowerCase().includes(term) || false;
        if (!matchName && !matchPerson && !matchPhone && !matchAddress) return false;
      }
      return true;
    });
  }, [customers, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                دليل العملاء والمحلات
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                سجل بيانات المحلات التجارية والمسؤولين والتواصل السريع
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onAddCustomer}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/30 transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة محل جديد</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم المحل، المسؤول، الجوال..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
          />
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300">
          إجمالي المسجلين:{' '}
          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">
            {customers.length} محل
          </span>
        </div>
      </div>

      {/* Customers Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-12 text-center space-y-3">
          <Store className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-300">لا يوجد عملاء مطابقون للبحث</h3>
          <p className="text-xs text-slate-500">أضف محلات وعملاء جدد لبدء التعامل بالشيكات والفواتير.</p>
          <button
            onClick={onAddCustomer}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            إضافة محل الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const customerChecks = checks.filter((c) => c.customerId === cust.id);
            const customerInvs = customerInvoices.filter((i) => i.customerId === cust.id);
            const totalChecksAmount = customerChecks.reduce((sum, c) => sum + c.amount, 0);

            // Clean phone for whatsapp
            const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
            const whatsappNumber = cleanPhone.startsWith('0')
              ? '966' + cleanPhone.substring(1)
              : cleanPhone;

            return (
              <div
                key={cust.id}
                className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                <div>
                  {/* Top Bar: Store Name */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">{cust.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>المسؤول: {cust.contactPerson}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Address */}
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span>الجوال:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-900 dark:text-white font-semibold">{cust.phone}</span>
                        <a
                          href={`tel:${cust.phone}`}
                          className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                          title="اتصال هاتف"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                        <a
                          href={`https://wa.me/${whatsappNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/30 dark:hover:bg-emerald-600 rounded text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-white transition-colors"
                          title="محادثة واتساب"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {cust.address && (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>العنوان:</span>
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 text-left text-[11px] truncate">
                          {cust.address}
                        </span>
                      </div>
                    )}

                    {cust.notes && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg mt-1 border border-slate-100 dark:border-slate-800">
                        {cust.notes}
                      </p>
                    )}
                  </div>

                  {/* Stats snippet */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/50">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">الشيكات المسجلة</div>
                      <div className="font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                        {customerChecks.length} شيك
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold truncate">
                        {formatCurrency(totalChecksAmount)}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/50">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">فواتير التوريد</div>
                      <div className="font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                        {customerInvs.length} فاتورة
                      </div>
                      <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-semibold truncate">
                        {formatCurrency(
                          customerInvs.reduce((sum, inv) => sum + inv.amount, 0)
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditCustomer(cust)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors text-xs cursor-pointer"
                      title="تعديل بيانات المحل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCustomer(cust.id)}
                      className="p-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-700 dark:hover:bg-rose-900/60 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 rounded-xl transition-colors text-xs cursor-pointer"
                      title="حذف المحل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedCustomerForModal(cust)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>التفاصيل والشيكات</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Full Detail Modal */}
      {selectedCustomerForModal && (
        <CustomerDetailModal
          isOpen={!!selectedCustomerForModal}
          onClose={() => setSelectedCustomerForModal(null)}
          customer={selectedCustomerForModal}
          customerChecks={checks.filter((c) => c.customerId === selectedCustomerForModal.id)}
          customerInvoices={customerInvoices.filter((i) => i.customerId === selectedCustomerForModal.id)}
          onAddCheck={() => {
            const c = selectedCustomerForModal;
            setSelectedCustomerForModal(null);
            if (onAddCheckForCustomer) onAddCheckForCustomer(c);
          }}
          onAddInvoice={() => {
            const c = selectedCustomerForModal;
            setSelectedCustomerForModal(null);
            if (onAddInvoiceForCustomer) onAddInvoiceForCustomer(c);
          }}
          onEditCustomer={(cust) => {
            setSelectedCustomerForModal(null);
            onEditCustomer(cust);
          }}
          onCashCheck={(chkId) => {
            if (onCashCheck) onCashCheck(chkId);
          }}
          onPreviewImage={(url, title) => {
            if (onPreviewImage) onPreviewImage(url, title);
          }}
        />
      )}
    </div>
  );
};
