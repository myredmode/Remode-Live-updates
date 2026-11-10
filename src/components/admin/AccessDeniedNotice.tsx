import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { AdminRole } from '../../types';

interface AccessDeniedNoticeProps {
  role: AdminRole;
  section: string;
  onRedirect: () => void;
}

export const AccessDeniedNotice: React.FC<AccessDeniedNoticeProps> = ({
  role,
  section,
  onRedirect,
}) => {
  return (
    <div className="min-h-[420px] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-rose-200 p-8 max-w-md w-full text-center shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200">
            Access Restricted (403)
          </span>
          <h3 className="text-lg font-extrabold text-slate-900 mt-2">
            Section Restricted: {section}
          </h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Your current staff role (<strong>{role}</strong>) does not have authorization to view or configure this administrative area.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onRedirect}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Your Assigned Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
