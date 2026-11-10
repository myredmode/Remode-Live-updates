import React, { useState } from 'react';
import {
  Star,
  CheckCircle2,
  ThumbsUp,
  MessageSquarePlus,
  X,
  Filter,
} from 'lucide-react';
import { ProductReview } from '../../types';

interface ProductReviewsProps {
  productId: string;
  productName: string;
  rating: number;
  reviewCount: number;
  initialReviews?: ProductReview[];
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  productName,
  rating = 4.8,
  reviewCount = 127,
  initialReviews = [],
}) => {
  const defaultReviews: ProductReview[] = [
    {
      id: 'rev-default-1',
      author: 'Pooja Kashyap',
      rating: 5,
      date: '28 August 2026',
      title: 'Stunning craftsmanship and pure cotton comfort!',
      comment:
        'The fabric is very soft, light, and breathable. The stitching is top notch and the color matches the photos exactly. Wore it all day with zero discomfort. Highly recommended!',
      verified: true,
      helpfulCount: 32,
    },
    {
      id: 'rev-default-2',
      author: 'Shreya Sharma',
      rating: 5,
      date: '16 August 2026',
      title: 'Perfect fitting according to the size chart',
      comment:
        'I ordered size L after checking the bust and waist measurements in the size guide. It fit like a glove! Delivery was super fast via Shipmozo in just 3 days.',
      verified: true,
      helpfulCount: 19,
    },
    {
      id: 'rev-default-3',
      author: 'Megha Reddy',
      rating: 4,
      date: '05 August 2026',
      title: 'Great daily wear kurti',
      comment:
        'Did not bleed color on first cold wash. Elegant neckline and nice sleeve finish. Will definitely purchase more colors.',
      verified: true,
      helpfulCount: 14,
    },
  ];

  const [reviewsList, setReviewsList] = useState<ProductReview[]>(() => {
    return initialReviews && initialReviews.length > 0 ? initialReviews : defaultReviews;
  });

  const [helpfulMap, setHelpfulMap] = useState<Record<string, boolean>>({});
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // Review Modal State
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState('');
  const [formComment, setFormComment] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Star Distribution Data
  const starCounts = [
    { stars: 5, percent: 82, count: Math.round(reviewCount * 0.82) },
    { stars: 4, percent: 12, count: Math.round(reviewCount * 0.12) },
    { stars: 3, percent: 4, count: Math.round(reviewCount * 0.04) },
    { stars: 2, percent: 1, count: Math.round(reviewCount * 0.01) },
    { stars: 1, percent: 1, count: Math.round(reviewCount * 0.01) },
  ];

  const handleHelpfulClick = (revId: string) => {
    if (helpfulMap[revId]) return;
    setHelpfulMap((prev) => ({ ...prev, [revId]: true }));
    setReviewsList((prev) =>
      prev.map((r) =>
        r.id === revId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r
      )
    );
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formTitle.trim() || !formComment.trim()) return;

    const newRev: ProductReview = {
      id: `rev-user-${Date.now()}`,
      author: formName.trim(),
      rating: formRating,
      date: 'Just now',
      title: formTitle.trim(),
      comment: formComment.trim(),
      verified: true,
      helpfulCount: 0,
    };

    setReviewsList([newRev, ...reviewsList]);
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setIsWriteModalOpen(false);
      setFormName('');
      setFormTitle('');
      setFormComment('');
      setFormRating(5);
    }, 1500);
  };

  const filteredReviews = filterRating
    ? reviewsList.filter((r) => r.rating === filterRating)
    : reviewsList;

  return (
    <div id="customer-reviews-section" className="space-y-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
            Real Customer Feedback
          </span>
          <h2 className="font-display text-2xl font-bold text-zinc-950 uppercase tracking-tight">
            Customer Reviews & Ratings
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsWriteModalOpen(true)}
          className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <MessageSquarePlus className="w-4 h-4 text-amber-400" />
          <span>Write a Review</span>
        </button>
      </div>

      {/* Ratings Overview & Star Breakdown Bar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start bg-zinc-50 border border-zinc-200 p-6 sm:p-8">
        {/* Left: Overall Score */}
        <div className="md:col-span-4 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-zinc-950">
              {rating.toFixed(1)}
            </span>
            <span className="text-sm font-bold text-zinc-500">out of 5</span>
          </div>

          <div className="flex items-center text-amber-400 gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-5 h-5 ${
                  s <= Math.floor(rating)
                    ? 'fill-amber-400 text-amber-400'
                    : s - 0.5 <= rating
                    ? 'fill-amber-400/50 text-amber-400'
                    : 'text-zinc-300'
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-zinc-600">
            Based on <strong className="text-zinc-900">{reviewCount}</strong> verified customer ratings
          </p>

          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-100/60 px-2.5 py-1 rounded border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>98% of buyers recommend this style</span>
            </span>
          </div>
        </div>

        {/* Right: Star Breakdown Progress Bars */}
        <div className="md:col-span-8 space-y-2.5">
          {starCounts.map((sc) => (
            <button
              key={sc.stars}
              type="button"
              onClick={() =>
                setFilterRating(filterRating === sc.stars ? null : sc.stars)
              }
              className={`w-full flex items-center gap-3 text-xs text-left group p-1 transition ${
                filterRating === sc.stars ? 'bg-zinc-200/70 font-bold' : ''
              }`}
            >
              <span className="w-14 shrink-0 font-medium text-zinc-700 group-hover:text-zinc-950">
                {sc.stars} star
              </span>

              <div className="flex-1 h-3 bg-zinc-200 overflow-hidden rounded-none">
                <div
                  className="h-full bg-amber-400 transition-all duration-500 group-hover:bg-amber-500"
                  style={{ width: `${sc.percent}%` }}
                />
              </div>

              <span className="w-10 shrink-0 text-right text-zinc-500 font-mono">
                {sc.percent}%
              </span>
            </button>
          ))}

          {filterRating && (
            <div className="pt-2 flex items-center justify-between text-xs text-zinc-600">
              <span>Showing {filterRating}-star reviews only</span>
              <button
                type="button"
                onClick={() => setFilterRating(null)}
                className="text-rose-700 underline font-bold"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Individual Customer Review Cards */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 border border-zinc-200 text-xs text-zinc-500">
            No reviews match the selected filter.
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="p-5 border border-zinc-200 bg-white space-y-2.5 transition hover:border-zinc-300"
            >
              {/* Reviewer Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-800">
                    {rev.author.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-zinc-900 block">
                      {rev.author}
                    </span>
                    {rev.verified && (
                      <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified Purchase</span>
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[11px] text-zinc-400">{rev.date}</span>
              </div>

              {/* Star Rating & Title */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= rev.rating ? 'fill-amber-400' : 'text-zinc-200'
                      }`}
                    />
                  ))}
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                  {rev.title}
                </h4>
              </div>

              {/* Review Comment Text */}
              <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                {rev.comment}
              </p>

              {/* Helpful Counter */}
              <div className="pt-2 flex items-center gap-3 text-xs text-zinc-500">
                <span>Was this review helpful?</span>
                <button
                  type="button"
                  onClick={() => handleHelpfulClick(rev.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 border text-[11px] font-semibold transition ${
                    helpfulMap[rev.id]
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>
                    {helpfulMap[rev.id] ? 'Helpful' : 'Yes'} ({rev.helpfulCount || 0})
                  </span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Write a Review Modal */}
      {isWriteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsWriteModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white border border-zinc-200 shadow-2xl p-6 sm:p-8 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div>
                <h3 className="font-display text-lg font-bold text-zinc-950">
                  Write a Customer Review
                </h3>
                <p className="text-xs text-zinc-500 truncate max-w-xs sm:max-w-sm">
                  {productName}
                </p>
              </div>
              <button
                onClick={() => setIsWriteModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-zinc-950 text-sm">
                  Thank you for your review!
                </h4>
                <p className="text-xs text-zinc-500">
                  Your feedback helps other shoppers make confident decisions.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3.5">
                {/* Star Picker */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1">
                    Overall Rating
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormRating(s)}
                        className="p-1 text-amber-400 hover:scale-110 transition"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            s <= formRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-zinc-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-zinc-700">
                      {formRating} out of 5 stars
                    </span>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Aditi Singhania"
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-none bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-950"
                  />
                </div>

                {/* Headline */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1">
                    Review Headline / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Wonderful fabric and authentic block print!"
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-none bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-950"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1">
                    Detailed Review
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                    placeholder="Tell other customers about the fabric feel, drape, colorfastness, and true-to-size fit..."
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-none bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-950 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWriteModalOpen(false)}
                    className="px-4 py-2 border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
