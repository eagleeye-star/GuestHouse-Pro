import { useState, useEffect, useCallback } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const STORAGE_KEY  = "ghpro_v1";
const LICENSE_KEY  = "ghpro_v1_license";
const TRIAL_DAYS   = 30;
const VALID_KEYS   = ["GHPRO-2024-HOTEL-0001", "GHPRO-AIFARMS-VIP-002", "GHPRO-DEMO-TRIAL-000"];

function daysLeft(expiry)  { if (!expiry) return 0; return Math.max(0, Math.ceil((new Date(expiry) - new Date()) / 86400000)); }
function isExpired(expiry) { if (!expiry) return true; return new Date(expiry) < new Date(); }
function loadLicense()     { try { const r = localStorage.getItem(LICENSE_KEY); if (r) return JSON.parse(r); } catch {} return null; }
function saveLicense(lic)  { try { localStorage.setItem(LICENSE_KEY, JSON.stringify(lic)); } catch {} }
const CURRENCY = "GH₵";

const COLORS = {
  bg: "#0f1117", surface: "#181c27", card: "#1e2235", card2: "#232840",
  border: "#2c3350", gold: "#c9a84c", gold2: "#e8c96a", accent: "#4f7ef7",
  green: "#2dd4a0", red: "#f05a5a", orange: "#f59e42", purple: "#a78bfa",
  text: "#e8eaf6", muted: "#7f8bb5",
};

const ROOM_TYPES = ["Single", "Double", "Twin", "Suite", "Deluxe", "Family"];
const PAY_METHODS = ["Cash", "Mobile Money", "Card", "Bank Transfer"];
const ID_TYPES = ["Ghana Card", "Passport", "Driver's Licence", "Voter ID", "Other"];
const EXPENSE_CATS = ["Utilities", "Maintenance", "Supplies", "Salaries", "Food & Beverages", "Marketing", "Other"];
const STAFF_ROLES = ["Receptionist", "Housekeeper", "Security", "Cook", "Manager", "Maintenance", "Other"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const nightsBetween = (ci, co) => Math.max(1, Math.round((new Date(co) - new Date(ci)) / 86400000));

function loadDB() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
}
function saveDB(db) { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }

function buildSeedDB() {
  const rooms = ROOM_TYPES.flatMap((type, ti) =>
    [0, 1].map((j) => ({
      id: uid(), number: String(101 + ti * 2 + j), type, floor: Math.ceil((ti + 1) / 3),
      price: [150, 200, 180, 450, 320, 280][ti], status: ti === 0 && j === 0 ? "occupied" : ti === 1 && j === 0 ? "reserved" : "available",
      amenities: "WiFi, AC, TV", notes: "",
    }))
  );
  const guests = [
    { id: uid(), name: "Kwame Asante", phone: "0244111222", email: "kwame@example.com", nationality: "Ghanaian", idType: "Ghana Card", idNum: "GHA-123456789-0" },
    { id: uid(), name: "Abena Mensah", phone: "0554332211", email: "abena@example.com", nationality: "Ghanaian", idType: "Passport", idNum: "G9876543" },
  ];
  const t = today();
  const co1 = new Date(); co1.setDate(co1.getDate() + 2); const co1s = co1.toISOString().slice(0, 10);
  const bookings = [
    { id: "BK001", guestName: guests[0].name, guestPhone: guests[0].phone, idType: "Ghana Card", idNum: "GHA-123456789-0", roomId: rooms[0].id, roomNum: rooms[0].number, roomType: rooms[0].type, numGuests: 2, checkin: t, checkout: co1s, totalAmount: rooms[0].price * 2, advance: rooms[0].price * 2, balance: 0, payType: "Cash", notes: "", status: "checked-in", created: new Date().toISOString() },
  ];
  const payments = [
    { id: uid(), guest: guests[0].name, room: rooms[0].number, amount: rooms[0].price * 2, method: "Cash", desc: "Full payment – BK001", date: t },
  ];
  const expenses = EXPENSE_CATS.slice(0, 5).map((cat, i) => {
    const d = new Date(); d.setDate(d.getDate() - i * 3);
    return { id: uid(), desc: `${cat} cost`, amount: [400, 250, 180, 2900, 350][i], cat, date: d.toISOString().slice(0, 10) };
  });
  const hkTasks = [
    { id: uid(), room: rooms[0].number, priority: "high", task: "Change linen after checkout", staff: "Kofi Atta", due: t, done: false },
    { id: uid(), room: rooms[2].number, priority: "medium", task: "Routine clean", staff: "Ama Boateng", due: t, done: true },
  ];
  const staff = [
    { id: uid(), name: "Akua Mensah", role: "Receptionist", phone: "0241234567", salary: 1200, start: "2023-01-15", status: "active" },
    { id: uid(), name: "Kofi Atta", role: "Housekeeper", phone: "0551234567", salary: 800, start: "2023-03-01", status: "active" },
    { id: uid(), name: "Ama Boateng", role: "Security", phone: "0271234567", salary: 900, start: "2024-01-10", status: "active" },
  ];
  return {
    settings: { hotelName: "My Guest House", address: "Eikwe, Western Region, Ghana", phone: "0597147460", email: "aifarms101@gmail.com", staffPin: "1234", adminPin: "9999" },
    license: null, rooms, guests, bookings, payments, expenses, hkTasks, staff,
  };
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  app: { display: "flex", height: "100vh", overflow: "hidden", background: COLORS.bg, fontFamily: "'Inter', sans-serif", color: COLORS.text },
  sidebar: { width: 220, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", flexShrink: 0 },
  sideTop: { padding: "20px 16px 14px", borderBottom: `1px solid ${COLORS.border}` },
  brand: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: COLORS.gold, fontWeight: 700, letterSpacing: 1 },
  tagline: { fontSize: 10, color: COLORS.muted, letterSpacing: 3, textTransform: "uppercase", marginTop: 2 },
  hotelChip: { marginTop: 10, background: COLORS.card, borderRadius: 6, padding: "5px 9px", fontSize: 11, color: COLORS.text, fontWeight: 500 },
  nav: { flex: 1, padding: "12px 10px", overflowY: "auto" },
  navSection: { fontSize: 9, color: COLORS.muted, letterSpacing: 2, textTransform: "uppercase", padding: "10px 8px 4px", fontWeight: 600 },
  navItem: (active) => ({ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7, cursor: "pointer", color: active ? "#000" : COLORS.muted, background: active ? COLORS.gold : "transparent", fontSize: 13, fontWeight: 500, marginBottom: 2, transition: "all .15s", userSelect: "none" }),
  sideFooter: { padding: "12px 10px", borderTop: `1px solid ${COLORS.border}` },
  licBadge: { background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "7px 11px", fontSize: 11, color: COLORS.muted, display: "flex", alignItems: "center", gap: 7 },
  licDot: (ok) => ({ width: 7, height: 7, borderRadius: "50%", background: ok ? COLORS.green : COLORS.orange, flexShrink: 0 }),
  main: { flex: 1, overflowY: "auto", background: COLORS.bg },
  page: { padding: "26px 30px" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  pageTitle: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, color: COLORS.text },
  pageTitleAccent: { color: COLORS.gold },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 },
  statCard: { background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "18px 20px" },
  statLabel: { fontSize: 10, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  statValue: (color) => ({ fontSize: 26, fontWeight: 700, color: color || COLORS.text }),
  statSub: { fontSize: 11, color: COLORS.muted, marginTop: 3 },
  card: { background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20, marginBottom: 18 },
  cardTitle: { fontSize: 13, fontWeight: 600, marginBottom: 14, color: COLORS.text, display: "flex", alignItems: "center", gap: 7 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  // table
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", color: COLORS.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, padding: "8px 12px", borderBottom: `1px solid ${COLORS.border}`, fontWeight: 600 },
  td: { padding: "11px 12px", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.text, verticalAlign: "middle" },
  // buttons
  btn: (variant, size) => {
    const base = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 7, fontWeight: 600, cursor: "pointer", border: "none", transition: "all .15s", fontSize: size === "sm" ? 11 : 13, padding: size === "sm" ? "5px 11px" : "9px 17px", fontFamily: "'Inter', sans-serif" };
    const variants = { gold: { background: COLORS.gold, color: "#000" }, outline: { background: "transparent", color: COLORS.text, border: `1px solid ${COLORS.border}` }, red: { background: COLORS.red, color: "#fff" }, green: { background: COLORS.green, color: "#000" }, ghost: { background: COLORS.card2, color: COLORS.text, border: `1px solid ${COLORS.border}` } };
    return { ...base, ...variants[variant] };
  },
  // forms
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 },
  formGroup: (full) => ({ display: "flex", flexDirection: "column", gap: 5, gridColumn: full ? "1 / -1" : undefined }),
  label: { fontSize: 11, color: COLORS.muted, fontWeight: 500 },
  input: { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "9px 11px", color: COLORS.text, fontSize: 13, outline: "none", fontFamily: "'Inter', sans-serif", width: "100%" },
  // modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: `1px solid ${COLORS.border}` },
  modalTitle: { fontSize: 15, fontWeight: 600 },
  modalBody: { padding: 22 },
  modalFooter: { padding: "14px 22px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 9 },
  // misc
  badge: (color) => {
    const map = { green: [COLORS.green, "rgba(45,212,160,.15)"], red: [COLORS.red, "rgba(240,90,90,.15)"], orange: [COLORS.orange, "rgba(245,158,66,.15)"], blue: [COLORS.accent, "rgba(79,126,247,.15)"], gold: [COLORS.gold, "rgba(201,168,76,.15)"], purple: [COLORS.purple, "rgba(167,139,250,.15)"] };
    const [c, bg] = map[color] || [COLORS.muted, COLORS.card2];
    return { display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: c, background: bg };
  },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 },
  searchBar: { display: "flex", gap: 9, marginBottom: 15, flexWrap: "wrap" },
  divider: { height: 1, background: COLORS.border, margin: "14px 0" },
  empty: { textAlign: "center", color: COLORS.muted, fontSize: 13, padding: "40px 20px" },
  tabs: { display: "flex", gap: 4, background: COLORS.card, borderRadius: 9, padding: 4, marginBottom: 18, width: "fit-content" },
  tab: (active) => ({ padding: "7px 18px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", color: active ? "#000" : COLORS.muted, background: active ? COLORS.gold : "transparent", border: "none", fontFamily: "'Inter', sans-serif", transition: "all .15s" }),
  roomCard: (status) => {
    const map = { available: [COLORS.green, "rgba(45,212,160,.07)"], occupied: [COLORS.red, "rgba(240,90,90,.07)"], reserved: [COLORS.orange, "rgba(245,158,66,.07)"], maintenance: [COLORS.purple, "rgba(167,139,250,.07)"] };
    const [border, bg] = map[status] || [COLORS.border, COLORS.card2];
    return { background: bg, border: `1.5px solid ${border}`, borderRadius: 10, padding: 16, cursor: "pointer", transition: "transform .15s" };
  },
  statusColor: { available: "green", occupied: "red", reserved: "orange", maintenance: "purple", confirmed: "blue", "checked-in": "green", "checked-out": "gold", cancelled: "red" },
};

// ─── SMALL UI COMPONENTS ─────────────────────────────────────────────────────
function Btn({ variant = "outline", size, onClick, children, style }) {
  const [hover, setHover] = useState(false);
  const base = S.btn(variant, size);
  const hoverMap = { gold: { background: COLORS.gold2 }, outline: { borderColor: COLORS.gold, color: COLORS.gold }, red: { opacity: .85 }, green: { opacity: .85 }, ghost: {} };
  return <button style={{ ...base, ...(hover ? hoverMap[variant] : {}), ...style }} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>{children}</button>;
}

function Badge({ color, children }) { return <span style={S.badge(color)}>{children}</span>; }

function Input({ value, onChange, placeholder, type = "text", style }) {
  return <input style={{ ...S.input, ...style }} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}

function Select({ value, onChange, options, style }) {
  return (
    <select style={{ ...S.input, ...style }} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={S.modalBody}>{children}</div>
        {footer && <div style={S.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

function InfoRow({ label, children }) {
  return <div style={S.infoRow}><span style={{ color: COLORS.muted }}>{label}</span><span>{children}</span></div>;
}

function Toast({ msg, err }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: COLORS.card, border: `1px solid ${err ? COLORS.red : COLORS.green}`, color: err ? COLORS.red : COLORS.green, padding: "11px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}>
      {msg}
    </div>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={S.statCard}>
      <div style={S.statLabel}>{label}</div>
      <div style={S.statValue(color)}>{value}</div>
      {sub && <div style={S.statSub}>{sub}</div>}
    </div>
  );
}

// ─── LOCK SCREEN ─────────────────────────────────────────────────────────────
function LockScreen({ onUnlock, staffPin, adminPin }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const attempt = () => {
    if (pin === staffPin || pin === adminPin) onUnlock(pin === adminPin);
    else { setErr("Incorrect PIN. Try again."); setPin(""); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "linear-gradient(135deg,#0a0d14 0%,#141828 50%,#0e1220 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 36, color: COLORS.gold, letterSpacing: 2, marginBottom: 4 }}>GuestHouse Pro</div>
      <div style={{ color: COLORS.muted, fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: 36 }}>Hotel Management System</div>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "32px 36px", width: 340 }}>
        <div style={{ fontSize: 14, fontWeight: 600, textAlign: "center", color: COLORS.text, marginBottom: 18 }}>Staff Login</div>
        <input style={{ ...S.input, marginBottom: 12, letterSpacing: 5, textAlign: "center", fontSize: 18 }} type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter PIN" maxLength={6} onKeyDown={e => e.key === "Enter" && attempt()} autoFocus />
        <Btn variant="gold" style={{ width: "100%", justifyContent: "center", padding: "12px 0" }} onClick={attempt}>Login →</Btn>
        {err && <div style={{ color: COLORS.red, fontSize: 12, textAlign: "center", marginTop: 10 }}>{err}</div>}
        <div style={{ color: COLORS.muted, fontSize: 11, textAlign: "center", marginTop: 14 }}>Default PIN: 1234 &nbsp;|&nbsp; Admin PIN: 9999</div>
      </div>
    </div>
  );
}

// ─── LICENCE GATE (hard) ─────────────────────────────────────────────────────
function LicenseScreen({ onActivate }) {
  const [mode, setMode] = useState("trial");
  const [key, setKey]   = useState("");
  const [err, setErr]   = useState("");

  const startTrial = () => {
    const expiry = new Date(); expiry.setDate(expiry.getDate() + TRIAL_DAYS);
    const lic = { type: "trial", key: null, expiry: expiry.toISOString(), issued: new Date().toISOString() };
    saveLicense(lic); onActivate(lic);
  };

  const activateKey = () => {
    const k = key.toUpperCase().trim();
    if (!k) { setErr("Enter a licence key."); return; }
    const validFormat = /^GHPRO-[A-Z0-9]{1,8}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k) || VALID_KEYS.includes(k);
    if (!validFormat) { setErr("Invalid key. Format: GHPRO-PLAN-XXXX-XXXX"); return; }
    const planSeg = k.split("-")[1] || "";
    let days = 365;
    if (planSeg === "TRIAL") days = TRIAL_DAYS;
    else if (planSeg === "1M")  days = 30;
    else if (planSeg === "6M")  days = 182;
    else if (planSeg === "12M") days = 365;
    else if (/^\d+Y$/.test(planSeg)) days = Math.round(parseInt(planSeg) * 365);
    const expiry = new Date(); expiry.setDate(expiry.getDate() + days);
    const lic = { type: "licensed", key: k, expiry: expiry.toISOString(), issued: new Date().toISOString() };
    saveLicense(lic); onActivate(lic);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0f1e 0%,#1a2340 50%,#0f1628 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.gold}55`, borderRadius: 18, padding: "36px 32px", width: "min(94vw,440px)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>🏨</div>
          <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 24, fontWeight: 700, color: COLORS.gold, marginBottom: 4 }}>GuestHouse Pro</div>
          <div style={{ color: COLORS.muted, fontSize: 13 }}>Hotel & Guesthouse Management</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["trial", "activate"].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `2px solid ${mode === m ? COLORS.gold : COLORS.border}`, background: mode === m ? `${COLORS.gold}18` : "transparent", color: mode === m ? COLORS.gold : COLORS.muted, cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all .15s" }}>
              {m === "trial" ? "Free Trial" : "Activate Licence"}
            </button>
          ))}
        </div>

        {mode === "trial" && (
          <div>
            <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7, margin: "0 0 14px" }}>
              Start a <strong style={{ color: COLORS.gold }}>{TRIAL_DAYS}-day free trial</strong>. Full access to all features — rooms, bookings, billing, reports, and backup. No payment required to start.
            </p>
            <div style={{ background: "#c9a84c18", border: `1px solid ${COLORS.gold}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: COLORS.gold, lineHeight: 1.6 }}>
              ⚠ Purchase a licence before trial ends to retain full access to your data.
            </div>
            <button onClick={startTrial} style={{ width: "100%", padding: "13px 0", background: `linear-gradient(135deg,${COLORS.gold},#b8922a)`, color: "#000", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Start {TRIAL_DAYS}-Day Free Trial
            </button>
          </div>
        )}

        {mode === "activate" && (
          <div>
            <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 10px" }}>Enter your licence key to activate GuestHouse Pro.</p>
            <input value={key} onChange={e => { setKey(e.target.value.toUpperCase()); setErr(""); }} onKeyDown={e => e.key === "Enter" && activateKey()}
              placeholder="GHPRO-PLAN-XXXX-XXXX"
              style={{ width: "100%", padding: "11px 12px", background: COLORS.bg, border: `1.5px solid ${err ? COLORS.red : COLORS.border}`, borderRadius: 8, fontSize: 14, color: COLORS.text, textAlign: "center", boxSizing: "border-box", letterSpacing: 2, marginBottom: 8, fontFamily: "monospace", outline: "none" }} />
            {err && <div style={{ color: COLORS.red, fontSize: 12, marginBottom: 8 }}>{err}</div>}
            <button onClick={activateKey} style={{ width: "100%", padding: "13px 0", background: `linear-gradient(135deg,${COLORS.gold},#b8922a)`, color: "#000", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Activate
            </button>
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 14, textAlign: "center", lineHeight: 1.7 }}>
              To purchase a licence, contact:<br />
              <strong style={{ color: COLORS.accent }}>0597147460</strong> · <strong style={{ color: COLORS.accent }}>aifarms101@gmail.com</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


// ── INSTITUTION HELPERS (Update 5) ───────────────────────────────────────────
function loadInstitution(key) {
  try { return JSON.parse(localStorage.getItem(key + "_inst")) || { name: "", address: "" }; } catch { return { name: "", address: "" }; }
}
function saveInstitution(key, inst) {
  try { localStorage.setItem(key + "_inst", JSON.stringify(inst)); } catch {}
}


// ── LICENCE EXPIRY BANNER (Update 8) ─────────────────────────────────────────
function ExpiryBanner({ expiry, phone }) {
  if (!expiry || expiry === "—") return null;
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days > 30) return null;
  const bg  = days <= 7 ? "#dc2626" : "#d97706";
  const msg = days <= 0
    ? `Licence has expired — contact ${phone||"0597147460"} to renew`
    : days <= 7
      ? `⚠ Licence expires in ${days} day${days!==1?"s":""} — renew immediately`
      : `Licence expires in ${days} day${days!==1?"s":""} — contact ${phone||"0597147460"} to renew`;
  return (
    <div style={{ background: bg, color: "#fff", textAlign: "center", padding: "7px 16px", fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
      {msg}
    </div>
  );
}


// ── RESET MODAL (Update 1) ───────────────────────────────────────────────────
function ResetModal({ onConfirm, onCancel, adminPin, accent, cardBg }) {
  const [pin,  setPin]  = useState("");
  const [err,  setErr]  = useState("");
  const [step, setStep] = useState(1);
  const check = () => { if (pin !== String(adminPin)) { setErr("Incorrect PIN."); return; } setStep(2); };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:20 }}>
      <div style={{ background: cardBg||"#1f2330", border:"1px solid #ef444455", borderRadius:14, padding:28, width:"min(94vw,400px)" }}>
        {step === 1 ? (<>
          <div style={{ fontSize:18, fontWeight:800, color:"#ef4444", marginBottom:8 }}>🔐 Admin PIN Required</div>
          <p style={{ fontSize:13, color:"#94a3b8", marginBottom:16 }}>Enter your admin PIN to access the reset function.</p>
          <input type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={e=>{setPin(e.target.value.replace(/\D/g,""));setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&check()} placeholder="••••" autoFocus
            style={{ width:"100%", padding:12, background:"rgba(255,255,255,0.06)", border:`1.5px solid ${err?"#ef4444":"rgba(255,255,255,0.15)"}`, borderRadius:8, color:"#fff", fontSize:20, textAlign:"center", letterSpacing:6, outline:"none", boxSizing:"border-box", marginBottom:8, fontFamily:"inherit" }} />
          {err && <div style={{ color:"#fca5a5", fontSize:12, marginBottom:8 }}>{err}</div>}
          <div style={{ display:"flex", gap:10, marginTop:8 }}>
            <button onClick={onCancel} style={{ flex:1, padding:"10px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#94a3b8", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={check}    style={{ flex:1, padding:"10px 0", background:accent||"#2E86AB", color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Verify PIN</button>
          </div>
        </>) : (<>
          <div style={{ fontSize:18, fontWeight:800, color:"#ef4444", marginBottom:8 }}>⚠️ Confirm Full Reset</div>
          <p style={{ fontSize:13, color:"#94a3b8", marginBottom:6, lineHeight:1.7 }}>This will <strong style={{ color:"#ef4444" }}>permanently delete ALL data</strong> in this app — records, settings, everything.</p>
          <p style={{ fontSize:13, color:"#ef4444", fontWeight:700, marginBottom:20 }}>This cannot be undone.</p>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onCancel}  style={{ flex:1, padding:"10px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#94a3b8", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex:1, padding:"10px 0", background:"#dc2626", color:"#fff", border:"none", borderRadius:8, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>Delete All Data</button>
          </div>
        </>)}
      </div>
    </div>
  );
}


// ── FIRST-TIME SETUP WIZARD (Update 4) ───────────────────────────────────────
function SetupWizard({ onComplete, instLabel, accentColor, bgGrad }) {
  const [step,     setStep]     = useState(1);
  const [instName, setInstName] = useState("");
  const [instAddr, setInstAddr] = useState("");
  const [username, setUsername] = useState("");
  const [pin,      setPin]      = useState("");
  const [pin2,     setPin2]     = useState("");
  const [err,      setErr]      = useState("");

  const nextStep = () => {
    if (!instName.trim()) { setErr((instLabel||"Institution") + " name is required."); return; }
    setErr(""); setStep(2);
  };
  const finish = () => {
    if (!username.trim())  { setErr("Admin username is required."); return; }
    if (pin.length < 4)    { setErr("PIN must be at least 4 digits."); return; }
    if (pin !== pin2)      { setErr("PINs do not match."); return; }
    onComplete({ instName: instName.trim(), instAddr: instAddr.trim(), username: username.trim(), pin });
  };

  const inp = { width:"100%", padding:"11px 13px", background:"rgba(255,255,255,0.08)", border:"1.5px solid rgba(255,255,255,0.2)", borderRadius:8, color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <div style={{ minHeight:"100vh", background: bgGrad||"#0a1628", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:18, padding:"36px 32px", width:"min(94vw,460px)", boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>⚙️</div>
          <div style={{ fontSize:22, fontWeight:900, color: accentColor||"#c9a84c", marginBottom:4 }}>First-Time Setup</div>
          <div style={{ color:"rgba(255,255,255,0.55)", fontSize:13 }}>Step {step} of 2 — {step===1?"Institution Details":"Admin Account"}</div>
        </div>
        <div style={{ display:"flex", gap:6, marginBottom:24 }}>
          {[1,2].map(s=>(
            <div key={s} style={{ flex:1, height:4, borderRadius:2, background: s<=step ? (accentColor||"#c9a84c") : "rgba(255,255,255,0.15)" }} />
          ))}
        </div>
        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:5 }}>{instLabel||"Institution"} Name *</label>
              <input value={instName} onChange={e=>{setInstName(e.target.value);setErr("");}} placeholder={`e.g. My ${instLabel||"Business"}`} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:5 }}>Address</label>
              <input value={instAddr} onChange={e=>setInstAddr(e.target.value)} placeholder="e.g. Kumasi, Ashanti Region" style={inp} />
            </div>
            {err && <div style={{ color:"#fca5a5", fontSize:12 }}>{err}</div>}
            <button onClick={nextStep} style={{ width:"100%", padding:"13px 0", background: accentColor||"#c9a84c", color:"#000", border:"none", borderRadius:10, fontWeight:800, fontSize:15, cursor:"pointer", fontFamily:"inherit", marginTop:4 }}>Next →</button>
          </div>
        )}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:5 }}>Admin Username *</label>
              <input value={username} onChange={e=>{setUsername(e.target.value);setErr("");}} placeholder="e.g. admin" style={inp} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:5 }}>Admin PIN * (4–6 digits)</label>
              <input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,""));setErr("");}} placeholder="••••" style={{...inp, letterSpacing:4, textAlign:"center"}} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:5 }}>Confirm PIN *</label>
              <input type="password" inputMode="numeric" maxLength={6} value={pin2} onChange={e=>{setPin2(e.target.value.replace(/\D/g,""));setErr("");}} placeholder="••••" style={{...inp, letterSpacing:4, textAlign:"center"}} />
            </div>
            {err && <div style={{ color:"#fca5a5", fontSize:12 }}>{err}</div>}
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button onClick={()=>{setStep(1);setErr("");}} style={{ flex:1, padding:"12px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, color:"rgba(255,255,255,0.7)", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
              <button onClick={finish} style={{ flex:2, padding:"12px 0", background: accentColor||"#c9a84c", color:"#000", border:"none", borderRadius:8, fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Complete Setup ✓</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LicenseExpiredScreen({ license, onRenew }) {
  const wasTrialExpiry = license?.type === "trial";
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#1a0505 0%,#3b0f0f 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.red}55`, borderRadius: 18, padding: "36px 32px", width: "min(94vw,420px)", textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>⏰</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.red, marginBottom: 8 }}>
          {wasTrialExpiry ? "Trial Expired" : "Licence Expired"}
        </div>
        <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7, marginBottom: 8 }}>
          Your {wasTrialExpiry ? "free trial" : "licence"} expired on <strong style={{ color: COLORS.text }}>{new Date(license.expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</strong>.
        </p>
        <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7, marginBottom: 24 }}>
          Your data is safely stored. Activate a licence key to regain full access.
        </p>
        <button onClick={onRenew} style={{ width: "100%", padding: "13px 0", background: `linear-gradient(135deg,${COLORS.gold},#b8922a)`, color: "#000", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 12 }}>
          🔑 Activate Licence
        </button>
        <p style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.7 }}>
          Contact: <strong style={{ color: COLORS.accent }}>0597147460</strong> · <strong style={{ color: COLORS.accent }}>aifarms101@gmail.com</strong>
        </p>
      </div>
    </div>
  );
}

// ─── PRINT RECEIPT ────────────────────────────────────────────────────────────
function printReceipt(html) {
  const win = window.open("", "_blank", "width=400,height=600");
  win.document.write(`<html><head><title>Receipt</title><style>body{font-family:'Courier New',monospace;max-width:320px;margin:0 auto;padding:20px;color:#000;}.logo{text-align:center;font-size:1rem;font-weight:bold;border-bottom:2px dashed #333;padding-bottom:10px;margin-bottom:10px;}.hotel{text-align:center;font-size:.75rem;margin-bottom:14px;}.row{display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:5px;}.dashed{border-top:1px dashed #333;margin:10px 0;}.total{display:flex;justify-content:space-between;font-size:1rem;font-weight:bold;margin-top:6px;}.footer{text-align:center;font-size:.72rem;margin-top:14px;border-top:2px dashed #333;padding-top:10px;color:#555;}</style></head><body>${html}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
  win.document.close();
}

// ─── PAGES ───────────────────────────────────────────────────────────────────

// DASHBOARD
function Dashboard({ db }) {
  const cur = CURRENCY;
  const t = today();
  const occ = db.rooms.filter(r => r.status === "occupied").length;
  const avail = db.rooms.filter(r => r.status === "available").length;
  const occPct = db.rooms.length ? Math.round(occ / db.rooms.length * 100) : 0;
  const todayRev = db.payments.filter(p => p.date === t).reduce((s, p) => s + p.amount, 0);
  const monthKey = t.slice(0, 7);
  const monthRev = db.payments.filter(p => p.date?.startsWith(monthKey)).reduce((s, p) => s + p.amount, 0);
  const pendingBal = db.bookings.filter(b => b.balance > 0 && b.status !== "cancelled").reduce((s, b) => s + b.balance, 0);
  const todayCI = db.bookings.filter(b => b.checkin === t && b.status === "confirmed").length;
  const todayCO = db.bookings.filter(b => b.checkout === t && b.status === "checked-in").length;
  const recentTx = [...db.payments].sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 6);

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div style={S.pageTitle}>Dashboard</div>
        <div style={{ color: COLORS.muted, fontSize: 12 }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>
      <div style={S.statsGrid}>
        <StatCard label="Total Rooms" value={db.rooms.length} sub={`${avail} available`} />
        <StatCard label="Occupancy" value={`${occPct}%`} color={COLORS.green} sub={`${occ} occupied`} />
        <StatCard label="Today's Revenue" value={`${cur}${todayRev.toFixed(2)}`} color={COLORS.gold} sub="Collected today" />
        <StatCard label="Month Revenue" value={`${cur}${monthRev.toFixed(2)}`} color={COLORS.gold} sub="This month" />
      </div>
      <div style={S.twoCol}>
        <div style={S.card}>
          <div style={S.cardTitle}>🛏 Room Status</div>
          {[["available", "green"], ["occupied", "red"], ["reserved", "orange"], ["maintenance", "purple"]].map(([st, c]) => (
            <InfoRow key={st} label={st.charAt(0).toUpperCase() + st.slice(1)}>
              <span style={{ color: COLORS[c], fontWeight: 700 }}>{db.rooms.filter(r => r.status === st).length} rooms</span>
            </InfoRow>
          ))}
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>📋 Today's Activity</div>
          <InfoRow label="Expected Check-ins"><span style={{ color: COLORS.green, fontWeight: 700 }}>{todayCI}</span></InfoRow>
          <InfoRow label="Expected Check-outs"><span style={{ color: COLORS.red, fontWeight: 700 }}>{todayCO}</span></InfoRow>
          <InfoRow label="Pending Balances"><span style={{ color: COLORS.orange, fontWeight: 700 }}>{cur}{pendingBal.toFixed(2)}</span></InfoRow>
          <InfoRow label="HK Tasks Pending"><span style={{ fontWeight: 700 }}>{db.hkTasks.filter(t => !t.done).length}</span></InfoRow>
          <InfoRow label="Active Staff"><span style={{ fontWeight: 700 }}>{db.staff.filter(s => s.status === "active").length}</span></InfoRow>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>💳 Recent Transactions</div>
        {recentTx.length ? (
          <table style={S.table}>
            <thead><tr><th style={S.th}>Guest</th><th style={S.th}>Room</th><th style={S.th}>Amount</th><th style={S.th}>Method</th><th style={S.th}>Date</th></tr></thead>
            <tbody>{recentTx.map(p => (
              <tr key={p.id}>
                <td style={S.td}>{p.guest}</td>
                <td style={{ ...S.td, color: COLORS.muted }}>{p.room || "—"}</td>
                <td style={{ ...S.td, color: COLORS.gold, fontWeight: 700 }}>{cur}{p.amount.toFixed(2)}</td>
                <td style={S.td}>{p.method}</td>
                <td style={{ ...S.td, color: COLORS.muted }}>{fmtDate(p.date)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <div style={S.empty}>No transactions yet.</div>}
      </div>
    </div>
  );
}

// ROOMS
function Rooms({ db, setDb, toast }) {
  const [filter, setFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState({ number: "", type: "Single", floor: "1", price: "", status: "available", amenities: "WiFi, AC, TV", notes: "" });
  const f = v => setForm(p => ({ ...p, ...v }));

  const rooms = filter ? db.rooms.filter(r => r.status === filter) : db.rooms;

  const openAdd = () => { setEditing(null); setForm({ number: "", type: "Single", floor: "1", price: "", status: "available", amenities: "WiFi, AC, TV", notes: "" }); setShowModal(true); };
  const openEdit = (r) => { setEditing(r.id); setForm({ number: r.number, type: r.type, floor: r.floor, price: r.price, status: r.status, amenities: r.amenities, notes: r.notes }); setViewing(null); setShowModal(true); };

  const save = () => {
    if (!form.number) { toast("Room number required.", true); return; }
    const data = { ...form, price: parseFloat(form.price) || 0, floor: form.floor };
    setDb(db => {
      const rooms = editing ? db.rooms.map(r => r.id === editing ? { ...r, ...data } : r) : [...db.rooms, { id: uid(), ...data }];
      return { ...db, rooms };
    });
    setShowModal(false); toast(editing ? "Room updated!" : "Room added!");
  };

  const updateStatus = (id, status) => {
    setDb(db => ({ ...db, rooms: db.rooms.map(r => r.id === id ? { ...r, status } : r) }));
    setViewing(null); toast("Room status updated.");
  };

  const del = (id) => {
    if (!confirm("Delete this room?")) return;
    setDb(db => ({ ...db, rooms: db.rooms.filter(r => r.id !== id) }));
    setViewing(null); toast("Room deleted.");
  };

  const vr = viewing ? db.rooms.find(r => r.id === viewing) : null;
  const vb = vr ? db.bookings.find(b => b.roomId === vr.id && ["checked-in", "confirmed"].includes(b.status)) : null;

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div style={S.pageTitle}>Rooms <span style={S.pageTitleAccent}>Management</span></div>
        <div style={{ display: "flex", gap: 9 }}>
          <Select value={filter} onChange={setFilter} options={[{ value: "", label: "All Rooms" }, { value: "available", label: "Available" }, { value: "occupied", label: "Occupied" }, { value: "reserved", label: "Reserved" }, { value: "maintenance", label: "Maintenance" }]} style={{ fontSize: 12 }} />
          <Btn variant="gold" size="sm" onClick={openAdd}>+ Add Room</Btn>
        </div>
      </div>
      {rooms.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 13 }}>
          {rooms.map(r => (
            <div key={r.id} style={S.roomCard(r.status)} onClick={() => setViewing(r.id)}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Rm {r.number}</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{r.type} · Floor {r.floor}</div>
              <div style={{ marginTop: 8 }}><Badge color={S.statusColor[r.status] || "blue"}>{r.status}</Badge></div>
              <div style={{ fontSize: 12, color: COLORS.gold, marginTop: 7, fontWeight: 600 }}>{CURRENCY}{r.price}/night</div>
              {r.amenities && <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 7 }}>{r.amenities}</div>}
            </div>
          ))}
        </div>
      ) : <div style={S.empty}>🛏<br />No rooms match. Add your first room.</div>}

      {/* Room detail modal */}
      {vr && (
        <Modal open title={`Room ${vr.number}`} onClose={() => setViewing(null)} footer={
          <>
            <Btn variant="red" size="sm" onClick={() => del(vr.id)}>Delete</Btn>
            <Btn variant="outline" size="sm" onClick={() => openEdit(vr)}>Edit</Btn>
            <Select value={vr.status} onChange={s => updateStatus(vr.id, s)} options={["available", "occupied", "reserved", "maintenance"]} style={{ fontSize: 12 }} />
          </>
        }>
          <InfoRow label="Type">{vr.type}</InfoRow>
          <InfoRow label="Floor">{vr.floor}</InfoRow>
          <InfoRow label="Status"><Badge color={S.statusColor[vr.status]}>{vr.status}</Badge></InfoRow>
          <InfoRow label="Price / Night"><span style={{ color: COLORS.gold, fontWeight: 700 }}>{CURRENCY}{vr.price}</span></InfoRow>
          <InfoRow label="Amenities">{vr.amenities || "—"}</InfoRow>
          {vb && <>
            <div style={{ ...S.divider }} />
            <div style={{ color: COLORS.muted, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Current Booking</div>
            <InfoRow label="Guest"><strong>{vb.guestName}</strong></InfoRow>
            <InfoRow label="Check-out">{fmtDate(vb.checkout)}</InfoRow>
            <InfoRow label="Balance"><span style={{ color: COLORS.red, fontWeight: 700 }}>{CURRENCY}{vb.balance.toFixed(2)}</span></InfoRow>
          </>}
        </Modal>
      )}

      {/* Add/Edit Room Modal */}
      <Modal open={showModal} title={editing ? "Edit Room" : "Add Room"} onClose={() => setShowModal(false)}
        footer={<><Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn><Btn variant="gold" onClick={save}>Save Room</Btn></>}>
        <div style={S.formGrid}>
          <div style={S.formGroup()}><label style={S.label}>Room Number</label><Input value={form.number} onChange={v => f({ number: v })} placeholder="e.g. 101" /></div>
          <div style={S.formGroup()}><label style={S.label}>Type</label><Select value={form.type} onChange={v => f({ type: v })} options={ROOM_TYPES} /></div>
          <div style={S.formGroup()}><label style={S.label}>Floor</label><Input value={form.floor} onChange={v => f({ floor: v })} placeholder="1" /></div>
          <div style={S.formGroup()}><label style={S.label}>Price / Night ({CURRENCY})</label><Input value={form.price} onChange={v => f({ price: v })} type="number" placeholder="0.00" /></div>
          <div style={S.formGroup(true)}><label style={S.label}>Status</label><Select value={form.status} onChange={v => f({ status: v })} options={["available", "maintenance"]} /></div>
          <div style={S.formGroup(true)}><label style={S.label}>Amenities</label><Input value={form.amenities} onChange={v => f({ amenities: v })} placeholder="WiFi, AC, TV, Hot Water..." /></div>
          <div style={S.formGroup(true)}><label style={S.label}>Notes</label><textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={e => f({ notes: e.target.value })} /></div>
        </div>
      </Modal>
    </div>
  );
}

// BOOKINGS
function Bookings({ db, setDb, toast, onViewBooking }) {
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ guestName: "", guestPhone: "", idType: "Ghana Card", idNum: "", roomId: "", numGuests: 1, checkin: today(), checkout: "", payType: "Cash", advance: "", notes: "" });
  const f = v => setForm(p => ({ ...p, ...v }));

  useEffect(() => {
    const co = new Date(); co.setDate(co.getDate() + 1);
    setForm(p => ({ ...p, checkout: co.toISOString().slice(0, 10), roomId: db.rooms.find(r => r.status === "available")?.id || "" }));
  }, [showModal]);

  const availRooms = db.rooms.filter(r => r.status === "available" || r.status === "reserved");
  const selRoom = db.rooms.find(r => r.id === form.roomId);
  const nights = form.checkin && form.checkout ? nightsBetween(form.checkin, form.checkout) : 0;
  const total = selRoom ? selRoom.price * nights : 0;
  const advance = parseFloat(form.advance) || 0;
  const balance = Math.max(0, total - advance);

  let bks = [...db.bookings].sort((a, b) => b.created?.localeCompare(a.created));
  if (search) bks = bks.filter(b => b.guestName.toLowerCase().includes(search.toLowerCase()) || b.roomNum.includes(search) || b.id.toLowerCase().includes(search.toLowerCase()));
  if (statusF) bks = bks.filter(b => b.status === statusF);

  const saveBooking = () => {
    if (!form.guestName.trim()) { toast("Guest name required.", true); return; }
    if (!form.roomId) { toast("Select a room.", true); return; }
    const room = db.rooms.find(r => r.id === form.roomId);
    const bkNum = db.bookings.length + 1;
    const id = "BK" + String(bkNum).padStart(3, "0");
    const bk = { id, guestName: form.guestName.trim(), guestPhone: form.guestPhone, idType: form.idType, idNum: form.idNum, roomId: form.roomId, roomNum: room.number, roomType: room.type, numGuests: parseInt(form.numGuests) || 1, checkin: form.checkin, checkout: form.checkout, totalAmount: total, advance, balance, payType: form.payType, notes: form.notes, status: "confirmed", created: new Date().toISOString() };
    setDb(db => {
      const rooms = db.rooms.map(r => r.id === form.roomId ? { ...r, status: "reserved" } : r);
      const payments = advance > 0 ? [...db.payments, { id: uid(), guest: form.guestName, room: room.number, amount: advance, method: form.payType, desc: "Advance – " + id, date: today() }] : db.payments;
      return { ...db, bookings: [...db.bookings, bk], rooms, payments };
    });
    setShowModal(false); toast("Booking confirmed! 🎉");
  };

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div style={S.pageTitle}>Bookings</div>
        <Btn variant="gold" size="sm" onClick={() => setShowModal(true)}>+ New Booking</Btn>
      </div>
      <div style={S.searchBar}>
        <Input value={search} onChange={setSearch} placeholder="Search by guest, room, ID..." style={{ flex: 1 }} />
        <Select value={statusF} onChange={setStatusF} options={[{ value: "", label: "All Status" }, { value: "confirmed", label: "Confirmed" }, { value: "checked-in", label: "Checked In" }, { value: "checked-out", label: "Checked Out" }, { value: "cancelled", label: "Cancelled" }]} style={{ fontSize: 12 }} />
      </div>
      <div style={{ ...S.card, padding: 0 }}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>ID</th><th style={S.th}>Guest</th><th style={S.th}>Room</th><th style={S.th}>Check-in</th><th style={S.th}>Check-out</th><th style={S.th}>Total</th><th style={S.th}>Balance</th><th style={S.th}>Status</th><th style={S.th}></th></tr></thead>
          <tbody>
            {bks.length ? bks.map(b => (
              <tr key={b.id} style={{ cursor: "pointer" }} onClick={() => onViewBooking(b.id)}>
                <td style={{ ...S.td, color: COLORS.muted, fontFamily: "monospace", fontSize: 11 }}>{b.id}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{b.guestName}</td>
                <td style={S.td}>{b.roomNum} ({b.roomType})</td>
                <td style={{ ...S.td, color: COLORS.muted }}>{fmtDate(b.checkin)}</td>
                <td style={{ ...S.td, color: COLORS.muted }}>{fmtDate(b.checkout)}</td>
                <td style={{ ...S.td, color: COLORS.gold, fontWeight: 700 }}>{CURRENCY}{b.totalAmount.toFixed(2)}</td>
                <td style={{ ...S.td, color: b.balance > 0 ? COLORS.red : COLORS.green, fontWeight: 700 }}>{CURRENCY}{b.balance.toFixed(2)}</td>
                <td style={S.td}><Badge color={S.statusColor[b.status] || "blue"}>{b.status}</Badge></td>
                <td style={S.td}><Btn variant="outline" size="sm" onClick={e => { e.stopPropagation(); onViewBooking(b.id); }}>View</Btn></td>
              </tr>
            )) : <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: COLORS.muted }}>No bookings found</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} title="New Booking" onClose={() => setShowModal(false)}
        footer={<><Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn><Btn variant="gold" onClick={saveBooking}>Confirm Booking</Btn></>}>
        <div style={S.formGrid}>
          <div style={S.formGroup()}><label style={S.label}>Guest Name</label><Input value={form.guestName} onChange={v => f({ guestName: v })} placeholder="Full name" /></div>
          <div style={S.formGroup()}><label style={S.label}>Phone</label><Input value={form.guestPhone} onChange={v => f({ guestPhone: v })} placeholder="0xx xxx xxxx" /></div>
          <div style={S.formGroup()}><label style={S.label}>ID Type</label><Select value={form.idType} onChange={v => f({ idType: v })} options={ID_TYPES} /></div>
          <div style={S.formGroup()}><label style={S.label}>ID Number</label><Input value={form.idNum} onChange={v => f({ idNum: v })} /></div>
          <div style={S.formGroup()}><label style={S.label}>Room</label>
            <Select value={form.roomId} onChange={v => f({ roomId: v })} options={availRooms.map(r => ({ value: r.id, label: `${r.number} – ${r.type} (${CURRENCY}${r.price}/night)` }))} />
          </div>
          <div style={S.formGroup()}><label style={S.label}>No. of Guests</label><Input value={form.numGuests} onChange={v => f({ numGuests: v })} type="number" /></div>
          <div style={S.formGroup()}><label style={S.label}>Check-In</label><Input value={form.checkin} onChange={v => f({ checkin: v })} type="date" /></div>
          <div style={S.formGroup()}><label style={S.label}>Check-Out</label><Input value={form.checkout} onChange={v => f({ checkout: v })} type="date" /></div>
          <div style={S.formGroup()}><label style={S.label}>Payment Method</label><Select value={form.payType} onChange={v => f({ payType: v })} options={PAY_METHODS} /></div>
          <div style={S.formGroup()}><label style={S.label}>Advance Payment ({CURRENCY})</label><Input value={form.advance} onChange={v => f({ advance: v })} type="number" placeholder="0.00" /></div>
          <div style={S.formGroup(true)}><label style={S.label}>Special Requests</label><textarea style={{ ...S.input, minHeight: 56, resize: "vertical" }} value={form.notes} onChange={e => f({ notes: e.target.value })} /></div>
        </div>
        {selRoom && (
          <div style={{ ...S.card, background: COLORS.bg, marginTop: 14, marginBottom: 0 }}>
            <InfoRow label="Room Rate"><span style={{ color: COLORS.gold, fontWeight: 700 }}>{CURRENCY}{selRoom.price}/night</span></InfoRow>
            <InfoRow label="Nights"><strong>{nights}</strong></InfoRow>
            <InfoRow label="Total"><span style={{ color: COLORS.gold, fontWeight: 700 }}>{CURRENCY}{total.toFixed(2)}</span></InfoRow>
            <InfoRow label="Balance Due"><span style={{ color: COLORS.red, fontWeight: 700 }}>{CURRENCY}{balance.toFixed(2)}</span></InfoRow>
          </div>
        )}
      </Modal>
    </div>
  );
}

// BOOKING VIEWER (used from multiple pages)
function BookingViewer({ db, setDb, bookingId, onClose, toast }) {
  const b = db.bookings.find(x => x.id === bookingId);
  if (!b) return null;
  const cur = CURRENCY;

  const checkIn = () => {
    setDb(db => ({ ...db, bookings: db.bookings.map(bk => bk.id === bookingId ? { ...bk, status: "checked-in" } : bk), rooms: db.rooms.map(r => r.id === b.roomId ? { ...r, status: "occupied" } : r) }));
    toast(`${b.guestName} checked in to Room ${b.roomNum}.`); onClose();
  };
  const checkOut = () => {
    if (b.balance > 0 && !confirm(`Balance of ${cur}${b.balance.toFixed(2)} is unpaid. Check out anyway?`)) return;
    setDb(db => ({
      ...db,
      bookings: db.bookings.map(bk => bk.id === bookingId ? { ...bk, status: "checked-out" } : bk),
      rooms: db.rooms.map(r => r.id === b.roomId ? { ...r, status: "available" } : r),
      hkTasks: [...db.hkTasks, { id: uid(), room: b.roomNum, priority: "high", task: "Clean room after checkout", staff: "", due: today(), done: false }]
    }));
    toast(`${b.guestName} checked out of Room ${b.roomNum}.`); onClose();
  };
  const cancel = () => {
    if (!confirm("Cancel this booking?")) return;
    setDb(db => ({ ...db, bookings: db.bookings.map(bk => bk.id === bookingId ? { ...bk, status: "cancelled" } : bk), rooms: db.rooms.map(r => r.id === b.roomId && r.status === "reserved" ? { ...r, status: "available" } : r) }));
    toast("Booking cancelled."); onClose();
  };
  const collectBalance = () => {
    const input = prompt(`Collect balance.\nAmount due: ${cur}${b.balance.toFixed(2)}\nEnter amount:`);
    if (!input) return;
    const amt = parseFloat(input);
    if (!amt || amt <= 0) { toast("Invalid amount.", true); return; }
    setDb(db => ({ ...db, bookings: db.bookings.map(bk => bk.id === bookingId ? { ...bk, advance: bk.advance + amt, balance: Math.max(0, bk.balance - amt) } : bk), payments: [...db.payments, { id: uid(), guest: b.guestName, room: b.roomNum, amount: amt, method: "Cash", desc: "Balance – " + b.id, date: today() }] }));
    toast("Payment recorded!");
  };
  const doPrint = () => {
    const s = db.settings;
    const room = db.rooms.find(r => r.id === b.roomId);
    const nights = nightsBetween(b.checkin, b.checkout);
    printReceipt(`
      <div class="logo">${s.hotelName}</div>
      <div class="hotel">${s.address}<br/>${s.phone}</div>
      <div class="dashed"></div>
      <div class="row"><span>INVOICE / RECEIPT</span><span>${b.id}</span></div>
      <div class="row"><span>Date:</span><span>${today()}</span></div>
      <div class="dashed"></div>
      <div class="row"><span>Guest:</span><span>${b.guestName}</span></div>
      <div class="row"><span>Phone:</span><span>${b.guestPhone || "—"}</span></div>
      <div class="row"><span>ID:</span><span>${b.idType}: ${b.idNum || "—"}</span></div>
      <div class="dashed"></div>
      <div class="row"><span>Room:</span><span>${b.roomNum} (${b.roomType})</span></div>
      <div class="row"><span>Check-in:</span><span>${b.checkin}</span></div>
      <div class="row"><span>Check-out:</span><span>${b.checkout}</span></div>
      <div class="row"><span>Nights:</span><span>${nights}</span></div>
      <div class="row"><span>Rate/Night:</span><span>${cur}${room?.price?.toFixed(2) || "—"}</span></div>
      <div class="dashed"></div>
      <div class="total"><span>TOTAL:</span><span>${cur}${b.totalAmount.toFixed(2)}</span></div>
      <div class="row"><span>Paid:</span><span>${cur}${b.advance.toFixed(2)}</span></div>
      <div class="row"><span>Balance:</span><span>${cur}${b.balance.toFixed(2)}</span></div>
      <div class="row"><span>Method:</span><span>${b.payType}</span></div>
      <div class="footer">Thank you for staying at ${s.hotelName}!<br/>We hope to see you again.</div>
    `);
  };

  return (
    <Modal open title={`Booking ${b.id}`} onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="outline" size="sm" onClick={onClose}>Close</Btn>
          {b.status === "confirmed" && <Btn variant="green" size="sm" onClick={checkIn}>✅ Check In</Btn>}
          {b.status === "checked-in" && <Btn variant="red" size="sm" onClick={checkOut}>🚪 Check Out</Btn>}
          {b.balance > 0 && b.status !== "cancelled" && <Btn variant="gold" size="sm" onClick={collectBalance}>Collect Balance</Btn>}
          {!["cancelled", "checked-out"].includes(b.status) && <Btn variant="outline" size="sm" onClick={cancel}>Cancel</Btn>}
          <Btn variant="ghost" size="sm" onClick={doPrint}>🖨 Receipt</Btn>
        </div>
      }>
      <InfoRow label="Booking ID"><span style={{ color: COLORS.gold, fontWeight: 700 }}>{b.id}</span></InfoRow>
      <InfoRow label="Guest"><strong>{b.guestName}</strong></InfoRow>
      <InfoRow label="Phone">{b.guestPhone || "—"}</InfoRow>
      <InfoRow label="ID">{b.idType}: {b.idNum || "—"}</InfoRow>
      <InfoRow label="Room">{b.roomNum} ({b.roomType})</InfoRow>
      <InfoRow label="No. of Guests">{b.numGuests}</InfoRow>
      <InfoRow label="Check-in">{fmtDate(b.checkin)}</InfoRow>
      <InfoRow label="Check-out">{fmtDate(b.checkout)}</InfoRow>
      <InfoRow label="Nights">{nightsBetween(b.checkin, b.checkout)}</InfoRow>
      <InfoRow label="Total"><span style={{ color: COLORS.gold, fontWeight: 700 }}>{CURRENCY}{b.totalAmount.toFixed(2)}</span></InfoRow>
      <InfoRow label="Paid"><span style={{ color: COLORS.green, fontWeight: 700 }}>{CURRENCY}{b.advance.toFixed(2)}</span></InfoRow>
      <InfoRow label="Balance Due"><span style={{ color: b.balance > 0 ? COLORS.red : COLORS.green, fontWeight: 700 }}>{CURRENCY}{b.balance.toFixed(2)}</span></InfoRow>
      <InfoRow label="Status"><Badge color={S.statusColor[b.status] || "blue"}>{b.status}</Badge></InfoRow>
      {b.notes && <InfoRow label="Notes"><span style={{ color: COLORS.muted }}>{b.notes}</span></InfoRow>}
    </Modal>
  );
}

// CHECK-IN / OUT
function CheckInOut({ db, setDb, toast, onViewBooking }) {
  const [tab, setTab] = useState("in");
  const t = today();
  const readyIn = db.bookings.filter(b => b.status === "confirmed" && b.checkin === t);
  const readyOut = db.bookings.filter(b => b.status === "checked-in");

  return (
    <div style={S.page}>
      <div style={S.pageHeader}><div style={S.pageTitle}>Check-In <span style={S.pageTitleAccent}>/ Out</span></div></div>
      <div style={S.tabs}>
        <button style={S.tab(tab === "in")} onClick={() => setTab("in")}>Check-In ({readyIn.length})</button>
        <button style={S.tab(tab === "out")} onClick={() => setTab("out")}>Check-Out ({readyOut.length})</button>
      </div>
      {tab === "in" && (
        <div style={S.card}>
          <div style={S.cardTitle}>🟢 Expected Check-Ins Today</div>
          {readyIn.length ? (
            <table style={S.table}>
              <thead><tr><th style={S.th}>ID</th><th style={S.th}>Guest</th><th style={S.th}>Room</th><th style={S.th}>Guests</th><th style={S.th}>Balance</th><th style={S.th}></th></tr></thead>
              <tbody>{readyIn.map(b => (
                <tr key={b.id}>
                  <td style={{ ...S.td, color: COLORS.gold }}>{b.id}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{b.guestName}</td>
                  <td style={S.td}>{b.roomNum}</td>
                  <td style={S.td}>{b.numGuests}</td>
                  <td style={{ ...S.td, color: b.balance > 0 ? COLORS.red : COLORS.green, fontWeight: 700 }}>{CURRENCY}{b.balance.toFixed(2)}</td>
                  <td style={S.td}><Btn variant="green" size="sm" onClick={() => onViewBooking(b.id)}>View & Check In</Btn></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div style={S.empty}>😴 No check-ins expected today.</div>}
        </div>
      )}
      {tab === "out" && (
        <div style={S.card}>
          <div style={S.cardTitle}>🔴 Currently Checked In</div>
          {readyOut.length ? (
            <table style={S.table}>
              <thead><tr><th style={S.th}>ID</th><th style={S.th}>Guest</th><th style={S.th}>Room</th><th style={S.th}>Check-out</th><th style={S.th}>Balance</th><th style={S.th}></th></tr></thead>
              <tbody>{readyOut.map(b => (
                <tr key={b.id}>
                  <td style={{ ...S.td, color: COLORS.gold }}>{b.id}</td>
                  <td style={{ ...S.td, fontWeight: 700 }}>{b.guestName}</td>
                  <td style={S.td}>{b.roomNum}</td>
                  <td style={{ ...S.td, color: new Date(b.checkout) < new Date() ? COLORS.red : COLORS.muted }}>{fmtDate(b.checkout)}</td>
                  <td style={{ ...S.td, color: b.balance > 0 ? COLORS.red : COLORS.green, fontWeight: 700 }}>{CURRENCY}{b.balance.toFixed(2)}</td>
                  <td style={{ ...S.td, display: "flex", gap: 6 }}>
                    <Btn variant="red" size="sm" onClick={() => onViewBooking(b.id)}>View & Check Out</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => onViewBooking(b.id)}>🖨</Btn>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          ) : <div style={S.empty}>🏨 No guests currently checked in.</div>}
        </div>
      )}
    </div>
  );
}

// GUESTS
function Guests({ db, setDb, toast }) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", nationality: "Ghanaian", idType: "Ghana Card", idNum: "" });
  const f = v => setForm(p => ({ ...p, ...v }));
  const save = () => {
    if (!form.name.trim()) { toast("Name required.", true); return; }
    setDb(db => ({ ...db, guests: [...db.guests, { id: uid(), ...form }] }));
    setShowModal(false); toast("Guest profile saved!");
  };
  const del = (id) => { if (!confirm("Remove guest?")) return; setDb(db => ({ ...db, guests: db.guests.filter(g => g.id !== id) })); toast("Guest removed."); };
  let gs = db.guests;
  if (search) gs = gs.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.phone?.includes(search));

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div style={S.pageTitle}>Guest <span style={S.pageTitleAccent}>Directory</span></div>
        <Btn variant="gold" size="sm" onClick={() => { setForm({ name: "", phone: "", email: "", nationality: "Ghanaian", idType: "Ghana Card", idNum: "" }); setShowModal(true); }}>+ Add Guest</Btn>
      </div>
      <div style={S.searchBar}>
        <Input value={search} onChange={setSearch} placeholder="Search guests..." style={{ flex: 1 }} />
      </div>
      <div style={{ ...S.card, padding: 0 }}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Name</th><th style={S.th}>Phone</th><th style={S.th}>Email</th><th style={S.th}>Nationality</th><th style={S.th}>ID</th><th style={S.th}>Stays</th><th style={S.th}></th></tr></thead>
          <tbody>{gs.length ? gs.map(g => {
            const stays = db.bookings.filter(b => b.guestName === g.name).length;
            return <tr key={g.id}>
              <td style={{ ...S.td, fontWeight: 700 }}>{g.name}</td>
              <td style={S.td}>{g.phone || "—"}</td>
              <td style={S.td}>{g.email || "—"}</td>
              <td style={S.td}>{g.nationality || "—"}</td>
              <td style={{ ...S.td, color: COLORS.muted, fontSize: 11 }}>{g.idType}: {g.idNum || "—"}</td>
              <td style={S.td}><Badge color="gold">{stays} stay{stays !== 1 ? "s" : ""}</Badge></td>
              <td style={S.td}><Btn variant="red" size="sm" onClick={() => del(g.id)}>✕</Btn></td>
            </tr>;
          }) : <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: COLORS.muted }}>No guests found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Modal open={showModal} title="Guest Profile" onClose={() => setShowModal(false)}
        footer={<><Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn><Btn variant="gold" onClick={save}>Save Guest</Btn></>}>
        <div style={S.formGrid}>
          <div style={S.formGroup()}><label style={S.label}>Full Name</label><Input value={form.name} onChange={v => f({ name: v })} /></div>
          <div style={S.formGroup()}><label style={S.label}>Phone</label><Input value={form.phone} onChange={v => f({ phone: v })} /></div>
          <div style={S.formGroup()}><label style={S.label}>Email</label><Input value={form.email} onChange={v => f({ email: v })} /></div>
          <div style={S.formGroup()}><label style={S.label}>Nationality</label><Input value={form.nationality} onChange={v => f({ nationality: v })} /></div>
          <div style={S.formGroup()}><label style={S.label}>ID Type</label><Select value={form.idType} onChange={v => f({ idType: v })} options={ID_TYPES} /></div>
          <div style={S.formGroup()}><label style={S.label}>ID Number</label><Input value={form.idNum} onChange={v => f({ idNum: v })} /></div>
        </div>
      </Modal>
    </div>
  );
}

// BILLING
function Billing({ db, setDb, toast }) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ guest: "", room: "", amount: "", method: "Cash", desc: "" });
  const f = v => setForm(p => ({ ...p, ...v }));
  const cur = CURRENCY;
  const monthKey = today().slice(0, 7);
  const monthRev = db.payments.filter(p => p.date?.startsWith(monthKey)).reduce((s, p) => s + p.amount, 0);
  const totalRev = db.payments.reduce((s, p) => s + p.amount, 0);
  const pending = db.bookings.filter(b => b.balance > 0 && b.status !== "cancelled").reduce((s, b) => s + b.balance, 0);
  const cash = db.payments.filter(p => p.method === "Cash").reduce((s, p) => s + p.amount, 0);

  const save = () => {
    const amt = parseFloat(form.amount);
    if (!form.guest.trim() || !amt) { toast("Guest and amount required.", true); return; }
    const p = { id: uid(), guest: form.guest, room: form.room, amount: amt, method: form.method, desc: form.desc, date: today() };
    setDb(db => ({ ...db, payments: [...db.payments, p] }));
    setShowModal(false); toast("Payment saved!");
    // Print
    printReceipt(`<div class="logo">${db.settings.hotelName}</div><div class="hotel">${db.settings.address}<br/>${db.settings.phone}</div><div class="dashed"></div><div class="row"><span>RECEIPT</span><span>${p.id.slice(-6).toUpperCase()}</span></div><div class="row"><span>Date:</span><span>${today()}</span></div><div class="dashed"></div><div class="row"><span>Received from:</span><span>${p.guest}</span></div><div class="row"><span>Room:</span><span>${p.room || "—"}</span></div><div class="row"><span>For:</span><span>${p.desc || "Hotel payment"}</span></div><div class="row"><span>Method:</span><span>${p.method}</span></div><div class="dashed"></div><div class="total"><span>AMOUNT:</span><span>${cur}${p.amount.toFixed(2)}</span></div><div class="footer">Official Receipt — ${db.settings.hotelName}<br/>${db.settings.phone}</div>`);
  };

  let ps = [...db.payments].sort((a, b) => b.date?.localeCompare(a.date));
  if (search) ps = ps.filter(p => p.guest.toLowerCase().includes(search.toLowerCase()) || p.room?.includes(search));

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div style={S.pageTitle}>Billing <span style={S.pageTitleAccent}>& Payments</span></div>
        <Btn variant="gold" size="sm" onClick={() => { setForm({ guest: "", room: "", amount: "", method: "Cash", desc: "" }); setShowModal(true); }}>+ Record Payment</Btn>
      </div>
      <div style={S.statsGrid}>
        <StatCard label="Month Revenue" value={`${cur}${monthRev.toFixed(2)}`} color={COLORS.gold} />
        <StatCard label="Total Collected" value={`${cur}${totalRev.toFixed(2)}`} color={COLORS.gold} />
        <StatCard label="Pending Balances" value={`${cur}${pending.toFixed(2)}`} color={COLORS.red} />
        <StatCard label="Cash Received" value={`${cur}${cash.toFixed(2)}`} />
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>💳 Payment Records</div>
        <div style={S.searchBar}><Input value={search} onChange={setSearch} placeholder="Search payments..." style={{ flex: 1 }} /></div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Guest</th><th style={S.th}>Room</th><th style={S.th}>Amount</th><th style={S.th}>Method</th><th style={S.th}>Description</th><th style={S.th}>Date</th><th style={S.th}></th></tr></thead>
          <tbody>{ps.length ? ps.map(p => (
            <tr key={p.id}>
              <td style={{ ...S.td, fontWeight: 700 }}>{p.guest}</td>
              <td style={S.td}>{p.room || "—"}</td>
              <td style={{ ...S.td, color: COLORS.gold, fontWeight: 700 }}>{cur}{p.amount.toFixed(2)}</td>
              <td style={S.td}>{p.method}</td>
              <td style={{ ...S.td, color: COLORS.muted }}>{p.desc || "—"}</td>
              <td style={{ ...S.td, color: COLORS.muted }}>{fmtDate(p.date)}</td>
              <td style={S.td}><Btn variant="ghost" size="sm" onClick={() => printReceipt(`<div class="logo">${db.settings.hotelName}</div><div class="hotel">${db.settings.address}<br/>${db.settings.phone}</div><div class="dashed"></div><div class="row"><span>Date:</span><span>${p.date}</span></div><div class="dashed"></div><div class="row"><span>Received from:</span><span>${p.guest}</span></div><div class="row"><span>Room:</span><span>${p.room || "—"}</span></div><div class="row"><span>For:</span><span>${p.desc || "Payment"}</span></div><div class="row"><span>Method:</span><span>${p.method}</span></div><div class="dashed"></div><div class="total"><span>AMOUNT:</span><span>${cur}${p.amount.toFixed(2)}</span></div><div class="footer">Official Receipt<br/>${db.settings.hotelName}<br/>${db.settings.phone}</div>`)}>🖨</Btn></td>
            </tr>
          )) : <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: COLORS.muted }}>No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Modal open={showModal} title="Record Payment" onClose={() => setShowModal(false)}
        footer={<><Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn><Btn variant="gold" onClick={save}>Save & Print Receipt</Btn></>}>
        <div style={S.formGrid}>
          <div style={S.formGroup()}><label style={S.label}>Guest Name</label><Input value={form.guest} onChange={v => f({ guest: v })} /></div>
          <div style={S.formGroup()}><label style={S.label}>Room No.</label><Input value={form.room} onChange={v => f({ room: v })} /></div>
          <div style={S.formGroup()}><label style={S.label}>Amount ({cur})</label><Input value={form.amount} onChange={v => f({ amount: v })} type="number" /></div>
          <div style={S.formGroup()}><label style={S.label}>Method</label><Select value={form.method} onChange={v => f({ method: v })} options={PAY_METHODS} /></div>
          <div style={S.formGroup(true)}><label style={S.label}>Description</label><Input value={form.desc} onChange={v => f({ desc: v })} placeholder="Room payment, extra service..." /></div>
        </div>
      </Modal>
    </div>
  );
}

// EXPENSES
function Expenses({ db, setDb, toast }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ desc: "", amount: "", cat: "Utilities", date: today() });
  const f = v => setForm(p => ({ ...p, ...v }));
  const cur = CURRENCY; const monthKey = today().slice(0, 7);
  const monthExp = db.expenses.filter(e => e.date?.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
  const monthRev = db.payments.filter(p => p.date?.startsWith(monthKey)).reduce((s, p) => s + p.amount, 0);
  const cats = {}; db.expenses.filter(e => e.date?.startsWith(monthKey)).forEach(e => { cats[e.cat] = (cats[e.cat] || 0) + e.amount; });

  const save = () => {
    const amt = parseFloat(form.amount);
    if (!form.desc.trim() || !amt) { toast("Description and amount required.", true); return; }
    setDb(db => ({ ...db, expenses: [...db.expenses, { id: uid(), desc: form.desc, amount: amt, cat: form.cat, date: form.date }] }));
    setShowModal(false); toast("Expense saved!");
  };
  const del = id => { if (!confirm("Delete expense?")) return; setDb(db => ({ ...db, expenses: db.expenses.filter(e => e.id !== id) })); };

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div style={S.pageTitle}>Expenses</div>
        <Btn variant="gold" size="sm" onClick={() => { setForm({ desc: "", amount: "", cat: "Utilities", date: today() }); setShowModal(true); }}>+ Add Expense</Btn>
      </div>
      <div style={S.twoCol}>
        <div style={S.card}>
          <div style={S.cardTitle}>📉 This Month Summary</div>
          <InfoRow label="Revenue"><span style={{ color: COLORS.gold, fontWeight: 700 }}>{cur}{monthRev.toFixed(2)}</span></InfoRow>
          <InfoRow label="Expenses"><span style={{ color: COLORS.red, fontWeight: 700 }}>{cur}{monthExp.toFixed(2)}</span></InfoRow>
          <InfoRow label="Net Profit"><span style={{ color: monthRev - monthExp >= 0 ? COLORS.green : COLORS.red, fontWeight: 700 }}>{cur}{(monthRev - monthExp).toFixed(2)}</span></InfoRow>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>📂 By Category</div>
          {Object.entries(cats).length ? Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
            <InfoRow key={cat} label={cat}><span style={{ color: COLORS.red }}>{cur}{amt.toFixed(2)}</span></InfoRow>
          )) : <div style={S.empty}>No expenses this month.</div>}
        </div>
      </div>
      <div style={{ ...S.card, padding: 0 }}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Description</th><th style={S.th}>Category</th><th style={S.th}>Amount</th><th style={S.th}>Date</th><th style={S.th}></th></tr></thead>
          <tbody>{[...db.expenses].sort((a, b) => b.date?.localeCompare(a.date)).map(e => (
            <tr key={e.id}>
              <td style={{ ...S.td, fontWeight: 600 }}>{e.desc}</td>
              <td style={S.td}><Badge color="orange">{e.cat}</Badge></td>
              <td style={{ ...S.td, color: COLORS.red, fontWeight: 700 }}>{cur}{e.amount.toFixed(2)}</td>
              <td style={{ ...S.td, color: COLORS.muted }}>{fmtDate(e.date)}</td>
              <td style={S.td}><Btn variant="red" size="sm" onClick={() => del(e.id)}>✕</Btn></td>
            </tr>
          ))}
          {!db.expenses.length && <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: COLORS.muted }}>No expenses recorded.</td></tr>}
          </tbody>
        </table>
      </div>
      <Modal open={showModal} title="Add Expense" onClose={() => setShowModal(false)}
        footer={<><Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn><Btn variant="gold" onClick={save}>Save Expense</Btn></>}>
        <div style={S.formGrid}>
          <div style={S.formGroup()}><label style={S.label}>Description</label><Input value={form.desc} onChange={v => f({ desc: v })} /></div>
          <div style={S.formGroup()}><label style={S.label}>Amount ({CURRENCY})</label><Input value={form.amount} onChange={v => f({ amount: v })} type="number" /></div>
          <div style={S.formGroup()}><label style={S.label}>Category</label><Select value={form.cat} onChange={v => f({ cat: v })} options={EXPENSE_CATS} /></div>
          <div style={S.formGroup()}><label style={S.label}>Date</label><Input value={form.date} onChange={v => f({ date: v })} type="date" /></div>
        </div>
      </Modal>
    </div>
  );
}

// REPORTS
function Reports({ db }) {
  const cur = CURRENCY;
  const totalRev = db.payments.reduce((s, p) => s + p.amount, 0);
  const totalExp = db.expenses.reduce((s, e) => s + e.amount, 0);
  const net = totalRev - totalExp;
  const occPct = db.rooms.length ? Math.round(db.rooms.filter(r => r.status === "occupied").length / db.rooms.length * 100) : 0;
  // Last 6 months
  const months = []; const revData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    months.push(d.toLocaleString("default", { month: "short" }));
    revData.push(db.payments.filter(p => p.date?.startsWith(key)).reduce((s, p) => s + p.amount, 0));
  }
  const maxRev = Math.max(...revData, 1);
  const types = {};
  db.bookings.filter(b => b.status !== "cancelled").forEach(b => { types[b.roomType] = (types[b.roomType] || 0) + b.totalAmount; });

  const exportCSV = () => {
    const rows = [["Type", "Description", "Room", "Amount", "Date"]];
    db.payments.forEach(p => rows.push(["Revenue", p.guest, p.room, p.amount, p.date]));
    db.expenses.forEach(e => rows.push(["Expense", e.desc, e.cat, -e.amount, e.date]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = "guesthouse_report.csv"; a.click();
  };

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div style={S.pageTitle}>Reports <span style={S.pageTitleAccent}>& Analytics</span></div>
        <Btn variant="outline" size="sm" onClick={exportCSV}>⬇ Export CSV</Btn>
      </div>
      <div style={S.statsGrid}>
        <StatCard label="Total Revenue" value={`${cur}${totalRev.toFixed(2)}`} color={COLORS.gold} />
        <StatCard label="Total Expenses" value={`${cur}${totalExp.toFixed(2)}`} color={COLORS.red} />
        <StatCard label="Net Profit" value={`${cur}${net.toFixed(2)}`} color={net >= 0 ? COLORS.green : COLORS.red} />
        <StatCard label="Occupancy" value={`${occPct}%`} color={COLORS.accent} />
      </div>
      <div style={S.twoCol}>
        <div style={S.card}>
          <div style={S.cardTitle}>📊 Monthly Revenue</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90, marginBottom: 14 }}>
            {months.map((m, i) => (
              <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", background: COLORS.gold, borderRadius: "3px 3px 0 0", height: Math.max(6, revData[i] / maxRev * 80) + "px" }} />
                <div style={{ fontSize: 9, color: COLORS.muted }}>{m}</div>
              </div>
            ))}
          </div>
          {months.map((m, i) => <InfoRow key={m} label={m}><span style={{ color: COLORS.gold, fontWeight: 700 }}>{cur}{revData[i].toFixed(2)}</span></InfoRow>)}
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>🏨 Room Type Performance</div>
          {Object.entries(types).length ? Object.entries(types).sort((a, b) => b[1] - a[1]).map(([type, rev]) => (
            <InfoRow key={type} label={type}><span style={{ color: COLORS.gold, fontWeight: 700 }}>{cur}{rev.toFixed(2)}</span></InfoRow>
          )) : <div style={S.empty}>No booking data yet.</div>}
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>📋 Room Occupancy Report</div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Room</th><th style={S.th}>Type</th><th style={S.th}>Status</th><th style={S.th}>Rate/Night</th><th style={S.th}>Total Bookings</th></tr></thead>
          <tbody>{db.rooms.map(r => {
            const cnt = db.bookings.filter(b => b.roomId === r.id && b.status !== "cancelled").length;
            return <tr key={r.id}>
              <td style={{ ...S.td, fontWeight: 700 }}>Rm {r.number}</td>
              <td style={S.td}>{r.type}</td>
              <td style={S.td}><Badge color={S.statusColor[r.status] || "blue"}>{r.status}</Badge></td>
              <td style={{ ...S.td, color: COLORS.gold }}>{cur}{r.price}</td>
              <td style={S.td}><Badge color="blue">{cnt}</Badge></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

// HOUSEKEEPING
function Housekeeping({ db, setDb, toast }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ room: "", priority: "medium", task: "", staff: "", due: today() });
  const f = v => setForm(p => ({ ...p, ...v }));
  const pending = db.hkTasks.filter(t => !t.done).length;
  const done = db.hkTasks.filter(t => t.done).length;
  const high = db.hkTasks.filter(t => !t.done && t.priority === "high").length;

  const complete = id => { setDb(db => ({ ...db, hkTasks: db.hkTasks.map(t => t.id === id ? { ...t, done: true } : t) })); toast("Task completed!"); };
  const del = id => { setDb(db => ({ ...db, hkTasks: db.hkTasks.filter(t => t.id !== id) })); };
  const save = () => {
    if (!form.task.trim()) { toast("Task description required.", true); return; }
    setDb(db => ({ ...db, hkTasks: [...db.hkTasks, { id: uid(), ...form, done: false }] }));
    setShowModal(false); toast("Task added!");
  };

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div style={S.pageTitle}>Housekeeping</div>
        <Btn variant="gold" size="sm" onClick={() => { setForm({ room: db.rooms[0]?.number || "", priority: "medium", task: "", staff: "", due: today() }); setShowModal(true); }}>+ Add Task</Btn>
      </div>
      <div style={S.statsGrid}>
        <StatCard label="Total Tasks" value={db.hkTasks.length} />
        <StatCard label="Pending" value={pending} color={COLORS.red} />
        <StatCard label="Completed" value={done} color={COLORS.green} />
        <StatCard label="High Priority" value={high} color={COLORS.orange} />
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>🧹 Task List</div>
        {db.hkTasks.length ? (
          <table style={S.table}>
            <thead><tr><th style={S.th}>Room</th><th style={S.th}>Task</th><th style={S.th}>Priority</th><th style={S.th}>Assigned To</th><th style={S.th}>Due</th><th style={S.th}>Status</th><th style={S.th}></th></tr></thead>
            <tbody>{[...db.hkTasks].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0)).map(t => (
              <tr key={t.id} style={{ opacity: t.done ? 0.5 : 1 }}>
                <td style={{ ...S.td, fontWeight: 700 }}>Rm {t.room}</td>
                <td style={S.td}>{t.task}</td>
                <td style={S.td}><Badge color={{ high: "red", medium: "orange", low: "blue" }[t.priority]}>{t.priority}</Badge></td>
                <td style={S.td}>{t.staff || <span style={{ color: COLORS.muted }}>Unassigned</span>}</td>
                <td style={{ ...S.td, color: COLORS.muted }}>{fmtDate(t.due)}</td>
                <td style={S.td}><Badge color={t.done ? "green" : "orange"}>{t.done ? "Done" : "Pending"}</Badge></td>
                <td style={{ ...S.td, display: "flex", gap: 6 }}>
                  {!t.done && <Btn variant="green" size="sm" onClick={() => complete(t.id)}>✓</Btn>}
                  <Btn variant="red" size="sm" onClick={() => del(t.id)}>✕</Btn>
                </td>
              </tr>
            ))}</tbody>
          </table>
        ) : <div style={S.empty}>✨<br />All clean! No tasks pending.</div>}
      </div>
      <Modal open={showModal} title="Add Housekeeping Task" onClose={() => setShowModal(false)}
        footer={<><Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn><Btn variant="gold" onClick={save}>Add Task</Btn></>}>
        <div style={S.formGrid}>
          <div style={S.formGroup()}>
            <label style={S.label}>Room</label>
            <Select value={form.room} onChange={v => f({ room: v })} options={db.rooms.map(r => ({ value: r.number, label: `${r.number} (${r.type})` }))} />
          </div>
          <div style={S.formGroup()}><label style={S.label}>Priority</label><Select value={form.priority} onChange={v => f({ priority: v })} options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} /></div>
          <div style={S.formGroup(true)}><label style={S.label}>Task Description</label><Input value={form.task} onChange={v => f({ task: v })} placeholder="Clean room, change linen, fix AC..." /></div>
          <div style={S.formGroup()}><label style={S.label}>Assign To</label><Input value={form.staff} onChange={v => f({ staff: v })} placeholder="Staff name" /></div>
          <div style={S.formGroup()}><label style={S.label}>Due Date</label><Input value={form.due} onChange={v => f({ due: v })} type="date" /></div>
        </div>
      </Modal>
    </div>
  );
}

// STAFF
function Staff({ db, setDb, toast }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Receptionist", phone: "", salary: "", start: today(), status: "active" });
  const f = v => setForm(p => ({ ...p, ...v }));
  const cur = CURRENCY;
  const save = () => {
    if (!form.name.trim()) { toast("Name required.", true); return; }
    setDb(db => ({ ...db, staff: [...db.staff, { id: uid(), ...form, salary: parseFloat(form.salary) || 0 }] }));
    setShowModal(false); toast("Staff member added!");
  };
  const del = id => { if (!confirm("Remove staff member?")) return; setDb(db => ({ ...db, staff: db.staff.filter(s => s.id !== id) })); };

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div style={S.pageTitle}>Staff <span style={S.pageTitleAccent}>Management</span></div>
        <Btn variant="gold" size="sm" onClick={() => { setForm({ name: "", role: "Receptionist", phone: "", salary: "", start: today(), status: "active" }); setShowModal(true); }}>+ Add Staff</Btn>
      </div>
      <div style={{ ...S.card, padding: 0 }}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Name</th><th style={S.th}>Role</th><th style={S.th}>Phone</th><th style={S.th}>Salary</th><th style={S.th}>Start Date</th><th style={S.th}>Status</th><th style={S.th}></th></tr></thead>
          <tbody>{db.staff.length ? db.staff.map(s => (
            <tr key={s.id}>
              <td style={{ ...S.td, fontWeight: 700 }}>{s.name}</td>
              <td style={S.td}>{s.role}</td>
              <td style={S.td}>{s.phone || "—"}</td>
              <td style={{ ...S.td, color: COLORS.gold }}>{cur}{(s.salary || 0).toFixed(2)}/mo</td>
              <td style={{ ...S.td, color: COLORS.muted }}>{fmtDate(s.start)}</td>
              <td style={S.td}><Badge color={{ active: "green", "on-leave": "orange", terminated: "red" }[s.status]}>{s.status}</Badge></td>
              <td style={S.td}><Btn variant="red" size="sm" onClick={() => del(s.id)}>✕</Btn></td>
            </tr>
          )) : <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: COLORS.muted }}>No staff records.</td></tr>}
          </tbody>
        </table>
      </div>
      <Modal open={showModal} title="Staff Member" onClose={() => setShowModal(false)}
        footer={<><Btn variant="outline" onClick={() => setShowModal(false)}>Cancel</Btn><Btn variant="gold" onClick={save}>Save Staff</Btn></>}>
        <div style={S.formGrid}>
          <div style={S.formGroup()}><label style={S.label}>Full Name</label><Input value={form.name} onChange={v => f({ name: v })} /></div>
          <div style={S.formGroup()}><label style={S.label}>Role</label><Select value={form.role} onChange={v => f({ role: v })} options={STAFF_ROLES} /></div>
          <div style={S.formGroup()}><label style={S.label}>Phone</label><Input value={form.phone} onChange={v => f({ phone: v })} /></div>
          <div style={S.formGroup()}><label style={S.label}>Monthly Salary ({CURRENCY})</label><Input value={form.salary} onChange={v => f({ salary: v })} type="number" /></div>
          <div style={S.formGroup()}><label style={S.label}>Start Date</label><Input value={form.start} onChange={v => f({ start: v })} type="date" /></div>
          <div style={S.formGroup()}><label style={S.label}>Status</label><Select value={form.status} onChange={v => f({ status: v })} options={[{ value: "active", label: "Active" }, { value: "on-leave", label: "On Leave" }, { value: "terminated", label: "Terminated" }]} /></div>
        </div>
      </Modal>
    </div>
  );
}

// SETTINGS
function Settings({ db, setDb, toast, onShowLicense }) {
  const [form, setForm] = useState({ ...db.settings });
  const f = v => setForm(p => ({ ...p, ...v }));
  const save = () => { setDb(db => ({ ...db, settings: { ...db.settings, ...form } })); toast("Settings saved!"); };
  const savePins = () => {
    if (form.staffPin && form.staffPin.length < 4) { toast("PIN must be at least 4 digits.", true); return; }
    setDb(db => ({ ...db, settings: { ...db.settings, staffPin: form.staffPin || db.settings.staffPin, adminPin: form.adminPin || db.settings.adminPin } }));
    toast("PINs updated!");
  };
  const reset = () => {
    if (!confirm("⚠ This will erase ALL data. Are you sure?")) return;
    const conf = prompt("Type YES to confirm permanent deletion:");
    if (conf !== "YES") { toast("Cancelled."); return; }
    localStorage.removeItem(STORAGE_KEY); location.reload();
  };
  const lic = db.license;

  return (
    <div style={S.page}>
      <div style={S.pageHeader}><div style={S.pageTitle}>Settings</div></div>
      <div style={S.twoCol}>
        <div>
          <div style={S.card}>
            <div style={S.cardTitle}>🏨 Hotel Profile</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={S.formGroup()}><label style={S.label}>Hotel Name</label><Input value={form.hotelName} onChange={v => f({ hotelName: v })} /></div>
              <div style={S.formGroup()}><label style={S.label}>Address</label><Input value={form.address} onChange={v => f({ address: v })} /></div>
              <div style={S.formGroup()}><label style={S.label}>Phone</label><Input value={form.phone} onChange={v => f({ phone: v })} /></div>
              <div style={S.formGroup()}><label style={S.label}>Email</label><Input value={form.email} onChange={v => f({ email: v })} /></div>
              <Btn variant="gold" onClick={save}>Save Profile</Btn>
            </div>
          </div>
        </div>
        <div>
          <div style={S.card}>
            <div style={S.cardTitle}>🔑 Access & PINs</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={S.formGroup()}><label style={S.label}>Staff PIN (4–6 digits)</label><Input value={form.staffPin} onChange={v => f({ staffPin: v })} type="password" placeholder="••••" /></div>
              <div style={S.formGroup()}><label style={S.label}>Admin PIN (4–6 digits)</label><Input value={form.adminPin} onChange={v => f({ adminPin: v })} type="password" placeholder="••••" /></div>
              <Btn variant="gold" onClick={savePins}>Update PINs</Btn>
            </div>
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>📄 License</div>
            {lic ? (
              <div>
                <Badge color={lic.type === "full" ? "green" : "orange"}>{lic.type === "full" ? "Full License" : "Trial"}</Badge>
                <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 10, lineHeight: 1.7 }}>
                  Key: {lic.key}<br />
                  Activated: {fmtDate(lic.activated)}<br />
                  {lic.expires ? `Expires: ${fmtDate(lic.expires)}` : "Lifetime"}
                </div>
              </div>
            ) : <div style={{ color: COLORS.muted, fontSize: 12 }}>No license activated.</div>}
            <Btn variant="outline" size="sm" style={{ marginTop: 12 }} onClick={onShowLicense}>Change License</Btn>
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>🗑️ Data Management</div>
            <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 12 }}>This will erase all rooms, bookings, guests, and financial records. Cannot be undone.</div>
            <Btn variant="red" onClick={reset}>⚠ Reset All Data</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BACKUP & RESTORE ────────────────────────────────────────────────────────
function Backup({ db, setDb }) {
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [fileError, setFileError] = useState("");
  const stats = [
    ["Rooms", db.rooms.length], ["Bookings", db.bookings.length],
    ["Guests", db.guests.length], ["Payments", db.payments.length],
    ["Expenses", db.expenses.length], ["Staff", db.staff.length],
  ];
  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify({ app: "GuestHouse Pro", exportedAt: new Date().toISOString(), version: 1, data: db }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `GuestHousePro-backup-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  const onFilePicked = (e) => {
    const file = e.target.files?.[0]; if (!file) return; setFileError("");
    const reader = new FileReader();
    reader.onload = () => { try { const p = JSON.parse(reader.result); if (!p.data || !p.data.rooms) { setFileError("Not a valid GuestHouse Pro backup file."); return; } setConfirmRestore(p); } catch { setFileError("Could not read this file."); } };
    reader.readAsText(file); e.target.value = "";
  };
  const cs = COLORS;
  return (
    <div style={S.page}>
      <div style={S.pageHeader}><div style={S.pageTitle}>Backup <span style={S.pageTitleAccent}>& Restore</span></div></div>
      <p style={{ color: cs.muted, fontSize: 13, marginBottom: 20, maxWidth: 600, lineHeight: 1.6 }}>
        All data lives only in this browser. Download a backup file regularly and store it in Google Drive, email, or a USB drive to keep your records safe long-term.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={S.card}>
          <div style={S.cardTitle}>⬇️ Export Backup</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {stats.map(([l, v]) => <div key={l} style={{ background: COLORS.bg, borderRadius: 7, padding: "8px 10px" }}><div style={{ fontSize: 10, color: cs.muted }}>{l}</div><div style={{ fontSize: 15, fontWeight: 700, color: cs.text }}>{v}</div></div>)}
          </div>
          <Btn variant="gold" onClick={downloadBackup}>⬇️ Download Backup File</Btn>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>⬆️ Restore from Backup</div>
          <p style={{ color: cs.muted, fontSize: 12, marginBottom: 12 }}>Choose a previously downloaded backup file. This replaces all current data.</p>
          <div style={{ background: "#3a2a14", border: `1px solid ${COLORS.gold}`, borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: "#f0d9a8" }}>
            ⚠️ Restoring overwrites everything. Export a fresh backup first if you want to keep what's here.
          </div>
          <label style={{ display: "block", textAlign: "center", padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, color: cs.muted, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            Choose Backup File… <input type="file" accept="application/json" onChange={onFilePicked} style={{ display: "none" }} />
          </label>
          {fileError && <div style={{ color: COLORS.red, fontSize: 12, marginTop: 10 }}>{fileError}</div>}
        </div>
      </div>
      {confirmRestore && (
        <Modal open title="Confirm Restore" onClose={() => setConfirmRestore(null)} footer={
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="outline" onClick={() => setConfirmRestore(null)}>Cancel</Btn>
            <Btn onClick={() => { setDb(() => confirmRestore.data); setConfirmRestore(null); }}>Yes, Restore This Backup</Btn>
          </div>
        }>
          <p style={{ fontSize: 13, color: cs.muted }}>Backup from <strong style={{ color: cs.text }}>{new Date(confirmRestore.exportedAt).toLocaleString()}</strong> — {confirmRestore.data.bookings?.length || 0} bookings, {confirmRestore.data.guests?.length || 0} guests. This will replace all current data and cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const NAV = [
  { section: "Operations", items: [["dashboard", "🏠", "Dashboard"], ["rooms", "🛏", "Rooms"], ["bookings", "📋", "Bookings"], ["checkin", "✅", "Check-In/Out"], ["guests", "👤", "Guests"]] },
  { section: "Finance", items: [["billing", "💳", "Billing"], ["expenses", "📊", "Expenses"], ["reports", "📈", "Reports"]] },
  { section: "Management", items: [["housekeeping", "🧹", "Housekeeping"], ["staff", "👥", "Staff"], ["settings", "⚙️", "Settings"], ["backup", "💾", "Backup & Restore"]] },
];

function Sidebar({ page, setPage, hotelName, license }) {
  const [hoverId, setHoverId] = useState(null);
  return (
    <aside style={S.sidebar}>
      <div style={S.sideTop}>
        <div style={S.brand}>GuestHouse Pro</div>
        <div style={S.tagline}>Management Suite</div>
        <div style={S.hotelChip}>{hotelName}</div>
      </div>
      <nav style={S.nav}>
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <div style={S.navSection}>{section}</div>
            {items.map(([id, icon, label]) => (
              <div key={id} style={S.navItem(page === id)} onClick={() => setPage(id)}
                onMouseEnter={() => setHoverId(id)} onMouseLeave={() => setHoverId(null)}>
                <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div style={S.sideFooter}>
        <div style={S.licBadge}>
          <div style={S.licDot(!!license)} />
          <span>{license ? (license.type === "full" ? "Licensed ✓" : "Trial Mode") : "Not Licensed"}</span>
        </div>
      </div>
    </aside>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function GuestHousePro() {
  const [license, setLicenseState] = useState(() => loadLicense());
  const [locked, setLocked]        = useState(true);
  const [renewMode, setRenewMode]  = useState(false);
  const [page, setPage]            = useState("dashboard");
  const [db, setDbRaw]             = useState(() => loadDB() || buildSeedDB());
  const [toast, setToastState]     = useState({ msg: "", err: false });
  const [viewingBooking, setViewingBooking] = useState(null);

  const setDb = useCallback((updater) => {
    setDbRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveDB(next);
      return next;
    });
  }, []);

  const showToast = useCallback((msg, err = false) => {
    setToastState({ msg, err });
    setTimeout(() => setToastState({ msg: "", err: false }), 3000);
  }, []);

  const onActivate = (lic) => {
    setLicenseState(lic);
    setRenewMode(false);
    showToast("Licence activated! Welcome to GuestHouse Pro. 🎉");
  };
  // ── Auto-activate from portal launch URL ─────────────────────────────────
  useEffect(() => {
    const urlKey = new URLSearchParams(window.location.search).get('key');
    if (urlKey && !loadLicense()) {
      const k = urlKey.toUpperCase().trim();
      if (/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k)) {
        const plan = k.split("-")[1]||"";
        const days = plan==="TRIAL"?TRIAL_DAYS:plan==="1M"?30:plan==="6M"?182:plan==="12M"?365:/^\d+Y$/.test(plan)?Math.round(parseInt(plan)*365):365;
        const expiry = new Date(); expiry.setDate(expiry.getDate()+days);
        const lic = { type:"licensed", key:k, expiry:expiry.toISOString(), issued:new Date().toISOString() };
        saveLicense(lic); setLicenseState(lic);
        window.history.replaceState({},document.title,window.location.pathname);
      }
    }
  }, []);

  const unlock = (isAdmin) => { setLocked(false); };

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.background = COLORS.bg;
  }, []);

  // ── 1. Licence gate — runs BEFORE PIN screen ──────────────────────────────
  if (!license || renewMode) return <LicenseScreen onActivate={onActivate} />;
  if (isExpired(license.expiry)) return <LicenseExpiredScreen license={license} onRenew={() => setRenewMode(true)} />;

  // ── 2. PIN / Lock screen ──────────────────────────────────────────────────
  if (locked) return <LockScreen onUnlock={unlock} staffPin={db.settings.staffPin} adminPin={db.settings.adminPin} />;

  const pageProps = { db, setDb, toast: showToast };

  const renderPage = () => {
    switch (page) {
      case "dashboard":   return <Dashboard {...pageProps} />;
      case "rooms":       return <Rooms {...pageProps} />;
      case "bookings":    return <Bookings {...pageProps} onViewBooking={id => setViewingBooking(id)} />;
      case "checkin":     return <CheckInOut {...pageProps} onViewBooking={id => setViewingBooking(id)} />;
      case "guests":      return <Guests {...pageProps} />;
      case "billing":     return <Billing {...pageProps} />;
      case "expenses":    return <Expenses {...pageProps} />;
      case "reports":     return <Reports db={db} />;
      case "housekeeping":return <Housekeeping {...pageProps} />;
      case "staff":       return <Staff {...pageProps} />;
      case "settings":    return <Settings {...pageProps} onShowLicense={() => setRenewMode(true)} />;
      case "backup":      return <Backup db={db} setDb={setDb} />;
      default: return null;
    }
  };

  // Trial banner
  const trialDaysLeft = license.type === "trial" ? daysLeft(license.expiry) : null;

  return (
    <>
      {trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div style={{ background: trialDaysLeft <= 2 ? COLORS.red : COLORS.orange, color: "#000", textAlign: "center", padding: "6px 16px", fontSize: 12, fontWeight: 700, zIndex: 500, position: "relative" }}>
          ⚠ Trial expires in <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</strong> — contact 0597147460 to activate a full licence.
        </div>
      )}
      <div style={S.app}>
        <Sidebar page={page} setPage={setPage} hotelName={db.settings.hotelName} license={license} />
        <main style={S.main}>{renderPage()}</main>
      </div>
      {viewingBooking && (
        <BookingViewer db={db} setDb={setDb} bookingId={viewingBooking} onClose={() => setViewingBooking(null)} toast={showToast} />
      )}
      <Toast msg={toast.msg} err={toast.err} />
    </>
  );
}
