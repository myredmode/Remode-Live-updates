import React from 'react';
import { useStore } from '../context/StoreContext';
import { MessageCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const StitchingServices: React.FC = () => {
  const { setActiveView, settings } = useStore();

  const brandName = settings?.brandName || 'REDMODE';
  const supportEmail = settings?.supportEmail || 'myredmode@gmail.com';
  const whatsappNumber = settings?.whatsappNumber || '+91 73027 97464';
  const cleanPhone = whatsappNumber.replace(/\D/g, '');
  const websiteDomain = 'redmode.in';

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello REDMODE Team, I am interested in your Stitching & Manufacturing Services for our clothing brand. Please share details on sampling, MOQs, and production process.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white min-h-screen text-black">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 py-8 sm:py-12">
        {/* Main Title - Left Aligned, Bold, Clean Upper Case */}
        <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide text-black mb-6">
          MADE FOR BRANDS — STITCHING & PRODUCTION SERVICES
        </h1>

        {/* Quick Contact Header */}
        <div className="space-y-4 text-[14px] sm:text-[15px] leading-relaxed text-black mb-8">
          <p>
            For brand manufacturing, private-label stitching, sampling requests, or bulk production quotes, please reach our production desk below:-
          </p>

          <p className="break-all">
            <button
              type="button"
              onClick={() => {
                setActiveView('contact');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="text-black underline underline-offset-2 hover:opacity-70 cursor-pointer font-normal text-left"
            >
              https://{websiteDomain}/stitching-services?inquiry=brand-production
            </button>
          </p>

          <p>
            Mail: <a href={`mailto:${supportEmail}`} className="text-black hover:underline">{supportEmail}</a>
          </p>

          <p>
            Customer Care / WhatsApp:{' '}
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:underline"
            >
              {whatsappNumber}
            </a>
          </p>
        </div>

        {/* Call to Action Banner */}
        <div className="border border-zinc-200 bg-zinc-50/60 p-6 sm:p-8 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <p className="text-xs uppercase font-extrabold tracking-widest text-zinc-950">
              BRING YOUR DESIGNS TO LIFE
            </p>
            <p className="text-sm sm:text-[15px] text-zinc-600 leading-relaxed">
              From sampling to final packing, {brandName} helps clothing labels, boutique designers, and retail brands scale production with meticulous craftsmanship.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider transition shrink-0 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Consult on WhatsApp</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body - Clean, structured, matching standard policy format */}
        <div className="space-y-6 text-[14px] sm:text-[15px] leading-relaxed text-zinc-900 font-normal">
          <p className="font-bold text-black pt-2">
            1. OVERVIEW & WORKSHOP CAPABILITIES
          </p>
          <p>
            {brandName} operates dedicated apparel manufacturing and artisanal stitching facilities equipped for precision tailoring, traditional Indian embellishment, and contemporary silhouettes. We collaborate with emerging designers, established labels, and modern D2C fashion houses to deliver export-grade apparel with reliable production turnarounds.
          </p>

          <p className="font-bold text-black pt-2">
            2. SAMPLING & PATTERN DEVELOPMENT
          </p>
          <p>
            Every successful collection begins with an accurate sample. Our master pattern makers interpret tech packs, sketches, reference garments, or mood boards to create precise patterns and fit prototypes. We conduct comprehensive drape and size grading evaluations before granting clearance for batch cutting.
          </p>

          <p className="font-bold text-black pt-2">
            3. FABRIC SOURCING & SURFACE EMBELLISHMENT
          </p>
          <p>
            We handle a wide array of premium textiles, including pure cotton, chanderi, georgette, organza, modal, silk blends, and linen. Our specialized artisans execute intricate embroidery (zari, threadwork, sequins, chikankari motifs, and gota patti) as well as modern digital and screen textile printing.
          </p>

          <p className="font-bold text-black pt-2">
            4. BATCH CUTTING & STITCHING
          </p>
          <p>
            Equipped with industrial single-needle lockstitch machines, overlock machines, and flatlock edge-finishers, our stitching unit delivers clean interior seams, reinforced stress points, and standardized fit tolerance across every production unit.
          </p>

          <p className="font-bold text-black pt-2">
            5. QUALITY ASSURANCE & INSPECTION
          </p>
          <p>
            Quality is inspected at 3 critical milestones:
          </p>
          <ul className="space-y-2 pl-4 text-zinc-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-zinc-950 shrink-0 mt-1" />
              <span><strong>Pre-Cut Inspection:</strong> Checking fabric rolls for color consistency, grain alignment, and weave imperfections.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-zinc-950 shrink-0 mt-1" />
              <span><strong>In-Line Inspection:</strong> Real-time monitoring of stitch tension, seam tolerances, collar symmetry, and placket alignment.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-zinc-950 shrink-0 mt-1" />
              <span><strong>End-of-Line Audit:</strong> 100% manual check for loose threads, spot cleaning, measurement fidelity, and steam finishing.</span>
            </li>
          </ul>

          <p className="font-bold text-black pt-2">
            6. PRIVATE LABELS, BRAND TAGS & PACKAGING
          </p>
          <p>
            We offer full private-label customization:
          </p>
          <p>
            • Custom woven neck labels and satin wash care labels.<br />
            • Printed hangtags, price tickets, and barcode stickers.<br />
            • Moisture-proof polybags, branded tissue wrapping, and master carton packing ready for retail or fulfillment warehouse distribution.
          </p>

          <p className="font-bold text-black pt-2">
            7. PRODUCTION TIMELINES & ORDER SIZES
          </p>
          <p>
            We accommodate both capsule test batches and ongoing volume manufacturing. Prototyping samples generally complete within 7–10 business days upon fabric approval. Production orders typically ship within 15–25 business days depending on design complexity and embellishment scope.
          </p>

          <p className="font-bold text-black pt-2">
            8. INQUIRE ABOUT STITCHING SERVICES
          </p>
          <p>
            To discuss your brand&apos;s production requirements or request a customized cost estimate, reach out to our team directly via email at{' '}
            <a href={`mailto:${supportEmail}`} className="text-black underline">
              {supportEmail}
            </a>{' '}
            or connect with our production coordinator on WhatsApp at{' '}
            <a
              href={`https://wa.me/${cleanPhone}`}
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
