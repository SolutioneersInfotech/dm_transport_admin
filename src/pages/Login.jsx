import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginRoute } from "../utils/apiRoutes";
import { Button } from "../components/ui/button";

export default function Login() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(loginRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid: id, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        return;
      }

      login(data.admin, data.token);
      navigate("/", { replace: true });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#101418] flex items-center justify-center">
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 px-6">

        {/* LEFT — BRAND */}
        <div className="hidden md:flex flex-col justify-center">
          <div className="mb-6 animate-fade-in">
            <div className="text-4xl font-bold tracking-wide text-gray-100">
              DM <span className="text-[#1f6feb]">Transport</span>
            </div>
            <div className="mt-2 h-[2px] w-16 bg-[#1f6feb] animate-line" />
          </div>

          <p className="text-gray-400 max-w-sm leading-relaxed">
            Secure administrative access for operations, dispatch, and internal
            management.
          </p>

          <p className="mt-10 text-xs text-gray-600">
            © DM Transport • Internal System
          </p>
        </div>

        {/* RIGHT — LOGIN CARD */}
        <form
          onSubmit={handleLogin}
          className="w-full bg-[rgba(22,27,34,0.85)] backdrop-blur-xl
          border border-gray-700 rounded-2xl p-10 shadow-xl
          animate-slide-up"
        >
          <h2 className="text-2xl font-semibold text-gray-200 mb-2">
            Admin Login
          </h2>
          <p className="text-sm text-gray-400 mb-8">
            Authorized personnel only
          </p>

          {/* ID */}
          <div className="mb-6">
            <label className="block text-gray-400 mb-1">Admin ID</label>
            <input
              disabled={loading}
              value={id}
              onChange={(e) => setId(e.target.value)}
              type="text"
              className="w-full bg-transparent border border-gray-600 rounded-md
              focus:border-[#1f6feb] focus:ring-0 transition outline-none py-2 px-2
              text-gray-200 disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div className="mb-6 relative">
            <label className="block text-gray-400 mb-1">Password</label>

            <input
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              className="w-full bg-transparent border border-gray-600 rounded-md
    focus:border-[#1f6feb] focus:ring-0 transition outline-none py-2 pl-2 pr-10
    text-gray-200 disabled:opacity-50"
            />

            {/* 👁 Eye Icon – perfectly centered INSIDE input */}
            <div
              onClick={() => setShowPassword((v) => !v)}
              className="absolute bottom-2.5 right-3
    flex items-center justify-center cursor-pointer
    text-gray-400 hover:text-gray-200"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
          </div>


          {error && (
            <p className="text-red-500 text-sm mb-4 text-center animate-shake">
              {error}
            </p>
          )}

          {/* Login Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-4 rounded-full cursor-pointer hover:cursor-pointer"
          >
            {loading ? "Authenticating..." : "Login"}
          </Button>

          <p className="mt-6 text-xs text-gray-600 text-center">
            🔒 Secure Access
          </p>
        </form>
      </div>

      {/* Animations */}
      <style>
        {`
          .animate-slide-up {
            animation: slideUp 0.4s ease-out;
          }
          .animate-fade-in {
            animation: fadeIn 1s ease-out;
          }
          .animate-line {
            animation: lineGrow 1.2s ease-out;
          }
          .animate-shake {
            animation: shake 0.3s;
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes lineGrow {
            from { width: 0; }
            to { width: 64px; }
          }
          @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            50% { transform: translateX(4px); }
            75% { transform: translateX(-4px); }
            100% { transform: translateX(0); }
          }
        `}
      </style>
    </div>
  );
}
