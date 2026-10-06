import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Box, ArrowRight, Route, ScanLine, ShieldCheck } from "lucide-react";
import useAuth from "../hooks/useAuth";
import Button from "../components/common/Button";
import { ErrorMessage, Field } from "../components/common/UI";
export default function LoginPage() {
  const auth = useAuth(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (auth.user) return <Navigate to="/" replace />;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.login({ email, password });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-symbol">
            <Box />
          </span>
          <span>
            wsrms<span className="brand-caption">WAREHOUSE MANAGEMENT</span>
          </span>
        </div>
        <div className="login-story-content">
          <p className="eyebrow">A CLEARER WAY TO WORK</p>
          <h1>
            A place for every parcel.
            <br />A record of every move.
          </h1>
          <p>
            From arrival to dispatch, keep your warehouse moving with
            confidence.
          </p>
          <div className="login-feature">
            <Route />
            <span>Smarter storage. Shorter routes.</span>
          </div>
          <div className="login-feature">
            <ScanLine />
            <span>Scan, verify, and dispatch.</span>
          </div>
          <div className="login-feature">
            <ShieldCheck />
            <span>Complete visibility. Clear accountability.</span>
          </div>
        </div>
        <div className="login-story-footer">
          Built for the people who keep things moving.
        </div>
      </section>
      <section className="login-form-panel">
        <div className="login-form">
          <span className="login-icon">
            <Box size={28} />
          </span>
          <p className="eyebrow">YOUR OPERATIONS WORKSPACE</p>
          <h1>Welcome back.</h1>
          <p className="muted mb-8">Sign in to manage your warehouse.</p>
          <ErrorMessage message={error || auth.error} />
          <form onSubmit={submit}>
            <Field label="Email address">
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@warehouse.com"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </Field>
            <Button className="w-full mt-3" loading={busy}>
              Sign in to workspace
              <ArrowRight size={17} />
            </Button>
          </form>
          <p className="login-help">
            Need access? Contact your warehouse administrator.
          </p>
        </div>
      </section>
    </div>
  );
}
