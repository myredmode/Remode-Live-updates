import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  HelpCircle,
} from 'lucide-react';

export const ContactUs: React.FC = () => {
  const { submitContactForm, settings } = useStore();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [issueMessage, setIssueMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Exact confirmation response required:
  // "Submit karne ke baad: Thank you! Our team will get back to you shortly."
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !issueMessage) return;

    submitContactForm(name, mobile, email, issueMessage);
    setIsSubmitted(true);
  };

  const rawWaNumber = (settings.whatsappNumber || '7302797464').replace(/\D/g, '');
  const cleanWaNumber = rawWaNumber.length === 10 ? '91' + rawWaNumber : rawWaNumber;
  const whatsappHref = `https://wa.me/${cleanWaNumber}?text=Hello%20REDMODE,%20I%20need%20assistance%20with%20my%20order.`;

  return (
    <div className="bg-zinc-50 min-h-screen py-10 lg:py-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
            Customer Care & Assistance
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 uppercase tracking-tight">
            Contact Us
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 max-w-lg mx-auto">
            Have a question about kurtis, sizes, or exchange requests? Reach out via WhatsApp, email, or send us a message below.
          </p>
        </div>

        {/* Quick Contact Cards (WhatsApp, Email, Working Hours) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* WhatsApp */}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="p-6 bg-white border border-zinc-200 hover:border-emerald-600 transition group flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                Contact &amp; WhatsApp
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Call or WhatsApp: <strong className="text-zinc-800">7302797464</strong>
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 group-hover:underline">
              Chat on WhatsApp (7302797464) →
            </span>
          </a>

          {/* Email */}
          <a
            href={`mailto:${settings.supportEmail || 'MyRedMode@gmail.com'}`}
            className="p-6 bg-white border border-zinc-200 hover:border-zinc-800 transition group flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center mb-3">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                Official Email
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                For order invoices &amp; customer queries.
              </p>
            </div>
            <span className="text-xs font-bold text-zinc-900 group-hover:underline">
              {settings.supportEmail || 'MyRedMode@gmail.com'} →
            </span>
          </a>

          {/* Timing & Official Address */}
          <div className="p-6 bg-white border border-zinc-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center mb-3">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                RedMode Official Address
              </h3>
              <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India
              </p>
            </div>
            <span className="text-[11px] text-zinc-500 font-medium">
              Mon – Sat: 10:00 AM – 7:00 PM IST
            </span>
          </div>
        </div>

        {/* Contact / Issue Form */}
        <div className="bg-white border border-zinc-200 p-6 sm:p-10 shadow-sm">
          {isSubmitted ? (
            /* Success confirmation requested:
               "Thank you! Our team will get back to you shortly." */
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
                Thank you! Our team will get back to you shortly.
              </h2>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                We have recorded your inquiry. A REDMODE support specialist will reach out to you on {mobile} or {email || 'your email'} within 2-4 business hours.
              </p>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setName('');
                  setMobile('');
                  setEmail('');
                  setIssueMessage('');
                }}
                className="mt-4 px-6 py-2.5 bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-zinc-800"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-zinc-200 pb-3">
                <h3 className="font-display text-lg font-bold text-zinc-900 uppercase tracking-wider">
                  Contact / Issue Form
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Fill in your details and message. We respond promptly.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Name */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Email Address <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Issue / Message */}
                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Issue / Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={issueMessage}
                    onChange={(e) => setIssueMessage(e.target.value)}
                    placeholder="Describe your inquiry, order ID, or exchange request..."
                    className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-none text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold tracking-widest uppercase transition flex items-center justify-center gap-2 shadow"
              >
                <Send className="w-4 h-4" />
                <span>Submit Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
