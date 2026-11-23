import React, { useState } from 'react';
import { Order } from '../../types';
import { Printer, X, FileText, Tag, ArrowDownToLine, AlertTriangle, Loader2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { generateCode128Svg, getOrderAwbNumber, hasRealDelhiveryAwb } from '../../utils/barcode128';

interface OrderPrintModalProps {
  order: Order | null;
  orders?: Order[];
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'invoice' | 'label' | 'both';
  onLabelDownloaded?: (orderId: string, transitionedToRtd?: boolean) => void;
}

function numberToWordsIndian(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(num);
  if (n === 0) return 'Zero Rupees Only';

  const convertLessThanThousand = (val: number): string => {
    let str = '';
    if (val >= 100) {
      str += a[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      str += b[Math.floor(val / 10)] + ' ';
      val %= 10;
    }
    if (val > 0) {
      str += a[val] + ' ';
    }
    return str.trim();
  };

  const crore = Math.floor(n / 10000000);
  let remainder = n % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  const remaining = remainder % 1000;

  let result = '';
  if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remaining > 0) result += convertLessThanThousand(remaining);

  return result.trim() + ' Rupees Only';
}

export const OrderPrintModal: React.FC<OrderPrintModalProps> = ({
  order,
  orders,
  isOpen,
  onClose,
  initialTab = 'invoice',
  onLabelDownloaded,
}) => {
  const { downloadShippingLabelForOrder } = useStore();
  const [activeTab, setActiveTab] = useState<'invoice' | 'label' | 'both'>(initialTab);
  const [downloadedSuccess, setDownloadedSuccess] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync activeTab when initialTab changes while opening
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
      setDownloadFeedback(null);
      setDownloadedSuccess(false);
    }
  }, [isOpen, initialTab, order?.id]);

  const activeOrders = orders && orders.length > 0 ? orders : (order ? [order] : []);
  if (!isOpen || activeOrders.length === 0) return null;
  const targetOrder = activeOrders[0];
  const eligibleLabelOrders = activeOrders.filter((o) => hasRealDelhiveryAwb(o));
  const hasAnyRealAwb = eligibleLabelOrders.length > 0;

  // CRITICAL: Preview or browser print dialog MUST NOT automatically trigger RTD.
  // RTD is triggered strictly after an actual successful shipping label download action.
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadLabelFile = async () => {
    if (!hasAnyRealAwb) {
      setDownloadFeedback({
        type: 'error',
        message: 'Real Delhivery AWB is not available yet. Generate the Delhivery AWB first — order remains Confirmed.',
      });
      return;
    }

    setIsDownloading(true);
    setDownloadFeedback(null);
    let successCount = 0;
    let movedToRtdCount = 0;
    let lastError = '';

    try {
      for (const ord of eligibleLabelOrders) {
        const res = await downloadShippingLabelForOrder(ord.id);
        if (res.success) {
          successCount++;
          if (res.transitionedToRtd) movedToRtdCount++;
          onLabelDownloaded?.(ord.id, res.transitionedToRtd);
        } else {
          lastError = res.message;
        }
      }

      if (successCount > 0) {
        setDownloadedSuccess(true);
        setDownloadFeedback({
          type: 'success',
          message:
            movedToRtdCount > 0
              ? `Downloaded ${successCount} shipping label(s). ${movedToRtdCount} Confirmed order(s) moved to RTD.`
              : `Downloaded ${successCount} shipping label(s) successfully.`,
        });
      } else {
        setDownloadFeedback({
          type: 'error',
          message: lastError || 'Shipping label download failed. Order remains Confirmed.',
        });
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const renderOrderDocuments = (ord: Order, orderIndex: number) => {
    const anyOrd = ord as any;
    const invoiceNo = `RM-INV-2026-${ord.id.replace(/-/g, '').slice(-6).toUpperCase()}`;
    const orderNo = `#${ord.id.replace(/-/g, '').slice(-8).toUpperCase()}`;
    const orderDate = new Date(ord.createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const hasRealAwb = hasRealDelhiveryAwb(ord);
    const awbNumber = hasRealAwb ? getOrderAwbNumber(ord) : '';
    const barcodeDataUrl = hasRealAwb
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(generateCode128Svg(awbNumber, { height: 56 }))}`
      : '';

    const payStr = String(ord.paymentMode || anyOrd.paymentMethod || '');
    const isCod =
      payStr.toLowerCase().includes('cod') ||
      payStr.toLowerCase().includes('cash');

    const customerName = ord.customer?.name || anyOrd.shippingAddress?.name || 'Customer';
    const customerMobile =
      ord.customer?.phone ||
      (ord.customer as any)?.mobile ||
      anyOrd.shippingAddress?.mobile ||
      anyOrd.shippingAddress?.phone ||
      '+91 XXXXX XXXXX';
    const addressLine = [
      ord.customer?.house,
      ord.customer?.address || ord.customer?.street,
      ord.customer?.landmark,
      anyOrd.shippingAddress?.house,
      anyOrd.shippingAddress?.address || anyOrd.shippingAddress?.street,
      anyOrd.shippingAddress?.landmark,
    ]
      .filter(Boolean)
      .join(', ');
    const city = ord.customer?.city || anyOrd.shippingAddress?.city || 'Meerut';
    const state = ord.customer?.state || anyOrd.shippingAddress?.state || 'Uttar Pradesh';
    const pincode = ord.customer?.pincode || anyOrd.shippingAddress?.pincode || '250002';

    const items =
      ord.items && ord.items.length > 0
        ? ord.items
        : [
            {
              productId: 'p-1',
              name: 'RedMode Premium Apparel',
              image: '',
              size: 'L',
              color: 'Standard',
              quantity: 1,
              price: ord.total || 999,
            },
          ];

    const totalQty = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
    const gstRate = 5;
    const taxableAmount = Math.round((ord.total * 100) / (100 + gstRate));
    const totalGst = ord.total - taxableAmount;
    const isInterstate = !['uttar pradesh', 'up'].includes(state.trim().toLowerCase());
    const cgst = isInterstate ? 0 : Math.round(totalGst / 2);
    const sgst = isInterstate ? 0 : Math.round(totalGst / 2);
    const igst = isInterstate ? totalGst : 0;

    return (
      <div key={ord.id || orderIndex} className="space-y-8 print:break-after-page">
        {/* ============================================================ */}
        {/* DOCUMENT 1: TAX INVOICE (Original Clean Text Branding)       */}
        {/* ============================================================ */}
        {(activeTab === 'invoice' || activeTab === 'both') && (
          <div
            id={`printable-tax-invoice-${orderIndex}`}
            className="bg-white p-6 sm:p-8 rounded-xl border border-slate-300/80 shadow-sm print:border-none print:shadow-none print:p-4 text-slate-900 font-sans text-xs leading-relaxed"
          >
            {/* Invoice Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-baseline gap-1 font-black text-2xl tracking-tight">
                    <span className="text-[#E52229]">RED</span>
                    <span className="text-slate-900">MODE</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                    Lifestyle &amp; Streetwear Co.
                  </p>
                </div>

                <div className="text-right">
                  <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">
                    TAX INVOICE
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Original for Recipient
                  </p>
                  <div className="mt-1 font-mono text-[11px] font-bold text-slate-800">
                    Invoice No: {invoiceNo}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Date: {orderDate}
                  </div>
                </div>
              </div>
            </div>

            {/* Seller & Buyer Grid */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
              {/* Seller / Supplier Details */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Sold By / Supplier Details:
                </p>
                <p className="font-bold text-slate-900">RedMode</p>
                <p className="text-[11px] text-slate-600">1807 Zakir Hussain Colony</p>
                <p className="text-[11px] text-slate-600">Meerut, Uttar Pradesh, 250002, India</p>
                <p className="text-[11px] text-slate-700 font-mono mt-1">
                  <span className="font-bold">GSTIN:</span> 09AAACR1234F1Z8
                </p>
                <p className="text-[11px] text-slate-700">
                  <span className="font-bold">Contact:</span> MyRedMode@gmail.com | 7302797464
                </p>
              </div>

              {/* Buyer / Customer Details */}
              <div className="space-y-1 border-l border-slate-200 pl-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Billed &amp; Shipped To:
                </p>
                <p className="font-bold text-slate-900">{customerName}</p>
                <p className="text-[11px] text-slate-600 leading-snug">
                  {addressLine || 'Address not specified'}
                </p>
                <p className="text-[11px] text-slate-600">
                  {city}, {state} - <span className="font-bold font-mono">{pincode}</span>
                </p>
                <p className="text-[11px] text-slate-700 mt-1">
                  <span className="font-bold">Phone:</span> {customerMobile}
                </p>
                <p className="text-[11px] text-slate-700">
                  <span className="font-bold">Order ID:</span> {orderNo}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div className="mt-4 overflow-hidden border border-slate-300 rounded-lg">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-2 text-center">HSN</th>
                    <th className="py-2 px-2 text-center">Size</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Gross Rate</th>
                    <th className="py-2 px-3 text-right">Taxable</th>
                    <th className="py-2 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {items.map((it, idx) => {
                    const itemGross = it.price || 0;
                    const itemTaxable = Math.round((itemGross * 100) / 105);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{it.name}</p>
                          {it.color && (
                            <p className="text-[10px] text-slate-500">Color: {it.color}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-[10px] text-slate-500">610910</td>
                        <td className="py-2.5 px-2 text-center font-bold">{it.size || 'M'}</td>
                        <td className="py-2.5 px-2 text-center font-bold font-mono">{it.quantity || 1}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{itemGross}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{itemTaxable}</td>
                        <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                          ₹{itemGross * (it.quantity || 1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tax Breakdown & Totals */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-200">
              {/* Left: In Words & Mode of Payment */}
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Invoice Value In Words:</p>
                  <p className="text-[11px] font-bold text-slate-800 italic">
                    {numberToWordsIndian(ord.total)}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Payment Information:</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Method:</span>
                    <span className={`font-bold font-mono ${isCod ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {isCod ? 'CASH ON DELIVERY (COD)' : 'PREPAID ONLINE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Payment Status:</span>
                    <span className="font-bold text-slate-900">{ord.paymentStatus || (isCod ? 'Pending at Delivery' : 'Paid')}</span>
                  </div>
                </div>
              </div>

              {/* Right: Calculations Table */}
              <div className="space-y-1.5 text-right font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>Total Units:</span>
                  <span className="font-bold text-slate-900">{totalQty} pcs</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>Taxable Value:</span>
                  <span className="font-bold text-slate-900">₹{taxableAmount}</span>
                </div>
                {!isInterstate ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                      <span>CGST (2.5%):</span>
                      <span>₹{cgst}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                      <span>SGST (2.5%):</span>
                      <span>₹{sgst}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>IGST (5%):</span>
                    <span>₹{igst}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>Shipping / Delivery:</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black text-slate-900">
                  <span>Grand Total (Net):</span>
                  <span>₹{ord.total}</span>
                </div>
              </div>
            </div>

            {/* Terms and Signatory Footer */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-200 text-[10px] text-slate-500">
              <div>
                <p className="font-bold text-slate-700 uppercase mb-1">Declaration &amp; Terms:</p>
                <ul className="list-disc pl-3 space-y-0.5 leading-snug">
                  <li>We declare that this invoice shows actual price of the goods described.</li>
                  <li>Returns / exchanges eligible within 7 days in original packaging.</li>
                  <li>All disputes subject to Meerut, Uttar Pradesh jurisdiction.</li>
                </ul>
              </div>

              <div className="text-right flex flex-col justify-between items-end">
                <div>
                  <p className="font-bold text-slate-700">For RedMode</p>
                </div>
                <div className="mt-6 border-t border-slate-300 pt-1 w-44 text-center">
                  <p className="font-bold text-slate-800 text-[10px]">Authorized Signatory</p>
                  <p className="text-[9px] text-slate-400">Computer Generated Document</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* DOCUMENT 2: SHIPPING LABEL (4x6 / THERMAL / A6 FORMAT)       */}
        {/* ============================================================ */}
        {(activeTab === 'label' || activeTab === 'both') && (
          <div
            id={`printable-shipping-label-${orderIndex}`}
            className="bg-white max-w-md mx-auto p-5 rounded-xl border-2 border-slate-900 shadow-sm print:border-2 print:border-black print:shadow-none text-slate-900 font-sans text-xs leading-tight relative"
          >
            {/* Header: Official REDMODE Logo & Courier Bar */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5 mb-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  {/* Cropped Official REDMODE Full Horizontal Logo */}
                  <div className="w-40 h-9 overflow-hidden flex items-center justify-start bg-white">
                    <img
                      src="/assets/aistudio/2_cc1df8cf.jpg"
                      alt="REDMODE"
                      className="w-52 h-52 max-w-none object-cover -ml-3.5 mix-blend-multiply"
                    />
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-900 text-white rounded font-bold uppercase tracking-wider">
                    EXPRESS
                  </span>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                  Women&apos;s Fashion &amp; Garments
                </p>
              </div>
              <div className="text-right font-mono font-bold text-[10px] text-slate-700">
                <div className="text-[#E52229] font-black tracking-wide">DELHIVERY</div>
                <div>SURFACE STD</div>
                <div>{orderDate}</div>
              </div>
            </div>

            {/* Genuine Scannable ISO/IEC 15417 Code-128 Routing Barcode */}
            <div className="text-center my-2 p-2.5 bg-white border border-slate-300 rounded">
              {hasRealAwb && barcodeDataUrl ? (
                <>
                  <img
                    src={barcodeDataUrl}
                    alt={`Delhivery Code 128 Barcode ${awbNumber}`}
                    className="h-14 w-full max-w-[290px] mx-auto object-contain"
                  />
                  <p className="font-mono font-bold text-xs tracking-widest text-slate-900 mt-1">
                    AWB: {awbNumber}
                  </p>
                  {ord.delhiverySortCode && (
                    <p className="font-mono text-[10px] font-bold text-slate-600 mt-0.5">
                      SORT CODE: {ord.delhiverySortCode}
                    </p>
                  )}
                </>
              ) : (
                <div className="py-3 px-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] font-semibold flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Real Delhivery AWB not generated yet. Generate AWB before downloading label.</span>
                </div>
              )}
            </div>

            {/* Big Payment Alert Box */}
            <div
              className={`p-2.5 rounded-lg border-2 my-2.5 text-center ${
                isCod
                  ? 'bg-amber-50 border-amber-500 text-amber-950'
                  : 'bg-emerald-50 border-emerald-600 text-emerald-950'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider">
                {isCod ? '⚠ CASH ON DELIVERY (COD)' : '✓ PREPAID ORDER'}
              </p>
              <p className="text-base font-black tracking-tight mt-0.5">
                {isCod ? `COLLECT FROM CUSTOMER: ₹${ord.total}` : 'DO NOT COLLECT CASH'}
              </p>
            </div>

            {/* Delivery Address (Large & Highlighted) */}
            <div className="p-2.5 border border-slate-300 rounded-lg bg-slate-50/50 space-y-1 my-2">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                SHIP TO / DELIVERY DESTINATION:
              </p>
              <p className="text-sm font-black text-slate-900">{customerName}</p>
              <p className="text-xs text-slate-700 font-medium leading-snug">
                {addressLine || '14/2 MG Road, Civil Lines'}
              </p>
              <p className="text-xs text-slate-700 font-medium">
                {city}, {state}
              </p>
              <div className="pt-1 flex items-center justify-between">
                <div className="inline-block bg-slate-900 text-white font-mono font-black text-sm px-2.5 py-1 rounded">
                  PIN: {pincode}
                </div>
                <div className="text-right text-xs font-bold text-slate-900 font-mono">
                  PH: {customerMobile}
                </div>
              </div>
            </div>

            {/* Order Summary Line */}
            <div className="p-2 border border-slate-200 rounded-lg text-[10px] text-slate-600 space-y-1 bg-white">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Order: {orderNo}</span>
                <span>Total Qty: {totalQty} items</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Items: {items.map((it) => `${it.name} (${it.size}) x${it.quantity || 1}`).join(', ')}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 pt-0.5">
                <span>Weight: 0.45 Kg (Volumetric)</span>
                <span>Dimensions: 25 x 20 x 4 cm</span>
              </div>
            </div>

            {/* Shipper & Return Address with REDMODE Emblem */}
            <div className="mt-2.5 pt-2 border-t border-slate-300 text-[9px] text-slate-500 leading-snug flex items-center justify-between gap-2">
              <div>
                <p className="font-bold uppercase text-slate-700">If Undelivered, Return To (RTO):</p>
                <p className="font-bold text-slate-900">RedMode (Women&apos;s Fashion &amp; Garments)</p>
                <p>1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India</p>
                <p className="text-slate-600 font-mono">Support: MyRedMode@gmail.com | 7302797464</p>
              </div>
              <div className="w-9 h-8 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src="/assets/aistudio/1_fdd0186c.jpg"
                  alt="REDMODE Emblem"
                  className="w-14 h-14 max-w-none object-cover mix-blend-multiply"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const headerOrderBadge =
    activeOrders.length > 1
      ? `${activeOrders.length} ORDERS BATCH`
      : `#${targetOrder.id.replace(/-/g, '').slice(-8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container */}
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* Top Header Controls (Hidden during Print) */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-rose-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                <span>Print Invoice &amp; Shipping Label</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 font-mono text-slate-300">
                  {headerOrderBadge}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                1-Click thermal label and official GST compliant invoice
              </p>
            </div>
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-white/10 rounded-xl p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('invoice')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'invoice' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tax Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('label')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'label' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Shipping Label</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('both')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'both' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>Both (A4 Sheet)</span>
            </button>
          </div>

          {/* Action Download, Print & Close */}
          <div className="flex items-center gap-2">
            {(activeTab === 'label' || activeTab === 'both') && (
              <button
                type="button"
                onClick={handleDownloadLabelFile}
                disabled={isDownloading || !hasAnyRealAwb}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                title="Download scannable Delhivery shipping label (moves Confirmed order to RTD only after download succeeds)"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                )}
                <span>{isDownloading ? 'Downloading...' : 'Download Shipping Label'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#E52229] hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Preview</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Download feedback banner */}
        {downloadFeedback && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold border-b flex items-center justify-between print:hidden ${
              downloadFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <span>{downloadFeedback.message}</span>
            <button
              type="button"
              onClick={() => setDownloadFeedback(null)}
              className="p-0.5 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:p-0 print:bg-white print:overflow-visible">
          <div className="max-w-3xl mx-auto space-y-8">
            {activeOrders.map((ord, idx) => renderOrderDocuments(ord, idx))}
          </div>
        </div>

        {/* Modal Bottom Print Button Footer (Hidden during Print) */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                downloadedSuccess || targetOrder.labelDownloaded
                  ? 'bg-indigo-600'
                  : hasAnyRealAwb
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
            ></span>
            {downloadedSuccess || targetOrder.labelDownloaded ? (
              <span className="font-semibold text-indigo-700">
                ✓ Shipping label downloaded — Order moved to RTD (Ready to Dispatch)
              </span>
            ) : hasAnyRealAwb ? (
              <span className="font-medium text-slate-700">
                Preview only — Order stays Confirmed until you click &quot;Download Shipping Label&quot;.
              </span>
            ) : (
              <span className="font-semibold text-amber-700">
                Real Delhivery AWB required before downloading shipping label.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Close
            </button>
            {(activeTab === 'label' || activeTab === 'both') && (
              <button
                type="button"
                onClick={handleDownloadLabelFile}
                disabled={isDownloading || !hasAnyRealAwb}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                )}
                <span>{isDownloading ? 'Downloading...' : 'Download Shipping Label'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#E52229] hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print {activeTab === 'label' ? 'Preview' : activeTab === 'invoice' ? 'Invoice' : 'Documents'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

