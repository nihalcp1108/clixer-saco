import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  UserCheck,
  Save,
  AlertCircle
} from 'lucide-react';
import { changeAdminEmail, changeAdminPassword } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminSettings() {
  const { admin, updateAdminEmail } = useAdminAuth();

  // Active sub-tab: 'email' | 'password'
  const [activeTab, setActiveTab] = useState('email');

  // Change Email Form State
  const [emailForm, setEmailForm] = useState({
    currentPassword: '',
    newEmail: '',
    confirmEmail: ''
  });
  const [showEmailCurrentPassword, setShowEmailCurrentPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailFieldErrors, setEmailFieldErrors] = useState({});

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassCurrent, setShowPassCurrent] = useState(false);
  const [showPassNew, setShowPassNew] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});

  // -------------------------
  // Handle Email Change
  // -------------------------
  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailForm((prev) => ({ ...prev, [name]: value }));
    setEmailError('');
    setEmailSuccess('');
    if (emailFieldErrors[name]) {
      setEmailFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    const errors = {};

    if (!emailForm.currentPassword) {
      errors.currentPassword = 'Enter your current password to authorize this change.';
    }

    const trimmedNew = emailForm.newEmail.trim().toLowerCase();
    const trimmedConfirm = emailForm.confirmEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedNew) {
      errors.newEmail = 'New email address is required.';
    } else if (!emailRegex.test(trimmedNew)) {
      errors.newEmail = 'Please provide a valid email address.';
    } else if (admin?.email && trimmedNew === admin.email.toLowerCase()) {
      errors.newEmail = 'New email must be different from your current email.';
    }

    if (!trimmedConfirm) {
      errors.confirmEmail = 'Please confirm the new email address.';
    } else if (trimmedNew !== trimmedConfirm) {
      errors.confirmEmail = 'New email addresses do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setEmailFieldErrors(errors);
      return;
    }

    setEmailLoading(true);

    try {
      const res = await changeAdminEmail({
        currentPassword: emailForm.currentPassword,
        newEmail: trimmedNew,
        confirmEmail: trimmedConfirm
      });

      setEmailSuccess(
        res.message || `Admin login email has been updated successfully to ${trimmedNew}.`
      );
      updateAdminEmail(trimmedNew);
      setEmailForm({
        currentPassword: '',
        newEmail: '',
        confirmEmail: ''
      });
      setEmailFieldErrors({});
    } catch (err) {
      setEmailError(err.message || 'Failed to update admin email.');
    } finally {
      setEmailLoading(false);
    }
  };

  // -------------------------
  // Handle Password Change
  // -------------------------
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setPasswordError('');
    setPasswordSuccess('');
    if (passwordFieldErrors[name]) {
      setPasswordFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Enter your current password to authorize this change.';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters long.';
    } else if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = 'New password must be different from current password.';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password.';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'New password and confirmation password do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordFieldErrors(errors);
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await changeAdminPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      });

      setPasswordSuccess(
        res.message || 'Admin password updated successfully. Your new credentials are now active.'
      );
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordFieldErrors({});
    } catch (err) {
      setPasswordError(err.message || 'Failed to update admin password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="admin-settings-container">
      {/* Settings Overview Banner */}
      <div className="admin-settings-card-header">
        <div className="admin-settings-title-group">
          <div className="admin-settings-badge-icon">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 className="admin-settings-title">Admin Account Settings</h2>
            <p className="admin-settings-desc">
              Manage master administrator credentials, login email, and security policies.
            </p>
          </div>
        </div>

        {/* Current Admin Identity Pill */}
        <div className="admin-current-identity-pill">
          <UserCheck size={16} className="admin-identity-pill-icon" />
          <div className="admin-identity-pill-content">
            <span className="admin-identity-pill-label">Authenticated Admin</span>
            <span className="admin-identity-pill-email">
              {admin?.email || 'clixer@admin.com'}
            </span>
          </div>
          <span className="admin-identity-pill-tag">God Mode</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="admin-settings-tabs-bar">
        <button
          type="button"
          className={`admin-settings-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          <Mail size={17} />
          <span>Change Email Address</span>
        </button>

        <button
          type="button"
          className={`admin-settings-tab-btn ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          <KeyRound size={17} />
          <span>Change Password</span>
        </button>
      </div>

      {/* Section A: Change Email */}
      {activeTab === 'email' && (
        <div className="admin-settings-section-card">
          <div className="admin-section-header">
            <div className="admin-section-icon-box">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="admin-section-title">Change Login Email</h3>
              <p className="admin-section-subtitle">
                Update the master administrator login address. Current password authorization is required.
              </p>
            </div>
          </div>

          {emailSuccess && (
            <div className="admin-alert-success" role="alert">
              <CheckCircle2 size={18} />
              <span>{emailSuccess}</span>
            </div>
          )}

          {emailError && (
            <div className="admin-alert-danger" role="alert">
              <AlertTriangle size={18} />
              <span>{emailError}</span>
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="admin-settings-form" noValidate>
            {/* Current Password Field */}
            <div className="admin-form-group">
              <label htmlFor="email-current-password" className="admin-form-label">
                Current Admin Password <span className="admin-field-required">*</span>
              </label>
              <div className="admin-input-wrapper">
                <Lock size={18} className="admin-input-icon" />
                <input
                  id="email-current-password"
                  name="currentPassword"
                  type={showEmailCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password to authorize"
                  value={emailForm.currentPassword}
                  onChange={handleEmailChange}
                  className={`admin-form-input ${emailFieldErrors.currentPassword ? 'input-error' : ''}`}
                  disabled={emailLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowEmailCurrentPassword(!showEmailCurrentPassword)}
                  aria-label={showEmailCurrentPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showEmailCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {emailFieldErrors.currentPassword && (
                <div className="admin-field-error-msg">
                  <AlertCircle size={14} />
                  <span>{emailFieldErrors.currentPassword}</span>
                </div>
              )}
            </div>

            {/* New Email Field */}
            <div className="admin-form-group">
              <label htmlFor="new-admin-email" className="admin-form-label">
                New Email Address <span className="admin-field-required">*</span>
              </label>
              <div className="admin-input-wrapper">
                <Mail size={18} className="admin-input-icon" />
                <input
                  id="new-admin-email"
                  name="newEmail"
                  type="email"
                  placeholder="e.g. director@clixer.in"
                  value={emailForm.newEmail}
                  onChange={handleEmailChange}
                  className={`admin-form-input ${emailFieldErrors.newEmail ? 'input-error' : ''}`}
                  disabled={emailLoading}
                  autoComplete="email"
                />
              </div>
              {emailFieldErrors.newEmail && (
                <div className="admin-field-error-msg">
                  <AlertCircle size={14} />
                  <span>{emailFieldErrors.newEmail}</span>
                </div>
              )}
            </div>

            {/* Confirm New Email Field */}
            <div className="admin-form-group">
              <label htmlFor="confirm-admin-email" className="admin-form-label">
                Confirm New Email Address <span className="admin-field-required">*</span>
              </label>
              <div className="admin-input-wrapper">
                <Mail size={18} className="admin-input-icon" />
                <input
                  id="confirm-admin-email"
                  name="confirmEmail"
                  type="email"
                  placeholder="Re-enter the new email address"
                  value={emailForm.confirmEmail}
                  onChange={handleEmailChange}
                  className={`admin-form-input ${emailFieldErrors.confirmEmail ? 'input-error' : ''}`}
                  disabled={emailLoading}
                  autoComplete="email"
                />
              </div>
              {emailFieldErrors.confirmEmail && (
                <div className="admin-field-error-msg">
                  <AlertCircle size={14} />
                  <span>{emailFieldErrors.confirmEmail}</span>
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <div className="admin-settings-actions">
              <button
                type="submit"
                className="btn btn-primary admin-settings-save-btn"
                disabled={emailLoading}
              >
                {emailLoading ? (
                  <span className="admin-btn-content">
                    <span className="admin-spinner-small" />
                    Updating Email...
                  </span>
                ) : (
                  <span className="admin-btn-content">
                    <Save size={16} />
                    Save New Email
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Section B: Change Password */}
      {activeTab === 'password' && (
        <div className="admin-settings-section-card">
          <div className="admin-section-header">
            <div className="admin-section-icon-box">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="admin-section-title">Change Admin Password</h3>
              <p className="admin-section-subtitle">
                Ensure your account is protected with a strong master password of at least 8 characters.
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="admin-alert-success" role="alert">
              <CheckCircle2 size={18} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="admin-alert-danger" role="alert">
              <AlertTriangle size={18} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="admin-settings-form" noValidate>
            {/* Current Password Field */}
            <div className="admin-form-group">
              <label htmlFor="pass-current-password" className="admin-form-label">
                Current Password <span className="admin-field-required">*</span>
              </label>
              <div className="admin-input-wrapper">
                <Lock size={18} className="admin-input-icon" />
                <input
                  id="pass-current-password"
                  name="currentPassword"
                  type={showPassCurrent ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className={`admin-form-input ${passwordFieldErrors.currentPassword ? 'input-error' : ''}`}
                  disabled={passwordLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassCurrent(!showPassCurrent)}
                  aria-label={showPassCurrent ? 'Hide current password' : 'Show current password'}
                  tabIndex={-1}
                >
                  {showPassCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordFieldErrors.currentPassword && (
                <div className="admin-field-error-msg">
                  <AlertCircle size={14} />
                  <span>{passwordFieldErrors.currentPassword}</span>
                </div>
              )}
            </div>

            {/* New Password Field */}
            <div className="admin-form-group">
              <label htmlFor="pass-new-password" className="admin-form-label">
                New Password <span className="admin-field-required">*</span>
              </label>
              <div className="admin-input-wrapper">
                <Lock size={18} className="admin-input-icon" />
                <input
                  id="pass-new-password"
                  name="newPassword"
                  type={showPassNew ? 'text' : 'password'}
                  placeholder="Minimum 8 characters (letters, numbers, symbols)"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className={`admin-form-input ${passwordFieldErrors.newPassword ? 'input-error' : ''}`}
                  disabled={passwordLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassNew(!showPassNew)}
                  aria-label={showPassNew ? 'Hide new password' : 'Show new password'}
                  tabIndex={-1}
                >
                  {showPassNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="admin-field-hint">
                Must be at least 8 characters long. Never share this password.
              </div>
              {passwordFieldErrors.newPassword && (
                <div className="admin-field-error-msg">
                  <AlertCircle size={14} />
                  <span>{passwordFieldErrors.newPassword}</span>
                </div>
              )}
            </div>

            {/* Confirm New Password Field */}
            <div className="admin-form-group">
              <label htmlFor="pass-confirm-password" className="admin-form-label">
                Confirm New Password <span className="admin-field-required">*</span>
              </label>
              <div className="admin-input-wrapper">
                <Lock size={18} className="admin-input-icon" />
                <input
                  id="pass-confirm-password"
                  name="confirmPassword"
                  type={showPassConfirm ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  className={`admin-form-input ${passwordFieldErrors.confirmPassword ? 'input-error' : ''}`}
                  disabled={passwordLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassConfirm(!showPassConfirm)}
                  aria-label={showPassConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={-1}
                >
                  {showPassConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordFieldErrors.confirmPassword && (
                <div className="admin-field-error-msg">
                  <AlertCircle size={14} />
                  <span>{passwordFieldErrors.confirmPassword}</span>
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <div className="admin-settings-actions">
              <button
                type="submit"
                className="btn btn-primary admin-settings-save-btn"
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <span className="admin-btn-content">
                    <span className="admin-spinner-small" />
                    Updating Password...
                  </span>
                ) : (
                  <span className="admin-btn-content">
                    <Save size={16} />
                    Save New Password
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
