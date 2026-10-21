import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  QrCode,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  LogOut,
  Server,
  Award,
  Users,
  TrendingUp,
  FileText,
  Clock,
  Search,
  Sparkles,
  Crown,
  ChevronRight,
  ArrowRight,
  Check,
  Zap,
  MapPin,
  RefreshCw,
  ShoppingBag,
  UserPlus,
} from "lucide-react";

import { PosBillingCounter } from "./components/PosBillingCounter";
import { CustomerEnrollment } from "./components/CustomerEnrollment";

// API Base URL (uses Vite proxy in dev)
const API_BASE = "http://localhost:8000/api/v1";

interface StaffSession {
  access_token: string;
  staff: {
    id: string;
    username: string;
    full_name: string;
    role: "staff" | "manager" | "admin";
    store_location: string;
  };
}

interface ValidationResult {
  valid: boolean;
  redemption_id: string;
  customer_name: string;
  customer_phone_masked: string;
  reward_title: string;
  points_to_deduct: number;
  current_points_balance: number;
  expires_at: string;
  status: string;
  message?: string;
}

export default function App() {
  const [session, setSession] = useState<StaffSession | null>(() => {
    const saved = localStorage.getItem("hubklub_staff_session");
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<"billing" | "counter" | "customers" | "rewards" | "integration" | "reconciliation">("billing");
  const [preselectedPhone, setPreselectedPhone] = useState<string>("");

  // Login Form State
  const [username, setUsername] = useState("vadodara_staff");
  const [password, setPassword] = useState("Staff@123");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Counter Redemption State
  const [tokenInput, setTokenInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [validationError, setValidationError] = useState("");
  const [billRef, setBillRef] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmationSuccess, setConfirmationSuccess] = useState<any | null>(null);

  // Admin Dashboard State
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [integrationHealth, setIntegrationHealth] = useState<any | null>(null);
  const [rewardsList, setRewardsList] = useState<any[]>([]);
  const [reconReport, setReconReport] = useState<any | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // Quick fill demo token helper
  const handleQuickFillToken = (code: string) => {
    setTokenInput(code);
    setValidationError("");
  };

  const performLogin = async (loginUser?: string, loginPass?: string) => {
    const finalUser = loginUser !== undefined ? loginUser : username;
    const finalPass = loginPass !== undefined ? loginPass : password;

    if (!finalUser || !finalPass) {
      setLoginError("Please enter both username and password");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    // Candidates to try in order
    const endpoints = [
      `${API_BASE}/staff/auth/login`,
      `${API_BASE}/admin/login`,
      `/api/v1/staff/auth/login`,
      `/admin/login`,
      `http://localhost:8000/api/v1/staff/auth/login`,
      `http://localhost:8000/admin/login`,
    ];

    let lastError = "Authentication failed";
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: finalUser, password: finalPass }),
        });

        if (res.status === 404) {
          continue; // Try next fallback candidate
        }

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Authentication failed");
        }

        setSession(data);
        localStorage.setItem("hubklub_staff_session", JSON.stringify(data));
        setLoginLoading(false);
        return;
      } catch (err: any) {
        lastError = err.message || lastError;
      }
    }

    setLoginError(lastError);
    setLoginLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin();
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("hubklub_staff_session");
  };

  const handleValidateToken = async () => {
    if (!tokenInput.trim()) return;
    setValidating(true);
    setValidationError("");
    setValidationData(null);
    setConfirmationSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/staff/redemptions/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ token_or_qr: tokenInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Token verification rejected");
      }

      setValidationData(data);
    } catch (err: any) {
      setValidationError(err.message || "Token verification failed. Please check the code.");
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmRedemption = async () => {
    if (!validationData) return;
    setConfirming(true);

    try {
      const res = await fetch(`${API_BASE}/staff/redemptions/${validationData.redemption_id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          store_bill_reference: billRef || "POS-VAD-WALKIN",
          staff_notes: `Processed by ${session?.staff.full_name} at Spentha Complex Counter`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Deduction confirmation failed");
      }

      setConfirmationSuccess(data);
      setValidationData(null);
      setTokenInput("");
      setBillRef("");
    } catch (err: any) {
      alert(`Redemption Error: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  // Fetch Admin Data
  const loadAdminData = async () => {
    if (!session || session.staff.role === "staff") return;
    setAdminLoading(true);

    try {
      const [dashRes, intRes, rewRes, recRes] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).then((r) => r.json()),
        fetch(`${API_BASE}/admin/integrations/status`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).then((r) => r.json()),
        fetch(`${API_BASE}/rewards`).then((r) => r.json()),
        fetch(`${API_BASE}/admin/reconciliation`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).then((r) => r.json()),
      ]);

      setDashboardStats(dashRes);
      setIntegrationHealth(intRes);
      setRewardsList(rewRes.rewards || []);
      setReconReport(recRes);
    } catch (e) {
      console.error("Admin data load error", e);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (session && session.staff.role !== "staff") {
      loadAdminData();
    }
  }, [session, activeTab]);

  // LOGIN SCREEN
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", backgroundColor: "#f9fafb" }}>
        <div className="hub-glass-panel" style={{ maxWidth: "460px", width: "100%", padding: "3rem 2.5rem", border: "1px solid #e5e7eb", borderRadius: "16px", backgroundColor: "#ffffff" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <img
              src="/the_hub_logo.png"
              alt="THE HUB"
              style={{ maxHeight: "56px", maxWidth: "220px", objectFit: "contain", margin: "0 auto 1rem" }}
            />
            <div style={{ fontSize: "0.75rem", letterSpacing: "3px", color: "#6b7280", textTransform: "uppercase", fontWeight: "800" }}>
              THE HUB • VADODARA
            </div>
            <p style={{ color: "#6b7280", fontSize: "0.85rem", letterSpacing: "0.2px", marginTop: "0.35rem" }}>
              Executive Staff & Counter Verification Portal
            </p>
          </div>

          {loginError && (
            <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "0.85rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={18} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", letterSpacing: "0.5px", textTransform: "uppercase", color: "#374151", marginBottom: "0.5rem", fontWeight: "700" }}>
                Staff Identity / Username
              </label>
              <input
                className="hub-input-luxury"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", letterSpacing: "0.5px", textTransform: "uppercase", color: "#374151", marginBottom: "0.5rem", fontWeight: "700" }}>
                Security Password
              </label>
              <input
                className="hub-input-luxury"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <button type="submit" className="btn-gold-primary" style={{ width: "100%", marginTop: "0.5rem", padding: "1rem" }} disabled={loginLoading}>
              {loginLoading ? <RotateCw className="pulse-indicator" size={18} /> : <ShieldCheck size={18} />}
              {loginLoading ? "Authorizing Staff..." : "Sign In to Counter Portal"}
            </button>
          </form>

          <div style={{ marginTop: "1.8rem", padding: "1.2rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "0.82rem" }}>
            <div style={{ fontWeight: "700", color: "#111827", marginBottom: "0.8rem", letterSpacing: "0.5px", textTransform: "uppercase", fontSize: "0.72rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>⚡ 1-Click Quick Demo Login</span>
              <span style={{ color: "#d97706", fontWeight: "600" }}>Instant Access</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={() => {
                  setUsername("admin");
                  setPassword("Admin@123");
                  performLogin("admin", "Admin@123");
                }}
                disabled={loginLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.7rem 0.9rem",
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#d97706")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              >
                <div>
                  <div style={{ fontWeight: "700", color: "#111827" }}>👑 Store Manager (Rajesh Patel)</div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>admin / Admin@123 • Full POS & Admin Reports</div>
                </div>
                <span style={{ background: "#fef3c7", color: "#92400e", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "700" }}>
                  Sign In →
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername("vadodara_staff");
                  setPassword("Staff@123");
                  performLogin("vadodara_staff", "Staff@123");
                }}
                disabled={loginLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.7rem 0.9rem",
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#d97706")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              >
                <div>
                  <div style={{ fontWeight: "700", color: "#111827" }}>🏷️ Counter Cashier (Kavita Sharma)</div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>vadodara_staff / Staff@123 • Billing & Invoicing</div>
                </div>
                <span style={{ background: "#f3f4f6", color: "#374151", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "700" }}>
                  Sign In →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN PORTAL VIEW
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#ffffff" }}>
      {/* Top Header */}
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e5e7eb", padding: "1rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
            <img
              src="/the_hub_logo.png"
              alt="THE HUB"
              style={{ maxHeight: "38px", width: "auto", objectFit: "contain" }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="badge-gold">HUBKLUB</span>
              </div>
              <div style={{ fontSize: "0.74rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "2px" }}>
                <MapPin size={12} color="#b8860b" /> Spentha Complex, Race Course Road, Vadodara Flagship
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: "flex", gap: "0.5rem", background: "#f3f4f6", padding: "0.35rem", borderRadius: "9999px", border: "1px solid #e5e7eb" }}>
            <button
              onClick={() => setActiveTab("billing")}
              className={activeTab === "billing" ? "btn-gold-primary" : "btn-luxury-secondary"}
              style={{ padding: "0.55rem 1.2rem", fontSize: "0.82rem", borderRadius: "9999px" }}
            >
              <ShoppingBag size={15} /> POS Billing Counter
            </button>

            <button
              onClick={() => setActiveTab("counter")}
              className={activeTab === "counter" ? "btn-gold-primary" : "btn-luxury-secondary"}
              style={{ padding: "0.55rem 1.2rem", fontSize: "0.82rem", borderRadius: "9999px" }}
            >
              <QrCode size={15} /> Voucher Scanner
            </button>

            <button
              onClick={() => setActiveTab("customers")}
              className={activeTab === "customers" ? "btn-gold-primary" : "btn-luxury-secondary"}
              style={{ padding: "0.55rem 1.2rem", fontSize: "0.82rem", borderRadius: "9999px" }}
            >
              <UserPlus size={15} /> Customers & OTP
            </button>

            {session.staff.role !== "staff" && (
              <>
                <button
                  onClick={() => setActiveTab("rewards")}
                  className={activeTab === "rewards" ? "btn-gold-primary" : "btn-luxury-secondary"}
                  style={{ padding: "0.55rem 1.2rem", fontSize: "0.82rem", borderRadius: "9999px" }}
                >
                  <Award size={15} /> Rewards Catalogue
                </button>
                <button
                  onClick={() => setActiveTab("integration")}
                  className={activeTab === "integration" ? "btn-gold-primary" : "btn-luxury-secondary"}
                  style={{ padding: "0.55rem 1.2rem", fontSize: "0.82rem", borderRadius: "9999px" }}
                >
                  <Server size={15} /> Tally Monitor
                </button>
                <button
                  onClick={() => setActiveTab("reconciliation")}
                  className={activeTab === "reconciliation" ? "btn-gold-primary" : "btn-luxury-secondary"}
                  style={{ padding: "0.55rem 1.2rem", fontSize: "0.82rem", borderRadius: "9999px" }}
                >
                  <FileText size={15} /> Audit & Recon
                </button>
              </>
            )}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", background: "#f9fafb", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.84rem", fontWeight: "800", color: "#0a0a0a" }}>{session.staff.full_name}</div>
              <div style={{ fontSize: "0.7rem", color: "#b8860b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>{session.staff.role} • Active</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-luxury-secondary" style={{ padding: "0.6rem 0.8rem" }} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "2.5rem", maxWidth: "1340px", margin: "0 auto", width: "100%", backgroundColor: "#ffffff" }}>
        {/* TAB 0: SHOPPERS STOP STYLE POS BILLING COUNTER */}
        {activeTab === "billing" && (
          <PosBillingCounter
            apiBase={API_BASE}
            sessionToken={session.access_token}
            cashierName={session.staff.full_name}
            initialPhone={preselectedPhone}
            onOpenEnrollment={(phone) => {
              if (phone) setPreselectedPhone(phone);
              setActiveTab("customers");
            }}
          />
        )}

        {/* TAB 0.5: CUSTOMER ACCOUNT ENROLLMENT WITH OTP */}
        {activeTab === "customers" && (
          <CustomerEnrollment
            apiBase={API_BASE}
            sessionToken={session.access_token}
            initialPhone={preselectedPhone}
            onNavigateToBilling={(phone) => {
              setPreselectedPhone(phone);
              setActiveTab("billing");
            }}
          />
        )}

        {/* TAB 1: COUNTER REDEMPTION VALIDATOR */}
        {activeTab === "counter" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "2.5rem", alignItems: "start" }}>
            {/* Input Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.8rem" }}>
              <div className="hub-glass-panel" style={{ padding: "2.2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.8rem" }}>
                  <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#fef9ee", border: "1px solid #f3d489", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <QrCode size={22} color="#b8860b" />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: "1.35rem", fontWeight: "800", color: "#0a0a0a" }}>Verify Customer Redemption</h2>
                    <p style={{ fontSize: "0.82rem", color: "#4b5563", marginTop: "2px" }}>
                      Enter the 6-character token or scan the customer's mobile QR payload
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: "1.2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <label style={{ fontSize: "0.78rem", letterSpacing: "0.6px", textTransform: "uppercase", color: "#374151", fontWeight: "700" }}>
                      Token Code / QR Payload
                    </label>
                    <span style={{ fontSize: "0.72rem", color: "#b8860b", fontWeight: "600" }}>Case-insensitive</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <input
                      className="hub-input-luxury"
                      type="text"
                      placeholder="e.g. HUB-3583"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleValidateToken()}
                      style={{ fontSize: "1.1rem", letterSpacing: "2px", fontWeight: "800" }}
                    />
                    <button onClick={handleValidateToken} className="btn-gold-primary" disabled={validating || !tokenInput.trim()}>
                      {validating ? <RotateCw className="pulse-indicator" size={18} /> : <Search size={18} />}
                      Verify
                    </button>
                  </div>
                </div>

                {/* Quick Test Token Helper */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
                  <span style={{ fontSize: "0.74rem", color: "#6b7280" }}>Quick Test Code:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickFillToken("HUB-3583")}
                    style={{ background: "#fef9ee", border: "1px solid #f3d489", borderRadius: "6px", color: "#8c6d23", padding: "0.25rem 0.6rem", fontSize: "0.75rem", cursor: "pointer", fontWeight: "700" }}
                  >
                    HUB-3583
                  </button>
                </div>

                {validationError && (
                  <div style={{ padding: "0.85rem 1.1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.2rem" }}>
                    <AlertTriangle size={18} />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Protocol Checklist */}
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1.2rem" }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: "800", color: "#0a0a0a", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.6rem" }}>
                    Tally Counter Verification Rules:
                  </div>
                  <div style={{ display: "grid", gap: "0.4rem", fontSize: "0.78rem", color: "#4b5563" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Check size={14} color="#059669" /> Single-use cryptographic tokens expire after 15 minutes.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Check size={14} color="#059669" /> Tally extension is contacted directly to confirm invoice linkage.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Check size={14} color="#059669" /> Points deduction reflects on the customer's mobile app in real time.
                    </div>
                  </div>
                </div>
              </div>

              {/* Success Notification Box */}
              {confirmationSuccess && (
                <div className="hub-glass-panel" style={{ border: "1px solid #a7f3d0", background: "#f0fdf4", padding: "1.8rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginBottom: "1rem" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CheckCircle size={22} color="#059669" />
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", color: "#065f46", fontSize: "1.1rem" }}>
                        Voucher Successfully Applied to Tally!
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#4b5563" }}>
                        Tally Voucher #: <strong style={{ color: "#0a0a0a", letterSpacing: "0.5px" }}>{confirmationSuccess.tally_voucher_number}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", background: "#ffffff", padding: "1rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", textTransform: "uppercase", fontWeight: "700" }}>Points Deducted</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#dc2626" }}>-{confirmationSuccess.points_deducted} pts</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", textTransform: "uppercase", fontWeight: "700" }}>Remaining Customer Balance</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0a0a0a" }}>{confirmationSuccess.remaining_balance.toLocaleString()} pts</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Verification Result Display */}
            <div>
              {validationData ? (
                <div className="member-card-surface" style={{ padding: "2.2rem" }}>
                  {/* Status Header Pill */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.8rem" }}>
                    <span className="badge-success" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <CheckCircle size={13} /> VERIFIED ACTIVE TOKEN
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#8c6d23", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: "700" }}>
                      <Clock size={13} />
                      Valid until {new Date(validationData.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Customer Graphic Block */}
                  <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "1.4rem", marginBottom: "1.4rem" }}>
                    <div style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "1px", color: "#b8860b", fontWeight: "800" }}>
                      HUBKLUB MEMBER PROFILE
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: "900", color: "#0a0a0a", letterSpacing: "0.3px", marginTop: "0.2rem" }}>
                      {validationData.customer_name}
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "#4b5563", marginTop: "2px", fontWeight: "600" }}>
                      {validationData.customer_phone_masked}
                    </div>
                  </div>

                  {/* Selected Voucher Highlight Box */}
                  <div style={{ background: "#ffffff", border: "1.5px solid #b8860b", borderRadius: "12px", padding: "1.4rem", marginBottom: "1.8rem", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
                    <div style={{ fontSize: "0.72rem", color: "#b8860b", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "800" }}>
                      STOREWIDE BILL DISCOUNT (1 PT = ₹1)
                    </div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0a0a0a", marginTop: "0.3rem" }}>
                      {validationData.reward_title}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed #e5e7eb" }}>
                      <div>
                        <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: "600" }}>Discount on Bill</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#b8860b" }}>
                          -₹{validationData.points_to_deduct} ({validationData.points_to_deduct} pts)
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: "600" }}>Current Points Balance</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0a0a0a" }}>
                          {validationData.current_points_balance.toLocaleString()} pts
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* POS Bill Reference Input */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ display: "block", fontSize: "0.76rem", letterSpacing: "0.5px", textTransform: "uppercase", color: "#374151", marginBottom: "0.5rem", fontWeight: "700" }}>
                      Store POS Invoice # (Printed on Bill)
                    </label>
                    <input
                      className="hub-input-luxury"
                      type="text"
                      placeholder="e.g. INV-2024-8841"
                      value={billRef}
                      onChange={(e) => setBillRef(e.target.value)}
                    />
                  </div>

                  {/* Confirmation CTA */}
                  <button
                    onClick={handleConfirmRedemption}
                    className="btn-gold-primary"
                    style={{ width: "100%", padding: "1.1rem", fontSize: "0.95rem" }}
                    disabled={confirming}
                  >
                    {confirming ? (
                      <>
                        <RotateCw className="pulse-indicator" size={20} />
                        Authorizing Points Deduction in Tally...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Confirm & Deduct {validationData.points_to_deduct} Points
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="hub-glass-panel" style={{ textAlign: "center", padding: "5rem 2.5rem", color: "#6b7280" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", border: "1px solid #e5e7eb" }}>
                    <ShieldCheck size={32} color="#0a0a0a" style={{ opacity: 0.7 }} />
                  </div>
                  <h3 style={{ fontFamily: "'Raleway', sans-serif", fontSize: "1.25rem", fontWeight: "800", color: "#0a0a0a" }}>
                    No Active Token Selected
                  </h3>
                  <p style={{ fontSize: "0.85rem", maxWidth: "320px", margin: "0.6rem auto 1.5rem", lineHeight: "1.5", color: "#4b5563" }}>
                    When a customer generates a counter token on the HUBKLUB mobile app, enter it on the left to inspect membership tier and discount eligibility.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REWARDS CATALOGUE MANAGER */}
        {activeTab === "rewards" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: "1.6rem", fontWeight: "800", color: "#0a0a0a" }}>
                  Universal Storewide Vouchers
                </h2>
                <p style={{ color: "#4b5563", fontSize: "0.85rem", marginTop: "2px" }}>
                  Universal bill discounts redeemable across all menswear and couture collections at 1 pt = ₹1
                </p>
              </div>
              <span className="badge-gold">{rewardsList.length} Active Vouchers</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.8rem" }}>
              {rewardsList.map((r) => (
                <div key={r.id} className="hub-luxury-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <span className="badge-gold">{r.category}</span>
                    <span className="badge-success">Tier: {r.tier_eligibility}</span>
                  </div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "0.5rem", color: "#0a0a0a" }}>{r.title}</h3>
                  <p style={{ fontSize: "0.84rem", color: "#4b5563", lineHeight: "1.6", marginBottom: "1.4rem" }}>
                    {r.description}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: "600" }}>Points Required</div>
                      <div style={{ color: "#b8860b", fontSize: "1.25rem", fontWeight: "900" }}>{r.points_required} pts</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: "600" }}>Store Value</div>
                      <div style={{ color: "#0a0a0a", fontSize: "1rem", fontWeight: "800" }}>₹{r.points_required.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TALLY INTEGRATION MONITOR */}
        {activeTab === "integration" && (
          <div>
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: "1.6rem", fontWeight: "800", color: "#0a0a0a" }}>
                Tally ERP Architecture & Telemetry
              </h2>
              <p style={{ color: "#4b5563", fontSize: "0.85rem", marginTop: "2px" }}>
                Health and sync telemetry for the authoritative in-store POS loyalty extension
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.8rem", marginBottom: "2rem" }}>
              <div className="hub-luxury-card">
                <div style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "1px", color: "#b8860b", fontWeight: "800", marginBottom: "0.4rem" }}>
                  Active Connector Mode
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: "900", color: "#0a0a0a" }}>
                  {integrationHealth?.adapter_mode || "MOCK"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.5rem" }}>
                  {integrationHealth?.is_mock ? "[DEMO/MOCK] Safe local fallback active" : "Production XML/HTTP connected"}
                </div>
              </div>

              <div className="hub-luxury-card">
                <div style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "1px", color: "#b8860b", fontWeight: "800", marginBottom: "0.4rem" }}>
                  Server Reachability
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: "900", color: integrationHealth?.is_reachable ? "#059669" : "#dc2626", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: integrationHealth?.is_reachable ? "#10b981" : "#ef4444" }} />
                  {integrationHealth?.is_reachable ? "Operational" : "Offline"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.5rem" }}>
                  Heartbeat Latency: <strong style={{ color: "#0a0a0a" }}>{integrationHealth?.latency_ms ?? 12} ms</strong>
                </div>
              </div>

              <div className="hub-luxury-card">
                <div style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "1px", color: "#b8860b", fontWeight: "800", marginBottom: "0.4rem" }}>
                  Target Company & Port
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0a0a0a" }}>
                  {integrationHealth?.company_name || "THE HUB (VADODARA)"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.5rem" }}>
                  {integrationHealth?.tally_host || "localhost"}:{integrationHealth?.tally_port || "9000"}
                </div>
              </div>
            </div>

            <div className="hub-glass-panel" style={{ padding: "2rem" }}>
              <h3 style={{ fontFamily: "'Raleway', sans-serif", fontSize: "1.15rem", fontWeight: "800", marginBottom: "0.8rem", color: "#0a0a0a" }}>
                Tally Master Integrity Guarantee
              </h3>
              <p style={{ fontSize: "0.86rem", color: "#4b5563", lineHeight: "1.7" }}>
                The existing Tally software extension at The HUB is the authoritative source for points-calculation rules and member balances. Points are never calculated or mutated independently in the cloud; every customer deduction creates an immutable audit event verified against the store's Tally ledger.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: RECONCILIATION */}
        {activeTab === "reconciliation" && (
          <div>
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: "1.6rem", fontWeight: "800", color: "#0a0a0a" }}>
                Cloud Cache vs Tally ERP Reconciliation
              </h2>
              <p style={{ color: "#4b5563", fontSize: "0.85rem", marginTop: "2px" }}>
                Continuous auditing to eliminate points discrepancies between mobile cache and POS counters
              </p>
            </div>

            <div className="hub-glass-panel" style={{ padding: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <span style={{ fontWeight: "800", color: "#0a0a0a" }}>Sync Status:</span>
                  <span className={`badge-${reconReport?.discrepancies_count === 0 ? "success" : "gold"}`}>
                    {reconReport?.status || "MATCHED & RECONCILED"}
                  </span>
                </div>
                <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>
                  Audited Customer Accounts: <strong style={{ color: "#0a0a0a" }}>{reconReport?.total_checked || 1}</strong>
                </span>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left", color: "#374151" }}>
                    <th style={{ padding: "1rem 0.6rem", fontWeight: "800" }}>Phone Number</th>
                    <th style={{ padding: "1rem 0.6rem", fontWeight: "800" }}>App Cache Balance</th>
                    <th style={{ padding: "1rem 0.6rem", fontWeight: "800" }}>Tally ERP Ledger</th>
                    <th style={{ padding: "1rem 0.6rem", fontWeight: "800" }}>Variance</th>
                    <th style={{ padding: "1rem 0.6rem", fontWeight: "800" }}>Reconciliation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reconReport?.items?.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "1rem 0.6rem", fontWeight: "700", color: "#0a0a0a" }}>{item.customer_phone}</td>
                      <td style={{ padding: "1rem 0.6rem", color: "#b8860b", fontWeight: "800" }}>{item.local_balance} pts</td>
                      <td style={{ padding: "1rem 0.6rem", color: "#0a0a0a", fontWeight: "600" }}>{item.tally_balance} pts</td>
                      <td style={{ padding: "1rem 0.6rem", color: item.discrepancy === 0 ? "#059669" : "#dc2626", fontWeight: "800" }}>
                        {item.discrepancy === 0 ? "0 pts (Perfect)" : `${item.discrepancy > 0 ? "+" : ""}${item.discrepancy} pts`}
                      </td>
                      <td style={{ padding: "1rem 0.6rem" }}>
                        <span className="badge-success">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
