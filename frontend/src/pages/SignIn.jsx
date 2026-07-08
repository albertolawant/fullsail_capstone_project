// Email: demo@tanio.ai
// Password: Demo123!

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

function SignIn() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (email === "demo@tanio.ai" && password === "Demo123!") {
      localStorage.setItem("tanioSession", "true");

      localStorage.setItem(
        "tanioUser",
        JSON.stringify({
          username: "Demo User",
          email: "demo@tanio.ai",
        })
      );

      navigate("/");
      return;
    }

    setError("Invalid email or password.");
  };

  return (
    <main className="min-h-screen bg-[#010A24] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <img
            src={logo}
            alt="Tanio AI"
            className="h-64 mx-auto mb-1 object-contain"
        />
      
        <div className="w-full max-w-md bg-[#07142F] border border-slate-800 rounded-2xl p-8 shadow-xl">
            <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Welcome to Tanio AI</h1>

            <p className="text-slate-400 mt-2">
                Sign in to access your workspace.
            </p>
            </div>

            <form onSubmit={handleSubmit}></form>

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
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-3 rounded-lg transition-all duration-200"
                data-testid="signin-button"
            >
                Sign In
            </button>
        </div>
      </div>
    </main>
  );
}

export default SignIn;