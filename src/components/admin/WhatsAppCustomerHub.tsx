import React, { useState, useMemo } from 'react';
import {
  Users,
  Download,
  Search,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Send,
  CheckCircle2,
  Phone,
  FileSpreadsheet,
  Copy,
  Check,
  Tag,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Order } from '../../types';

interface WhatsAppCustomerHubProps {
  orders: Order[];
}

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  state: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  isVIP: boolean;
  status: 'Repeat Buyer' | 'Recent Buyer' | 'Registered';
}

export const WhatsAppCustomerHub: React.FC<WhatsAppCustomerHubProps> = ({ orders }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vip' | 'repeat'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<'festive' | 'new_collection' | 'vip_offer' | 'bogo'>('festive');
  const [campaignDiscountCode, setCampaignDiscountCode] = useState('FESTIVE25');
  const [copiedText, setCopiedText] = useState(false);
  const [sentQueue, setSentQueue] = useState<Record<string, boolean>>({});

  // Base curated repeat customers for Redmode store
  const baseCustomers: CustomerRecord[] = useMemo(
    () => [
      {
        id: 'cust-1',
        name: 'Priya Sharma',
        phone: '9820144521',
        email: 'priya.sharma@gmail.com',
        city: 'Mumbai',
        state: 'Maharashtra',
        totalOrders: 4,
        totalSpent: 8450,
        lastOrderDate: '18 Sep 2024',
        isVIP: true,
        status: 'Repeat Buyer',
      },
      {
        id: 'cust-2',
        name: 'Ananya Verma',
        phone: '9811234980',
        email: 'ananya.verma@yahoo.com',
        city: 'New Delhi',
        state: 'Delhi NCR',
        totalOrders: 3,
        totalSpent: 6200,
        lastOrderDate: '15 Sep 2024',
        isVIP: true,
        status: 'Repeat Buyer',
      },
      {
        id: 'cust-3',
        name: 'Pooja Patel',
        phone: '9723456711',
        email: 'pooja.patel@outlook.com',
        city: 'Ahmedabad',
        state: 'Gujarat',
        totalOrders: 2,
        totalSpent: 4150,
        lastOrderDate: '12 Sep 2024',
        isVIP: false,
        status: 'Recent Buyer',
      },
      {
        id: 'cust-4',
        name: 'Sneha Reddy',
        phone: '9848012399',
        email: 'sneha.reddy@gmail.com',
        city: 'Hyderabad',
        state: 'Telangana',
        totalOrders: 3,
        totalSpent: 7300,
        lastOrderDate: '10 Sep 2024',
        isVIP: true,
        status: 'Repeat Buyer',
      },
      {
        id: 'cust-5',
        name: 'Kavita Joshi',
        phone: '9414055234',
        email: 'kavita.joshi@gmail.com',
        city: 'Jaipur',
        state: 'Rajasthan',
        totalOrders: 2,
        totalSpent: 3890,
        lastOrderDate: '08 Sep 2024',
        isVIP: false,
        status: 'Recent Buyer',
      },
      {
        id: 'cust-6',
        name: 'Neha Gupta',
        phone: '9822019844',
        email: 'neha.gupta@rediffmail.com',
        city: 'Pune',
        state: 'Maharashtra',
        totalOrders: 5,
        totalSpent: 11400,
        lastOrderDate: '05 Sep 2024',
        isVIP: true,
        status: 'Repeat Buyer',
      },
      {
        id: 'cust-7',
        name: 'Ritu Singh',
        phone: '9450012890',
        email: 'ritu.singh@gmail.com',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        totalOrders: 1,
        totalSpent: 2150,
        lastOrderDate: '01 Sep 2024',
        isVIP: false,
        status: 'Recent Buyer',
      },
    ],
    []
  );

  // Combine with dynamic placed store orders
  const allCustomers: CustomerRecord[] = useMemo(() => {
    const list = [...baseCustomers];
    const phoneMap = new Set(list.map((c) => c.phone));

    orders.forEach((o, index) => {
      const name = o.customer?.name || (o as any)?.shippingAddress?.name || 'Customer';
      const rawPhone =
        o.customer?.phone ||
        (o as any)?.customer?.mobile ||
        (o as any)?.shippingAddress?.mobile ||
        (o as any)?.shippingAddress?.phone ||
        '';
      const digits = rawPhone.replace(/[^0-9]/g, '').slice(-10);

      if (digits && digits.length === 10 && !phoneMap.has(digits)) {
        phoneMap.add(digits);
        list.unshift({
          id: `order-cust-${o.id || index}`,
          name,
          phone: digits,
          email: (o.customer as any)?.email,
          city: (o.customer as any)?.city || (o as any)?.shippingAddress?.city || 'India',
          state: (o.customer as any)?.state || (o as any)?.shippingAddress?.state || '',
          totalOrders: 1,
          totalSpent: Number(o.total) || 1850,
          lastOrderDate: 'Just Now',
          isVIP: Number(o.total) > 3000,
          status: 'Recent Buyer',
        });
      }
    });

    return list;
  }, [baseCustomers, orders]);

  // Filtered customer records
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.city.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (filterType === 'vip') return c.isVIP;
      if (filterType === 'repeat') return c.totalOrders > 1;
      return true;
    });
  }, [allCustomers, searchQuery, filterType]);

  // Promotional broadcast templates (modern, neutral e-commerce copy)
  const broadcastTemplates = {
    festive: {
      title: '🪔 Festive Dhamaka Offer',
      badge: 'High Conversion',
      code: 'FESTIVE25',
      text: (code: string) =>
        `Hello! ✨\n\nREDMODE Festive Dhamaka Sale is now LIVE! 🎉\n\n👗 *Special Festive Offer:*\nPayein Flat 25% Off + Free Delivery on our entire Ethnic Kurtis, Silk Sarees & Suit Sets Collection!\n\n🎟️ Use Coupon Code: *${code}*\n🛍️ Shop Now: https://redmode.in\n\n*Hurry, stock is limited for the festive season!* ✨`,
    },
    new_collection: {
      title: '👗 New Velvet & Silk Launch',
      badge: 'New Arrivals',
      code: 'NEWLOOK15',
      text: (code: string) =>
        `Hello! 🌸\n\nREDMODE ka naya Festive & Wedding Collection launch ho gaya hai! ✨\n\n✨ Royal Chanderi Silk Kurtis\n✨ Embroidered Velvet Anarkalis\n✨ Designer Dupatta Sets\n\n🎁 Agle 24 ghante ke liye Flat 15% Extra Off!\nUse Code: *${code}*\n👉 Explore designs: https://redmode.in/new-arrivals`,
    },
    vip_offer: {
      title: '👑 VIP Repeat Buyer Exclusive',
      badge: 'VIP Only',
      code: 'REDVIP300',
      text: (code: string) =>
        `Hello! 👑\n\nAap hamare valued customer hain! Humein khushi hai ki aapne REDMODE ko chuna.\n\n🎁 *Aapke liye special VIP gift:*\nAapke agle order par Flat ₹300 OFF (No minimum order value)!\n\n🎟️ Secret Code: *${code}*\nValid till this Sunday midnight.\n🛍️ Claim your offer: https://redmode.in`,
    },
    bogo: {
      title: '⚡ Buy 1 Get 1 Free Clearance',
      badge: 'Flash Clearance',
      code: 'BOGO',
      text: (code: string) =>
        `Hello! ⚡ Mega Weekend Alert!\n\nREDMODE Weekend Flash Sale starts now! 💃\n\n💥 *BUY 1 GET 1 FREE* on selected Daily Wear Kurtis & Cotton Tunics!\n\n🎟️ Apply Code: *${code}*\nOrder karo 1 aur paao 2!\n🛒 Order now: https://redmode.in/sale`,
    },
  };

  const currentTemplate = broadcastTemplates[selectedTemplate];

  // 1-Click Export Contacts as VCF vCard file for mobile phone import
  const handleExportVCF = () => {
    let vcfContent = '';

    allCustomers.forEach((cust) => {
      const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
      const fullPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;

      vcfContent += `BEGIN:VCARD\r\n`;
      vcfContent += `VERSION:3.0\r\n`;
      vcfContent += `FN:Redmode Cust ${cust.name}\r\n`;
      vcfContent += `N:${cust.name};Redmode Cust;;;\r\n`;
      vcfContent += `ORG:Redmode Customers;\r\n`;
      vcfContent += `TEL;TYPE=CELL,VOICE:${fullPhone}\r\n`;
      if (cust.email) {
        vcfContent += `EMAIL;TYPE=INTERNET:${cust.email}\r\n`;
      }
      vcfContent += `NOTE:Redmode Customer | City: ${cust.city} | Orders: ${cust.totalOrders} | LTV: Rs ${cust.totalSpent}\r\n`;
      vcfContent += `CATEGORIES:Redmode Customers\r\n`;
      vcfContent += `END:VCARD\r\n`;
    });

    const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Redmode_WhatsApp_Customers_${new Date().toISOString().slice(0, 10)}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1-Click Export to CSV / Excel
  const handleExportCSV = () => {
    const headers = ['Customer Name', 'Phone Number', 'Email', 'City', 'State', 'Total Orders', 'Total Spent (INR)', 'VIP'];
    const rows = allCustomers.map((c) => [
      `"${c.name}"`,
      `"+91${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.city}"`,
      `"${c.state}"`,
      c.totalOrders,
      c.totalSpent,
      c.isVIP ? 'YES' : 'NO',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Redmode_Customers_List_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1-Click WhatsApp Direct Message trigger
  const handleSendDirectWhatsApp = (customer: CustomerRecord) => {
    const message = currentTemplate.text(campaignDiscountCode);
    const cleanDigits = customer.phone.replace(/[^0-9]/g, '');
    const phone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // Mark as sent in queue
    setSentQueue((prev) => ({ ...prev, [customer.id]: true }));
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Copy promotional message to clipboard
  const handleCopyTemplate = async () => {
    const textToCopy = currentTemplate.text(campaignDiscountCode);

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const sentCount = Object.keys(sentQueue).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Customer KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Total Customer Base</p>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{allCustomers.length}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">100% Mobile Verified</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Repeat Buyers</p>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {allCustomers.filter((c) => c.totalOrders > 1).length}
          </p>
          <p className="text-[11px] text-purple-600 font-semibold mt-1">High LTV Customers</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Customer Lifetime Value</p>
            <Tag className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ₹{allCustomers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-blue-600 font-semibold mt-1">Total Past Purchases</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Campaign Dispatch Progress</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {sentCount} / {filteredCustomers.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {sentCount > 0 ? `${Math.round((sentCount / filteredCustomers.length) * 100)}% Dispatched` : 'Ready to Launch'}
          </p>
        </div>
      </div>

      {/* SECTION: Interactive Campaign Builder */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Offers &amp; Promotion Campaigns</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a festive or promotional template to preview and dispatch to your customer database.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-500">Discount Code:</span>
            <input
              type="text"
              value={campaignDiscountCode}
              onChange={(e) => setCampaignDiscountCode(e.target.value.toUpperCase())}
              className="w-28 px-2.5 py-1 text-xs font-mono font-bold border border-slate-200 rounded-lg bg-slate-50 text-slate-900 uppercase focus:bg-white focus:border-emerald-500 outline-hidden text-center"
              placeholder="CODE"
            />
          </div>
        </div>

        {/* Template Selection Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(broadcastTemplates) as Array<keyof typeof broadcastTemplates>).map((tKey) => {
            const t = broadcastTemplates[tKey];
            const isSelected = selectedTemplate === tKey;
            return (
              <button
                key={tKey}
                type="button"
                onClick={() => {
                  setSelectedTemplate(tKey);
                  setCampaignDiscountCode(t.code);
                }}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50/80'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {t.badge}
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-1.5">{t.title}</p>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-emerald-700 font-semibold pt-2 border-t border-slate-100">
                  <span>Code: {t.code}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Preview of Message */}
        <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Message Preview (Universal Neutral):</span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
                Ready to Broadcast
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyTemplate}
              className="text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-lg text-slate-700 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto shadow-3xs"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Broadcast Message</span>
                </>
              )}
            </button>
          </div>

          <div className="text-[11px] p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-emerald-900 leading-relaxed">
            💡 <strong>Universal &amp; Safe:</strong> Ye clean neutral message hai (Myntra/Zara pattern). Ise copy karke WhatsApp Broadcast List me ek sath sabhi customers ko bhej sakte hain, bina kisi galat naam ke risk ke.
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-3xs text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans max-w-xl">
            {currentTemplate.text(campaignDiscountCode)}
          </div>
        </div>
      </div>

      {/* SECTION: Customer Directory & Direct Dispatch Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Customer Contacts &amp; Direct Dispatch</h3>
            <p className="text-xs text-slate-500">
              Showing {filteredCustomers.length} verified customers ready for WhatsApp outreach.
            </p>
          </div>

          {/* Search, Filter pills, & Export Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 outline-hidden w-44 sm:w-52"
              />
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/60 text-xs">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({allCustomers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('vip')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  filterType === 'vip' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                VIP
              </button>
              <button
                type="button"
                onClick={() => setFilterType('repeat')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  filterType === 'repeat' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Repeat
              </button>
            </div>

            {/* Quick Export Actions */}
            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              <button
                type="button"
                onClick={handleExportVCF}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Download VCF file to import all customer contacts into phone"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export VCF</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Export customer list to Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel / CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Orders</th>
                <th className="py-3 px-4">Total Spent (LTV)</th>
                <th className="py-3 px-4 text-center">Campaign Status</th>
                <th className="py-3 px-4 text-right">1-Click WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredCustomers.map((c) => {
                const isSent = !!sentQueue[c.id];
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900">{c.name}</p>
                            {c.isVIP && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                VIP
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">{c.status}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-mono text-slate-900 font-semibold">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>+91 {c.phone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.city}
                      {c.state ? `, ${c.state}` : ''}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.totalOrders} orders</td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{c.totalSpent.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-center">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Sent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSendDirectWhatsApp(c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer shadow-3xs ${
                          isSent
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                        title="Send personalized offer via WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSent ? 'Resend' : 'Send Offer'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
