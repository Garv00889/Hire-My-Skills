import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Shield,
  Percent,
  DollarSign,
  AlertTriangle,
  Mail,
  Phone,
  Power,
} from 'lucide-react';
import { getAdminSettings, updateAdminSettings } from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminSettingsPage = () => {
  const [settings, setSettings] = useState({
    siteName: 'HireMySkills',
    supportEmail: 'support@hiremyskills.com',
    contactPhone: '+91 98765 43210',
    commissionRate: 10,
    minPayoutAmount: 500,
    withdrawalFee: 0,
    currency: 'INR',
    maintenanceMode: false,
    allowNewRegistrations: true,
    allowProjectPosting: true,
    maxProjectsPerUser: 20,
    escrowEnabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getAdminSettings();
      if (res.data) setSettings(res.data);
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateAdminSettings(settings);
      toast.success('Platform settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-spinner-box" style={{ padding: '80px 0' }}>
        <div className="admin-spinner" />
        <p>Loading platform configuration...</p>
      </div>
    );
  }

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Platform & System Settings</h1>
          <p className="admin-page-subtitle">
            Configure global marketplace parameters, financial commissions, minimum payout thresholds, and operational flags.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '850px' }}>
        {/* Marketplace Identity */}
        <div className="admin-chart-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Marketplace Identity & Support</h2>
              <p className="admin-card-subtitle">Public branding and customer support contacts</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="modal-form-group">
              <label className="form-label">Platform Name</label>
              <input
                type="text"
                required
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="form-select-control"
              />
            </div>

            <div className="modal-form-group">
              <label className="form-label">Support Email Address</label>
              <input
                type="email"
                required
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="form-select-control"
              />
            </div>

            <div className="modal-form-group">
              <label className="form-label">Support Helpline Phone</label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="form-select-control"
              />
            </div>

            <div className="modal-form-group">
              <label className="form-label">Default Currency</label>
              <input
                type="text"
                disabled
                value={settings.currency || 'INR (₹)'}
                className="form-select-control"
                style={{ background: '#F9FAFB' }}
              />
            </div>
          </div>
        </div>

        {/* Financial & Commission Policies */}
        <div className="admin-chart-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Financial & Escrow Policies</h2>
              <p className="admin-card-subtitle">Fee structures and student withdrawal parameters</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="modal-form-group">
              <label className="form-label">Platform Commission Rate (%)</label>
              <input
                type="number"
                required
                min={0}
                max={100}
                value={settings.commissionRate}
                onChange={(e) => setSettings({ ...settings, commissionRate: Number(e.target.value) })}
                className="form-select-control"
              />
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                Default: 10%. Deducted from client milestone release.
              </span>
            </div>

            <div className="modal-form-group">
              <label className="form-label">Minimum Payout Amount (INR ₹)</label>
              <input
                type="number"
                required
                min={100}
                value={settings.minPayoutAmount}
                onChange={(e) => setSettings({ ...settings, minPayoutAmount: Number(e.target.value) })}
                className="form-select-control"
              />
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                Minimum balance student must reach to request UPI/Bank withdrawal.
              </span>
            </div>
          </div>
        </div>

        {/* Operational & Security Flags */}
        <div className="admin-chart-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">System Controls & Availability</h2>
              <p className="admin-card-subtitle">Operational switches for marketplace availability</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="modal-checkbox-row">
              <input
                type="checkbox"
                id="escrowEnabled"
                checked={settings.escrowEnabled}
                onChange={(e) => setSettings({ ...settings, escrowEnabled: e.target.checked })}
              />
              <label htmlFor="escrowEnabled">
                <strong>Escrow Milestone Protection</strong>
                <p>Locks client funds until project milestone completion is accepted or arbitrated.</p>
              </label>
            </div>

            <div className="modal-checkbox-row">
              <input
                type="checkbox"
                id="allowReg"
                checked={settings.allowNewRegistrations}
                onChange={(e) => setSettings({ ...settings, allowNewRegistrations: e.target.checked })}
              />
              <label htmlFor="allowReg">
                <strong>Allow New User Signups</strong>
                <p>Permit new students and clients to create marketplace accounts.</p>
              </label>
            </div>

            <div className="modal-checkbox-row">
              <input
                type="checkbox"
                id="allowPost"
                checked={settings.allowProjectPosting}
                onChange={(e) => setSettings({ ...settings, allowProjectPosting: e.target.checked })}
              />
              <label htmlFor="allowPost">
                <strong>Allow Client Project Creation</strong>
                <p>Enables the "Create Project" form for clients on the main marketplace.</p>
              </label>
            </div>

            <div className="modal-checkbox-row" style={{ borderColor: settings.maintenanceMode ? '#EF4444' : '#E5E7EB' }}>
              <input
                type="checkbox"
                id="maintMode"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              />
              <label htmlFor="maintMode">
                <strong style={{ color: settings.maintenanceMode ? '#DC2626' : '#111827' }}>
                  Platform Maintenance Mode
                </strong>
                <p>When enabled, regular users see a maintenance banner and non-essential actions are paused.</p>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            className="admin-btn-primary"
            style={{ padding: '12px 24px', fontSize: '14px' }}
          >
            <Save size={16} />
            {saving ? 'Saving Platform Configuration...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettingsPage;
