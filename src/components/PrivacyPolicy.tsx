import React from 'react';
import { useStore } from '../context/StoreContext';

export const PrivacyPolicy: React.FC = () => {
  const { setActiveView, settings } = useStore();

  const brandName = settings?.brandName || 'RedMode';
  const supportEmail = settings?.supportEmail || 'MyRedMode@gmail.com';
  const whatsappNumber = settings?.whatsappNumber || '7302797464';
  const websiteDomain = 'redmode.in';

  return (
    <div className="bg-white min-h-screen text-black">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 py-8 sm:py-12">
        {/* Main Title - Left Aligned, Bold, Clean Upper Case */}
        <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide text-black mb-6">
          PRIVACY POLICY
        </h1>

        {/* Quick Contact Header - Exactly as in the reference image */}
        <div className="space-y-4 text-[14px] sm:text-[15px] leading-relaxed text-black mb-6">
          <p>For any privacy queries, personal data access, or account assistance, please reach us below:-</p>
          
          <p className="break-all">
            <button
              type="button"
              onClick={() => setActiveView('contact')}
              className="text-black underline underline-offset-2 hover:opacity-70 cursor-pointer font-normal text-left"
            >
              https://{websiteDomain}/support?topic=privacy-and-data-protection
            </button>
          </p>

          <p>
            Company Name: <strong>RedMode</strong> — 1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India
          </p>

          <p>
            Mail: <a href={`mailto:${supportEmail}`} className="text-black hover:underline">{supportEmail}</a>
          </p>

          <p>
            Customer Care / WhatsApp: <a href={`https://wa.me/91${whatsappNumber.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener noreferrer" className="text-black hover:underline">{whatsappNumber}</a>
          </p>
        </div>

        {/* Policy Body - Left aligned, clean paragraphs, exact spacing and layout */}
        <div className="space-y-6 text-[14px] sm:text-[15px] leading-relaxed text-zinc-900 font-normal">
          <p>
            {brandName} ("we", "our", "us") values the trust you place in us and recognizes the importance of secure transactions and information privacy. This Privacy Policy describes how {brandName} collects, uses, shares, or otherwise processes your personal information through our website {websiteDomain}.
          </p>

          <p>
            By visiting this website, providing your information, or placing an order, you expressly agree to be bound by the terms and conditions of this Privacy Policy and the applicable service/product terms and conditions. If you do not agree, please do not use or access our website.
          </p>

          <p className="font-bold text-black pt-2">
            1. COLLECTION OF YOUR INFORMATION
          </p>
          <p>
            When you browse our website or purchase items from our catalog, we collect and store your personal information which is provided by you from time to time. Our primary goal in doing so is to provide you a safe, efficient, smooth, and customized shopping experience. This allows us to provide services and features that most likely meet your needs.
          </p>
          <p>
            In general, you can browse the website without telling us who you are or revealing any personal information about yourself. Once you give us your personal information, you are not anonymous to us. We collect information such as your name, mobile phone number, email address, billing address, and shipping address when you set up an account or transact with us.
          </p>

          <p className="font-bold text-black pt-2">
            2. USE OF DEMOGRAPHIC / PROFILE DATA
          </p>
          <p>
            We use your personal information to provide the services you request. To the extent we use your personal information to market to you, we will provide you the ability to opt-out of such uses. We use your personal information to assist sellers and partners in handling and fulfilling orders; enhancing customer experience; resolving disputes; troubleshoot problems; help promote a safe service; collect money; measure consumer interest in our products and services; inform you about online offers, products, services, and updates; customize your experience; detect and protect us against error, fraud, and other criminal activity.
          </p>

          <p className="font-bold text-black pt-2">
            3. PAYMENT & CARD INFORMATION
          </p>
          <p>
            We do not collect or store your sensitive payment card credentials, CVV numbers, net banking passwords, or UPI security PINs. Online transactions are completed through encrypted payment gateways that comply with relevant Payment Card Industry Data Security Standards (PCI-DSS).
          </p>

          <p className="font-bold text-black pt-2">
            4. COOKIES
          </p>
          <p>
            A "cookie" is a small piece of information stored by a web server on a web browser so it can be later read back from that browser. Cookies are useful for enabling the browser to remember information specific to a given user, such as shopping cart selections and login state. We place both permanent and temporary cookies in your computer or mobile device's hard drive.
          </p>

          <p className="font-bold text-black pt-2">
            5. SHARING OF PERSONAL INFORMATION
          </p>
          <p>
            We may share personal information with our affiliated logistics partners, delivery courier services, and technical service providers who assist in order fulfillment, parcel tracking, and payment processing. We do not sell or trade your personal information to third parties for independent marketing purposes.
          </p>
          <p>
            We may disclose personal information if required to do so by law or in the good faith belief that such disclosure is reasonably necessary to respond to subpoenas, court orders, or other legal process.
          </p>

          <p className="font-bold text-black pt-2">
            6. SECURITY PRECAUTIONS
          </p>
          <p>
            We maintain reasonable physical, electronic, and procedural safeguards to protect your personal information. Whenever you access your account information, we offer the use of a secure server. Once your information is in our possession, we adhere to strict security guidelines, protecting it against unauthorized access.
          </p>

          <p className="font-bold text-black pt-2">
            7. CHOICE / OPT-OUT
          </p>
          <p>
            We provide all users with the opportunity to opt-out of receiving non-essential (promotional, marketing-related) communications from us after setting up an account. If you wish to remove your contact information from our promotional lists, you may contact our support desk at any time.
          </p>

          <p className="font-bold text-black pt-2">
            8. CHILDREN'S PRIVACY
          </p>
          <p>
            Use of our website is available only to persons who can form a legally binding contract under the Indian Contract Act, 1872. We do not knowingly solicit or collect personal information from children under the age of 18.
          </p>

          <p className="font-bold text-black pt-2">
            9. POLICY UPDATES & INQUIRIES
          </p>
          <p>
            Please check our Privacy Policy regularly for changes. We may update this policy to reflect changes to our information practices. For questions regarding this statement, you may write to {supportEmail}.
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
