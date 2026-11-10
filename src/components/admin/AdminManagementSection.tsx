import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { AdminRole, AdminUser } from '../../types';
import { getRoleBadgeInfo } from '../../utils/rbac';
import { StaffActivityMonitor } from './StaffActivityMonitor';
import {
  Users,
  ShieldAlert,
  UserPlus,
  Edit2,
  Trash2,
  Power,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Lock,
  ArrowRight,
  RefreshCw,
  X,
  Phone,
  Mail,
} from 'lucide-react';

interface AdminManagementSectionProps {
  onSaveNotification?: (msg: string) => void;
}

export const AdminManagementSection: React.FC<AdminManagementSectionProps> = ({
  onSaveNotification,
}) => {
  const {
    adminUsers,
    currentAdminUser,
    addAdminUser,
    updateAdminUser,
    toggleAdminUserStatus,
    deleteAdminUser,
    switchAdminUser,
  } = useStore();

  // Status & Feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Add Admin Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: 'Staff@' + Math.floor(1000 + Math.random() * 9000),
    role: 'Label Admin' as 'Label Admin' | 'Listing + Label Admin',
  });
  const [showAddPassword, setShowAddPassword] = useState(false);

  // Edit Admin Modal State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'Label Admin' as 'Label Admin' | 'Listing + Label Admin',
    newPassword: '',
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete Confirmation State
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  // Lock body scroll and listen for ESC key when modals are open
  useEffect(() => {
    if (isAddModalOpen || editingUser || userToDelete) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsAddModalOpen(false);
          setEditingUser(null);
          setUserToDelete(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isAddModalOpen, editingUser, userToDelete]);

  const showStatus = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    if (onSaveNotification) {
      onSaveNotification(message);
    }
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Only Super Admin can access this view
  if (currentAdminUser.role !== 'Super Admin') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-xl mx-auto my-12">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Restricted Access</h3>
        <p className="text-xs text-slate-600 mt-2">
          Staff administration is strictly reserved for the Super Admin owner account.
        </p>
      </div>
    );
  }

  // Handle Add Admin Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      showStatus('Please enter the staff member full name.', 'error');
      return;
    }
    if (!addForm.email.trim() || !addForm.email.includes('@')) {
      showStatus('Please provide a valid company or staff email address.', 'error');
      return;
    }

    const res = addAdminUser({
      name: addForm.name.trim(),
      email: addForm.email.trim().toLowerCase(),
      mobile: addForm.mobile.trim(),
      password: addForm.password.trim(),
      role: addForm.role,
    });

    if (res.success) {
      showStatus(res.message, 'success');
      setIsAddModalOpen(false);
      setAddForm({
        name: '',
        email: '',
        mobile: '',
        password: 'Staff@' + Math.floor(1000 + Math.random() * 9000),
        role: 'Label Admin',
      });
    } else {
      showStatus(res.message, 'error');
    }
  };

  // Open Edit Modal
  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      mobile: user.mobile || '',
      role: (user.role === 'Super Admin' ? 'Label Admin' : user.role) as
        | 'Label Admin'
        | 'Listing + Label Admin',
      newPassword: '',
    });
    setShowEditPassword(false);
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editForm.name.trim()) {
      showStatus('Please enter staff member name.', 'error');
      return;
    }

    const updates: any = {
      name: editForm.name.trim(),
      mobile: editForm.mobile.trim(),
      role: editForm.role,
    };

    if (editForm.newPassword.trim()) {
      updates.password = editForm.newPassword.trim();
    }

    const res = updateAdminUser(editingUser.id, updates);
    if (res.success) {
      showStatus(res.message, 'success');
      setEditingUser(null);
    } else {
      showStatus(res.message, 'error');
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = (user: AdminUser) => {
    if (user.role === 'Super Admin') {
      showStatus('Super Admin account cannot be disabled.', 'error');
      return;
    }
    const res = toggleAdminUserStatus(user.id);
    if (res.success) {
      showStatus(res.message, 'success');
    } else {
      showStatus(res.message, 'error');
    }
  };

  // Handle Delete Admin
  const handleDeleteConfirm = () => {
    if (!userToDelete) return;
    const res = deleteAdminUser(userToDelete.id);
    if (res.success) {
      showStatus(res.message, 'success');
      setUserToDelete(null);
    } else {
      showStatus(res.message, 'error');
    }
  };

  const totalStaffCount = adminUsers.filter((u) => u.role !== 'Super Admin').length;

  return (
    <div className="space-y-6">


      {/* 2. Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Staff Team Activity & Performance Monitor */}
      <StaffActivityMonitor mode="super_admin" title="Staff Roles Live Activity Tracker" />

      {/* 4. Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Configured Administrator Accounts ({adminUsers.length})
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">
              &bull; {totalStaffCount} staff account{totalStaffCount === 1 ? '' : 's'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Staff Admin</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Admin Member</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adminUsers.map((user) => {
                const isSuper = user.role === 'Super Admin';
                const badge = getRoleBadgeInfo(user.role);
                const isActive = user.status !== 'disabled';

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50/80 transition ${
                      !isActive ? 'opacity-60 bg-slate-50/40' : ''
                    }`}
                  >
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            isSuper
                              ? 'bg-slate-950 text-red-500 border border-slate-800 shadow-xs'
                              : user.role === 'Listing + Label Admin'
                              ? 'bg-blue-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
                            <span>{user.name}</span>
                            {isSuper && (
                              <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded font-extrabold">
                                OWNER
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {user.email}
                            </span>
                            {user.mobile && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {user.mobile}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.badgeBg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotBg}`} />
                        {user.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {isSuper ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Permanent Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          title={`Click to ${isActive ? 'deactivate' : 'activate'} this staff account`}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {isActive ? 'Active' : 'Disabled'}
                        </button>
                      )}
                    </td>

                    {/* Last Login */}
                    <td className="py-3.5 px-4 text-slate-500 font-medium text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Never logged in'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {isSuper ? (
                        <span className="text-[11px] font-semibold text-slate-400 italic">
                          Protected Owner
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit / Change Role */}
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Edit Staff Member & Role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isActive
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Disable Access' : 'Enable Access'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Account */}
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                            title="Remove Staff Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ADD STAFF ADMIN MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Add Staff Administrator</h4>
                  <p className="text-[11px] text-slate-500">
                    Create restricted credentials for warehouse or catalog staff.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh.shipping@redmode.in"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={addForm.mobile}
                  onChange={(e) => setAddForm({ ...addForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Role Dropdown - Strictly Label Admin and Listing + Label Admin */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={addForm.role}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      role: e.target.value as 'Label Admin' | 'Listing + Label Admin',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold bg-white"
                >
                  <option value="Label Admin">1. Label Admin (Shipping, AWB, Labels, Tracking)</option>
                  <option value="Listing + Label Admin">
                    2. Listing + Label Admin (Catalog, Listings + Shipping Labels)
                  </option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1 italic">
                  Note: Super Admin cannot be created here. Only one protected Super Admin account exists.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Initial Password *</label>
                  <button
                    type="button"
                    onClick={() =>
                      setAddForm({
                        ...addForm,
                        password: 'Staff@' + Math.floor(1000 + Math.random() * 9000),
                      })
                    }
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Staff will use their email and this password to log in.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-2"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Create Staff Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. EDIT STAFF ADMIN MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Edit Staff: {editingUser.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Update role assignment or reset staff password.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={editForm.email}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Change Role */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as 'Label Admin' | 'Listing + Label Admin',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold bg-white"
                >
                  <option value="Label Admin">Label Admin (Orders, AWB, Labels, Tracking)</option>
                  <option value="Listing + Label Admin">
                    Listing + Label Admin (Product Listings + Shipping Labels)
                  </option>
                </select>
              </div>

              {/* Reset Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reset Password (Leave blank to keep existing)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Enter new password if resetting..."
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-bold text-slate-900">Remove Staff Account?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently revoke admin access for{' '}
                <strong>{userToDelete.name}</strong> ({userToDelete.email})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Yes, Remove Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
