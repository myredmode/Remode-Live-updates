import React from 'react';
import { useStore } from '../context/StoreContext';
import {
  Instagram,
  Facebook,
  MessageCircle,
  Lock,
} from 'lucide-react';

// Minimal, clean Pinterest SVG icon consistent with brand aesthetic
const PinterestIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.699-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

export const Footer: React.FC = () => {
  const {
    setActiveView,
    setSelectedCategorySlug,
    setSelectedSubcategorySlug,
    setIsLoginOpen,
    settings,
    userProfile,
  } = useStore();

  return (
    <footer className="w-full bg-white text-zinc-900 border-t border-zinc-200 transition-colors font-sans select-none">
      {/* 
        Full-width desktop distribution:
        - Uses full available width with generous horizontal padding (px-6 sm:px-8 lg:px-14 xl:px-20)
        - Prevents being squished into the center, aligning perfectly with the 4 top category banners
        - Generous whitespace & minimal luxury aesthetic
      */}
      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-8 md:px-10 lg:px-14 xl:px-20 pt-12 sm:pt-14 lg:pt-16 pb-28 md:pb-12">
        {/* 4 Main Columns: Horizontally distributed across available width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-8 lg:gap-12 xl:gap-16 pb-12 lg:pb-16">
          
          {/* COLUMN 1 — CUSTOMER CARE */}
          <div className="flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 font-sans mb-4 sm:mb-5">
              CUSTOMER CARE
            </h3>
            <ul className="space-y-3 sm:space-y-3.5 text-xs sm:text-[13px] text-zinc-600">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('contact');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('track-order');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  Track Your Order
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('shipping-delivery');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  Shipping & Delivery
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('returns-exchange');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  Returns / Exchange
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('faqs');
                    if (typeof window !== 'undefined') {
                      window.history.pushState(null, '', '/faqs');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  FAQs
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('size-guide');
                    if (typeof window !== 'undefined') {
                      window.history.pushState(null, '', '/size-guide');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  Size Guide
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 2 — QUICK LINKS */}
          <div className="flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 font-sans mb-4 sm:mb-5">
              QUICK LINKS
            </h3>
            <ul className="space-y-3 sm:space-y-3.5 text-xs sm:text-[13px] text-zinc-600">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (userProfile.isLoggedIn) {
                      setActiveView('account');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      setIsLoginOpen(true);
                    }
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  My Account
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('wishlist');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  My Wishlist
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('returns-exchange');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  Returns / Exchange
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('track-order');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  Track Your Order
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('contact');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  Store Locator
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategorySlug(null);
                    setSelectedSubcategorySlug(null);
                    setActiveView('catalogue');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-zinc-950 transition-colors duration-150 text-left cursor-pointer inline-block py-0.5"
                >
                  All Silhouettes
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMN 3 — FOLLOW US */}
          <div className="flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 font-sans mb-4 sm:mb-5">
              FOLLOW US
            </h3>
            <ul className="space-y-3 sm:space-y-3.5 text-xs sm:text-[13px] text-zinc-700">
              <li>
                <a
                  href="https://www.instagram.com/redmode.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-zinc-600 hover:text-zinc-950 transition-colors duration-150 group py-0.5"
                  aria-label="Follow REDMODE on Instagram"
                >
                  <Instagram className="w-4 h-4 text-zinc-800 group-hover:scale-105 transition-transform duration-150 shrink-0" />
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/profile.php?id=61591094683419"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-zinc-600 hover:text-zinc-950 transition-colors duration-150 group py-0.5"
                  aria-label="Follow REDMODE on Facebook"
                >
                  <Facebook className="w-4 h-4 text-zinc-800 group-hover:scale-105 transition-transform duration-150 shrink-0" />
                  <span>Facebook</span>
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${(() => {
                    const raw = (settings?.whatsappNumber || '7302797464').replace(/\D/g, '');
                    return raw.length === 10 ? '91' + raw : raw;
                  })()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-zinc-600 hover:text-zinc-950 transition-colors duration-150 group py-0.5"
                  aria-label="Chat with REDMODE on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 text-zinc-800 group-hover:scale-105 transition-transform duration-150 shrink-0" />
                  <span>WhatsApp</span>
                </a>
              </li>
              <li>
                <a
                  href="https://in.pinterest.com/myredmode/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-zinc-600 hover:text-zinc-950 transition-colors duration-150 group py-0.5"
                  aria-label="Follow REDMODE on Pinterest"
                >
                  <PinterestIcon className="w-4 h-4 text-zinc-800 group-hover:scale-105 transition-transform duration-150 shrink-0" />
                  <span>Pinterest</span>
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMN 4 — MADE FOR BRANDS */}
          <div className="flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 font-sans mb-4 sm:mb-5">
              MADE FOR BRANDS
            </h3>
            {/* Naturally wraps into approximately 2–3 lines on desktop */}
            <p className="text-xs sm:text-[13px] text-zinc-600 leading-relaxed max-w-sm mb-4">
              From sampling to final packing, we help brands bring their clothing ideas to production.
            </p>

            <div>
              <button
                type="button"
                onClick={() => {
                  setActiveView('stitching-services');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  if (typeof window !== 'undefined' && window.history?.pushState) {
                    window.history.pushState(null, '', '/stitching-services');
                  }
                }}
                className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-zinc-950 hover:text-rose-700 transition-colors duration-150 group cursor-pointer"
              >
                <span>EXPLORE STITCHING SERVICES</span>
                <span className="ml-1.5 transition-transform duration-150 group-hover:translate-x-1">→</span>
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 space-y-1 leading-relaxed">
              <p className="font-semibold text-zinc-800">RedMode</p>
              <p>1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India</p>
              <p>
                Tel: <a href="tel:7302797464" className="hover:text-zinc-900">7302797464</a> •{' '}
                <a href="mailto:MyRedMode@gmail.com" className="hover:text-zinc-900">MyRedMode@gmail.com</a>
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR: Thin horizontal divider above legal bar */}
        <div className="border-t border-zinc-200/90 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] sm:text-xs text-zinc-500 tracking-[0.05em]">
          {/* Left: Copyright */}
          <p className="font-normal select-none text-center sm:text-left text-zinc-500">
            © 2026 RedMode. All Rights Reserved.
          </p>

          {/* Right: Legal Links with elegant spacing */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 sm:gap-x-6 gap-y-2 text-zinc-500">
            <button
              type="button"
              onClick={() => {
                setActiveView('privacy-policy');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-zinc-950 transition-colors duration-150 cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-zinc-300 select-none">|</span>
            <button
              type="button"
              onClick={() => {
                setActiveView('terms-conditions');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-zinc-950 transition-colors duration-150 cursor-pointer"
            >
              Terms & Conditions
            </button>
            <span className="text-zinc-300 select-none">|</span>
            <button
              type="button"
              onClick={() => {
                setActiveView('cancellation-policy');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-zinc-950 transition-colors duration-150 cursor-pointer"
            >
              Cancellation Policy
            </button>
            <span className="text-zinc-300 select-none">|</span>
            <button
              type="button"
              onClick={() => {
                setActiveView('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-rose-600 transition-colors duration-150 cursor-pointer text-zinc-400"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
