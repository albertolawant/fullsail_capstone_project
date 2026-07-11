import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

function SignIn() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("demo@tanio.ai");
  const [password, setPassword] = useState("Demo123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams();

      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Invalid email or password."
        );
      }

      const data = await response.json();

      localStorage.setItem("token", data.access_token);

      localStorage.setItem("tanioSession", "true");

      localStorage.setItem(
        "tanioUser",
        JSON.stringify({
          email,
          username: email === "demo@tanio.ai" ? "Demo User" : email,
        })
      );

      navigate("/");
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#010A24] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <img
          src={logo}
          alt="Tanio AI"
          className="h-64 mx-auto mb-1 object-contain"
        />

        <div className="w-full bg-[#07142F] border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Welcome to Tanio AI</h1>

            <p className="text-slate-400 mt-2">
              Sign in to access your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label
                htmlFor="email"
                className="block text-sm text-slate-300 mb-2"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="demo@tanio.ai"
                autoComplete="email"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
                data-testid="signin-email"
              />
            </div>

            <div className="mb-5">
              <label
                htmlFor="password"
                className="block text-sm text-slate-300 mb-2"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
                data-testid="signin-password"
              />
            </div>

            <div className="mb-5 rounded-lg border border-cyan-900 bg-cyan-950/30 p-3 text-sm text-slate-300">
              <p className="font-semibold text-cyan-400">Demo Account</p>
              <p>Email: demo@tanio.ai</p>
              <p>Password: Demo123!</p>
            </div>

            {error && (
              <p
                className="mb-5 bg-red-950 border border-red-800 text-red-300 rounded-lg p-3 text-sm"
                role="alert"
                data-testid="signin-error"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="signin-button"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default SignIn;