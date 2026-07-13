import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

export default function Activate() {
  const { activateAccount } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!code || !email || !password || !confirmPassword) {
      setError("Please fill in all verification fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await activateAccount(code, email, password);
      setSuccess("Account activated successfully! Redirecting to login page...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err?.message || "Verification failed. Check your Code and Email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans p-6">
      <Card className="max-w-md w-full p-8 shadow-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary text-white font-extrabold font-outfit rounded-xl flex items-center justify-center text-2xl mx-auto shadow-md shadow-primary/20">
            E
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight font-sans">
            Activate Account
          </h2>
          <p className="text-xs text-neutral-600">
            First-time user? Verify your Student/Teacher Code and Email to set your password.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-danger/20 text-danger text-xs font-semibold rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-success/20 text-success text-xs font-semibold rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Student/Teacher/Parent Identifier Code"
            id="code-input"
            placeholder="e.g. HS-1001 or GV-2002"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <Input
            label="Registered School Email Address"
            id="email-input"
            type="email"
            placeholder="e.g. nam.student@edulms.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Choose New Password"
            id="password-input"
            type="password"
            placeholder="Min 6 characters..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Input
            label="Confirm New Password"
            id="confirm-password-input"
            type="password"
            placeholder="Repeat password..."
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Button type="submit" variant="primary" className="w-full font-bold py-2.5 mt-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Verifying and activating...
              </>
            ) : (
              "Activate Account"
            )}
          </Button>

          <div className="text-center pt-2">
            <span
              onClick={() => navigate("/login")}
              className="text-xs font-bold text-neutral-600 hover:text-primary transition-colors cursor-pointer"
            >
              Already activated? Go back to login
            </span>
          </div>
        </form>
      </Card>
    </div>
  );
}
