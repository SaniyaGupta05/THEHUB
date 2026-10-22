import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RotateCw,
  Sparkles,
  Search,
  Users,
  Award,
  ArrowRight,
  RefreshCw,
  Check,
  CreditCard,
  Mail,
  Zap,
} from "lucide-react";

interface CustomerProfile {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  is_member: boolean;
  tier: string;
  membership_number: string;
  available_points: number;
  redemption_value_inr: number;
  annual_spend_current_year?: number;
  lifetime_spend?: number;
}

interface CustomerEnrollmentProps {
  apiBase: string;
  sessionToken?: string;
  initialPhone?: string;
  onCustomerCreated?: (customer: CustomerProfile) => void;
  onNavigateToBilling?: (phone: string) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const CustomerEnrollment: React.FC<CustomerEnrollmentProps> = ({
  apiBase,
  sessionToken,
  initialPhone = "",
  onCustomerCreated,
  onNavigateToBilling,
  isModal = false,
  onClose,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"enroll" | "directory">("enroll");

  // Step 1 & 2 Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState("");
  const [welcomeBonus, setWelcomeBonus] = useState(true);

  // OTP Verification State
  const [step, setStep] = useState<"details" | "otp" | "success">("details");
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpExpiry, setOtpExpiry] = useState(300);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successCustomer, setSuccessCustomer] = useState<CustomerProfile | null>(null);

  // Customer Directory State
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialPhone) {
      setPhone(initialPhone);
    }
  }, [initialPhone]);

  useEffect(() => {
    let timer: any = null;
    if (step === "otp" && otpExpiry > 0) {
      timer = setInterval(() => {
        setOtpExpiry((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, otpExpiry]);

  // Load customer directory
  const loadDirectory = async () => {
    setLoadingDirectory(true);
    try {
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const endpoints = [
        `${apiBase}/admin/customers`,
        `/api/v1/admin/customers`,
        ...(isLocal ? [`http://localhost:8000/api/v1/admin/customers`] : []),
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            setCustomersList(data);
            break;
          }
        } catch {}
      }
    } catch {
    } finally {
      setLoadingDirectory(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "directory") {
      loadDirectory();
    }
  }, [activeSubTab]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    const cleanDigits = phone.replace(/\D/g, "");
    if (!name.trim()) {
      setErrorMessage("Please enter customer full name.");
      return;
    }
    if (cleanDigits.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSendingOtp(true);
    try {
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const endpoints = [
        `${apiBase}/staff/customers/send-otp`,
        `/api/v1/staff/customers/send-otp`,
        ...(isLocal ? [`http://localhost:8000/api/v1/staff/customers/send-otp`] : []),
      ];

      let sent = false;
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
            },
            body: JSON.stringify({ name: name.trim(), phone: cleanDigits }),
          });

          if (res.ok) {
            const data = await res.json();
            setGeneratedOtp(data.mock_otp || "123456");
            setOtpExpiry(300);
            setStep("otp");
            sent = true;
            break;
          } else {
            const err = await res.json();
            setErrorMessage(err.detail || "Failed to send OTP.");
            break;
          }
        } catch {}
      }

      if (!sent && !errorMessage) {
        setErrorMessage("Network error connecting to OTP gateway.");
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    if (!otpInput.trim() || otpInput.trim().length < 4) {
      setErrorMessage("Please enter the verification code sent to customer.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const endpoints = [
        `${apiBase}/staff/customers/create-with-otp`,
        `/api/v1/staff/customers/create-with-otp`,
        ...(isLocal ? [`http://localhost:8000/api/v1/staff/customers/create-with-otp`] : []),
      ];

      let verified = false;
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
            },
            body: JSON.stringify({
              name: name.trim(),
              phone: phone.trim(),
              otp: otpInput.trim(),
              email: email.trim() || undefined,
              welcome_bonus: welcomeBonus,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setSuccessCustomer(data.customer);
            setStep("success");
            verified = true;
            if (onCustomerCreated) {
              onCustomerCreated(data.customer);
            }
            break;
          } else {
            const err = await res.json();
            setErrorMessage(err.detail || "Invalid or expired OTP.");
            break;
          }
        } catch {}
      }

      if (!verified && !errorMessage) {
        setErrorMessage("Could not complete verification. Please check backend connection.");
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleReset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setOtpInput("");
    setGeneratedOtp(null);
    setStep("details");
    setSuccessCustomer(null);
    setErrorMessage("");
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const filteredCustomers = customersList.filter((c) => {
    const q = searchQuery.toLowerCase();
    const full = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
    return (
      full.includes(q) ||
      (c.phone || "").includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.membership_number || "").toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: isModal ? "16px" : "12px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      {/* Component Header & Tabs */}
      <div
        style={{
          padding: "1.25rem 2rem",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #d4af37, #b8860b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
            }}
          >
            <UserPlus size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "#111827" }}>
              Customer Account Creation
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
              Instant Store Counter Enrollment with Mobile OTP Verification
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              display: "flex",
              background: "#e5e7eb",
              padding: "0.25rem",
              borderRadius: "9999px",
            }}
          >
            <button
              onClick={() => setActiveSubTab("enroll")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "9999px",
                border: "none",
                background: activeSubTab === "enroll" ? "#ffffff" : "transparent",
                color: activeSubTab === "enroll" ? "#111827" : "#6b7280",
                fontWeight: "700",
                fontSize: "0.78rem",
                cursor: "pointer",
                boxShadow: activeSubTab === "enroll" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <UserPlus size={14} /> New Enrollment
            </button>
            <button
              onClick={() => setActiveSubTab("directory")}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "9999px",
                border: "none",
                background: activeSubTab === "directory" ? "#ffffff" : "transparent",
                color: activeSubTab === "directory" ? "#111827" : "#6b7280",
                fontWeight: "700",
                fontSize: "0.78rem",
                cursor: "pointer",
                boxShadow: activeSubTab === "directory" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Users size={14} /> Customer Directory
            </button>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "0.4rem",
                color: "#6b7280",
                borderRadius: "6px",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          style={{
            margin: "1.25rem 2rem 0 2rem",
            padding: "0.85rem 1.2rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#991b1b",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: ENROLLMENT FLOW */}
      {activeSubTab === "enroll" && (
        <div style={{ padding: "2rem" }}>
          {/* STEP 1: Enter Customer Information */}
          {step === "details" && (
            <form onSubmit={handleSendOtp} style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
                <span
                  style={{
                    background: "#fef3c7",
                    color: "#92400e",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: "800",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Step 1 of 2: Customer Details
                </span>
                <h4 style={{ margin: "0.75rem 0 0.35rem 0", fontSize: "1.3rem", fontWeight: "800", color: "#111827" }}>
                  Register New HUBKLUB Member
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                  Enter customer full name and mobile number. A 6-digit OTP will be generated for instant verification.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: "700",
                      color: "#374151",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Customer Full Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: "14px", top: "14px", color: "#9ca3af" }}>
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      className="hub-input-luxury"
                      placeholder="e.g. Yashvardhan Singhania"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ paddingLeft: "42px" }}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: "700",
                      color: "#374151",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Contact Mobile Number <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: "14px", top: "14px", color: "#9ca3af" }}>
                      <Phone size={18} />
                    </div>
                    <input
                      type="tel"
                      className="hub-input-luxury"
                      placeholder="10-digit mobile (e.g. 98250 12345)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ paddingLeft: "42px" }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: "700",
                      color: "#374151",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Email Address <span style={{ color: "#9ca3af", fontWeight: "400" }}>(Optional)</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: "14px", top: "14px", color: "#9ca3af" }}>
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      className="hub-input-luxury"
                      placeholder="e.g. yash@thehub.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ paddingLeft: "42px" }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    background: "#fdf8ee",
                    border: "1px solid #fde68a",
                    borderRadius: "10px",
                    padding: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <input
                    type="checkbox"
                    id="welcomeBonus"
                    checked={welcomeBonus}
                    onChange={(e) => setWelcomeBonus(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "#d4af37", cursor: "pointer" }}
                  />
                  <label htmlFor="welcomeBonus" style={{ cursor: "pointer", fontSize: "0.85rem", color: "#78350f" }}>
                    <strong>Award 100 Welcome Points (₹100 Value)</strong> upon OTP verification as a sign-up gift.
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-gold-primary"
                  style={{ width: "100%", padding: "1.1rem", fontSize: "0.95rem", marginTop: "0.5rem" }}
                  disabled={sendingOtp}
                >
                  {sendingOtp ? <RotateCw className="pulse-indicator" size={18} /> : <Zap size={18} />}
                  {sendingOtp ? "Sending Verification OTP..." : "Send Verification OTP →"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Enter & Verify OTP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} style={{ maxWidth: "560px", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
                <span
                  style={{
                    background: "#ecfdf5",
                    color: "#065f46",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: "800",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Step 2 of 2: OTP Verification
                </span>
                <h4 style={{ margin: "0.75rem 0 0.35rem 0", fontSize: "1.3rem", fontWeight: "800", color: "#111827" }}>
                  Verify Customer Mobile
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                  Enter the 6-digit verification code sent to <strong>{phone}</strong> for <strong>{name}</strong>.
                </p>
              </div>

              {/* Instant Simulated SMS Banner (For Testing & Cashier Speed) */}
              {generatedOtp && (
                <div
                  style={{
                    background: "linear-gradient(135deg, #111827, #1f2937)",
                    borderRadius: "12px",
                    padding: "1rem 1.25rem",
                    color: "#ffffff",
                    marginBottom: "1.5rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    border: "1px solid #374151",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#d4af37", fontWeight: "700" }}>
                      <Sparkles size={14} /> SMS DISPATCH SIMULATOR
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>Just now</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#e5e7eb", lineHeight: "1.4" }}>
                    "Your The HUB & HUBKLUB verification code is{" "}
                    <strong style={{ color: "#fbbf24", letterSpacing: "2px", fontSize: "1.1rem" }}>{generatedOtp}</strong>. Valid for 5 minutes."
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpInput(generatedOtp)}
                    style={{
                      marginTop: "0.75rem",
                      background: "rgba(212, 175, 55, 0.2)",
                      border: "1px solid #d4af37",
                      color: "#fbbf24",
                      borderRadius: "6px",
                      padding: "0.4rem 0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    ⚡ Auto-Fill Code ({generatedOtp})
                  </button>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: "700",
                      color: "#374151",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "0.5rem",
                      textAlign: "center",
                    }}
                  >
                    Enter 6-Digit OTP
                  </label>
                  <div style={{ position: "relative", maxWidth: "280px", margin: "0 auto" }}>
                    <input
                      type="text"
                      className="hub-input-luxury"
                      placeholder="• • • • • •"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                      style={{
                        textAlign: "center",
                        fontSize: "1.6rem",
                        letterSpacing: "8px",
                        fontWeight: "800",
                        padding: "0.85rem",
                      }}
                      required
                      autoFocus
                    />
                  </div>
                  <div
                    style={{
                      marginTop: "0.6rem",
                      textAlign: "center",
                      fontSize: "0.8rem",
                      color: otpExpiry > 0 ? "#6b7280" : "#dc2626",
                    }}
                  >
                    {otpExpiry > 0 ? (
                      <span>Code expires in <strong>{formatTimer(otpExpiry)}</strong></span>
                    ) : (
                      <span>OTP expired. Please click below to resend.</span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-gold-primary"
                  style={{ width: "100%", padding: "1.1rem", fontSize: "0.95rem" }}
                  disabled={verifyingOtp || !otpInput}
                >
                  {verifyingOtp ? <RotateCw className="pulse-indicator" size={18} /> : <ShieldCheck size={18} />}
                  {verifyingOtp ? "Verifying & Enrolling Customer..." : "Verify OTP & Activate Account"}
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setStep("details")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#6b7280",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    ← Edit Name / Phone
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={sendingOtp}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#b8860b",
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <RefreshCw size={14} /> Resend OTP
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STEP 3: Success Member Card Celebration */}
          {step === "success" && successCustomer && (
            <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "#dcfce7",
                  color: "#15803d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem auto",
                  boxShadow: "0 4px 12px rgba(22, 163, 74, 0.2)",
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.5rem", fontWeight: "900", color: "#111827" }}>
                Customer Account Activated!
              </h3>
              <p style={{ margin: "0 0 1.75rem 0", fontSize: "0.9rem", color: "#4b5563" }}>
                Successfully enrolled in <strong>THE HUB & HUBKLUB</strong> Rewards Program.
              </p>

              {/* Luxury Digital Membership Card Preview */}
              <div
                style={{
                  background: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #09090b 100%)",
                  borderRadius: "16px",
                  padding: "1.75rem",
                  color: "#ffffff",
                  textAlign: "left",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.25)",
                  border: "1px solid #3f3f46",
                  marginBottom: "1.75rem",
                }}
              >
                {/* Gold accent line */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "4px",
                    background: "linear-gradient(90deg, #d4af37, #fef3c7, #b8860b)",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                  <div>
                    <div style={{ fontSize: "0.68rem", letterSpacing: "2px", textTransform: "uppercase", color: "#d4af37", fontWeight: "800" }}>
                      THE HUB • VADODARA
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "900", color: "#ffffff", marginTop: "2px" }}>
                      HUBKLUB MEMBER
                    </div>
                  </div>
                  <span
                    style={{
                      background: "rgba(212, 175, 55, 0.2)",
                      border: "1px solid #d4af37",
                      color: "#fbbf24",
                      padding: "0.25rem 0.65rem",
                      borderRadius: "9999px",
                      fontSize: "0.72rem",
                      fontWeight: "800",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {successCustomer.tier || "Classic"} Tier
                  </span>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#ffffff", letterSpacing: "0.5px" }}>
                    {successCustomer.name}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#9ca3af", marginTop: "2px" }}>
                    {successCustomer.phone} • {successCustomer.email}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    paddingTop: "1rem",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Membership Number
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "#d4af37", letterSpacing: "1px" }}>
                      {successCustomer.membership_number}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.65rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Available Points
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "900", color: "#10b981" }}>
                      {successCustomer.available_points} pts{" "}
                      <span style={{ fontSize: "0.75rem", color: "#e5e7eb", fontWeight: "500" }}>
                        (₹{successCustomer.available_points})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                {onNavigateToBilling && (
                  <button
                    onClick={() => onNavigateToBilling(successCustomer.phone)}
                    className="btn-gold-primary"
                    style={{ padding: "0.9rem 1.6rem", fontSize: "0.9rem" }}
                  >
                    <CreditCard size={18} /> Proceed to POS Billing Counter →
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="btn-luxury-secondary"
                  style={{ padding: "0.9rem 1.4rem", fontSize: "0.9rem" }}
                >
                  <UserPlus size={16} /> Enroll Another Customer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER DIRECTORY (LIVE DATABASE VIEW) */}
      {activeSubTab === "directory" && (
        <div style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div style={{ position: "relative", maxWidth: "360px", width: "100%" }}>
              <div style={{ position: "absolute", left: "12px", top: "11px", color: "#9ca3af" }}>
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Search by name, phone or HK number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hub-input-luxury"
                style={{ paddingLeft: "36px", fontSize: "0.85rem", padding: "0.6rem 0.6rem 0.6rem 36px" }}
              />
            </div>

            <button
              onClick={loadDirectory}
              className="btn-luxury-secondary"
              style={{ padding: "0.5rem 0.9rem", fontSize: "0.8rem" }}
              disabled={loadingDirectory}
            >
              <RefreshCw size={14} className={loadingDirectory ? "pulse-indicator" : ""} /> Refresh Records
            </button>
          </div>

          <div
            style={{
              overflowX: "auto",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "#374151" }}>Customer Name</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "#374151" }}>Phone Number</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "#374151" }}>Membership Number</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "#374151" }}>Tier</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "#374151" }}>Available Points</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "#374151" }}>Annual Spend</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: "700", color: "#374151", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                      {loadingDirectory ? "Loading customers from SQLite database..." : "No customers found matching search."}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.85rem 1rem", fontWeight: "700", color: "#111827" }}>
                        {c.first_name} {c.last_name}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "#4b5563" }}>{c.phone}</td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span style={{ fontFamily: "monospace", color: "#b8860b", fontWeight: "700" }}>
                          {c.membership_number || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            background:
                              c.tier === "Platinum"
                                ? "#f3e8ff"
                                : c.tier === "Gold"
                                ? "#fef3c7"
                                : "#f3f4f6",
                            color:
                              c.tier === "Platinum"
                                ? "#6b21a8"
                                : c.tier === "Gold"
                                ? "#92400e"
                                : "#374151",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                          }}
                        >
                          {c.tier || "Classic"}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontWeight: "700", color: "#10b981" }}>
                        {c.available_points || 0} pts (₹{c.available_points || 0})
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "#374151" }}>
                        ₹{(c.annual_spend_current_year || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        {onNavigateToBilling && (
                          <button
                            onClick={() => onNavigateToBilling(c.phone)}
                            className="btn-gold-primary"
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", borderRadius: "6px" }}
                          >
                            Bill at POS →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
