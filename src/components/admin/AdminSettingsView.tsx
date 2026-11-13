import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Shield,
  Bell,
  Store,
  Sliders,
  Lock,
  CheckCircle2,
  Key,
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  MapPin,
  Clock,
  LogOut,
  AlertCircle,
  Camera,
  Check,
  Building,
  Laptop,
  Users,
  Upload,
  Link,
  Trash2,
  Info,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { StoreSettings, AdminProfileSettings, AdminNotificationSettings, AdminUiPreferences } from '../../types';
import { useStore } from '../../context/StoreContext';

interface AdminSettingsViewProps {
  settings: StoreSettings;
  updateSettings: (newSettings: StoreSettings) => void;
  onSaveNotification?: (msg: string) => void;
  initialSection?: string;
}

type SettingsSection = 'store' | 'security' | 'notifications';

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  updateSettings,
  onSaveNotification,
  initialSection,
}) => {
  const { currentAdminUser } = useStore();
  // Current active sub-section tab - default to store & profile combined
  const [activeSection, setActiveSection] = useState<SettingsSection>(() => {
    if (initialSection === 'security') return 'security';
    if (initialSection === 'notifications') return 'notifications';
    return 'store';
  });

  useEffect(() => {
    if (initialSection === 'security' || initialSection === 'notifications' || initialSection === 'store') {
      setActiveSection(initialSection as SettingsSection);
    }
  }, [initialSection]);

  // Success / error banners
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    if (onSaveNotification && type === 'success') {
      onSaveNotification(text);
    }
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // -------------------------------------------------------------
  // 1. PROFILE STATE & AVATAR HANDLERS
  // -------------------------------------------------------------
  const [profileData, setProfileData] = useState<AdminProfileSettings>(() => ({
    name: settings.adminProfile?.name || currentAdminUser.name || 'Aamir',
    avatarUrl:
      settings.adminProfile?.avatarUrl ||
      currentAdminUser.avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    email: settings.adminProfile?.email || currentAdminUser.email || settings.supportEmail || 'myredmode@gmail.com',
    mobile: settings.adminProfile?.mobile || currentAdminUser.mobile || settings.whatsappNumber || '+91 73027 97464',
    role: settings.adminProfile?.role || currentAdminUser.role || '',
  }));

  const [isEditingPhotoUrl, setIsEditingPhotoUrl] = useState(false);
  const [photoInputUrl, setPhotoInputUrl] = useState(profileData.avatarUrl);
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [hasPhotoImgError, setHasPhotoImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync profileData when settings.adminProfile updates
  useEffect(() => {
    if (settings.adminProfile) {
      setProfileData((prev) => ({
        ...prev,
        name: settings.adminProfile?.name || prev.name,
        avatarUrl: settings.adminProfile?.avatarUrl || prev.avatarUrl,
        email: settings.adminProfile?.email || prev.email,
        mobile: settings.adminProfile?.mobile || prev.mobile,
        role: settings.adminProfile?.role || prev.role,
      }));
      setPhotoInputUrl(settings.adminProfile?.avatarUrl || '');
    }
  }, [settings.adminProfile]);

  // Extract Google Drive File ID from any Google Drive link format
  const extractGoogleDriveFileId = (rawUrl: string): string | null => {
    if (!rawUrl) return null;
    const trimmed = rawUrl.trim();
    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/i);
    if (fileDMatch) return fileDMatch[1];
    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/i);
    if (idParamMatch) return idParamMatch[1];
    const lh3Match = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]{15,})/i);
    if (lh3Match) return lh3Match[1];
    return null;
  };

  // Convert raw user-pasted link into direct previewable link
  const normalizePhotoUrl = (rawUrl: string): { url: string; isGoogleDrive: boolean; driveId: string | null } => {
    if (!rawUrl) return { url: '', isGoogleDrive: false, driveId: null };
    const trimmed = rawUrl.trim();
    const driveId = extractGoogleDriveFileId(trimmed);
    if (driveId) {
      return {
        url: `https://lh3.googleusercontent.com/d/${driveId}`,
        isGoogleDrive: true,
        driveId,
      };
    }
    if (trimmed.includes('dropbox.com')) {
      return {
        url: trimmed.replace(/\?dl=0$/, '?raw=1').replace(/&dl=0$/, '&raw=1'),
        isGoogleDrive: false,
        driveId: null,
      };
    }
    return { url: trimmed, isGoogleDrive: false, driveId: null };
  };

  // Directly apply and persist avatar immediately across settings and store
  const applyAndSaveAvatar = (newAvatarUrl: string) => {
    const updatedProfile: AdminProfileSettings = {
      ...profileData,
      avatarUrl: newAvatarUrl,
    };
    setProfileData(updatedProfile);
    setPhotoInputUrl(newAvatarUrl);
    setHasPhotoImgError(false);
    setPhotoError(null);
    setIsEditingPhotoUrl(false);

    const updatedSettings: StoreSettings = {
      ...settings,
      adminProfile: updatedProfile,
    };
    updateSettings(updatedSettings);
    showStatus('Profile picture updated and saved successfully! ✅');
  };

  // Handle URL apply / Done button
  const handleApplyPhotoUrl = (urlToApply?: string) => {
    const rawTarget = (urlToApply !== undefined ? urlToApply : photoInputUrl).trim();
    if (!rawTarget) {
      setPhotoError('Please enter an image link or upload a file directly.');
      return;
    }

    const { url: normalizedUrl, isGoogleDrive, driveId } = normalizePhotoUrl(rawTarget);
    setIsValidatingPhoto(true);
    setPhotoError(null);

    // Test load image in background
    const testImg = new Image();
    testImg.onload = () => {
      setIsValidatingPhoto(false);
      applyAndSaveAvatar(normalizedUrl);
    };

    testImg.onerror = () => {
      // If Google Drive lh3 fails, test thumbnail endpoint
      if (isGoogleDrive && driveId) {
        const fallbackUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setIsValidatingPhoto(false);
          applyAndSaveAvatar(fallbackUrl);
        };
        fallbackImg.onerror = () => {
          setIsValidatingPhoto(false);
          // If Google Drive link is restricted, explain clearly & save fallback so they still have it
          setPhotoError(
            'Google Drive link is private or restricted. In Google Drive, click Share → change "General access" to "Anyone with the link". Alternatively, click "Upload Photo" to select the image file directly from your device.'
          );
        };
        fallbackImg.src = fallbackUrl;
        return;
      }

      setIsValidatingPhoto(false);
      setPhotoError(
        'Could not load image from this URL. Please verify the link or upload the image directly from your computer/phone.'
      );
    };

    testImg.src = normalizedUrl;
  };

  // Handle file upload from device / computer
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showStatus('Selected image file is too large (over 10MB). Please choose a smaller image.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        // Optimize and square-crop avatar to crisp 360x360
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 360;
        const width = img.width;
        const height = img.height;
        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;

        canvas.width = Math.min(minDim, MAX_SIZE);
        canvas.height = Math.min(minDim, MAX_SIZE);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, canvas.width, canvas.height);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          applyAndSaveAvatar(optimizedDataUrl);
        } else {
          applyAndSaveAvatar(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Reset / remove custom avatar
  const handleResetAvatar = () => {
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
    applyAndSaveAvatar(defaultAvatar);
    showStatus('Profile picture reset to default avatar.', 'success');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name.trim()) {
      showStatus('Please enter a valid administrator name.', 'error');
      return;
    }
    if (!profileData.email.trim() || !profileData.email.includes('@')) {
      showStatus('Please enter a valid administrator email address.', 'error');
      return;
    }

    const updated: StoreSettings = {
      ...settings,
      adminProfile: profileData,
      supportEmail: profileData.email,
    };
    updateSettings(updated);
    showStatus('Profile changes saved successfully! ✅');
  };

  // -------------------------------------------------------------
  // 2. SECURITY STATE
  // -------------------------------------------------------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoggedOutOtherDevices, setIsLoggedOutOtherDevices] = useState(false);

  const getAdminAuthHeaders = (): Record<string, string> => {
    const token =
      sessionStorage.getItem('redmode_admin_token') ||
      localStorage.getItem('redmode_admin_token') ||
      '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      showStatus('Please enter your current security password.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showStatus('New password must be at least 6 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showStatus('New password and confirmation password do not match.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showStatus(data.message || 'Current password does not match existing credentials.', 'error');
        return;
      }

      if (data.token) {
        sessionStorage.setItem('redmode_admin_token', data.token);
        if (localStorage.getItem('redmode_admin_trusted') === 'true') {
          localStorage.setItem('redmode_admin_token', data.token);
        }
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showStatus('Security password updated on server and all other sessions invalidated! 🔒');
    } catch (err: any) {
      showStatus(err?.message || 'Failed to update security password on server.', 'error');
    }
  };

  const handleLogoutOtherDevices = async () => {
    try {
      const res = await fetch('/api/admin/logout-all-devices', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showStatus(data.message || 'Failed to invalidate other device sessions.', 'error');
        return;
      }

      if (data.token) {
        sessionStorage.setItem('redmode_admin_token', data.token);
        if (localStorage.getItem('redmode_admin_trusted') === 'true') {
          localStorage.setItem('redmode_admin_token', data.token);
        }
      }
      setIsLoggedOutOtherDevices(true);
      showStatus('All other active device sessions have been invalidated on the server. ✅');
    } catch (err: any) {
      showStatus(err?.message || 'Error invalidating other sessions.', 'error');
    }
  };

  // -------------------------------------------------------------
  // 3. NOTIFICATIONS STATE
  // -------------------------------------------------------------
  const [notifications, setNotifications] = useState<AdminNotificationSettings>(() => ({
    newOrder: settings.adminNotifications?.newOrder ?? true,
    orderConfirmation: settings.adminNotifications?.orderConfirmation ?? true,
    paymentReceived: settings.adminNotifications?.paymentReceived ?? true,
    lowStock: settings.adminNotifications?.lowStock ?? true,
    emailNotifications: settings.adminNotifications?.emailNotifications ?? true,
    whatsappNotifications: settings.adminNotifications?.whatsappNotifications ?? true,
  }));

  const handleToggleNotification = (key: keyof AdminNotificationSettings) => {
    const updatedNotifications = {
      ...notifications,
      [key]: !notifications[key],
    };
    setNotifications(updatedNotifications);
    const updatedSettings: StoreSettings = {
      ...settings,
      adminNotifications: updatedNotifications,
    };
    updateSettings(updatedSettings);
    showStatus(`Notification preference for "${key}" updated. ✅`);
  };

  // -------------------------------------------------------------
  // 4. STORE PREFERENCES STATE & BRAND LOGO
  // -------------------------------------------------------------
  const [storeData, setStoreData] = useState({
    businessName: settings.businessName || 'RedMode',
    logoUrl: settings.logoUrl || '/assets/2.png',
    tagline: settings.tagline || 'Made On Loom',
    supportEmail: settings.supportEmail || 'MyRedMode@gmail.com',
    whatsappNumber: settings.whatsappNumber || '7302797464',
    storeAddress:
      settings.storeAddress && !settings.storeAddress.includes('Jaipur')
        ? settings.storeAddress
        : '1807 Zakir Hussain Colony, Meerut, Uttar Pradesh, 250002, India',
    currency: settings.storeCurrency || 'INR (₹)',
    timezone: settings.storeTimezone || 'IST (Asia/Kolkata, UTC+05:30)',
  });

  const [logoInputUrl, setLogoInputUrl] = useState(settings.logoUrl || '/assets/2.png');
  const [isEditingLogoUrl, setIsEditingLogoUrl] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Sync when settings change
  useEffect(() => {
    if (settings.logoUrl) {
      setStoreData((prev) => ({ ...prev, logoUrl: settings.logoUrl }));
      setLogoInputUrl(settings.logoUrl);
    }
  }, [settings.logoUrl]);

  const applyAndSaveLogo = (newLogoUrl: string) => {
    setStoreData((prev) => ({ ...prev, logoUrl: newLogoUrl }));
    setLogoInputUrl(newLogoUrl);
    setLogoError(null);
    setIsEditingLogoUrl(false);

    const updatedSettings: StoreSettings = {
      ...settings,
      logoUrl: newLogoUrl,
    };
    updateSettings(updatedSettings);
    showStatus('Brand logo updated and applied across website! ✅');
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Logo file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        applyAndSaveLogo(dataUrl);
      }
    };
    reader.onerror = () => {
      setLogoError('Could not read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogoUrl = (rawTarget?: string) => {
    const targetUrl = (rawTarget !== undefined ? rawTarget : logoInputUrl).trim();
    if (!targetUrl) {
      setLogoError('Please enter a valid image URL');
      return;
    }
    const normalized = normalizePhotoUrl(targetUrl);
    applyAndSaveLogo(normalized.url);
  };

  const handleSaveStorePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreSettings = {
      ...settings,
      businessName: storeData.businessName,
      logoUrl: storeData.logoUrl,
      tagline: storeData.tagline,
      supportEmail: storeData.supportEmail,
      whatsappNumber: storeData.whatsappNumber,
      storeAddress: storeData.storeAddress,
      contactInfo: storeData.storeAddress,
      storeCurrency: storeData.currency,
      storeTimezone: storeData.timezone,
    };
    updateSettings(updated);
    showStatus('Store preferences and brand settings saved successfully! ✅');
  };

  // -------------------------------------------------------------
  // 5. ADMIN PREFERENCES STATE
  // -------------------------------------------------------------
  const [adminPrefs, setAdminPrefs] = useState<AdminUiPreferences>(() => ({
    defaultOrderView: settings.adminPreferences?.defaultOrderView || 'ALL',
    defaultDateRange: settings.adminPreferences?.defaultDateRange || 'Yearly',
    itemsPerPage: settings.adminPreferences?.itemsPerPage || 25,
  }));

  const handleSaveAdminPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreSettings = {
      ...settings,
      adminPreferences: adminPrefs,
    };
    updateSettings(updated);
    showStatus('Admin display preferences saved! ✅');
  };

  // -------------------------------------------------------------
  // 6. RAZORPAY PAYMENT GATEWAY STATE
  // -------------------------------------------------------------
  const [razorpayData, setRazorpayData] = useState(() => ({
    enabled: settings.razorpaySettings?.enabled ?? true,
    keyId: settings.razorpaySettings?.keyId || '',
    keySecret: settings.razorpaySettings?.keySecret || '',
    merchantName: settings.razorpaySettings?.merchantName || 'REDMODE',
    themeColor: settings.razorpaySettings?.themeColor || '#E11D48',
    mode: settings.razorpaySettings?.mode || 'test',
  }));

  useEffect(() => {
    if (settings.razorpaySettings) {
      setRazorpayData({
        enabled: settings.razorpaySettings.enabled ?? true,
        keyId: settings.razorpaySettings.keyId || '',
        keySecret: settings.razorpaySettings.keySecret || '',
        merchantName: settings.razorpaySettings.merchantName || 'REDMODE',
        themeColor: settings.razorpaySettings.themeColor || '#E11D48',
        mode: settings.razorpaySettings.mode || 'test',
      });
    }
  }, [settings.razorpaySettings]);

  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [isTestingRazorpay, setIsTestingRazorpay] = useState(false);
  const [razorpayTestResult, setRazorpayTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestRazorpayKeys = async () => {
    if (!razorpayData.keyId.trim() || !razorpayData.keySecret.trim()) {
      setRazorpayTestResult({
        success: false,
        message: 'Please enter both Razorpay Key ID and Key Secret to test connection.',
      });
      return;
    }

    setIsTestingRazorpay(true);
    setRazorpayTestResult(null);

    try {
      const res = await fetch('/api/payment/razorpay/test-keys', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          keyId: razorpayData.keyId.trim(),
          keySecret: razorpayData.keySecret.trim(),
        }),
      });

      const data = await res.json();
      setRazorpayTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Razorpay credentials verified successfully!' : 'Verification failed.'),
      });
    } catch (err: any) {
      setRazorpayTestResult({
        success: false,
        message: `Failed to connect to Razorpay test endpoint: ${err.message}`,
      });
    } finally {
      setIsTestingRazorpay(false);
    }
  };

  const handleSaveRazorpaySettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreSettings = {
      ...settings,
      razorpaySettings: {
        enabled: razorpayData.enabled,
        keyId: razorpayData.keyId.trim(),
        keySecret: razorpayData.keySecret.trim(),
        merchantName: razorpayData.merchantName.trim() || 'REDMODE',
        themeColor: razorpayData.themeColor || '#E11D48',
        mode: razorpayData.keyId.startsWith('rzp_live') ? 'live' : razorpayData.mode as any,
      },
    };
    updateSettings(updated);
    showStatus('Razorpay payment gateway settings saved successfully! 💳✅');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Admin Settings</span>
          </h2>
        </div>

        {/* Current Admin Tag */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{profileData.name}</span>
          </div>
        </div>
      </div>

      {/* 2. Global Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs underline cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSection('store')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer border-b-2 -mb-px ${
            activeSection === 'store'
              ? 'border-slate-900 text-slate-900 bg-slate-50 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/60'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Store &amp; Admin Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer border-b-2 -mb-px ${
            activeSection === 'security'
              ? 'border-slate-900 text-slate-900 bg-slate-50 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/60'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security &amp; Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer border-b-2 -mb-px ${
            activeSection === 'notifications'
              ? 'border-slate-900 text-slate-900 bg-slate-50 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/60'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notifications</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: STORE & ADMIN PROFILE (COMBINED)               */}
      {/* ========================================================= */}
      {activeSection === 'store' && (
        <div className="space-y-6">
          {/* A. STORE PROFILE & BRAND IDENTITY */}
          <form onSubmit={handleSaveStorePreferences} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Store Profile &amp; Brand Identity</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official store details, logo, and contact info reflected across your website and invoices.
              </p>
            </div>

            {/* Official Brand Logo Section */}
            <div className="p-5 sm:p-6 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Official Website Brand Logo</span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                      Live On Header
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This logo appears directly on your website header, checkout, and invoices.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingLogoUrl(!isEditingLogoUrl)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Link className="w-3.5 h-3.5 text-slate-500" />
                    <span>Image Link</span>
                  </button>
                </div>
              </div>

              {/* Logo Preview Areas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center min-h-[110px] relative group">
                  <span className="absolute top-2 left-2 text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                    Website Header Preview (Light)
                  </span>
                  <img
                    src={storeData.logoUrl || '/assets/2.png'}
                    alt="Brand Logo Preview"
                    className="h-9 sm:h-10 w-auto max-w-[200px] object-contain my-3"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('/assets/2.png')) {
                        target.src = '/assets/2.png';
                      }
                    }}
                  />
                  <span className="text-[10px] text-slate-400">Header par exact aisa dikhega</span>
                </div>

                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col items-center justify-center min-h-[110px] relative group text-white">
                  <span className="absolute top-2 left-2 text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-500">
                    Dark Contrast / Transparency
                  </span>
                  <img
                    src={storeData.logoUrl || '/assets/2.png'}
                    alt="Brand Logo Dark Preview"
                    className="h-9 sm:h-10 w-auto max-w-[200px] object-contain my-3"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('/assets/2.png')) {
                        target.src = '/assets/2.png';
                      }
                    }}
                  />
                  <span className="text-[10px] text-zinc-500">Transparent PNG check</span>
                </div>
              </div>

              {isEditingLogoUrl && (
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Direct Image URL ya Google Drive Link Paste Karein:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png ya Google Drive share link"
                      value={logoInputUrl}
                      onChange={(e) => setLogoInputUrl(e.target.value)}
                      className="flex-1 text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-slate-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyLogoUrl()}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Apply URL
                    </button>
                  </div>
                </div>
              )}

              {logoError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{logoError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => applyAndSaveLogo('/assets/2.png')}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition ${
                    storeData.logoUrl === '/assets/2.png'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  REDMODE Default
                </button>
                <button
                  type="button"
                  onClick={() => applyAndSaveLogo('/assets/2-transparent.png')}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition ${
                    storeData.logoUrl === '/assets/2-transparent.png'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Transparent PNG
                </button>
                <button
                  type="button"
                  onClick={() => applyAndSaveLogo('/assets/2-trimmed.png')}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition ${
                    storeData.logoUrl === '/assets/2-trimmed.png'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Trimmed Crop
                </button>
                <button
                  type="button"
                  onClick={() => applyAndSaveLogo('/redmode-icon.svg')}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition ${
                    storeData.logoUrl === '/redmode-icon.svg'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Icon SVG
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Store / Brand Name</label>
                <input
                  type="text"
                  required
                  value={storeData.businessName}
                  onChange={(e) => setStoreData({ ...storeData, businessName: e.target.value })}
                  className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tagline</label>
                <input
                  type="text"
                  value={storeData.tagline}
                  onChange={(e) => setStoreData({ ...storeData, tagline: e.target.value })}
                  className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Store Support Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={storeData.supportEmail}
                    onChange={(e) => setStoreData({ ...storeData, supportEmail: e.target.value })}
                    className="w-full text-xs font-mono pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Customer Support Number</label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={storeData.whatsappNumber}
                    onChange={(e) => setStoreData({ ...storeData, whatsappNumber: e.target.value })}
                    className="w-full text-xs font-mono font-bold pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Store Currency</label>
                <input
                  type="text"
                  readOnly
                  value={storeData.currency}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Time Zone</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    readOnly
                    value={storeData.timezone}
                    className="w-full text-xs font-semibold pl-10 pr-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Official Registered Store Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <textarea
                    rows={2}
                    required
                    value={storeData.storeAddress}
                    onChange={(e) => setStoreData({ ...storeData, storeAddress: e.target.value })}
                    className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
              >
                Save Store Preferences
              </button>
            </div>
          </form>

          {/* B. ADMINISTRATOR PROFILE */}
          <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Administrator Account Profile</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal admin name, contact details, and account photo.
            </p>
          </div>

          {/* Profile Photo & Quick Preview */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-5 p-4 sm:p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            {/* Hidden native file input for direct computer/phone photo upload */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/jpg,image/gif"
              className="hidden"
              onChange={handleFileSelected}
            />

            {/* Avatar Circle with Camera Trigger */}
            <div className="relative group shrink-0 self-center sm:self-start">
              {profileData.avatarUrl && !hasPhotoImgError ? (
                <img
                  src={profileData.avatarUrl}
                  alt={profileData.name}
                  className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover border-2 border-white shadow-md bg-white"
                  onError={() => {
                    setHasPhotoImgError(true);
                  }}
                />
              ) : (
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-2xl border-2 border-white shadow-md">
                  {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setPhotoInputUrl(profileData.avatarUrl || '');
                  setIsEditingPhotoUrl(!isEditingPhotoUrl);
                }}
                className="absolute bottom-0 right-0 p-2 bg-slate-900 hover:bg-black text-white rounded-full shadow-md cursor-pointer transition active:scale-95"
                title="Update Profile Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Meta & Actions */}
            <div className="flex-1 min-w-0 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-slate-900">{profileData.name}</span>
                <span className="px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-200 text-[10px] font-normal rounded-full uppercase tracking-wider">
                  {profileData.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {profileData.email} • {profileData.mobile}
              </p>

              {/* Photo Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold transition cursor-pointer shadow-3xs active:scale-95"
                  title="Choose image file from computer or phone"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPhotoInputUrl(profileData.avatarUrl || '');
                    setIsEditingPhotoUrl(!isEditingPhotoUrl);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer active:scale-95 ${
                    isEditingPhotoUrl
                      ? 'bg-slate-200 border-slate-300 text-slate-800'
                      : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Paste Google Drive, Dropbox, or image link"
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>{isEditingPhotoUrl ? 'Close URL Box' : 'Paste Link'}</span>
                </button>

                {profileData.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs transition cursor-pointer"
                    title="Reset photo to default avatar"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* URL Editor Input & Auto-Converter */}
              {isEditingPhotoUrl && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="url"
                        placeholder="Paste link (Google Drive, Dropbox, or image URL)"
                        value={photoInputUrl}
                        onChange={(e) => {
                          setPhotoInputUrl(e.target.value);
                          setPhotoError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyPhotoUrl();
                          }
                        }}
                        className="w-full text-xs pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        autoFocus
                      />
                      {extractGoogleDriveFileId(photoInputUrl) && (
                        <span
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 pointer-events-none"
                          title="Google Drive Link Detected"
                        >
                          GDrive
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isValidatingPhoto}
                      onClick={() => handleApplyPhotoUrl()}
                      className="px-4 py-2 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition active:scale-95 shrink-0"
                    >
                      {isValidatingPhoto ? 'Checking...' : 'Done'}
                    </button>
                  </div>

                  {/* Format guidance */}
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Google Drive links are automatically converted to direct preview format. Ensure Google Drive sharing is set to <strong>&ldquo;Anyone with the link can view&rdquo;</strong>, or use the <strong>Upload Photo</strong> button above.
                    </span>
                  </div>

                  {/* Error / Assistance Notice */}
                  {photoError && (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="font-medium text-[11px] leading-relaxed">{photoError}</p>
                      </div>
                      <div className="pl-6 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer transition inline-flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File Directly</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Force save the link anyway if user insists
                            applyAndSaveAvatar(normalizePhotoUrl(photoInputUrl).url);
                          }}
                          className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer hover:bg-amber-100/60 transition"
                        >
                          Save Link Anyway
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none transition"
                  placeholder="e.g. Jenny Wilson"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Role / Title
              </label>
              <input
                type="text"
                value={profileData.role}
                onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
                className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none transition"
                placeholder="e.g. Store Administrator"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none transition font-mono"
                  placeholder="myredmode@gmail.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={profileData.mobile}
                  onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
                  className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none transition font-mono"
                  placeholder="+91 73027 97464"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Changes apply instantly across your admin session.
            </span>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: SECURITY                                       */}
      {/* ========================================================= */}
      {activeSection === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handleUpdatePassword} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-700" />
                <span>Change Password</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Keep your store protected with a secure and unique administrator password.
              </p>
            </div>

            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-start">
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>

          {/* Session Management */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Active Sessions &amp; Device Security</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Revoke access to all other browsers and mobile devices currently logged into this admin account.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Current Device (Chrome Desktop • India)
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Active Now
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogoutOtherDevices}
                disabled={isLoggedOutOtherDevices}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isLoggedOutOtherDevices
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 cursor-default'
                    : 'bg-white hover:bg-rose-50 border-slate-300 hover:border-rose-300 text-slate-700 hover:text-rose-700'
                }`}
              >
                {isLoggedOutOtherDevices ? 'Other Devices Logged Out ✓' : 'Logout from all other devices'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 3: NOTIFICATIONS                                  */}
      {/* ========================================================= */}
      {activeSection === 'notifications' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Store &amp; Order Notification Controls</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure real-time automated triggers, alerts, and customer notifications.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {/* 1. New Order */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  New Order Audio &amp; System Alerts
                </p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                  Play an instant chime and pop up a browser banner whenever a customer places an order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleNotification('newOrder')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifications.newOrder ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.newOrder ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. Order Confirmation */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  Automated Order Confirmation
                </p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                  Automatically generate and send itemized invoice summaries to customers on checkout completion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleNotification('orderConfirmation')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifications.orderConfirmation ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.orderConfirmation ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Payment Notifications */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  Prepaid &amp; UPI Payment Capture Alerts
                </p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                  Notify the admin dashboard instantly when prepaid UPI / QR / Card payment is successfully captured.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleNotification('paymentReceived')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifications.paymentReceived ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.paymentReceived ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 4. Low Stock */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  Low Stock Inventory Warnings
                </p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                  Highlight products with low-stock badges when any color or size stock drops under 5 units.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleNotification('lowStock')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifications.lowStock ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.lowStock ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 5. Email Notifications */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  Store Email Notifications
                </p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                  Deliver order summaries and customer inquiry messages to {profileData.email}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleNotification('emailNotifications')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifications.emailNotifications ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 6. WhatsApp Notifications */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  Customer WhatsApp Order Updates
                </p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                  Dispatch automated live tracking links and 23-hour review reminders to customer mobile numbers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleNotification('whatsappNotifications')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifications.whatsappNotifications ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.whatsappNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
