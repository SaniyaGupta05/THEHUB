import React, { useState } from "react";
import {
  Receipt,
  User,
  CreditCard,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Coins,
  ArrowRight,
  Search,
  RotateCw,
  Plus,
  X,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { CustomerEnrollment } from "./CustomerEnrollment";

interface CustomerLookup {
  customer_id: string;
  name: string;
  phone: string;
  email: string;
  is_member: boolean;
  tier: string;
  membership_number: string;
  available_points: number;
  redemption_value_inr: number;
  expiring_soon_points: number;
  annual_spend: number;
  bonus_achieved: boolean;
  is_eligible: boolean;
  eligibility_message: string;
}

interface CompletedReceipt {
  invoice_number: string;
  tally_voucher_no: string;
  store_name: string;
  store_address: string;
  timestamp: string;
  customer_name: string;
  customer_phone: string;
  customer_tier: string;
  gross_amount: number;
  loyalty_discount_inr: number;
  points_redeemed: number;
  net_payable: number;
  payment_method: string;
  points_earned_this_bill: number;
  new_points_balance: number;
  new_balance_rupee_val: number;
  cashier: string;
  status: string;
}

interface PosBillingCounterProps {
  apiBase: string;
  sessionToken?: string;
  cashierName?: string;
  initialPhone?: string;
  onOpenEnrollment?: (phone?: string) => void;
}

export const PosBillingCounter: React.FC<PosBillingCounterProps> = ({
  apiBase,
  sessionToken,
  cashierName = "Spentha Counter 01",
  initialPhone,
  onOpenEnrollment,
}) => {
  // Step 1: Customer
  const [phoneInput, setPhoneInput] = useState(initialPhone || "");
  const [lookingUp, setLookingUp] = useState(false);
  const [customer, setCustomer] = useState<CustomerLookup | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);

  // Step 2: Bill Amount
  const [invoiceNo] = useState(() => `HUB-${Math.floor(100000 + Math.random() * 900000)}`);
  const [billAmount, setBillAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("UPI / Card");

  // Step 3: Redeem Points
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Sale Processing
  const [processing, setProcessing] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<CompletedReceipt | null>(null);

  // Auto lookup when initialPhone is provided
  React.useEffect(() => {
    if (initialPhone) {
      setPhoneInput(initialPhone);
      handleLookup(initialPhone);
    }
  }, [initialPhone]);

  const handleLookup = async (phoneToSearch: string) => {
    const clean = phoneToSearch.trim();
    if (!clean) return;
    setLookingUp(true);
    setLookupError("");

    try {
      const endpoints = [
        `${apiBase}/staff/billing/lookup`,
        `/api/v1/staff/billing/lookup`,
        `http://localhost:8000/api/v1/staff/billing/lookup`,
      ];

      let resData = null;
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
            },
            body: JSON.stringify({ phone_or_id: clean }),
          });
          if (res.ok) {
            resData = await res.json();
            break;
          }
        } catch {
          // try next
        }
      }

      if (resData) {
        setCustomer(resData);
        // Default points to 0 on new customer lookup
        setPointsToRedeem(0);
      } else {
        setLookupError("Customer not found in database. Treated as Walk-in Customer.");
        setCustomer({
          customer_id: "cust_walkin",
          name: "Walk-in Customer",
          phone: clean,
          email: "",
          is_member: false,
          tier: "Non-Member",
          membership_number: "NOT-ENROLLED",
          available_points: 0,
          redemption_value_inr: 0,
          expiring_soon_points: 0,
          annual_spend: 0,
          bonus_achieved: false,
          is_eligible: true,
          eligibility_message: "Eligible for HUBKLUB membership",
        });
      }
    } catch {
      setLookupError("Error connecting to database");
    } finally {
      setLookingUp(false);
    }
  };

  // Calculations
  const grossNum = Math.max(0, parseFloat(billAmount) || 0);
  const maxPts = customer?.is_member ? Math.min(customer.available_points, grossNum) : 0;
  const actualRedeemPts = Math.min(pointsToRedeem, maxPts);
  const netPayable = Math.max(0, grossNum - actualRedeemPts);

  // Points to earn
  const rate = netPayable >= 50000 ? 0.06 : netPayable >= 20000 ? 0.05 : 0.03;
  const pointsToEarn = Math.round(netPayable * rate);

  const handleProcessSale = async () => {
    if (grossNum <= 0) {
      alert("Please enter a valid bill amount");
      return;
    }
    setProcessing(true);

    try {
      const endpoints = [
        `${apiBase}/staff/billing/process-invoice`,
        `/api/v1/staff/billing/process-invoice`,
        `http://localhost:8000/api/v1/staff/billing/process-invoice`,
      ];

      let result = null;
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
            },
            body: JSON.stringify({
              customer_id: customer?.customer_id || "cust_guest",
              gross_amount: grossNum,
              points_to_redeem: actualRedeemPts,
              payment_method: paymentMethod,
            }),
          });
          if (res.ok) {
            result = await res.json();
            break;
          }
        } catch {
          // try next
        }
      }

      if (!result) {
        // Fallback local receipt
        result = {
          invoice_number: invoiceNo,
          tally_voucher_no: `TALLY-POS-${Math.floor(10000 + Math.random() * 90000)}`,
          store_name: "The HUB — Spentha Complex",
          store_address: "RC Dutt Road, Alkapuri, Vadodara - 390007",
          timestamp: new Date().toLocaleString("en-IN"),
          customer_name: customer?.name || "Walk-in Customer",
          customer_phone: customer?.phone || phoneInput,
          customer_tier: customer?.tier || "Gold",
          gross_amount: grossNum,
          loyalty_discount_inr: actualRedeemPts,
          points_redeemed: actualRedeemPts,
          net_payable: netPayable,
          payment_method: paymentMethod,
          points_earned_this_bill: pointsToEarn,
          new_points_balance: Math.max(0, (customer?.available_points || 0) - actualRedeemPts + pointsToEarn),
          new_balance_rupee_val: Math.max(0, (customer?.available_points || 0) - actualRedeemPts + pointsToEarn),
          cashier: cashierName,
          status: "completed",
        };
      }

      setCompletedReceipt(result);
    } catch (e: any) {
      alert("Billing error: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleStartNewBill = () => {
    setCompletedReceipt(null);
    setBillAmount("5000");
    setPointsToRedeem(0);
    if (customer?.phone) {
      handleLookup(customer.phone);
    }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Super Simple POS Card */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            background: "#0a0a0a",
            color: "#ffffff",
            padding: "1.2rem 1.8rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <Receipt size={22} color="#d4af37" />
            <div>
              <div style={{ fontSize: "1.05rem", fontWeight: "800", letterSpacing: "0.5px" }}>
                POS Billing Counter
              </div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                The HUB • Vadodara (Spentha Counter)
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "1.8rem", display: "flex", flexDirection: "column", gap: "1.8rem" }}>
          {/* STEP 1: CUSTOMER LOOKUP */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#374151" }}>
                Step 1 • Customer Mobile Number or Name
              </label>
              <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>Search by phone, name, or ID</span>
            </div>

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup(phoneInput)}
                  placeholder="Enter mobile (e.g. 98250 12345) or name (e.g. Dev, Aarav)"
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    fontSize: "1.05rem",
                    fontWeight: "700",
                    border: "1.5px solid #d1d5db",
                    borderRadius: "8px",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleLookup(phoneInput)}
                disabled={lookingUp}
                style={{
                  background: "#0a0a0a",
                  color: "#d4af37",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0 1.4rem",
                  fontWeight: "800",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                }}
              >
                {lookingUp ? <RotateCw className="pulse-indicator" size={16} /> : <Search size={16} />}
                Search
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenEnrollment) {
                    onOpenEnrollment(phoneInput);
                  } else {
                    setShowEnrollmentModal(true);
                  }
                }}
                style={{
                  background: "linear-gradient(135deg, #d4af37, #b8860b)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0 1.2rem",
                  fontWeight: "800",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.82rem",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 6px rgba(184, 134, 11, 0.25)",
                }}
                title="Create a new customer account with OTP verification"
              >
                <UserPlus size={16} /> + New Customer (OTP)
              </button>
            </div>

            {/* Customer Status Strip */}
            {customer && (
              <div
                style={{
                  marginTop: "0.8rem",
                  padding: "0.85rem 1rem",
                  background: customer.is_member ? "#fefce8" : "#f3f4f6",
                  border: `1px solid ${customer.is_member ? "#fef08a" : "#e5e7eb"}`,
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "800", color: "#111827", fontSize: "0.95rem" }}>
                    {customer.name}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
                    {customer.phone} • {customer.is_member ? `${customer.tier} Member` : "Walk-in Customer"}
                  </div>
                </div>

                {customer.is_member ? (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.7rem", color: "#854d0e", fontWeight: "700", textTransform: "uppercase" }}>
                      Available Points
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#b45309" }}>
                      ⭐ {customer.available_points.toLocaleString("en-IN")} pts
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#059669", fontWeight: "700" }}>
                      Worth ₹{customer.redemption_value_inr.toLocaleString("en-IN")} discount
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenEnrollment) {
                          onOpenEnrollment(customer.phone || phoneInput);
                        } else {
                          setShowEnrollmentModal(true);
                        }
                      }}
                      style={{
                        background: "#fef3c7",
                        color: "#92400e",
                        border: "1px solid #f59e0b",
                        borderRadius: "6px",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.72rem",
                        fontWeight: "800",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <UserPlus size={13} /> Enroll with OTP (+100 pts)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: BILL AMOUNT */}
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#374151", marginBottom: "0.5rem" }}>
              Step 2 • Enter Gross Bill Amount (₹)
            </label>

            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "11px", fontSize: "1.4rem", fontWeight: "900", color: "#d97706" }}>
                ₹
              </span>
              <input
                type="number"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="0"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem 0.75rem 2.8rem",
                  fontSize: "1.5rem",
                  fontWeight: "900",
                  color: "#111827",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  outline: "none",
                }}
              />
            </div>

            {/* Quick Bill Amount Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
              {[1500, 3500, 5000, 10000, 25000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBillAmount(amt.toString())}
                  style={{
                    flex: 1,
                    background: billAmount === amt.toString() ? "#111827" : "#f9fafb",
                    color: billAmount === amt.toString() ? "#ffffff" : "#374151",
                    border: "1px solid #d1d5db",
                    padding: "0.4rem 0.2rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  ₹{amt.toLocaleString("en-IN")}
                </button>
              ))}
            </div>

            {/* Payment Method */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
              {["UPI / Card", "Cash", "Card (Swipe)"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: `1.5px solid ${paymentMethod === m ? "#d97706" : "#e5e7eb"}`,
                    background: paymentMethod === m ? "#fffbeb" : "#ffffff",
                    color: paymentMethod === m ? "#92400e" : "#4b5563",
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 3: REDEEM POINTS */}
          <div
            style={{
              padding: "1.2rem",
              background: "#fafaf9",
              borderRadius: "10px",
              border: "1px solid #e7e5e4",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Coins size={18} color="#d97706" />
                <span style={{ fontSize: "0.82rem", fontWeight: "800", textTransform: "uppercase", color: "#1c1917" }}>
                  Step 3 • Redeem HUBKLUB Points
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#78716c", fontWeight: "600" }}>
                1 pt = ₹1 discount
              </span>
            </div>

            {customer?.is_member && maxPts > 0 ? (
              <div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                  <button
                    type="button"
                    onClick={() => setPointsToRedeem(0)}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      border: `1px solid ${pointsToRedeem === 0 ? "#1c1917" : "#d6d3d1"}`,
                      background: pointsToRedeem === 0 ? "#1c1917" : "#ffffff",
                      color: pointsToRedeem === 0 ? "#ffffff" : "#44403c",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    No Points (₹0)
                  </button>

                  {[500, 1000, 2000].filter((p) => p <= maxPts).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPointsToRedeem(p)}
                      style={{
                        padding: "0.4rem 0.8rem",
                        borderRadius: "6px",
                        border: `1px solid ${pointsToRedeem === p ? "#d97706" : "#fef08a"}`,
                        background: pointsToRedeem === p ? "#d97706" : "#fefce8",
                        color: pointsToRedeem === p ? "#ffffff" : "#854d0e",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Redeem ₹{p} ({p} pts)
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPointsToRedeem(maxPts)}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      border: `1px solid ${pointsToRedeem === maxPts ? "#b45309" : "#fed7aa"}`,
                      background: pointsToRedeem === maxPts ? "#b45309" : "#fff7ed",
                      color: pointsToRedeem === maxPts ? "#ffffff" : "#9a3412",
                      fontSize: "0.75rem",
                      fontWeight: "800",
                      cursor: "pointer",
                    }}
                  >
                    Redeem Max (₹{maxPts})
                  </button>
                </div>

                {actualRedeemPts > 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#059669", fontWeight: "700" }}>
                    ✓ Applying ₹{actualRedeemPts} instant discount against {actualRedeemPts} points
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "0.78rem", color: "#78716c" }}>
                {customer?.is_member ? "No available points to redeem on this bill." : "Customer is not enrolled in HUBKLUB loyalty."}
              </div>
            )}
          </div>

          {/* NET PAYABLE SUMMARY & BIG COMPLETE BUTTON */}
          <div
            style={{
              background: "#111827",
              borderRadius: "12px",
              padding: "1.5rem",
              color: "#ffffff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#9ca3af" }}>
              <span>Gross Bill Amount:</span>
              <span style={{ color: "#ffffff", fontWeight: "700" }}>₹{grossNum.toLocaleString("en-IN")}</span>
            </div>

            {actualRedeemPts > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#34d399" }}>
                <span>Points Discount ({actualRedeemPts} pts):</span>
                <span style={{ fontWeight: "800" }}>-₹{actualRedeemPts.toLocaleString("en-IN")}</span>
              </div>
            )}

            <div
              style={{
                borderTop: "1px solid #374151",
                paddingTop: "0.8rem",
                marginTop: "0.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <div>
                <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "#9ca3af", fontWeight: "700" }}>
                  Net Amount Payable
                </div>
                <div style={{ fontSize: "0.72rem", color: "#d1d5db" }}>via {paymentMethod}</div>
              </div>
              <div style={{ fontSize: "2rem", fontWeight: "900", color: "#fbbf24" }}>
                ₹{netPayable.toLocaleString("en-IN")}
              </div>
            </div>

            {/* Customer Points Earn Banner */}
            <div
              style={{
                marginTop: "1rem",
                padding: "0.6rem 0.8rem",
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.75rem",
              }}
            >
              <span style={{ color: "#d1d5db" }}>Customer earns on this bill:</span>
              <span style={{ color: "#fbbf24", fontWeight: "800" }}>+{pointsToEarn} HUBKLUB Points</span>
            </div>

            {/* Process Button */}
            <button
              type="button"
              onClick={handleProcessSale}
              disabled={processing || grossNum <= 0}
              style={{
                width: "100%",
                marginTop: "1.2rem",
                background: "linear-gradient(135deg, #d4af37 0%, #b8860b 100%)",
                color: "#0a0a0a",
                border: "none",
                borderRadius: "8px",
                padding: "1rem",
                fontSize: "1.05rem",
                fontWeight: "900",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                boxShadow: "0 4px 12px rgba(212, 175, 55, 0.35)",
              }}
            >
              {processing ? (
                <>
                  <RotateCw className="pulse-indicator" size={20} />
                  Processing Sale...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Complete Sale & Print Bill
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CLEAN PRINTABLE RETAIL RECEIPT MODAL */}
      {completedReceipt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              maxWidth: "420px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              padding: "2rem",
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {/* Store Receipt Header */}
            <div style={{ textAlign: "center", borderBottom: "1px dashed #0a0a0a", paddingBottom: "1rem", marginBottom: "1rem" }}>
              <img
                src="/the_hub_logo.png"
                alt="THE HUB"
                style={{ maxHeight: "38px", margin: "0 auto 0.5rem", display: "block" }}
              />
              <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#0a0a0a" }}>
                THE HUB • VADODARA
              </div>
              <div style={{ fontSize: "0.75rem", color: "#4b5563" }}>
                Spentha Complex, Alkapuri, Vadodara
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                GSTIN: 24AABCT1234F1Z8 • POS #01
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "3px" }}>
                {completedReceipt.timestamp}
              </div>
            </div>

            {/* Bill Details */}
            <div style={{ fontSize: "0.75rem", borderBottom: "1px dashed #0a0a0a", paddingBottom: "0.8rem", marginBottom: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Bill No: <strong>{completedReceipt.invoice_number}</strong></span>
                <span>Ref: <strong>{completedReceipt.tally_voucher_no}</strong></span>
              </div>
              <div>Customer: <strong>{completedReceipt.customer_name}</strong></div>
              <div>Mobile: {completedReceipt.customer_phone} ({completedReceipt.customer_tier})</div>
            </div>

            {/* Price Ledger */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.82rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Gross Purchase:</span>
                <span>₹{completedReceipt.gross_amount.toLocaleString("en-IN")}</span>
              </div>

              {completedReceipt.points_redeemed > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontWeight: "700" }}>
                  <span>Points Redeemed ({completedReceipt.points_redeemed} pts):</span>
                  <span>-₹{completedReceipt.loyalty_discount_inr.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #0a0a0a", paddingTop: "0.5rem", fontSize: "1.05rem", fontWeight: "900" }}>
                <span>NET PAID:</span>
                <span>₹{completedReceipt.net_payable.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280", textAlign: "right" }}>
                Tender: {completedReceipt.payment_method}
              </div>
            </div>

            {/* Loyalty Statement */}
            <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: "6px", padding: "0.7rem", marginBottom: "1.2rem", fontSize: "0.75rem" }}>
              <div style={{ fontWeight: "800", color: "#854d0e", marginBottom: "0.3rem" }}>
                ★ HUBKLUB LOYALTY STATEMENT ★
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Points Earned Today:</span>
                <strong style={{ color: "#059669" }}>+{completedReceipt.points_earned_this_bill} pts</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dotted #fef08a", paddingTop: "0.3rem", marginTop: "0.3rem" }}>
                <span>Total Available Balance:</span>
                <strong style={{ color: "#b45309" }}>{completedReceipt.new_points_balance.toLocaleString("en-IN")} pts (₹{completedReceipt.new_balance_rupee_val})</strong>
              </div>
            </div>

            {/* Print & Next Action Buttons */}
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: "#ffffff",
                  border: "1.5px solid #111827",
                  borderRadius: "6px",
                  fontWeight: "800",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  fontSize: "0.85rem",
                }}
              >
                <Printer size={16} /> Print
              </button>

              <button
                type="button"
                onClick={handleStartNewBill}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: "#111827",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "800",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  fontSize: "0.85rem",
                }}
              >
                Next Bill <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Customer Enrollment with OTP Modal */}
      {showEnrollmentModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1.5rem",
          }}
        >
          <div style={{ maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <CustomerEnrollment
              apiBase={apiBase}
              sessionToken={sessionToken}
              initialPhone={phoneInput}
              isModal={true}
              onClose={() => setShowEnrollmentModal(false)}
              onCustomerCreated={(newCust) => {
                setShowEnrollmentModal(false);
                setPhoneInput(newCust.phone);
                handleLookup(newCust.phone);
              }}
              onNavigateToBilling={(phone) => {
                setShowEnrollmentModal(false);
                setPhoneInput(phone);
                handleLookup(phone);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
