import React from 'react';
import { useStore } from '../context/StoreContext';

export const TermsAndConditions: React.FC = () => {
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
          TERMS AND CONDITIONS
        </h1>

        {/* Quick Links & Contact Header - Exactly as in the reference image */}
        <div className="space-y-4 text-[14px] sm:text-[15px] leading-relaxed text-black mb-6">
          <p>For Return/Exchange of any order, Please click on the link below:-</p>
          
          <p className="break-all">
            <button
              type="button"
              onClick={() => setActiveView('contact')}
              className="text-black underline underline-offset-2 hover:opacity-70 cursor-pointer font-normal text-left"
            >
              https://{websiteDomain}/returns?brand={brandName.toLowerCase()}&service=exchange
            </button>
          </p>

          <p>
            Mail: <a href={`mailto:${supportEmail}`} className="text-black hover:underline">{supportEmail}</a>
          </p>

          <p>
            For Trade / Wholesale Inquiry: <a href={`mailto:${supportEmail}`} className="text-black hover:underline">{supportEmail}</a>
          </p>

          <p>
            Customer Care / WhatsApp: <a href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-black hover:underline">{whatsappNumber}</a>
          </p>
        </div>

        {/* Policy Body - Left aligned, clean paragraphs, exact spacing and layout */}
        <div className="space-y-6 text-[14px] sm:text-[15px] leading-relaxed text-zinc-900 font-normal">
          <p>
            These are the terms and conditions governing the use of this website and the agreement that operates between us and you (hereinafter, "the Terms"). These Terms set out the rights and obligations of all users (hereinafter, "You" / "your") and those of {brandName} (hereinafter, "us" / "our" / "we" / "the Vendor") about the goods/services offered by us through this website (hereinafter, collectively known as the "{brandName} Services"). Before you click on the "Authorize Payment" or "Place Order" button at the end of the ordering process, please carefully read these Terms and our Privacy Statement. By using this website or placing an order through it, You are consenting to be bound by these Terms and our Privacy Statement. If You do not agree to all of the Terms and the Privacy Statement, do not place an order.
          </p>

          <p>
            These Terms may be subject to amendment, so You should carefully read them before placing any order.
          </p>

          <p className="font-bold text-black pt-2">
            1. USE OF OUR WEBSITE
          </p>
          <p>
            These Terms are the only conditions that are applicable to the use of this website and they supersede all other conditions. These Terms are important for both You and Us as they have been designed to protect your rights as a valued customer and our rights as a business. By using this website, You agree that:
          </p>
          <p>
            • You may only use the website to make legitimate inquiries or orders.<br />
            • You will not make any speculative, false, or fraudulent orders. If we reasonably believe that such an order has been placed, we reserve the right to cancel it and inform relevant authorities.<br />
            • You undertake to provide correct and accurate email, postal, and/or other contact details to us and acknowledge that we may use these details to contact You in the event that this should prove necessary.<br />
            • If you do not give us all of the information that we need, we may not be able to complete your order.
          </p>
          <p>
            By placing an order through the website, You warrant that You are at least 18 years old and are legally capable of entering into binding contracts under the Indian Contract Act, 1872.
          </p>

          <p className="font-bold text-black pt-2">
            2. SERVICE AVAILABILITY
          </p>
          <p>
            Articles offered over this website are available for delivery within India. Orders for delivery across pin codes serviced by our partner courier networks will be processed in accordance with our shipping guidelines.
          </p>

          <p className="font-bold text-black pt-2">
            3. HOW THE CONTRACT IS FORMED
          </p>
          <p>
            The information set out in the Terms and the detail contained on this website do not constitute an offer for sale, but rather an invitation to treat. No contract in respect of any products shall exist between You and Us until your order has been accepted by us. If we do not accept your offer and funds have already been deducted from your account, these will be refunded in full.
          </p>
          <p>
            To place an order, you will be required to follow the online shopping process and press the checkout button to submit the order. After doing so, you will receive an electronic confirmation of receipt. Please note that this does not mean that your order has been accepted. Your order constitutes your offer to us to buy one or more products from us. All orders are subject to acceptance by us, and we will confirm such acceptance to you by sending you an electronic communication confirming that the product has been dispatched (the "Shipment Confirmation"). The contract for the purchase of a product between Us will only be formed when we send you the Shipment Confirmation.
          </p>

          <p className="font-bold text-black pt-2">
            4. AVAILABILITY OF PRODUCTS
          </p>
          <p>
            All orders for products are subject to availability. In the event of supply difficulties or because products are no longer in stock, we reserve the right to give you information about substitute products of an equal or higher quality and value which you can order. If you do not wish to order such substitute products, we will refund any monies that you might have paid.
          </p>

          <p className="font-bold text-black pt-2">
            5. REFUSAL OF ORDER
          </p>
          <p>
            We reserve the right to withdraw any product from this website at any time and/or remove or edit any materials or content on this website. While we will make reasonable efforts to process all the orders submitted to us, there may be exceptional circumstances where we may need to refuse to process or accept an order after we have received it, which we reserve the right to do at any time. We will not be liable to you or any other third party by reason of our withdrawing any product from this website, removing or editing any materials, or refusing to accept an order.
          </p>

          <p className="font-bold text-black pt-2">
            6. PRICE AND PAYMENT
          </p>
          <p>
            The price of the products will be as quoted on our website from time to time, except in cases of obvious error. While we take reasonable care to ensure that all prices on the website are accurate, errors may occur. If we discover an error in the price of products you have ordered, we will inform you as soon as possible and give you the option of reconfirming the order at the correct price or cancelling it.
          </p>
          <p>
            Prices are liable to change at any time, but changes will not affect orders in respect of which we have already sent you a Shipment Confirmation. Prices listed on the website are in Indian Rupees (INR) and include applicable Goods and Services Tax (GST).
          </p>
          <p>
            Payment can be made through credit cards, debit cards, net banking, UPI, and Cash on Delivery (where applicable). All card payments are subject to validation checks and authorization by your card issuer.
          </p>

          <p className="font-bold text-black pt-2">
            7. CASH ON DELIVERY (COD)
          </p>
          <p>
            Cash on Delivery is available for designated postal codes across India. The order amount must be paid in full to the delivery partner at the time of parcel handover. We reserve the right to confirm COD orders via phone or messaging prior to processing.
          </p>

          <p className="font-bold text-black pt-2">
            8. DELIVERY & SHIPPING
          </p>
          <p>
            Subject to the availability of products, we endeavor to fulfill your order for product(s) listed in the Shipment Confirmation within the estimated delivery period or within a maximum of 7-10 business days following the date of the Shipment Confirmation. Delays may occur during festivals, adverse weather, or logistical force majeure events beyond our direct control.
          </p>

          <p className="font-bold text-black pt-2">
            9. RISK AND TITLE
          </p>
          <p>
            The products will be at your risk from the time of delivery. Ownership of the products will only pass to you when we receive full payment of all sums due in respect of the products, including delivery charges, or upon delivery, whichever is later.
          </p>

          <p className="font-bold text-black pt-2">
            10. RETURN AND EXCHANGE POLICY
          </p>
          <p>
            If you wish to return or exchange a product, you may do so in accordance with our return guidelines. The product must be unused, unwashed, and returned in the same condition in which you received it, with all original tags, labels, and packaging intact. Products purchased during final clearance sales may not be eligible for exchange or return.
          </p>

          <p className="font-bold text-black pt-2">
            11. INTELLECTUAL PROPERTY
          </p>
          <p>
            You acknowledge and agree that all copyright, trademarks, and all other intellectual property rights in all material or content supplied as part of the website shall remain at all times vested in us or in our licensors. You are permitted to use this material only as expressly authorized by us.
          </p>

          <p className="font-bold text-black pt-2">
            12. WRITTEN COMMUNICATIONS & GOVERNING LAW
          </p>
          <p>
            Applicable laws require that some of the information or communications we send to you should be in writing. When using our website, you accept that communication with us will be mainly electronic.
          </p>
          <p>
            The use of our website and the contracts for the purchase of products through such website will be governed by the laws of India. Any dispute arising from, or related to, such contracts shall be subject to the exclusive jurisdiction of the competent courts in India.
          </p>

          <p className="font-bold text-black pt-2">
            13. FEEDBACK AND CONTACT
          </p>
          <p>
            We welcome your comments and feedback. Please send all feedback, inquiries, or notices to {supportEmail} or via WhatsApp at {whatsappNumber}.
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
