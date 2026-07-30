import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Customer } from '../types';
import { Building, Phone, Mail, MapPin, Calendar, Clock, ArrowLeft, MessageSquare, FileText } from 'lucide-react';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchCustomerDetail();
  }, [id]);

  const fetchCustomerDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data.customer);
    } catch (err) {
      console.error('Failed to load customer details', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading customer profile...</div>;
  }

  if (!customer) {
    return <div className="p-8 text-center text-rose-400">Customer profile not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/customers" className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Customers List
      </Link>

      {/* Profile Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100">{customer.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
              {customer.customerType}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              customer.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {customer.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
            <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-slate-500" /> {customer.businessName}</span>
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" /> {customer.mobile}</span>
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" /> {customer.email}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {customer.address}</span>
          </div>
        </div>
      </div>

      {/* Grid Content: Info & Follow-up History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 h-fit">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2">Customer Details</h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block">GSTIN</span>
              <span className="text-slate-200 font-mono">{customer.gst || 'Not Provided'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Scheduled Next Follow-Up</span>
              <span className="text-slate-200">{customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : 'None'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Account Created On</span>
              <span className="text-slate-200">{new Date(customer.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Follow-up Notes Timeline */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-400" /> Follow-Up Log History
            </h3>
            <span className="text-xs text-slate-500">{customer.followUps?.length || 0} entries</span>
          </div>

          <div className="space-y-4">
            {!customer.followUps || customer.followUps.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No follow-up notes recorded yet.</p>
            ) : (
              customer.followUps.map((f) => (
                <div key={f.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-sky-400">{f.createdBy}</span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(f.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{f.note}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
