// login.jsx — Sign-in + Create User with warehouse slideshow background
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, UserPlus, LogIn } from "lucide-react";
import { userStore, sessionStore } from "@/lib/store";

/* ── Custom BrushPack box logo (replaces Lovable / Package icon) ── */
function BrushPackLogo({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#000000" />
      {/* top face */}
      <polygon points="50,16 80,32 50,48 20,32" fill="white" />
      {/* left face */}
      <polygon points="20,32 20,68 50,84 50,48" fill="rgba(255,255,255,0.55)" />
      {/* right face */}
      <polygon points="80,32 80,68 50,84 50,48" fill="rgba(255,255,255,0.78)" />
      {/* center seam - top face divider */}
      <line x1="50" y1="16" x2="50" y2="48" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
      {/* flap lines on top */}
      <line x1="20" y1="32" x2="50" y2="48" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
      <line x1="80" y1="32" x2="50" y2="48" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
    </svg>
  );
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — BrushPack" },
      { name: "description", content: "Manager login for BrushPack packaging operations." },
    ],
  }),
  component: LoginPage,
});

const SLIDES = [
  "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&w=1920&q=80",
];

const INTERVAL_MS = 5000;
const FADE_MS     = 1000;

/* ── Shared input style ── */
const inputStyle = {
  border: "1.5px solid #6b5ca5",
  backgroundColor: "#ffffff",
  color: "#000000",
  caretColor: "#6b5ca5",
  cursor: "text",
};

function LoginPage() {
  const navigate = useNavigate();

  /* If a session already exists, go straight to the dashboard */
  useEffect(() => {
    if (sessionStore.get()) {
      navigate({ to: "/" });
    }
  }, []);

  /* slideshow */
  const [idx,    setIdx]    = useState(0);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => { setIdx((i) => (i + 1) % SLIDES.length); setFading(false); }, FADE_MS);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  /* tab */
  const [tab, setTab] = useState("signin"); // "signin" | "create"

  /* sign-in form */
  const [siUser, setSiUser]     = useState("");
  const [siPass, setSiPass]     = useState("");
  const [siShowP, setSiShowP]   = useState(false);
  const [siError, setSiError]   = useState("");
  const [siLoading, setSiLoading] = useState(false);

  /* create-user form */
  const [cuUser,  setCuUser]   = useState("");
  const [cuPass,  setCuPass]   = useState("");
  const [cuConf,  setCuConf]   = useState("");
  const [cuRole,  setCuRole]   = useState("Operations Manager");
  const [cuShowP, setCuShowP]  = useState(false);
  const [cuShowC, setCuShowC]  = useState(false);
  const [cuError, setCuError]  = useState("");
  const [cuOk,    setCuOk]     = useState("");
  const [cuLoading, setCuLoading] = useState(false);

  const nextIdx = (idx + 1) % SLIDES.length;

  /* ── Sign In submit ── */
  const submitSignIn = (e) => {
    e.preventDefault();
    setSiError("");
    if (!siUser.trim()) { setSiError("Username is required."); return; }
    if (!siPass.trim()) { setSiError("Password is required."); return; }
    setSiLoading(true);
    setTimeout(() => {
      const user = userStore.authenticate(siUser, siPass);
      if (!user) {
        setSiLoading(false);
        setSiError("Incorrect username or password.");
        return;
      }
      sessionStore.set(user);
      navigate({ to: "/" });
    }, 500);
  };

  /* ── Create User submit ── */
  const submitCreate = (e) => {
    e.preventDefault();
    setCuError(""); setCuOk("");
    if (!cuUser.trim())  { setCuError("Username is required."); return; }
    if (cuUser.trim().length < 3) { setCuError("Username must be at least 3 characters."); return; }
    if (!cuPass)         { setCuError("Password is required."); return; }
    if (cuPass.length < 6) { setCuError("Password must be at least 6 characters."); return; }
    if (cuPass !== cuConf) { setCuError("Passwords do not match."); return; }
    setCuLoading(true);
    setTimeout(() => {
      try {
        userStore.add(cuUser.trim(), cuPass, cuRole);
        setCuOk(`User "${cuUser.trim()}" created! You can now sign in.`);
        setCuUser(""); setCuPass(""); setCuConf(""); setCuRole("Operations Manager");
        setCuLoading(false);
      } catch (err) {
        setCuLoading(false);
        if (err.message === "username_taken") {
          setCuError("That username is already taken.");
        } else {
          setCuError("Something went wrong. Please try again.");
        }
      }
    }, 400);
  };

  /* ── Tab button ── */
  function TabBtn({ id, icon: Icon, label }) {
    const active = tab === id;
    return (
      <button
        type="button"
        onClick={() => { setTab(id); setSiError(""); setCuError(""); setCuOk(""); }}
        style={{
          flex: 1,
          padding: "9px 0",
          borderRadius: "10px",
          border: "none",
          cursor: "pointer",
          fontWeight: active ? 600 : 400,
          fontSize: "13px",
          backgroundColor: active ? "#000000" : "transparent",
          color: active ? "#ffffff" : "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          transition: "all 0.2s ease",
        }}
      >
        <Icon size={14} />
        {label}
      </button>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">

      {/* Slideshow backgrounds */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${SLIDES[idx]})`, opacity: fading ? 0 : 1, transition: `opacity ${FADE_MS}ms ease-in-out`, zIndex: 0 }} />
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${SLIDES[nextIdx]})`, opacity: fading ? 1 : 0, transition: `opacity ${FADE_MS}ms ease-in-out`, zIndex: 0 }} />

      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(10,20,30,0.72) 0%, rgba(13,115,119,0.42) 100%)", zIndex: 1 }} />

      {/* Slide dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 3 }}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`} style={{ width: i === idx ? "22px" : "8px", height: "8px", borderRadius: "9999px", border: "none", backgroundColor: i === idx ? "#000000" : "rgba(255,255,255,0.45)", transition: "width 0.3s ease, background-color 0.3s ease", cursor: "pointer", padding: 0 }} />
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-sm sm:max-w-md animate-scale-in" style={{ zIndex: 2 }}>
        <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10" style={{ backgroundColor: "rgba(255,255,255,0.97)", boxShadow: "0 28px 72px -16px rgba(0,0,0,0.55)", backdropFilter: "blur(16px)" }}>

          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="animate-float">
              <BrushPackLogo size={60} />
            </div>
            <h1 className="mt-4 font-display text-2xl sm:text-3xl tracking-tight" style={{ color: "#000000" }}>BrushPack</h1>
            <p className="text-sm mt-1" style={{ color: "#000000" }}>Packaging Operations Portal</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: "#ffffff", border: "1px solid #6b5ca5" }}>
            <TabBtn id="signin" icon={LogIn}    label="Sign In"      />
            <TabBtn id="create" icon={UserPlus} label="Create User"  />
          </div>

          {/* ── SIGN IN FORM ── */}
          {tab === "signin" && (
            <form onSubmit={submitSignIn} className="space-y-4 sm:space-y-5">
              {siError && (
                <div className="rounded-lg px-4 py-2.5 text-sm font-medium" style={{ backgroundColor: "#FFF5F5", color: "#C53030", border: "1px solid #FED7D7" }}>
                  {siError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#000000" }}>Username</label>
                <input
                  value={siUser}
                  onChange={(e) => setSiUser(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Enter username"
                  className="w-full rounded-xl px-4 py-2.5 sm:py-3 text-sm outline-none transition"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#000000")}
                  onBlur={(e)  => (e.target.style.borderColor = "#000000")}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#000000" }}>Password</label>
                <div className="relative">
                  <input
                    type={siShowP ? "text" : "password"}
                    value={siPass}
                    onChange={(e) => setSiPass(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-2.5 sm:py-3 pr-11 text-sm outline-none transition"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#000000")}
                    onBlur={(e)  => (e.target.style.borderColor = "#000000")}
                  />
                  <button type="button" onClick={() => setSiShowP((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: "#000000", cursor: "pointer" }} aria-label={siShowP ? "Hide" : "Show"}>
                    {siShowP ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs mt-1.5" style={{ color: "#000000" }}>
                  Default: username <strong>manager</strong> / password <strong>brushpack2024</strong>
                </p>
              </div>

              <button type="submit" disabled={siLoading} className="w-full rounded-xl py-2.5 sm:py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all" style={{ backgroundColor: "#000000", color: "#ffffff", cursor: siLoading ? "not-allowed" : "pointer", boxShadow: siLoading ? "none" : "0 4px 16px rgba(0,0,0,0.35)" }}>
                {siLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {siLoading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          )}

          {/* ── CREATE USER FORM ── */}
          {tab === "create" && (
            <form onSubmit={submitCreate} className="space-y-4">
              {cuError && (
                <div className="rounded-lg px-4 py-2.5 text-sm font-medium" style={{ backgroundColor: "#FFF5F5", color: "#C53030", border: "1px solid #FED7D7" }}>
                  {cuError}
                </div>
              )}
              {cuOk && (
                <div className="rounded-lg px-4 py-2.5 text-sm font-medium" style={{ backgroundColor: "#F0FFF4", color: "#276749", border: "1px solid #9AE6B4" }}>
                  {cuOk}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#000000" }}>Username</label>
                <input
                  value={cuUser}
                  onChange={(e) => setCuUser(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Choose a username"
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#000000")}
                  onBlur={(e)  => (e.target.style.borderColor = "#000000")}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#000000" }}>Role</label>
                <select
                  value={cuRole}
                  onChange={(e) => setCuRole(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition"
                  style={{ ...inputStyle, cursor: "default" }}
                  onFocus={(e) => (e.target.style.borderColor = "#000000")}
                  onBlur={(e)  => (e.target.style.borderColor = "#000000")}
                >
                  {["Operations Manager","Supervisor","Packer","QC Inspector","Loader"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#000000" }}>Password</label>
                <div className="relative">
                  <input
                    type={cuShowP ? "text" : "password"}
                    value={cuPass}
                    onChange={(e) => setCuPass(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
                    className="w-full rounded-xl px-4 py-2.5 pr-11 text-sm outline-none transition"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#000000")}
                    onBlur={(e)  => (e.target.style.borderColor = "#000000")}
                  />
                  <button type="button" onClick={() => setCuShowP((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: "#000000", cursor: "pointer" }}>
                    {cuShowP ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "#000000" }}>Confirm Password</label>
                <div className="relative">
                  <input
                    type={cuShowC ? "text" : "password"}
                    value={cuConf}
                    onChange={(e) => setCuConf(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    className="w-full rounded-xl px-4 py-2.5 pr-11 text-sm outline-none transition"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#000000")}
                    onBlur={(e)  => (e.target.style.borderColor = "#000000")}
                  />
                  <button type="button" onClick={() => setCuShowC((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: "#000000", cursor: "pointer" }}>
                    {cuShowC ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={cuLoading} className="w-full rounded-xl py-2.5 sm:py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all" style={{ backgroundColor: "#000000", color: "#ffffff", cursor: cuLoading ? "not-allowed" : "pointer", boxShadow: cuLoading ? "none" : "0 4px 16px rgba(0,0,0,0.35)" }}>
                {cuLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {cuLoading ? "Creating…" : "Create User"}
              </button>
            </form>
          )}

          <p className="text-xs text-center mt-6" style={{ color: "#000000" }}>
            BrushPack Packaging Operations · Manager Portal
          </p>
        </div>
      </div>
    </div>
  );
}

