import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Percent,
  DollarSign,
  TrendingUp,
  Settings,
  Calculator,
  ShieldCheck,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { getAdminCommissions } from '../services/adminApi';
import toast from 'react-hot-toast';

const AdminCommissionsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Calculator State
  const [calcBudget, setCalcBudget] = useState(15000);

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const res = await getAdminCommissions();
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load commissions overview');
    } finally {
      setLoading(false);
    }
  };

  const commissionRate = data?.commissionRate || 10;
  const overview = data?.overview || {
    totalCommissionEarned: 0,
    totalGrossVolume: 0,
    totalTransactions: 0,
  };
  const typeBreakdown = data?.typeBreakdown || [];

  // Calculator calculations
  const platformFeeCalc = (calcBudget * (commissionRate / 100));
  const studentPayoutCalc = calcBudget - platformFeeCalc;

  return (
    <div className="admin-projects-page">
      <div className="admin-page-hero">
        <div>
          <h1 className="admin-page-title">Platform Commissions & Revenue</h1>
          <p className="admin-page-subtitle">
            Configure marketplace commission percentages, analyze fee generation by service type, and project future revenues.
          </p>
        </div>
        <Link to="/admin/settings" className="admin-btn-primary">
          <Settings size={16} /> Adjust Commission Rate ({commissionRate}%)
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="admin-kpi-grid">
        <StatCard
          title="Commission Rate"
          value={`${commissionRate}%`}
          subtitle="Applied on project release & store sales"
          icon={Percent}
          color="gold"
        />

        <StatCard
          title="Total Commission Earned"
          value={`₹${(overview.totalCommissionEarned || 0).toLocaleString('en-IN')}`}
          subtitle="Net platform earnings to date"
          icon={DollarSign}
          color="green"
        />

        <StatCard
          title="Gross Marketplace Volume"
          value={`₹${(overview.totalGrossVolume || 0).toLocaleString('en-IN')}`}
          subtitle={`${overview.totalTransactions || 0} total settled transactions`}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Two Column Layout: Fee Breakdown + Interactive Calculator */}
      <div className="admin-analytics-row" style={{ marginTop: '12px' }}>
        {/* Breakdown Card */}
        <div className="admin-chart-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Commissions by Transaction Stream</h2>
              <p className="admin-card-subtitle">Aggregated earnings across services</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {typeBreakdown.length === 0 ? (
              <p className="empty-subtext">No transaction fee records available</p>
            ) : (
              typeBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: '#FAF9F6',
                    borderRadius: '12px',
                    border: '1px solid #EFECE6',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '14px', color: '#111827', textTransform: 'capitalize' }}>
                      {item._id.replace(/_/g, ' ')}
                    </strong>
                    <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#6B7280' }}>
                      {item.count} transactions processed
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>
                      ₹{(item.totalFee || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Simulator */}
        <div className="admin-categories-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Commission Calculator</h2>
              <p className="admin-card-subtitle">Simulate escrow fee splits</p>
            </div>
            <Calculator size={18} color="#F5A623" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="modal-form-group">
              <label className="form-label">Project Budget (INR ₹)</label>
              <input
                type="number"
                value={calcBudget}
                onChange={(e) => setCalcBudget(Number(e.target.value) || 0)}
                className="form-select-control"
              />
            </div>

            <div style={{ background: '#FAF9F6', border: '1px solid #EFECE6', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#6B7280' }}>Platform Cut ({commissionRate}%):</span>
                <strong style={{ color: '#059669' }}>₹{platformFeeCalc.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#6B7280' }}>Student Freelancer Net:</span>
                <strong style={{ color: '#111827' }}>₹{studentPayoutCalc.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ fontSize: '12.5px', color: '#9CA3AF', lineHeight: '1.5' }}>
              Note: The {commissionRate}% commission rate is automatically deducted when milestones are approved or digital goods are purchased.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCommissionsPage;
