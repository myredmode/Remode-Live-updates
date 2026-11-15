import React, { useState } from 'react';
import { Order } from '../../types';
import { Printer, X, FileText, Tag, Check, ArrowDownToLine } from 'lucide-react';

interface OrderPrintModalProps {
  order: Order | null;
  orders?: Order[];
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'invoice' | 'label' | 'both';
  onLabelDownloaded?: (orderId: string) => void;
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
  const [activeTab, setActiveTab] = useState<'invoice' | 'label' | 'both'>(initialTab);
  const [hasDispatchedTracking, setHasDispatchedTracking] = useState(false);

  // Sync activeTab when initialTab changes while opening
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const activeOrders = orders && orders.length > 0 ? orders : (order ? [order] : []);
  if (!isOpen || activeOrders.length === 0) return null;
  const targetOrder = activeOrders[0];

  const handlePrint = () => {
    if (activeTab === 'label' || activeTab === 'both') {
      activeOrders.forEach((o) => onLabelDownloaded?.(o.id));
      setHasDispatchedTracking(true);
    }
    window.print();
  };

  const handleDownloadLabelFile = () => {
    activeOrders.forEach((o) => onLabelDownloaded?.(o.id));
    setHasDispatchedTracking(true);
    const origin = window.location.origin;
    const logoIconUrl = `${origin}/assets/aistudio/1_fdd0186c.jpg`;
    const logoFullUrl = `${origin}/assets/aistudio/2_cc1df8cf.jpg`;

    const labelsHtml = activeOrders
      .map((ord) => {
        const anyOrd = ord as any;
        const ordNo = `#${ord.id.replace(/-/g, '').slice(-8).toUpperCase()}`;
        const ordDate = new Date(ord.createdAt || Date.now()).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const awb =
          ord.shipmozo?.awb ||
          anyOrd.shipment?.awb ||
          ord.awb_number ||
          `RM${ord.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}IN`;
        const payStr = String(ord.paymentMode || anyOrd.paymentMethod || '');
        const cod =
          payStr.toLowerCase().includes('cod') ||
          payStr.toLowerCase().includes('cash');
        const cName = ord.customer?.name || anyOrd.shippingAddress?.name || 'Valued Customer';
        const cMobile =
          ord.customer?.phone ||
          (ord.customer as any)?.mobile ||
          anyOrd.shippingAddress?.mobile ||
          anyOrd.shippingAddress?.phone ||
          '+91 98765 43210';
        const addrLine =
          [
            ord.customer?.house,
            ord.customer?.address || ord.customer?.street,
            ord.customer?.landmark,
            anyOrd.shippingAddress?.house,
            anyOrd.shippingAddress?.address || anyOrd.shippingAddress?.street,
            anyOrd.shippingAddress?.landmark,
          ]
            .filter(Boolean)
            .join(', ') || '14/2 MG Road, Civil Lines';
        const cCity = ord.customer?.city || anyOrd.shippingAddress?.city || 'New Delhi';
        const cState = ord.customer?.state || anyOrd.shippingAddress?.state || 'Delhi';
        const cPin = ord.customer?.pincode || anyOrd.shippingAddress?.pincode || '110001';
        const ordItems =
          ord.items && ord.items.length > 0
            ? ord.items
            : [
                {
                  productId: 'p-1',
                  name: 'RedMode Signature Ethnic Kurta Set',
                  image: '',
                  size: 'M',
                  color: 'Crimson Red',
                  quantity: 1,
                  price: ord.total || 1499,
                },
              ];
        const qty = ordItems.reduce((acc, it) => acc + (it.quantity || 1), 0);

        return `
          <div class="label-sheet">
            <div class="hdr">
              <div class="brand-wrap">
                <div class="logo-crop">
                  <img src="${logoFullUrl}" alt="REDMODE" class="logo-img" onerror="this.style.display='none'" />
                </div>
                <div class="brand-sub">WOMEN FASHION &amp; ETHNIC WEAR &bull; EXPRESS</div>
              </div>
              <div class="routing">
                <div class="courier-badge">DELHIVERY SURFACE</div>
                <div class="date-txt">${ordDate}</div>
              </div>
            </div>

            <div class="barcode-box">
              <div class="barcode-stripes"></div>
              <div class="awb-txt">AWB: ${awb}</div>
              <div class="order-ref">ORDER ID: ${ordNo}</div>
            </div>

            <div class="pay-box ${cod ? 'pay-cod' : 'pay-prepaid'}">
              <div class="pay-mode">${cod ? '⚠ CASH ON DELIVERY (COD)' : '✓ PREPAID ORDER'}</div>
              <div class="pay-amt">${cod ? `COLLECT CASH: ₹${ord.total}` : 'DO NOT COLLECT CASH (PAID)'}</div>
            </div>

            <div class="addr-box">
              <div class="sec-label">SHIP TO / DELIVERY DESTINATION:</div>
              <div class="cust-name">${cName}</div>
              <div class="cust-addr">${addrLine}</div>
              <div class="cust-addr">${cCity}, ${cState}</div>
              <div class="pin-row">
                <span class="pin-badge">PIN: ${cPin}</span>
                <span class="ph-badge">PH: ${cMobile}</span>
              </div>
            </div>

            <div class="items-box">
              <div class="items-hdr">
                <span>Order: ${ordNo}</span>
                <span>Total Qty: ${qty} pcs</span>
              </div>
              <div class="items-list">
                Items: ${ordItems.map((it) => `${it.name} (Size: ${it.size || 'M'}) x${it.quantity || 1}`).join(', ')}
              </div>
              <div class="items-meta">
                <span>Weight: 0.45 Kg (Volumetric)</span>
                <span>Dimensions: 25 x 20 x 4 cm</span>
              </div>
            </div>

            <div class="rto-box">
              <div class="rto-row">
                <div>
                  <div class="rto-title">IF UNDELIVERED, RETURN TO (RTO ORIGIN):</div>
                  <div class="rto-name">REDMODE (RedMode Lifestyle &amp; Garments)</div>
                  <div>1807 Zakir Hussain Colony, Meerut, Uttar Pradesh - 250002, India</div>
                  <div class="rto-contact">Support: MyRedMode@gmail.com | +91 7302797464</div>
                </div>
                <div class="rto-emblem">
                  <img src="${logoIconUrl}" alt="RM" />
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>REDMODE Shipping Label - ${activeOrders[0].id}</title>
  <style>
    @page { size: 4in 6in; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #f8fafc;
      margin: 0;
      padding: 16px;
      color: #0f172a;
    }
    .toolbar {
      max-width: 400px;
      margin: 0 auto 14px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #fff;
      padding: 10px 14px;
      border-radius: 10px;
    }
    .toolbar button {
      background: #E52229;
      color: #fff;
      border: none;
      padding: 7px 14px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 12px;
      cursor: pointer;
    }
    .label-sheet {
      background: #ffffff;
      max-width: 400px;
      margin: 0 auto 20px auto;
      padding: 16px;
      border: 2px solid #0f172a;
      border-radius: 10px;
      page-break-after: always;
    }
    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .logo-crop {
      width: 165px;
      height: 38px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    .logo-img {
      width: 210px;
      height: 210px;
      object-fit: cover;
      margin-left: -18px;
      mix-blend-mode: multiply;
    }
    .brand-sub {
      font-size: 8.5px;
      font-weight: 800;
      color: #475569;
      letter-spacing: 0.4px;
      margin-top: 2px;
    }
    .routing {
      text-align: right;
      font-family: monospace;
    }
    .courier-badge {
      background: #0f172a;
      color: #fff;
      font-size: 9px;
      font-weight: 900;
      padding: 3px 6px;
      border-radius: 4px;
      display: inline-block;
    }
    .date-txt {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      margin-top: 3px;
    }
    .barcode-box {
      text-align: center;
      padding: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .barcode-stripes {
      height: 40px;
      width: 88%;
      margin: 0 auto 5px auto;
      background: repeating-linear-gradient(90deg, #0f172a 0px, #0f172a 2px, transparent 2px, transparent 4px, #0f172a 4px, #0f172a 7px, transparent 7px, transparent 10px, #0f172a 10px, #0f172a 12px, transparent 12px, transparent 15px);
    }
    .awb-txt {
      font-family: monospace;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 1.5px;
    }
    .order-ref {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      margin-top: 2px;
    }
    .pay-box {
      padding: 8px;
      border-radius: 6px;
      text-align: center;
      margin-bottom: 10px;
      border: 2px solid #0f172a;
    }
    .pay-cod { background: #fffbeb; border-color: #f59e0b; color: #78350f; }
    .pay-prepaid { background: #ecfdf5; border-color: #059669; color: #064e3b; }
    .pay-mode { font-size: 10px; font-weight: 800; letter-spacing: 0.5px; }
    .pay-amt { font-size: 15px; font-weight: 900; margin-top: 2px; }
    .addr-box {
      padding: 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #f8fafc;
      margin-bottom: 10px;
    }
    .sec-label { font-size: 9px; font-weight: 900; color: #64748b; margin-bottom: 3px; }
    .cust-name { font-size: 14px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
    .cust-addr { font-size: 11.5px; font-weight: 500; color: #334155; line-height: 1.35; }
    .pin-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #cbd5e1;
    }
    .pin-badge {
      background: #0f172a;
      color: #fff;
      font-family: monospace;
      font-weight: 900;
      font-size: 13px;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .ph-badge {
      font-family: monospace;
      font-weight: 800;
      font-size: 11.5px;
    }
    .items-box {
      padding: 8px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 10px;
      margin-bottom: 10px;
    }
    .items-hdr { display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 3px; }
    .items-list { color: #475569; margin-bottom: 4px; line-height: 1.3; }
    .items-meta { display: flex; justify-content: space-between; color: #94a3b8; font-size: 9px; }
    .rto-box {
      border-top: 1.5px solid #cbd5e1;
      padding-top: 8px;
      font-size: 9px;
      color: #475569;
      line-height: 1.35;
    }
    .rto-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .rto-title { font-weight: 900; color: #0f172a; }
    .rto-name { font-weight: 800; color: #1e293b; }
    .rto-contact { font-family: monospace; color: #334155; }
    .rto-emblem { width: 34px; height: 30px; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rto-emblem img { width: 54px; height: 54px; object-fit: cover; mix-blend-mode: multiply; }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .label-sheet { border: 2px solid #000; border-radius: 0; margin: 0 auto; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span style="font-size:12px;font-weight:700;">REDMODE Official 4x6 Thermal Label</span>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${labelsHtml}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileSuffix =
      activeOrders.length > 1
        ? `BULK-${activeOrders.length}-ORDERS`
        : targetOrder.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
    a.download = `REDMODE-Shipping-Label-${fileSuffix}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

    const awbNumber =
      ord.shipmozo?.awb ||
      anyOrd.shipment?.awb ||
      ord.awb_number ||
      `RM${ord.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}IN`;

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

            {/* Routing Barcode */}
            <div className="text-center my-2 p-2 bg-slate-50 border border-slate-300 rounded">
              <div className="h-10 flex items-center justify-center gap-[3px] overflow-hidden px-4">
                {[4, 2, 6, 1, 3, 5, 2, 4, 1, 7, 3, 2, 6, 4, 1, 5, 2, 6, 3, 1, 4, 2, 5, 1, 3, 6, 2, 4, 1, 5, 3].map(
                  (h, i) => (
                    <div
                      key={i}
                      className="bg-slate-900 rounded-2xs"
                      style={{
                        width: `${(i % 3) + 1.5}px`,
                        height: `${28 + (h % 3) * 4}px`,
                      }}
                    />
                  )
                )}
              </div>
              <p className="font-mono font-bold text-xs tracking-widest text-slate-900 mt-1">
                AWB: {awbNumber}
              </p>
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
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                title="Download 4x6 thermal shipping label with REDMODE logo"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Download Label</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#E52229] hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now</span>
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

        {/* Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:p-0 print:bg-white print:overflow-visible">
          <div className="max-w-3xl mx-auto space-y-8">
            {activeOrders.map((ord, idx) => renderOrderDocuments(ord, idx))}
          </div>
        </div>

        {/* Modal Bottom Print Button Footer (Hidden during Print) */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${hasDispatchedTracking || targetOrder.labelDownloaded ? 'bg-blue-600' : 'bg-emerald-500'}`}></span>
            {hasDispatchedTracking || targetOrder.labelDownloaded ? (
              <span className="font-semibold text-blue-700">
                ✓ Label printed &amp; Delhivery tracking update dispatched to customer (₹0 inside 24h window)
              </span>
            ) : (
              <span>Ready to print 4x6 thermal label or standard invoice</span>
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
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Download Label</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#E52229] hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print {activeTab === 'label' ? 'Label' : activeTab === 'invoice' ? 'Invoice' : 'Documents'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

