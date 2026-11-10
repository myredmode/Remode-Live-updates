import React from 'react';
import { useStore } from '../context/StoreContext';

export const ShippingPolicy: React.FC = () => {
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
          SHIPPING & DELIVERY
        </h1>

        {/* Quick Contact Header - Matching Privacy & Terms format */}
        <div className="space-y-4 text-[14px] sm:text-[15px] leading-relaxed text-black mb-6">
          <p>For any shipping inquiries, delivery timeline updates, or tracking assistance, please reach us below:-</p>
          
          <p className="break-all">
            <button
              type="button"
              onClick={() => {
                setActiveView('track-order');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="text-black underline underline-offset-2 hover:opacity-70 cursor-pointer font-normal text-left"
            >
              https://{websiteDomain}/trackyourorder
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
            At {brandName}, we take pride in delivering handcrafted ethnic wear and premium kurtis safely and efficiently to our customers across India and internationally. This Shipping & Delivery Policy explains our processing timelines, transit schedules, and courier handling procedures.
          </p>

          <p className="font-bold text-black pt-2">
            1. OVERVIEW
          </p>
          <p>
            {brandName} partners with leading express courier networks and logistics aggregators to ensure secure parcel handling and prompt fulfillment. Shipping and delivery timelines may vary depending on destination location, product inventory availability, warehouse processing schedules, and prevailing regional logistics conditions.
          </p>

          <p className="font-bold text-black pt-2">
            2. ORDER PROCESSING
          </p>
          <p>
            All orders placed on our website are processed after successful order confirmation. Prepaid orders may be prioritized for same-day dispatch from our fulfillment warehouse where applicable and when placed within operating transit hours.
          </p>
          <p>
            Cash on Delivery (COD) orders are scheduled and dispatched in accordance with our standard fulfillment and customer verification schedule. All order dispatches are strictly subject to real-time product availability, fabric quality inspection, and accurate contact verification.
          </p>

          <p className="font-bold text-black pt-2">
            3. DOMESTIC SHIPPING
          </p>
          <p>
            For delivery within India, {brandName}&apos;s standard domestic delivery timeline is:
          </p>
          <p className="font-semibold text-black">
            3–7 business days after dispatch.
          </p>
          <p>
            Metropolitan cities (such as Delhi NCR, Mumbai, Bengaluru, Hyderabad, and Chennai) typically receive delivery within 3 to 4 business days. Regional, tier-2, tier-3, and remote locations may require up to 5 to 7 business days. Delivery times can vary depending on destination accessibility, local courier logistics, regional public holidays, extreme weather conditions, or operational transit delays beyond {brandName}&apos;s direct control.
          </p>

          <p className="font-bold text-black pt-2">
            4. INTERNATIONAL SHIPPING
          </p>
          <p>
            For international shipments dispatched outside India, our standard delivery timeline is:
          </p>
          <p className="font-semibold text-black">
            7–21 business days after dispatch.
          </p>
          <p>
            International delivery timelines vary depending on the destination country, customs clearance procedures, international air freight schedules, import regulatory inspections, and local partner carrier operations.
          </p>

          <p className="font-bold text-black pt-2">
            5. SHIPPING CHARGES
          </p>
          <p>
            Applicable shipping charges, if any, are calculated and clearly displayed during checkout before you review and complete your order. Any active promotional free-shipping benefits or minimum order threshold waivers are automatically applied in the order summary before payment.
          </p>

          <p className="font-bold text-black pt-2">
            6. ORDER TRACKING
          </p>
          <p>
            Once your order has been packed and handed over to our logistics partner, an Air Waybill (AWB) tracking number and courier tracking link are generated. Tracking information is sent via SMS, email, or WhatsApp. You can also monitor real-time shipment status at any time on our{' '}
            <button
              type="button"
              onClick={() => {
                setActiveView('track-order');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="text-black underline underline-offset-2 hover:opacity-70 cursor-pointer font-medium"
            >
              Track Your Order
            </button>{' '}
            page.
          </p>

          <p className="font-bold text-black pt-2">
            7. DELIVERY DELAYS
          </p>
          <p>
            While we strive to ensure every parcel arrives within the estimated timeframe, delivery delays may occasionally happen due to unforeseen circumstances, including courier operational bottlenecks, severe weather disruptions, national or regional holidays, incorrect contact coordinates, customs clearance queues for overseas orders, or regional administrative transit curbs outside {brandName}&apos;s reasonable control.
          </p>

          <p className="font-bold text-black pt-2">
            8. INCORRECT OR INCOMPLETE ADDRESS
          </p>
          <p>
            Customers are responsible for providing complete and accurate shipping information at checkout, including full recipient name, flat/house number, street name, nearest landmark, active mobile number, and valid postal PIN code.
          </p>
          <p>
            If a package cannot be delivered or is returned to our fulfillment warehouse due to an incorrect, incomplete, unreachable, or untraceable address, re-dispatch will be arranged only after verified address details are confirmed. Additional re-shipping charges may apply in such cases.
          </p>

          <p className="font-bold text-black pt-2">
            9. DELIVERY ATTEMPTS
          </p>
          <p>
            Our courier partners typically make up to 2 to 3 delivery attempts at your delivery address according to their standard operating procedures. Prior to delivery, delivery agents may call or send an SMS alert. If delivery cannot be completed, the customer should coordinate directly with the courier using their AWB number or contact {brandName} customer support for assistance.
          </p>

          <p className="font-bold text-black pt-2">
            10. CONTACT US
          </p>
          <p>
            If you have questions regarding your order shipment or require delivery assistance, please contact our support team at{' '}
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
