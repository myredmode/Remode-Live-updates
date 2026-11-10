import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Blog } from '../types';
import { Calendar, User, ArrowRight, ChevronLeft, BookOpen } from 'lucide-react';

export const Blogs: React.FC = () => {
  const { blogs, selectedBlogId, setSelectedBlogId, setActiveView } = useStore();
  const publishedBlogs = blogs.filter((b) => b.published);

  const activeBlog = blogs.find((b) => b.id === selectedBlogId);

  // Single Blog Reader
  if (activeBlog) {
    return (
      <div className="bg-zinc-50/60 min-h-screen py-10 lg:py-16 px-4 sm:px-6">
        <article className="max-w-3xl mx-auto bg-white border border-zinc-200 p-6 sm:p-12 shadow-sm space-y-6">
          <button
            onClick={() => setSelectedBlogId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-950 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Journal</span>
          </button>

          <header className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(activeBlog.createdAt).toLocaleDateString()}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>{activeBlog.author || 'REDMODE Editorial'}</span>
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-bold text-zinc-950 leading-tight">
              {activeBlog.title}
            </h1>
          </header>

          <div className="aspect-[16/9] w-full overflow-hidden bg-zinc-100 border">
            <img
              src={activeBlog.featuredImage}
              alt={activeBlog.seoTitle || activeBlog.title}
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="prose prose-zinc max-w-none text-sm leading-relaxed text-zinc-700 whitespace-pre-line">
            {activeBlog.content}
          </div>

          <footer className="border-t border-zinc-200 pt-6 mt-8 flex justify-between items-center text-xs">
            <span className="text-zinc-500">Published by REDMODE Styling Studio</span>
            <button
              onClick={() => setActiveView('catalogue')}
              className="font-bold text-zinc-900 hover:text-rose-700 underline"
            >
              Explore Featured Ethnic Wear →
            </button>
          </footer>
        </article>
      </div>
    );
  }

  // Blog Listing
  return (
    <div className="bg-zinc-50/60 min-h-screen py-10 lg:py-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
            Stories & Styling Guides
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 uppercase tracking-tight">
            The REDMODE Journal
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600">
            Insights on Indian handlooms, timeless ethnic silhouettes, modern kurti pairings, and garment preservation.
          </p>
        </div>

        {publishedBlogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {publishedBlogs.map((blog) => (
              <article
                key={blog.id}
                onClick={() => setSelectedBlogId(blog.id)}
                className="bg-white border border-zinc-200 hover:border-zinc-800 transition cursor-pointer group flex flex-col justify-between overflow-hidden shadow-sm"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-100">
                  <img
                    src={blog.featuredImage}
                    alt={blog.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{blog.author}</span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-zinc-900 group-hover:text-rose-700 transition leading-snug">
                      {blog.title}
                    </h2>
                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                      {blog.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 flex items-center gap-1 text-xs font-bold text-zinc-900 group-hover:text-rose-700">
                    <span>Read Full Article</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white border border-zinc-200 p-8">
            <BookOpen className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-700">No blog articles published yet.</p>
            <p className="text-xs text-zinc-400 mt-1">Publish articles via the Admin Management Panel.</p>
          </div>
        )}
      </div>
    </div>
  );
};
