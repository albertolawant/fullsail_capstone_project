import { useState } from "react";
import { useNavigate } from "react-router-dom";

import logo from "../assets/logo.png";

const INTEREST_PROMPT_KEY = "tanioInterestPromptPending";

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

      formData.append("username", email.trim());
      formData.append("password", password);

      const response = await fetch(
        "http://127.0.0.1:8000/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.detail || "Invalid email or password."
        );
      }

      const data = await response.json();

      if (!data?.access_token) {
        throw new Error(
          "The server did not return an authentication token."
        );
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("tanioSession", "true");

      localStorage.setItem(
        INTEREST_PROMPT_KEY,
        "true"
      );

      localStorage.setItem(
        "tanioUser",
        JSON.stringify({
          email: email.trim(),
          username:
            email.trim().toLowerCase() === "demo@tanio.ai"
              ? "Demo User"
              : email.trim(),
        })
      );

      navigate("/", { replace: true });
    } catch (err) {
      localStorage.removeItem("token");
      localStorage.removeItem("tanioSession");
      localStorage.removeItem("tanioUser");
      localStorage.removeItem(INTEREST_PROMPT_KEY);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#010A24] p-6 text-white">
      <div className="w-full max-w-md">
        <img
          src={logo}
          alt="Tanio AI"
          className="mx-auto mb-1 h-64 object-contain"
        />

        <div className="w-full rounded-2xl border border-slate-800 bg-[#07142F] p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              Welcome to Tanio AI
            </h1>

            <p className="mt-2 text-slate-400">
              Sign in to access your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label
                htmlFor="email"
                className="mb-2 block text-sm text-slate-300"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="demo@tanio.ai"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-cyan-500 focus:outline-none"
                data-testid="signin-email"
              />
            </div>

            <div className="mb-5">
              <label
                htmlFor="password"
                className="mb-2 block text-sm text-slate-300"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-cyan-500 focus:outline-none"
                data-testid="signin-password"
              />
            </div>

            <div className="mb-5 rounded-lg border border-cyan-900 bg-cyan-950/30 p-3 text-sm text-slate-300">
              <p className="font-semibold text-cyan-400">
                Demo Account
              </p>

              <p>Email: demo@tanio.ai</p>
              <p>Password: Demo123!</p>
            </div>

            {error && (
              <p
                className="mb-5 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300"
                role="alert"
                data-testid="signin-error"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-cyan-500 py-3 font-semibold text-slate-950 transition-all duration-200 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
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