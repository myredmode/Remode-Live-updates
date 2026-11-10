import React from 'react';
import { X } from 'lucide-react';
import { SizeChartEntry } from '../../types';

interface SizeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  sizeChart: SizeChartEntry[];
  selectedSize?: string;
  category?: string;
}

export const SizeChartModal: React.FC<SizeChartModalProps> = ({
  isOpen,
  onClose,
  sizeChart,
  selectedSize,
  category = 'Kurti',
}) => {
  if (!isOpen) return null;

  // Clean category name without repeating "garment"
  const cleanCategory = (category || 'Kurti').replace(/garment/gi, '').trim();

  const defaultChart: SizeChartEntry[] = [
    { size: 'S', bust: '36"', waist: '32"', hip: '39"', length: '44"' },
    { size: 'M', bust: '38"', waist: '34"', hip: '41"', length: '44"' },
    { size: 'L', bust: '40"', waist: '36"', hip: '43"', length: '45"' },
    { size: 'XL', bust: '42"', waist: '38"', hip: '45"', length: '45"' },
    { size: 'XXL', bust: '44"', waist: '40"', hip: '47"', length: '46"' },
  ];

  const chartData = sizeChart && sizeChart.length > 0 ? sizeChart : defaultChart;

  const formatMeasurement = (val: string) => {
    return val && val.trim() ? val : '-';
  };

  return (
    <div
      id="size-chart-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="size-chart-modal-content"
        className="relative w-full max-w-2xl bg-white border border-zinc-200 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Clean, No Icon, No Subtitle, Exact Category Size Guide */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
          <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wider text-zinc-950">
            {cleanCategory} Size Guide
          </h3>
          <button
            id="size-chart-close-btn"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 rounded-full transition cursor-pointer"
            aria-label="Close size guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Size Table */}
        <div className="mt-4 border border-zinc-200 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 text-zinc-700 font-bold uppercase tracking-wider border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Bust / Chest</th>
                <th className="py-3 px-4">Waist</th>
                <th className="py-3 px-4">Hip</th>
                <th className="py-3 px-4">Garment Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {chartData.map((row, idx) => {
                const isSelected = selectedSize && row.size === selectedSize;
                return (
                  <tr
                    key={idx}
                    className="hover:bg-zinc-50/80 text-zinc-800 transition"
                  >
                    <td className="py-3 px-4 font-bold text-zinc-950">
                      <span>{row.size}</span>
                    </td>
                    <td className="py-3 px-4">{formatMeasurement(row.bust)}</td>
                    <td className="py-3 px-4">{formatMeasurement(row.waist)}</td>
                    <td className="py-3 px-4">{formatMeasurement(row.hip)}</td>
                    <td className="py-3 px-4">{formatMeasurement(row.length)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end pt-4 border-t border-zinc-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
