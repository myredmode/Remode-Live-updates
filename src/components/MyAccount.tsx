import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { CustomerAddress, Order } from '../types';
import {
  User,
  Package,
  MapPin,
  RotateCcw,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Truck,
  XCircle,
  AlertCircle,
  ArrowRight,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';

export const MyAccount: React.FC = () => {
  const {
    userProfile,
    setIsLoginOpen,
    logoutUser,
    updateUserProfile,
    saveCustomerAddress,
    deleteCustomerAddress,
    orders,
    cancelCustomerOrder,
    submitCustomerReturnRequest,
    returnsList,
    setActiveView,
    formatPrice,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile' | 'returns'>('orders');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form state
  const [profileName, setProfileName] = useState(userProfile.name || '');
  const [profileEmail, setProfileEmail] = useState(
    userProfile.savedAddresses?.[0]?.email || ''
  );

  // Address form state
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | undefined>(undefined);
  const [addressForm, setAddressForm] = useState<CustomerAddress>({
    name: userProfile.name || '',
    mobile: userProfile.mobileOrEmail || '',
    email: '',
    country: 'India',
    house: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });

  // Cancel Order confirmation modal state
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Changed my mind / Ordered by mistake');

  // Return / Exchange modal state
  const [returnTargetOrder, setReturnTargetOrder] = useState<Order | null>(null);
  const [selectedReturnItemIndex, setSelectedReturnItemIndex] = useState(0);
  const [returnReason, setReturnReason] = useState('Size Exchange Needed');
  const [returnNotes, setReturnNotes] = useState('');

  const normalizePhone = (val: string = '') => {
    const digits = val.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits.slice(-10);
  };

  const customerMobile = normalizePhone(userProfile.mobileOrEmail);

  const customerOrders = useMemo(() => {
    if (!userProfile.isLoggedIn || !customerMobile) return [];
    return orders
      .filter((o) => {
        const orderPhone = normalizePhone(o.customer?.mobile || o.customer?.phone || '');
        return orderPhone === customerMobile;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, userProfile.isLoggedIn, customerMobile]);

  const customerReturns = useMemo(() => {
    if (!userProfile.isLoggedIn || !customerMobile) return [];
    const orderIds = new Set(customerOrders.map((o) => o.id));
    return returnsList.filter((r) => {
      const rPhone = normalizePhone(r.customerPhone || '');
      return rPhone === customerMobile || orderIds.has(r.orderId);
    });
  }, [returnsList, customerOrders, userProfile.isLoggedIn, customerMobile]);

  if (!userProfile.isLoggedIn) {
    return (
      <div className="min-h-[70vh] bg-zinc-50 flex items-center justify-center px-4 py-16 font-sans">
        <div className="max-w-md w-full bg-white border border-zinc-200 p-8 text-center space-y-5 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900">
            <User className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold uppercase tracking-wider text-zinc-950">
              My REDMODE Account
            </h1>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Sign in with your 10-digit mobile number via OTP to view your orders, track shipments, manage delivery addresses, and request returns or size exchanges.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsLoginOpen(true)}
            className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Sign In with Mobile OTP</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('track-order')}
            className="w-full py-2.5 border border-zinc-300 hover:border-zinc-900 text-zinc-800 text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
          >
            Lookup Order by Order ID / AWB
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please enter your name.' });
      return;
    }
    updateUserProfile({
      name: profileName.trim(),
      email: profileEmail.trim(),
    });
    setFeedbackMsg({ type: 'success', text: 'Your profile details have been saved.' });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleOpenAddAddress = () => {
    setEditingAddressIndex(undefined);
    setAddressForm({
      name: userProfile.name || '',
      mobile: userProfile.mobileOrEmail || '',
      email: profileEmail || '',
      country: 'India',
      house: '',
      street: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
    });
    setIsAddressFormOpen(true);
  };

  const handleOpenEditAddress = (addr: CustomerAddress, idx: number) => {
    setEditingAddressIndex(idx);
    setAddressForm({
      name: addr.name || userProfile.name || '',
      mobile: addr.mobile || addr.phone || userProfile.mobileOrEmail || '',
      email: addr.email || '',
      country: addr.country || 'India',
      house: addr.house || addr.address || '',
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      landmark: addr.landmark || '',
    });
    setIsAddressFormOpen(true);
  };

  const handleSaveAddressForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.name.trim() || !addressForm.house?.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.pincode.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please complete all required address fields.' });
      return;
    }
    saveCustomerAddress(addressForm, editingAddressIndex);
    setIsAddressFormOpen(false);
    setFeedbackMsg({
      type: 'success',
      text: editingAddressIndex !== undefined ? 'Address updated successfully.' : 'New delivery address saved.',
    });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleConfirmCancelOrder = () => {
    if (!cancellingOrderId) return;
    const res = cancelCustomerOrder(cancellingOrderId, cancelReason);
    setCancellingOrderId(null);
    setFeedbackMsg({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnTargetOrder) return;
    const item = returnTargetOrder.items[selectedReturnItemIndex] || returnTargetOrder.items[0];
    if (!item) return;

    const fullReason = returnNotes.trim() ? `${returnReason} — ${returnNotes.trim()}` : returnReason;
    const res = submitCustomerReturnRequest({
      orderId: returnTargetOrder.id,
      productName: item.name,
      productImage: item.image,
      size: item.size,
      quantity: item.quantity,
      reason: fullReason,
      refundAmount: item.price * item.quantity,
    });
    setReturnTargetOrder(null);
    setReturnNotes('');
    setFeedbackMsg({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const isOrderCancellable = (status: string) => {
    return ['NEW', 'Pending', 'COD Verification', 'Confirmed', 'Processing'].includes(status);
  };

  const isOrderDelivered = (status: string) => {
    return status === 'Delivered' || status === 'DELIVERED';
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Account Header */}
        <div className="bg-white border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-950 text-white flex items-center justify-center text-base font-bold uppercase shrink-0">
              {(userProfile.name || 'R').charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-zinc-950 uppercase tracking-wide">
                  {userProfile.name || 'Valued Customer'}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Mobile: <strong className="text-zinc-800">+91 {customerMobile}</strong>
                {userProfile.customerId && (
                  <span className="ml-2 text-zinc-400">• ID: {userProfile.customerId}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveView('catalogue')}
              className="px-4 py-2 border border-zinc-300 hover:border-zinc-950 text-zinc-900 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Continue Shopping
            </button>
            <button
              type="button"
              onClick={() => {
                logoutUser();
                setActiveView('home');
              }}
              className="px-4 py-2 bg-zinc-100 hover:bg-rose-50 hover:text-rose-700 text-zinc-700 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div
            className={`p-4 border text-xs font-semibold flex items-center justify-between ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-zinc-500 hover:text-zinc-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white border border-zinc-200 p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Orders ({customerOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'addresses'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Addresses ({userProfile.savedAddresses?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('returns')}
            className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'returns'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returns ({customerReturns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
        </div>

        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {customerOrders.length === 0 ? (
              <div className="bg-white border border-zinc-200 p-12 text-center space-y-4">
                <Package className="w-10 h-10 text-zinc-400 mx-auto stroke-[1.25]" />
                <div className="space-y-1">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                    No Orders Yet
                  </h2>
                  <p className="text-xs text-zinc-500">
                    You haven&apos;t placed any orders with +91 {customerMobile} yet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('catalogue')}
                  className="px-6 py-3 bg-zinc-950 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition cursor-pointer"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              customerOrders.map((order) => {
                const awb = order.awb_number || order.shipmozo?.awb;
                const isCancelled = order.orderStatus === 'Cancelled' || (order.orderStatus as string) === 'CANCELLED';
                return (
                  <div key={order.id} className="bg-white border border-zinc-200 p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-bold text-zinc-950">
                            Order {order.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 border ${
                              isCancelled
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isOrderDelivered(order.orderStatus)
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-zinc-100 text-zinc-800 border-zinc-200'
                            }`}
                          >
                            {order.orderStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Placed on{' '}
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          • Payment: <strong>{order.paymentMode}</strong> ({order.paymentStatus})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-zinc-500 block">Order Total</span>
                        <span className="text-base font-extrabold text-zinc-950">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-zinc-100">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-16 object-cover object-top border border-zinc-200 shrink-0 bg-zinc-50"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-zinc-900 uppercase">
                                {item.name}
                              </h4>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                Size: <strong>{item.size}</strong>
                                {item.color ? ` • Color: ${item.color}` : ''} • Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-zinc-900">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Delivery & Actions Footer */}
                    <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="text-zinc-600">
                        <span className="font-semibold text-zinc-900">Deliver to: </span>
                        {order.customer.name}, {order.customer.house}, {order.customer.city},{' '}
                        {order.customer.state} - {order.customer.pincode}
                        {awb && (
                          <span className="block text-[11px] text-emerald-700 font-semibold mt-0.5">
                            Courier: {order.selected_courier_name || order.shipmozo?.courier || 'Delhivery'} • AWB: {awb}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveView('track-order')}
                          className="px-3.5 py-2 border border-zinc-300 hover:border-zinc-950 text-zinc-900 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Track Order</span>
                        </button>

                        {isOrderCancellable(order.orderStatus) && (
                          <button
                            type="button"
                            onClick={() => setCancellingOrderId(order.id)}
                            className="px-3.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel Order</span>
                          </button>
                        )}

                        {isOrderDelivered(order.orderStatus) && (
                          <button
                            type="button"
                            onClick={() => {
                              setReturnTargetOrder(order);
                              setSelectedReturnItemIndex(0);
                            }}
                            className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Return / Exchange</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: SAVED ADDRESSES */}
        {activeTab === 'addresses' && (
          <div className="bg-white border border-zinc-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-950">
                  Saved Delivery Addresses
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Manage your shipping addresses for faster checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Address</span>
              </button>
            </div>

            {isAddressFormOpen && (
              <form
                onSubmit={handleSaveAddressForm}
                className="bg-zinc-50 border border-zinc-200 p-5 space-y-4 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold uppercase tracking-wider text-zinc-900">
                    {editingAddressIndex !== undefined ? 'Edit Address' : 'New Delivery Address'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddressFormOpen(false)}
                    className="text-zinc-500 hover:text-zinc-900 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold uppercase text-zinc-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={addressForm.name}
                      onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-zinc-950 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-zinc-700 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={addressForm.mobile}
                      onChange={(e) => setAddressForm({ ...addressForm, mobile: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-zinc-950 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold uppercase text-zinc-700 mb-1">
                      Flat / House No. / Building *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.house || ''}
                      onChange={(e) => setAddressForm({ ...addressForm, house: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-zinc-950 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold uppercase text-zinc-700 mb-1">
                      Street / Area / Colony *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.street || ''}
                      onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-zinc-950 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-zinc-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-zinc-950 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-zinc-700 mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-zinc-950 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-zinc-700 mb-1">
                      PIN / Postal Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-zinc-950 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase text-zinc-700 mb-1">Country *</label>
                    <input
                      type="text"
                      required
                      value={addressForm.country || 'India'}
                      onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-zinc-950 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddressFormOpen(false)}
                    className="px-4 py-2 border border-zinc-300 text-zinc-700 font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-zinc-950 text-white font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            )}

            {(!userProfile.savedAddresses || userProfile.savedAddresses.length === 0) ? (
              <p className="text-xs text-zinc-500 py-6 text-center">
                No saved addresses yet. Click &quot;Add Address&quot; above to save your delivery details.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userProfile.savedAddresses.map((addr, index) => (
                  <div
                    key={index}
                    className="border border-zinc-200 p-4 flex flex-col justify-between space-y-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-950 uppercase">{addr.name}</span>
                        {index === 0 && (
                          <span className="text-[10px] font-bold uppercase bg-zinc-100 text-zinc-800 px-2 py-0.5">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-600">
                        {addr.house}
                        {addr.street ? `, ${addr.street}` : ''}
                      </p>
                      <p className="text-zinc-600">
                        {addr.city}, {addr.state} - {addr.pincode} ({addr.country || 'India'})
                      </p>
                      <p className="text-zinc-500 pt-1">Mobile: {addr.mobile || addr.phone}</p>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => handleOpenEditAddress(addr, index)}
                        className="text-zinc-700 hover:text-zinc-950 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCustomerAddress(index)}
                        className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RETURNS & EXCHANGES */}
        {activeTab === 'returns' && (
          <div className="bg-white border border-zinc-200 p-6 space-y-4">
            <div className="border-b border-zinc-200 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-950">
                Returns &amp; Size Exchanges
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Track the status of your return or size exchange requests.
              </p>
            </div>

            {customerReturns.length === 0 ? (
              <p className="text-xs text-zinc-500 py-8 text-center">
                You have no active return or exchange requests.
              </p>
            ) : (
              <div className="divide-y divide-zinc-200">
                {customerReturns.map((ret) => (
                  <div key={ret.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-950">{ret.id}</span>
                        <span className="text-zinc-400">•</span>
                        <span className="font-semibold text-zinc-800">Order {ret.orderId}</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                          {ret.status}
                        </span>
                      </div>
                      <p className="font-semibold text-zinc-900">
                        {ret.productName} (Size: {ret.size} • Qty: {ret.quantity})
                      </p>
                      <p className="text-zinc-600">Reason: {ret.reason}</p>
                      {ret.resolutionNotes && (
                        <p className="text-emerald-700 font-medium">
                          Update: {ret.resolutionNotes}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-zinc-400 block text-[11px]">Refund / Value</span>
                      <span className="font-bold text-zinc-950 text-sm">
                        {formatPrice(ret.refundAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PROFILE DETAILS */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-zinc-200 p-6 max-w-xl space-y-5">
            <div className="border-b border-zinc-200 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-950">
                Account Profile Details
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Update your personal information associated with your verified mobile number.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Verified Mobile Number
                </label>
                <input
                  type="text"
                  readOnly
                  value={`+91 ${customerMobile}`}
                  className="w-full px-3.5 py-2.5 bg-zinc-100 border border-zinc-200 text-zinc-600 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 focus:border-zinc-950 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Email Address (For Order Receipts)
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 focus:border-zinc-950 outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-widest transition cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      {cancellingOrderId && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setCancellingOrderId(null)}
        >
          <div
            className="bg-white border border-zinc-200 max-w-md w-full p-6 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-950">
                Cancel Order {cancellingOrderId}
              </h3>
              <button
                type="button"
                onClick={() => setCancellingOrderId(null)}
                className="text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-zinc-600 leading-relaxed">
              Please select a reason for cancelling this order. Reserved stock will be automatically restored.
            </p>

            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-zinc-300 bg-white text-zinc-900 outline-none focus:border-zinc-950"
            >
              <option value="Changed my mind / Ordered by mistake">
                Changed my mind / Ordered by mistake
              </option>
              <option value="Want to change size or color">
                Want to change size or color
              </option>
              <option value="Want to update delivery address">
                Want to update delivery address
              </option>
              <option value="Found another design on REDMODE">
                Found another design on REDMODE
              </option>
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingOrderId(null)}
                className="px-4 py-2.5 border border-zinc-300 text-zinc-800 font-bold uppercase tracking-wider cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-wider cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return / Exchange Modal */}
      {returnTargetOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setReturnTargetOrder(null)}
        >
          <form
            onSubmit={handleSubmitReturn}
            className="bg-white border border-zinc-200 max-w-md w-full p-6 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-950">
                Request Return / Exchange ({returnTargetOrder.id})
              </h3>
              <button
                type="button"
                onClick={() => setReturnTargetOrder(null)}
                className="text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-bold uppercase text-zinc-700 mb-1">Select Item</label>
              <select
                value={selectedReturnItemIndex}
                onChange={(e) => setSelectedReturnItemIndex(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-zinc-300 bg-white text-zinc-900 outline-none focus:border-zinc-950"
              >
                {returnTargetOrder.items.map((it, idx) => (
                  <option key={idx} value={idx}>
                    {it.name} (Size: {it.size} • Qty: {it.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-zinc-700 mb-1">Reason *</label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2.5 border border-zinc-300 bg-white text-zinc-900 outline-none focus:border-zinc-950"
              >
                <option value="Size Exchange Needed">Size Exchange Needed</option>
                <option value="Fit Issue">Fit Issue</option>
                <option value="Received Wrong Item or Color">Received Wrong Item or Color</option>
                <option value="Quality / Transit Damage">Quality / Transit Damage</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-zinc-700 mb-1">
                Preferred Size / Additional Notes
              </label>
              <textarea
                rows={3}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="e.g. Please exchange for Size L"
                className="w-full px-3 py-2 border border-zinc-300 bg-white text-zinc-900 outline-none focus:border-zinc-950"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReturnTargetOrder(null)}
                className="px-4 py-2.5 border border-zinc-300 text-zinc-800 font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <span>Submit Request</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
