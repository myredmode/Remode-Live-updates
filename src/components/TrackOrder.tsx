import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Order } from '../types';
import {
  Search,
  Truck,
  MapPin,
  AlertCircle,
  X,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Package,
  PhoneCall,
} from 'lucide-react';

export const TrackOrder: React.FC = () => {
  const { trackOrder, updateOrderStatus, updateCodVerificationStatus } = useStore();
  const [orderInput, setOrderInput] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer changed mind / Ordered by mistake');
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [liveDelhiveryData, setLiveDelhiveryData] = useState<any>(null);
  const [isLoadingLiveTrack, setIsLoadingLiveTrack] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [copiedAwb, setCopiedAwb] = useState(false);

  // Fetch real-time Delhivery tracking details from server-side proxy
  const fetchDelhiveryTracking = async (awb: string, order?: Order | null) => {
    if (!awb) return;
    setIsLoadingLiveTrack(true);
    try {
      const ord = order || searchedOrder;
      const statusParam = ord?.shipmozo?.status || ord?.orderStatus || '';
      const cityParam = ord?.customer?.city || '';
      const url = `/api/delhivery/track/${encodeURIComponent(awb)}?status=${encodeURIComponent(
        statusParam
      )}&city=${encodeURIComponent(cityParam)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLiveDelhiveryData(data);
          setLastRefreshedAt(new Date());
        }
      }
    } catch (e) {
      console.error('Failed to load live Delhivery tracking', e);
    } finally {
      setIsLoadingLiveTrack(false);
    }
  };

  useEffect(() => {
    const awb = searchedOrder?.awb_number || searchedOrder?.shipmozo?.awb;
    if (awb) {
      fetchDelhiveryTracking(awb, searchedOrder);
    } else {
      setLiveDelhiveryData(null);
    }
  }, [searchedOrder?.id, searchedOrder?.awb_number]);

  const handleTrackSubmit = (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const query = directQuery || orderInput;
    if (!query.trim()) return;

    const result = trackOrder(query);
    if (result) {
      setSearchedOrder(result);
      setErrorMessage(null);
      setCancelSuccessMsg(null);
      const awb = result.awb_number || result.shipmozo?.awb;
      if (awb) {
        fetchDelhiveryTracking(awb, result);
      }
    } else {
      setSearchedOrder(null);
      setLiveDelhiveryData(null);
      setErrorMessage(
        `No shipment found matching "${query}". Please check your Order ID (e.g. #12345), 10-digit mobile number, or Delhivery AWB number.`
      );
    }
  };

  const handleCopyAwb = (awb: string) => {
    if (!awb) return;
    navigator.clipboard.writeText(awb);
    setCopiedAwb(true);
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  const handleCustomerCancel = () => {
    if (!searchedOrder) return;
    updateOrderStatus(searchedOrder.id, 'Cancelled');
    if (searchedOrder.paymentMode === 'COD' || (searchedOrder as any).paymentMethod === 'COD') {
      updateCodVerificationStatus(
        searchedOrder.id,
        'REJECTED',
        `Customer (Via Tracking Portal: ${cancelReason})`
      );
    }
    const updated = {
      ...searchedOrder,
      orderStatus: 'Cancelled' as const,
    };
    setSearchedOrder(updated);
    setShowCancelModal(false);
    setCancelSuccessMsg('Your order cancellation request has been processed successfully.');
  };

  const activeAwb = searchedOrder?.awb_number || searchedOrder?.shipmozo?.awb || liveDelhiveryData?.awb;

  // Determine active status display title
  const displayTitle = useMemo(() => {
    if (!searchedOrder) return 'Ordered';
    if (searchedOrder.orderStatus === 'Cancelled') return 'Cancelled';

    const delhiveryStatus = (liveDelhiveryData?.status || '').toLowerCase();
    const storeStatus = (searchedOrder.shipmozo?.status || searchedOrder.orderStatus || '').toLowerCase();
    const isPickedUp = !!liveDelhiveryData?.isPickedUp;

    if (
      delhiveryStatus.includes('delivered') ||
      storeStatus === 'delivered' ||
      liveDelhiveryData?.statusCode === 'DL'
    ) {
      return 'Delivered';
    }

    if (
      delhiveryStatus.includes('out for delivery') ||
      storeStatus === 'out for delivery' ||
      liveDelhiveryData?.statusCode === 'OFD'
    ) {
      return 'Out for delivery';
    }

    if (
      isPickedUp ||
      delhiveryStatus.includes('transit') ||
      delhiveryStatus.includes('shipped') ||
      delhiveryStatus.includes('dispatched') ||
      storeStatus === 'in transit' ||
      storeStatus === 'shipped' ||
      liveDelhiveryData?.statusCode === 'IT'
    ) {
      return 'Shipped';
    }

    return 'Ordered';
  }, [searchedOrder, liveDelhiveryData]);

  return (
    <div className="bg-zinc-50 min-h-screen py-8 sm:py-12 px-4 sm:px-6 selection:bg-[#E52229] selection:text-white">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full text-xs font-bold text-[#E52229] uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#E52229]" />
            <span>Delhivery One Logistics Tracking</span>
          </div>

          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-zinc-950 uppercase tracking-tight">
            Track Your Order
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed">
            Real-time status updates directly from Delhivery Logistics. Enter your Order ID,
            mobile number, or AWB number.
          </p>
        </div>

        {/* Search Bar & Sample Selectors */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-zinc-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
                placeholder="Enter Order ID (e.g. #12345), Mobile, or AWB (e.g. DLH-99281741)"
                className="w-full pl-11 pr-4 py-3 border border-zinc-300 rounded-xl text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
              />
            </div>
            <button
              type="submit"
              className="px-7 py-3 bg-zinc-950 hover:bg-[#E52229] text-white text-xs font-bold tracking-widest uppercase rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
            >
              <Truck className="w-4 h-4" />
              <span>Track Status</span>
            </button>
          </form>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Tracking Details View */}
        {searchedOrder && (
          <div className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden divide-y divide-zinc-100">
            {/* Clean Order Header Bar */}
            <div className="p-5 sm:p-6 bg-zinc-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-zinc-950">
                    {searchedOrder.id}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-lg ${
                      searchedOrder.orderStatus === 'Cancelled'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : displayTitle === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : displayTitle === 'Out for delivery'
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        : displayTitle === 'Shipped'
                        ? 'bg-sky-100 text-sky-800 border border-sky-200'
                        : 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                    }`}
                  >
                    {searchedOrder.orderStatus === 'Cancelled' ? 'Cancelled' : displayTitle}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">•</span>
                  <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-[#358c9b]" />
                    {searchedOrder.selected_courier_name || 'Delhivery Surface Logistics'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Recipient: <strong className="text-zinc-800">{searchedOrder.customer.name}</strong> •{' '}
                  {searchedOrder.customer.city}, {searchedOrder.customer.state} ({searchedOrder.customer.pincode})
                </p>
              </div>

              {/* Waybill & Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {activeAwb && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-200 shadow-2xs text-xs">
                    <span className="font-mono font-bold text-zinc-800">AWB: {activeAwb}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAwb(activeAwb)}
                      title="Copy AWB Number"
                      className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    >
                      {copiedAwb ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Refresh Status */}
                {activeAwb && (
                  <button
                    type="button"
                    onClick={() => fetchDelhiveryTracking(activeAwb, searchedOrder)}
                    disabled={isLoadingLiveTrack}
                    title="Refresh live status from Delhivery"
                    className="p-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#358c9b] ${isLoadingLiveTrack ? 'animate-spin' : ''}`} />
                  </button>
                )}

                {/* Customer Cancel Option */}
                {!['Cancelled', 'Delivered', 'Shipped', 'In Transit'].includes(
                  searchedOrder.orderStatus
                ) && (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </div>

            {/* Success feedback if customer just cancelled */}
            {cancelSuccessMsg && (
              <div className="p-4 bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{cancelSuccessMsg}</span>
              </div>
            )}

            {/* Genuine RTO Banner */}
            {searchedOrder.rtoInfo?.isRto && (
              <div className="p-4 bg-rose-50 text-rose-900 space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Shipment Returned to Origin (RTO)
                  </span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Reason: <strong>{searchedOrder.rtoInfo.reason}</strong>.{' '}
                  {searchedOrder.rtoInfo.courierRemarks && `(${searchedOrder.rtoInfo.courierRemarks})`}
                </p>
              </div>
            )}

            {/* NDR Exception Banner */}
            {searchedOrder.ndrInfo?.hasNdr && !searchedOrder.rtoInfo?.isRto && (
              <div className="p-4 bg-amber-50 text-amber-900 space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Non-Delivery Exception (NDR): {searchedOrder.ndrInfo.reason}
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Delivery was attempted by Delhivery but could not be completed. Re-attempt will be scheduled automatically.
                </p>
              </div>
            )}

            {/* Cancelled Banner */}
            {searchedOrder.orderStatus === 'Cancelled' && !searchedOrder.rtoInfo?.isRto && (
              <div className="p-4 bg-rose-50 text-rose-900 space-y-1">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    This Order Has Been Cancelled
                  </span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  This order was cancelled prior to dispatch. Refunds (if paid online) reflect in 3-5 business days.
                </p>
              </div>
            )}

            {/* Delhivery Scans & Timestamps Feed */}
            <div className="p-5 sm:p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    Delhivery Live Checkpoints
                  </h4>
                  {isLoadingLiveTrack && (
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 text-[#358c9b]" />
                      Fetching live GPS scans...
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {liveDelhiveryData?.scans?.length || 0} scans
                </span>
              </div>

              {liveDelhiveryData?.scans && liveDelhiveryData.scans.length > 0 ? (
                <div className="space-y-4 border-l-2 border-zinc-200 ml-3.5 pl-5 py-1">
                  {liveDelhiveryData.scans.map((event: any, idx: number) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={idx} className="relative space-y-1">
                        <div
                          className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 ${
                            isLatest
                              ? 'bg-[#358c9b] border-white'
                              : 'bg-zinc-400 border-white'
                          }`}
                        />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <span
                            className={`font-bold ${
                              isLatest ? 'text-zinc-950 font-extrabold text-sm' : 'text-zinc-800'
                            }`}
                          >
                            {event.status}
                          </span>
                          <span className="text-zinc-400 font-mono text-[11px]">
                            {event.timestamp}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-600 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{event.location}</span>
                        </p>

                        {event.note && (
                          <p className="text-[11px] text-zinc-500 italic bg-zinc-50 p-2 rounded-lg border border-zinc-100 mt-1">
                            {event.note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
                  <p className="font-semibold text-zinc-900">
                    Order is packaged and awaiting Delhivery pickup scan.
                  </p>
                  <p className="text-zinc-500">
                    Scans will appear here as soon as the courier partner scans the parcel.
                  </p>
                </div>
              )}
            </div>

            {/* Order Items & Destination Address */}
            <div className="p-5 sm:p-6 bg-zinc-50/50 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              {/* Items Card */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-zinc-500" />
                  <span>Items in Shipment ({searchedOrder.items.length})</span>
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {searchedOrder.items.map((it, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200 bg-white"
                    >
                      <img
                        src={it.image}
                        alt={it.name}
                        className="w-12 h-14 object-cover rounded-lg border border-zinc-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-zinc-900 truncate">{it.name}</p>
                        <p className="text-zinc-500 text-[11px]">
                          Size:{' '}
                          {it.size?.toLowerCase().includes('free') ? (
                            <em className="font-normal text-zinc-700">Free size</em>
                          ) : (
                            <strong className="text-zinc-800">{it.size}</strong>
                          )}{' '}
                          • Qty: <strong className="text-zinc-800">{it.quantity}</strong>
                        </p>
                        <p className="text-zinc-700 font-bold mt-0.5">₹{it.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address Card */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-zinc-500" />
                  <span>Delivery Address</span>
                </h4>
                <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1.5 text-xs">
                  <p className="font-bold text-zinc-950 text-sm">{searchedOrder.customer.name}</p>
                  <p className="text-zinc-700">
                    {searchedOrder.customer.house}, {searchedOrder.customer.street}
                  </p>
                  <p className="text-zinc-700 font-medium">
                    {searchedOrder.customer.city}, {searchedOrder.customer.state} -{' '}
                    <strong className="text-zinc-950 font-bold">{searchedOrder.customer.pincode}</strong>
                  </p>
                  <p className="text-zinc-500 pt-1 flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Phone: {searchedOrder.customer.mobile}</span>
                  </p>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">Payment Mode:</span>
                    <strong className="text-zinc-900 uppercase font-bold">
                      {searchedOrder.paymentMode || 'COD'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Cancel Confirmation Modal */}
        {showCancelModal && searchedOrder && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-zinc-200 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-zinc-950 uppercase tracking-tight">
                    Cancel Order {searchedOrder.id}?
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Confirm cancellation before package handover to Delhivery courier.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider block">
                  Select cancellation reason:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-xs border border-zinc-300 rounded-xl p-3 bg-white text-zinc-800 font-medium focus:outline-none focus:border-zinc-950 cursor-pointer"
                >
                  <option value="Customer changed mind / Ordered by mistake">
                    Ordered by mistake / Changed mind
                  </option>
                  <option value="Delivery time is too long">
                    Need it urgently / Delivery time too long
                  </option>
                  <option value="Want to change size or color">Want to change size or color</option>
                  <option value="Want to change delivery address or phone number">
                    Want to change delivery address
                  </option>
                  <option value="Found a better price elsewhere">Found a better price elsewhere</option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>

              <p className="text-[11px] text-zinc-600 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                Notice: Once cancelled, your order will not be dispatched. If paid online, your refund will be
                processed to your source payment method within 3 to 5 business days.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleCustomerCancel}
                  className="flex-1 py-3 px-4 bg-[#E52229] hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <X className="w-4 h-4" />
                  <span>Confirm Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
