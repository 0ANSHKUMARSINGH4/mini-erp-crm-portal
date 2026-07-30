import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Customer, Product } from '../types';
import { Plus, Trash2, ArrowLeft, CheckCircle, Save, AlertTriangle, AlertCircle } from 'lucide-react';

interface LineItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export const ChallanCreate: React.FC = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<LineItemInput[]>([
    { productId: '', quantity: 1, unitPrice: 0 }
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/customers?limit=100'),
        api.get('/products?limit=100')
      ]);
      setCustomers(cRes.data.customers || []);
      setProducts(pRes.data.products || []);
    } catch (err) {
      console.error('Failed to load customers or products for challan form', err);
    }
  };

  const productMap = new Map(products.map(p => [p.id, p]));

  const handleProductSelect = (index: number, productId: string) => {
    const prod = productMap.get(productId);
    const updated = [...items];
    updated[index] = {
      productId,
      quantity: updated[index].quantity || 1,
      unitPrice: prod ? prod.unitPrice : 0
    };
    setItems(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, qty);
    setItems(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...items];
    updated[index].unitPrice = Math.max(0, price);
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSubmit = async (status: 'DRAFT' | 'CONFIRMED') => {
    setError(null);
    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }

    const invalidItem = items.find(i => !i.productId || i.quantity <= 0);
    if (invalidItem) {
      setError('Please ensure all line items have a valid product selected and quantity > 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        status,
        notes: notes || undefined,
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        }))
      };

      const res = await api.post('/challans', payload);
      navigate(`/challans/${res.data.challan.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to submit sales challan';
      setError(msg);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to="/challans" className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Challans List
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Create Sales Challan</h1>
          <p className="text-slate-400 text-sm">Issue a new wholesale sales dispatch with automatic stock validation.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Validation / Stock Check Failed</p>
            <p className="text-xs text-rose-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        {/* Customer Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Customer / Firm *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.businessName} ({c.customerType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Order Notes / Delivery Terms
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              placeholder="e.g. Freight prepaid, dispatched via Blue Dart"
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Line Items</h3>
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-xl"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const selectedProd = productMap.get(item.productId);
              const availableStock = selectedProd ? selectedProd.currentStock : 0;
              const isInsufficient = selectedProd && item.quantity > availableStock;

              return (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] text-slate-400 mb-1">Product SKU</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — Stock: {p.currentStock} units
                        </option>
                      ))}
                    </select>

                    {selectedProd && (
                      <div className="mt-1 flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400">Available Stock:</span>
                        <span className={`font-bold ${isInsufficient ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {availableStock} units
                        </span>
                        {isInsufficient && (
                          <span className="text-rose-400 flex items-center gap-1 font-bold">
                            <AlertTriangle className="w-3 h-3" /> Shortage of {item.quantity - availableStock}!
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-1">Unit Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2 text-right">
                    <label className="block text-[10px] text-slate-400 mb-1">Subtotal</label>
                    <span className="text-sm font-extrabold text-slate-100 block py-1">
                      ₹{(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>

                  <div className="sm:col-span-1 text-right">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => removeItemRow(idx)}
                      className="p-2 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grand Total & Action Footer */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Grand Total Amount</span>
            <span className="text-3xl font-extrabold text-sky-400">₹{grandTotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('DRAFT')}
              className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-sm transition-all"
            >
              <Save className="w-4 h-4" /> Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('CONFIRMED')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl text-sm shadow-xl shadow-emerald-600/30 transition-all"
            >
              <CheckCircle className="w-4 h-4" /> Confirm & Deduct Stock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
