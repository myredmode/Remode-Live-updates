import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  HelpCircle,
  ChevronDown,
  Search,
  Package,
  CreditCard,
  Truck,
  RotateCcw,
  Ruler,
  Headphones,
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'orders' | 'payment' | 'shipping' | 'returns' | 'sizing' | 'support';
  question: string;
  answer: React.ReactNode;
}

export const FAQs: React.FC = () => {
  const { setActiveView, settings, formatPrice } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'orders-1': true, // Open first question by default
  });

  const brandName = settings?.brandName || 'REDMODE';
  const supportEmail = settings?.supportEmail || 'myredmode@gmail.com';
  const whatsappNumber = settings?.whatsappNumber || '+91 73027 97464';
  const cleanWaNumber = whatsappNumber.replace(/\D/g, '');
  const finalWaNumber = cleanWaNumber.length === 10 ? '91' + cleanWaNumber : cleanWaNumber;

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleNavigateHome = () => {
    setActiveView('home');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const categories = [
    { key: 'all', label: 'All Questions', icon: HelpCircle },
    { key: 'orders', label: 'Orders', icon: Package },
    { key: 'payment', label: 'Payment', icon: CreditCard },
    { key: 'shipping', label: 'Shipping & Delivery', icon: Truck },
    { key: 'returns', label: 'Returns & Exchange', icon: RotateCcw },
    { key: 'sizing', label: 'Products & Sizing', icon: Ruler },
    { key: 'support', label: 'Customer Support', icon: Headphones },
  ];

  const faqItems: FAQItem[] = [
    // 1. ORDERS
    {
      id: 'orders-1',
      category: 'orders',
      question: 'How can I place an order?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            Placing an order on {brandName} is simple and quick:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm">
            <li>Browse our curated catalog of kurtis, bottom-wear, and ethnic sets.</li>
            <li>Select your size and color variant, then click <strong>Add to Bag</strong> or <strong>Buy Now</strong>.</li>
            <li>Review your items in the shopping bag and proceed to checkout.</li>
            <li>Enter your shipping details, contact number, and postal pincode.</li>
            <li>Select your preferred payment method—Prepaid (UPI / Cards / Net Banking) or Cash on Delivery (COD).</li>
            <li>Confirm your order. You will receive an instant confirmation message with your Order ID via SMS and WhatsApp.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'orders-2',
      category: 'orders',
      question: 'Can I cancel my order?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            Yes, you can cancel your order free of cost at any time <strong>before it has been dispatched</strong> from our fulfillment center.
          </p>
          <p>
            To cancel, please notify our customer care team via WhatsApp at{' '}
            <a
              href={`https://wa.me/${finalWaNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-950 font-semibold underline underline-offset-2"
            >
              {whatsappNumber}
            </a>{' '}
            or email at{' '}
            <a href={`mailto:${supportEmail}`} className="text-zinc-950 font-semibold underline underline-offset-2">
              {supportEmail}
            </a>{' '}
            with your Order ID.
          </p>
          <p>
            Once an order is handed over to our courier partner (an AWB tracking number has been generated), it cannot be cancelled directly from the system. In such cases, you may decline the parcel at delivery time. For prepaid cancellations prior to shipment, a 100% full refund is credited back to your original payment method within 5–7 working days.
          </p>
        </div>
      ),
    },
    {
      id: 'orders-3',
      category: 'orders',
      question: 'How can I track my order?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            Once your order is verified and dispatched from our facility, an Air Waybill (AWB) number and courier tracking link are sent to your registered mobile number via WhatsApp and SMS, as well as by email.
          </p>
          <p>
            You can also check the real-time tracking status anytime on our dedicated{' '}
            <button
              type="button"
              onClick={() => {
                setActiveView('track-order');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="text-zinc-950 font-semibold underline underline-offset-2 hover:opacity-75 cursor-pointer"
            >
              Track Order page
            </button>{' '}
            by entering your Order ID or phone number.
          </p>
        </div>
      ),
    },
    {
      id: 'orders-4',
      category: 'orders',
      question: 'Can I modify my order after placing it?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            If you need to change your size, color preference, or update your delivery address, please reach out to our support desk immediately via WhatsApp at{' '}
            <a
              href={`https://wa.me/${finalWaNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-950 font-semibold underline underline-offset-2"
            >
              {whatsappNumber}
            </a>{' '}
            before the package has been handed over to the courier.
          </p>
          <p>
            Once a parcel has been picked up by the logistics carrier, shipping coordinates cannot be altered in transit.
          </p>
        </div>
      ),
    },

    // 2. PAYMENT
    {
      id: 'payment-1',
      category: 'payment',
      question: 'What payment methods do you accept?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>We accept a wide range of safe and verified payment options:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
            <li><strong>UPI & QR:</strong> Google Pay, PhonePe, Paytm, BHIM, CRED, and any bank UPI app.</li>
            <li><strong>Debit & Credit Cards:</strong> Visa, MasterCard, RuPay, Maestro, and American Express.</li>
            <li><strong>Net Banking:</strong> Over 50+ major Indian banks supported.</li>
            <li><strong>Cash on Delivery (COD):</strong> Available for eligible postal delivery codes across India.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'payment-2',
      category: 'payment',
      question: 'Is Cash on Delivery available?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            Yes! Cash on Delivery (COD) is available across most serviceable pincodes throughout India.
          </p>
          <p>
            You can verify COD availability instantly at checkout by entering your 6-digit delivery pincode. You pay the exact order amount in cash or via delivery-agent UPI QR code when the parcel is delivered to your doorstep.
          </p>
        </div>
      ),
    },
    {
      id: 'payment-3',
      category: 'payment',
      question: 'Is prepaid payment secure?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            Absolutely. Every online transaction on {brandName} is processed via industry-standard 256-bit SSL encrypted payment gateways adhering strictly to PCI-DSS Level 1 compliance.
          </p>
          <p>
            We do not store your banking passwords, card CVV, or PIN credentials on our servers at any time.
          </p>
        </div>
      ),
    },
    {
      id: 'payment-4',
      category: 'payment',
      question: 'Do you offer any prepaid discount?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            Yes! We offer an <strong>extra 10% instant auto-discount</strong> on all prepaid orders with a cart value of {formatPrice(settings.autoDiscountThreshold || 999)} or higher.
          </p>
          <p>
            In addition to monetary savings, all prepaid orders are prioritized for <strong>same-day fulfillment & express dispatch</strong> from our warehouse.
          </p>
        </div>
      ),
    },

    // 3. SHIPPING & DELIVERY
    {
      id: 'shipping-1',
      category: 'shipping',
      question: 'How long does delivery take?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>Our standard domestic delivery timeline across India is:</p>
          <p className="font-bold text-zinc-950">3–7 business days after dispatch.</p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
            <li><strong>Metro Cities (Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai):</strong> Typically 3 to 4 business days.</li>
            <li><strong>Tier-2, Tier-3 & Regional Destinations:</strong> Typically 5 to 7 business days.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'shipping-2',
      category: 'shipping',
      question: 'Do you provide same-day dispatch for prepaid orders?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            Yes. Prepaid orders placed within our operational transit cutoff hours are given priority packaging and dispatch on the same business day from our central fulfillment hub in Meerut, Uttar Pradesh, subject to fabric quality inspection.
          </p>
        </div>
      ),
    },
    {
      id: 'shipping-3',
      category: 'shipping',
      question: 'Do you ship internationally?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            Yes, {brandName} ships to international destinations across North America, Europe, the Middle East, and Asia-Pacific.
          </p>
          <p>
            Our standard international delivery timeline is <strong>7–21 business days after dispatch</strong>, depending on destination country customs processing and international air cargo connectivity.
          </p>
        </div>
      ),
    },
    {
      id: 'shipping-4',
      category: 'shipping',
      question: 'How can I track my shipment?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            Once your shipment is registered with our courier partner, you receive an automated notification containing your Air Waybill (AWB) number and direct courier tracking link via WhatsApp, SMS, and email.
          </p>
          <p>
            You can also click{' '}
            <button
              type="button"
              onClick={() => {
                setActiveView('track-order');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="text-zinc-950 font-semibold underline underline-offset-2 hover:opacity-75 cursor-pointer"
            >
              Order Tracking
            </button>{' '}
            in our header or footer to view the delivery progress at any moment.
          </p>
        </div>
      ),
    },

    // 4. RETURNS & EXCHANGE
    {
      id: 'returns-1',
      category: 'returns',
      question: 'What is your return/exchange policy?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            We take pride in our artisan craftsmanship and stand firmly behind our quality. We facilitate hassle-free returns, replacements, or size exchanges under the following conditions:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
            <li>The garment arrived damaged in transit or exhibits a manufacturing flaw.</li>
            <li>The item delivered differs in size, color, or style from what was ordered.</li>
            <li>You request a size exchange for a better fit (subject to stock availability).</li>
          </ul>
          <p>
            All returned garments must remain in their original, unwashed, unworn condition with all brand tags and original packaging intact.
          </p>
        </div>
      ),
    },
    {
      id: 'returns-2',
      category: 'returns',
      question: 'What should I do if I receive a damaged product?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            If your parcel arrives damaged or with any fabric defect, please notify us immediately.
          </p>
          <p>
            Take clear photos or a short video of the damaged section along with the garment tags and parcel shipping label, and send them to our support desk via WhatsApp at{' '}
            <a
              href={`https://wa.me/${finalWaNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-950 font-semibold underline underline-offset-2"
            >
              {whatsappNumber}
            </a>{' '}
            or email at{' '}
            <a href={`mailto:${supportEmail}`} className="text-zinc-950 font-semibold underline underline-offset-2">
              {supportEmail}
            </a>
            .
          </p>
          <p>
            Once accepted by our quality inspection team, a replacement is dispatched within <strong>48 hours of claim approval</strong> at zero cost to you.
          </p>
        </div>
      ),
    },
    {
      id: 'returns-3',
      category: 'returns',
      question: 'What should I do if I receive the wrong product?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            In the rare event that an incorrect item or size was delivered, please share your Order ID and a photo of the received item and packaging tag with our team via WhatsApp or email.
          </p>
          <p>
            We will arrange a priority exchange and reverse pickup for the incorrectly sent piece right away.
          </p>
        </div>
      ),
    },
    {
      id: 'returns-4',
      category: 'returns',
      question: 'How long do I have to report an issue?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p className="font-bold text-zinc-950">
            All damage, defect, or incorrect delivery claims must be reported within 48 HOURS OF DELIVERY.
          </p>
          <p>
            Prompt reporting is necessary so we can initiate courier investigation and issue replacement clearance with our dispatch center. Claims submitted after 48 hours of verified carrier delivery cannot be accepted.
          </p>
        </div>
      ),
    },

    // 5. PRODUCTS & SIZING
    {
      id: 'sizing-1',
      category: 'sizing',
      question: 'How do I choose my size?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            Every product page features accurate garment measurements. To find your ideal size:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm">
            <li>Take a measuring tape and measure around the fullest part of your bust/chest.</li>
            <li>Measure your natural waistline and fullest hip circumference.</li>
            <li>Compare your body measurements to our garment size chart. We typically build in 1.5 to 2 inches of comfortable ease into all ethnic silhouettes.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'sizing-2',
      category: 'sizing',
      question: 'Where can I find the Size Guide?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            You can access our comprehensive{' '}
            <button
              type="button"
              onClick={() => {
                setActiveView('size-guide');
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/size-guide');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }
              }}
              className="text-zinc-950 font-semibold underline underline-offset-2 hover:opacity-75 cursor-pointer"
            >
              Interactive Size Guide page
            </button>{' '}
            at any time.
          </p>
          <p>
            It includes full measurement charts for Kurtis and Trousers in both <strong>Inches (in)</strong> and <strong>Centimeters (cm)</strong>, alongside a step-by-step &quot;How to Measure&quot; visual guide.
          </p>
        </div>
      ),
    },
    {
      id: 'sizing-3',
      category: 'sizing',
      question: 'What should I do if I am between two sizes?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>
            If your measurements fall between two sizes:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
            <li>For straight-cut kurtis or structured fabrics (pure cotton, chanderi), we recommend choosing the <strong>larger size</strong> for a graceful drape and effortless movement.</li>
            <li>For anarkalis or A-line fits where the waist/hip is flared, choosing based primarily on your <strong>bust measurement</strong> will provide the best fit.</li>
          </ul>
          <p>
            You can also WhatsApp us at{' '}
            <a
              href={`https://wa.me/${finalWaNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-950 font-semibold underline underline-offset-2"
            >
              {whatsappNumber}
            </a>{' '}
            and our styling team will help you pick the exact size for your body type.
          </p>
        </div>
      ),
    },

    // 6. CUSTOMER SUPPORT
    {
      id: 'support-1',
      category: 'support',
      question: 'How can I contact RedMode?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>You can connect with us through multiple official channels:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
            <li>
              <strong>WhatsApp:</strong>{' '}
              <a
                href={`https://wa.me/${finalWaNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-semibold hover:underline"
              >
                {whatsappNumber}
              </a>{' '}
              (Fastest support for orders & sizing)
            </li>
            <li>
              <strong>Email:</strong>{' '}
              <a href={`mailto:${supportEmail}`} className="text-zinc-950 font-semibold hover:underline">
                {supportEmail}
              </a>
            </li>
            <li>
              <strong>Direct Form:</strong> Visit our{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveView('contact');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className="text-zinc-950 font-semibold underline underline-offset-2 hover:opacity-75 cursor-pointer"
              >
                Contact Us
              </button>{' '}
              page to send an inquiry directly to our support desk.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'support-2',
      category: 'support',
      question: 'What are your customer support hours?',
      answer: (
        <div className="space-y-2 text-zinc-700 leading-relaxed">
          <p>Our customer assistance desk operates:</p>
          <p className="font-bold text-zinc-950">
            Monday – Saturday: 10:00 AM – 7:00 PM IST
          </p>
          <p className="text-xs sm:text-sm text-zinc-600">
            Operating from RedMode, 1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India. Messages sent outside operational hours or on public holidays are answered promptly on the next business morning.
          </p>
        </div>
      ),
    },
  ];

  // Filter items by category & search query
  const filteredFaqs = faqItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    if (!matchesCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesQuestion = item.question.toLowerCase().includes(q);
    return matchesQuestion;
  });

  return (
    <div className="bg-white min-h-screen text-zinc-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb: Home / FAQs */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center space-x-2 text-xs text-zinc-500 uppercase tracking-wider">
            <li>
              <button
                type="button"
                onClick={handleNavigateHome}
                className="hover:text-zinc-950 transition cursor-pointer"
              >
                Home
              </button>
            </li>
            <li className="text-zinc-400">/</li>
            <li className="text-zinc-900 font-semibold" aria-current="page">
              FAQs
            </li>
          </ol>
        </nav>

        {/* Header Section */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="w-6 h-6 text-zinc-900" />
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-zinc-950 font-sans">
              FREQUENTLY ASKED QUESTIONS
            </h1>
          </div>
          <p className="text-sm sm:text-base text-zinc-600 max-w-2xl leading-relaxed mt-2">
            Find answers to the most common questions about {brandName} products, orders, shipping, payments and returns.
          </p>
        </header>

        {/* Search Bar */}
        <div className="mb-8 relative max-w-xl">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your question (e.g. delivery time, COD, return, size)..."
              className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white transition rounded-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition cursor-pointer border ${
                  isSelected
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-950'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQs Accordion List */}
        <section aria-label="Frequently Asked Questions" className="space-y-3 mb-12">
          {filteredFaqs.length === 0 ? (
            <div className="border border-zinc-200 p-8 text-center bg-zinc-50/50">
              <p className="text-sm font-medium text-zinc-600">
                No questions found matching &quot;{searchQuery}&quot;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-3 text-xs font-bold text-zinc-950 underline underline-offset-2 uppercase tracking-wider cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          ) : (
            filteredFaqs.map((item) => {
              const isOpen = !!openIds[item.id];
              return (
                <div
                  key={item.id}
                  className={`border transition duration-150 ${
                    isOpen ? 'border-zinc-950 bg-white shadow-2xs' : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(item.id)}
                    aria-expanded={isOpen}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                  >
                    <span className="text-sm sm:text-base font-semibold text-zinc-950 font-sans">
                      {item.question}
                    </span>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-zinc-500 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-zinc-950 bg-zinc-100' : 'bg-transparent'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm border-t border-zinc-100 animate-fadeIn">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
};
