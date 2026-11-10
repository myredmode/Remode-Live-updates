import React from 'react';
import { AlertTriangle, X, Trash2, PowerOff } from 'lucide-react';
import { ColorDef } from './ColorEditorModal';

interface DeleteColorModalProps {
  isOpen: boolean;
  color: ColorDef | null;
  activeVariantsCount: number;
  totalStockCount: number;
  onCancel: () => void;
  onDeactivate: (color: ColorDef) => void;
  onPermanentDelete: (color: ColorDef) => void;
}

export const DeleteColorModal: React.FC<DeleteColorModalProps> = ({
  isOpen,
  color,
  activeVariantsCount,
  totalStockCount,
  onCancel,
  onDeactivate,
  onPermanentDelete,
}) => {
  if (!isOpen || !color) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150 space-y-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">
              Delete Color Variation: {color.name}?
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              This color has <span className="font-semibold text-slate-800">{activeVariantsCount} variants</span> with a total of <span className="font-semibold text-slate-800">{totalStockCount} units</span> in stock.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 text-xs">
          <span
            className="w-4 h-4 rounded-full border border-black/20 shrink-0"
            style={{ backgroundColor: color.hex }}
          />
          <div className="flex-1">
            <span className="font-bold text-slate-800">{color.name}</span>
            <span className="text-slate-400 ml-2 font-mono">({color.code})</span>
          </div>
        </div>

        <p className="text-xs text-slate-600">
          How would you like to handle this color?
        </p>

        <div className="space-y-2 pt-1">
          {/* Deactivate Option */}
          <button
            type="button"
            onClick={() => onDeactivate(color)}
            className="w-full px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2 text-left">
              <PowerOff className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="block font-bold">Deactivate Color</span>
                <span className="text-[11px] text-amber-700 font-normal">
                  Keeps existing SKUs &amp; stock history, hides from storefront
                </span>
              </div>
            </div>
          </button>

          {/* Permanent Delete Option */}
          <button
            type="button"
            onClick={() => onPermanentDelete(color)}
            className="w-full px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2 text-left">
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="block font-bold">Delete Color and Variants</span>
                <span className="text-[11px] text-rose-700 font-normal">
                  Permanently deletes this color and all its variant rows
                </span>
              </div>
            </div>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
