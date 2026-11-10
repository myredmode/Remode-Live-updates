import React from 'react';
import { useStore } from '../context/StoreContext';

export const ReturnsExchange: React.FC = () => {
  const { setActiveView, settings } = useStore();

  const brandName = settings?.brandName || 'REDMODE';
  const supportEmail = settings?.supportEmail || 'myredmode@gmail.com';
  const whatsappNumber = settings?.whatsappNumber || '+91 73027 97464';
  const websiteDomain = 'redmode.in';

  return (
    <div className="bg-white min-h-screen text-black">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 py-8 sm:py-12">
        {/* Main Title - Left Aligned, Bold, Clean Upper Case */}
        <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide text-black mb-6">
          RETURNS AND EXCHANGE POLICY
        </h1>

        {/* Quick Contact Header - Matching Privacy & Terms format */}
        <div className="space-y-4 text-[14px] sm:text-[15px] leading-relaxed text-black mb-6">
          <p>For Return/Exchange of any order, Please click on the link below:-</p>
          
          <p className="break-all">
            <button
              type="button"
              onClick={() => {
                setActiveView('contact');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="text-black underline underline-offset-2 hover:opacity-70 cursor-pointer font-normal text-left"
            >
              https://{websiteDomain}/returns?brand={brandName.toLowerCase()}&service=exchange
            </button>
          </p>

          <p>
            Mail: <a href={`mailto:${supportEmail}`} className="text-black hover:underline">{supportEmail}</a>
          </p>

          <p>
            Customer Care / WhatsApp: <a href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-black hover:underline">{whatsappNumber}</a>
          </p>
        </div>

        {/* Policy Body - Left aligned, clean paragraphs, exact spacing and layout */}
        <div className="space-y-6 text-[14px] sm:text-[15px] leading-relaxed text-zinc-900 font-normal">
          <p>
            At {brandName}, our objective is to provide high craftsmanship in handcrafted ethnic wear and a dependable shopping experience on our website {websiteDomain}. This Returns and Exchange Policy sets out the terms, guidelines, and procedures applicable to returns, replacements, and size exchanges.
          </p>

          <p className="font-bold text-black pt-2">
            1. OVERVIEW
          </p>
          <p>
            We take meticulous care in quality inspection, fabric curation, and tailoring before any garment leaves our fulfillment facility. In the event that a garment received is damaged, defective, incorrectly supplied, or requires a size exchange, we facilitate a transparent and hassle-free resolution process in accordance with this policy.
          </p>

          <p className="font-bold text-black pt-2">
            2. ELIGIBILITY
          </p>
          <p>
            An item purchased on our website qualifies for return, replacement, or size exchange under the following circumstances:
          </p>
          <p>
            • The delivered item has arrived damaged in transit or exhibits verified manufacturing defects in fabric or stitching.<br />
            • The item received differs in style, size, or color from what was ordered in your confirmed order details.<br />
            • An exchange for an alternate size is requested, subject to stock availability and adherence to product return conditions.
          </p>

          <p className="font-bold text-black pt-2">
            3. DAMAGED, DEFECTIVE OR INCORRECT PRODUCTS
          </p>
          <p>
            If you receive a damaged, defective, or incorrect product, the issue must be reported within our mandatory reporting period:
          </p>
          <p className="font-semibold text-black">
            All claims must be reported within 48 HOURS OF DELIVERY.
          </p>
          <p>
            Timely notification is essential to allow our team to initiate immediate verification with our warehouse and logistics partners. Claims submitted after 48 hours of confirmed delivery cannot be entertained for transit damage or incorrect items.
          </p>

          <p className="font-bold text-black pt-2">
            4. REPORTING AN ISSUE
          </p>
          <p>
            To report an issue with your received order, please contact our support team via email or WhatsApp and provide:
          </p>
          <p>
            • Your Order ID and registered mobile number.<br />
            • A clear description of the defect, damage, or discrepancy observed.<br />
            • Clear, well-lit photographs or a short video demonstrating the issue, along with pictures of the brand tags and parcel shipping label.
          </p>

          <p className="font-bold text-black pt-2">
            5. RETURN / REPLACEMENT PROCESS
          </p>
          <p>
            Once our customer support team receives your issue report and required documentation, the claim is reviewed by our quality assurance desk.
          </p>
          <p>
            Where a product is confirmed as damaged, defective, or incorrectly dispatched, {brandName} provides replacement within 48 hours of claim acceptance. Replacement items are processed only after official claim review and approval.
          </p>

          <p className="font-bold text-black pt-2">
            6. PRODUCTS THAT ARE NOT ELIGIBLE
          </p>
          <p>
            The following products and conditions are strictly non-eligible for return or exchange:
          </p>
          <p>
            • Products damaged due to customer misuse, rough handling, pulling, or snagging.<br />
            • Products damaged through improper washing, bleaching, harsh detergents, ironing burns, or failure to follow fabric care instructions.<br />
            • Garments that have been altered, hemmed, or customized after delivery.<br />
            • Items showing signs of wear, perfume odors, deodorant stains, makeup marks, or dirt.<br />
            • Products returned without original tags, wash care labels, or brand packaging.<br />
            • Clearance sale items explicitly marked as non-returnable at the time of purchase.
          </p>

          <p className="font-bold text-black pt-2">
            7. CONDITION OF PRODUCTS
          </p>
          <p>
            All products submitted for an approved return or exchange must be in their original, unwashed, and unworn condition with all original tags attached and neatly placed in the original packaging. Items that do not meet these criteria will not qualify for replacement and will be returned to the customer.
          </p>

          <p className="font-bold text-black pt-2">
            8. EXCHANGE
          </p>
          <p>
            If you wish to exchange an item for an alternate size, you may submit a size exchange request. Size exchanges are strictly subject to warehouse inventory availability of the requested size or variant. If the requested size is unavailable, our team will assist you with an alternative option or issue a store credit or refund.
          </p>

          <p className="font-bold text-black pt-2">
            9. REFUNDS
          </p>
          <p>
            Refunds apply when an eligible return has been received, inspected, and approved at our facility, or when an exchange cannot be completed due to product unavailability.
          </p>
          <p>
            For prepaid orders, refunds are credited back to the original payment source (UPI, net banking, or debit/credit card). For Cash on Delivery (COD) orders, refunds are issued via direct bank transfer (NEFT/IMPS) or store credit after verification of bank account details provided by the customer. Refunds typically reflect within 5–7 business days following approval.
          </p>

          <p className="font-bold text-black pt-2">
            10. CONTACT US
          </p>
          <p>
            For returns, size exchanges, and support assistance, please contact our team at{' '}
            <a href={`mailto:${supportEmail}`} className="text-black underline">
              {supportEmail}
            </a>{' '}
            or WhatsApp us at{' '}
            <a
              href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-black underline"
            >
              {whatsappNumber}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
