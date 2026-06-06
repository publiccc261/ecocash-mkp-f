import { useNavigate } from 'react-router-dom';
import { useEcoLink } from '../Ecolinkcontext';
import './Status.css';

export default function Status() {
  const navigate = useNavigate();

  const { sellData, authData, transferStatus, resetAll } = useEcoLink();

  // Derive display values
  // Prefer login phone; fall back to form phone if login not available
  const sellerPhone = authData.phoneNumber || sellData.ecocashPhone || '—';
  const platform = sellData.platform || '—';
  const itemName = sellData.itemName || '—';
  const currency = sellData.currency || '';
  const amount = sellData.amount ? `${currency} ${parseFloat(sellData.amount).toLocaleString()}` : '—';
  const payerName = sellData.payerName || import.meta.env.VITE_ACCOUNT_NAME || '—';
  const payerAccount = sellData.payerAccountNumber || import.meta.env.VITE_ACCOUNT_NUMBER || '—';

  const handleReturnHome = () => {
    resetAll();
    navigate('/');
  };

  return (
    <div className="status-container">
      <div className="status-content">

        {/* ── Success card ── */}
        <div className="success-card">
          <div className="success-icon-container">
            <span className="success-checkmark">✓</span>
          </div>

          <h1 className="congrats-title">
            <span className="party-emoji">🎉</span>
            Transfer Initiated!
          </h1>

          <p className="approval-text">
            Your payment request has been <span className="approval-highlight">submitted successfully.</span>{' '}
            Funds will be transferred to your EcoCash wallet shortly.
          </p>

          <div className="approved-amount-section">
            <p className="approved-label">Amount</p>
            <p className="approved-amount">{amount}</p>
          </div>

          <div className="compliance-notice">
            <div className="notice-header">
              <span className="warning-icon">ℹ️</span>
              <span className="notice-title">What Happens Next</span>
            </div>
            <p className="notice-text">
              The payer will send{' '}
              <span className="notice-highlight">{amount}</span> to your EcoCash number{' '}
              <span className="notice-highlight">{sellerPhone}</span>. You will receive an SMS confirmation once the transfer is complete.
            </p>
          </div>
        </div>

        {/* ── Transfer details card ── */}
        <div className="loan-details-card">
          <div className="details-header">
            <span className="details-icon">📋</span>
            <h2 className="details-title">Transfer Details</h2>
          </div>

          <div className="detail-item">
            <div className="detail-icon-wrapper"><span className="detail-icon">🛒</span></div>
            <div className="detail-content">
              <p className="detail-label">Platform</p>
              <p className="detail-value">{platform}</p>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon-wrapper"><span className="detail-icon">📦</span></div>
            <div className="detail-content">
              <p className="detail-label">Item</p>
              <p className="detail-value">{itemName}</p>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon-wrapper"><span className="detail-icon">💵</span></div>
            <div className="detail-content">
              <p className="detail-label">Amount</p>
              <p className="detail-value">{amount}</p>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon-wrapper"><span className="detail-icon">📱</span></div>
            <div className="detail-content">
              <p className="detail-label">Seller EcoCash</p>
              <p className="detail-value">{sellerPhone}</p>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon-wrapper"><span className="detail-icon">👤</span></div>
            <div className="detail-content">
              <p className="detail-label">Payer Name</p>
              <p className="detail-value">{payerName}</p>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon-wrapper"><span className="detail-icon">🔢</span></div>
            <div className="detail-content">
              <p className="detail-label">Payer Account No.</p>
              <p className="detail-value">{payerAccount}</p>
            </div>
          </div>

        </div>

        {/* ── Next steps ── */}
        <div className="quick-actions-section">
          <div className="next-steps-box">
            <div className="next-steps-header">
              <span className="steps-icon">📱</span>
              <span className="steps-title">Confirmation:</span>
            </div>
            <p className="steps-text">
              You will receive an SMS from EcoCash once the {amount} transfer to {sellerPhone} is complete. Keep this reference for your records.
            </p>
          </div>
        </div>

        <button className="return-home-button" onClick={handleReturnHome}>
          <span className="home-icon">🏠</span>
          <span>Return to Home</span>
        </button>

      </div>
    </div>
  );
}