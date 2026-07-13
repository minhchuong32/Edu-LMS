import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all credentials fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userData = await login(email, password);
      // Success redirection based on logged in role
      if (userData.role === "admin") {
        navigate("/admin");
      } else if (userData.role === "teacher") {
        navigate("/teacher");
      } else if (userData.role === "parent") {
        navigate("/parent");
      } else {
        navigate("/student");
      }
    } catch (err) {
      setError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans p-6">
      <Card className="max-w-md w-full p-8 shadow-xl space-y-6">
        {/* Brand identity */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary text-white font-extrabold font-outfit rounded-xl flex items-center justify-center text-2xl mx-auto shadow-md shadow-primary/20">
            E
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight font-sans">
            Sign In to EduLMS
          </h2>
          <p className="text-xs text-neutral-600">
            Enter your credentials issued by your school administrator.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            id="email-input"
            type="email"
            placeholder="e.g. chuong.admin@edulms.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            id="password-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-neutral-600">
              <input
                type="checkbox"
                className="rounded border-neutral-200 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              Remember session
            </label>
            <span
              onClick={() => navigate("/activate")}
              className="font-bold text-primary hover:text-primary-hover hover:underline cursor-pointer"
            >
              Activate Account
            </span>
          </div>

          <Button type="submit" variant="primary" className="w-full font-bold py-2.5 mt-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Info Box */}
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1.5">
          <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Dev Preview Accounts:</p>
          <div className="text-[11px] text-neutral-600 font-medium space-y-1 leading-normal">
            <p>🔑 <span className="font-semibold">admin@edulms.edu</span> (role: admin)</p>
            <p>🔑 <span className="font-semibold">teacher@edulms.edu</span> (role: teacher)</p>
            <p>🔑 <span className="font-semibold">student@edulms.edu</span> (role: student)</p>
            <p>🔑 <span className="font-semibold">parent@edulms.edu</span> (role: parent)</p>
            <p className="text-neutral-400 italic pt-1">Use any non-empty password to log in.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
