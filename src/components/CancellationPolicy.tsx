import React from 'react';
import { useStore } from '../context/StoreContext';

export const CancellationPolicy: React.FC = () => {
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
          CANCELLATION POLICY
        </h1>

        {/* Quick Contact Header - Exactly as in the reference image */}
        <div className="space-y-4 text-[14px] sm:text-[15px] leading-relaxed text-black mb-6">
          <p>For Cancellation of any order or urgent assistance, Please contact us below:-</p>
          
          <p className="break-all">
            <button
              type="button"
              onClick={() => setActiveView('contact')}
              className="text-black underline underline-offset-2 hover:opacity-70 cursor-pointer font-normal text-left"
            >
              https://{websiteDomain}/cancellations?brand={brandName.toLowerCase()}
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
            At {brandName}, we strive to fulfill your orders smoothly and efficiently. We understand that there may be occasions when you wish to cancel an order placed on our website {websiteDomain}. This policy outlines the terms and procedure governing such cancellations.
          </p>

          <p className="font-bold text-black pt-2">
            1. CANCELLATION PRIOR TO SHIPMENT
          </p>
          <p>
            You can cancel your order free of cost at any time before it has been dispatched from our fulfillment center. To cancel your order, you can contact our Customer Care team via WhatsApp or email with your Order ID.
          </p>
          <p>
            If your order has not been dispatched, we will cancel the order and initiate a refund for prepaid transactions.
          </p>

          <p className="font-bold text-black pt-2">
            2. CANCELLATION AFTER DISPATCH
          </p>
          <p>
            Once an order has been packed and handed over to our courier partners (an AWB tracking number has been generated), it cannot be cancelled directly from our system.
          </p>
          <p>
            In such circumstances, you may refuse to accept delivery of the parcel when the delivery courier attempts delivery at your doorstep. Once the package is returned to our warehouse, we will verify its condition and process any eligible refund.
          </p>

          <p className="font-bold text-black pt-2">
            3. REFUNDS FOR CANCELLED PREPAID ORDERS
          </p>
          <p>
            For prepaid orders cancelled prior to dispatch, the refund will be processed back to the original source account (Debit Card, Credit Card, Net Banking, or UPI) within 5-7 working days from the cancellation confirmation.
          </p>

          <p className="font-bold text-black pt-2">
            4. CASH ON DELIVERY (COD) CANCELLATION
          </p>
          <p>
            If you placed an order under Cash on Delivery and choose to cancel before dispatch, no charges will be applied. We request that you inform our support desk promptly so that the parcel is not dispatched.
          </p>

          <p className="font-bold text-black pt-2">
            5. CANCELLATION BY REDMODE
          </p>
          <p>
            Under certain exceptional circumstances, {brandName} reserves the right to cancel an order. These circumstances include:
          </p>
          <p>
            • Unavailability of the product or inventory defects identified during quality inspection.<br />
            • Inaccuracies or typographical errors in product pricing or descriptions.<br />
            • Unserviceable delivery pin codes or delivery partner logistical constraints.<br />
            • Suspected fraudulent activity or non-compliance with our Terms & Conditions.
          </p>
          <p>
            If an order is cancelled by us, you will be notified immediately, and any payments made will be refunded in full.
          </p>

          <p className="font-bold text-black pt-2">
            6. CONTACT FOR ASSISTANCE
          </p>
          <p>
            For any queries or assistance regarding order cancellations, please reach out to our customer care team at {supportEmail} or via WhatsApp at {whatsappNumber}.
          </p>
        </div>

        {/* Subtle spacing at bottom */}
        <div className="mt-12 pt-6 border-t border-zinc-200">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            {brandName} © {new Date().getFullYear()} — All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
};
