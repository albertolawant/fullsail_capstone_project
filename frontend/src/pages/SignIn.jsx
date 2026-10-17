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

    if (loading) {
      return;
    }

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
        const errorData = await response.json().catch(() => null);

        throw new Error(
          typeof errorData?.detail === "string"
            ? errorData.detail
            : "Invalid email or password."
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
      localStorage.setItem(INTEREST_PROMPT_KEY, "true");

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

  const inputClass =
    "w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <main className="flex min-h-screen w-full min-w-0 items-center justify-center bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="w-full max-w-md">
        <section
          aria-labelledby="signin-title"
          className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl"
        >
          {/* Existing logo artwork */}
          <div className="border-b border-slate-800 bg-slate-950 px-6 py-6">
            <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-2xl bg-[#010A24]">
              <img
                src={logo}
                alt="Tanio AI"
                className="block h-auto w-full object-contain"
                draggable={false}
              />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-7 text-center">
              <h1
                id="signin-title"
                className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
              >
                Welcome to Tanio AI
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Sign in to access your workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} aria-busy={loading}>
              <div className="mb-5">
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-300"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  placeholder="demo@tanio.ai"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  disabled={loading}
                  className={inputClass}
                  data-testid="signin-email"
                />
              </div>

              <div className="mb-5">
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-300"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className={inputClass}
                  data-testid="signin-password"
                />
              </div>

              <div className="mb-6 rounded-xl border border-cyan-900 bg-cyan-950/30 p-4 text-sm text-slate-300">
                <p className="font-semibold text-cyan-400">
                  Demo Account
                </p>

                <dl className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-slate-400">Email:</dt>
                    <dd className="break-all">demo@tanio.ai</dd>
                  </div>

                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-slate-400">Password:</dt>
                    <dd>Demo123!</dd>
                  </div>
                </dl>
              </div>

              {error && (
                <p
                  className="mb-5 rounded-xl border border-red-800 bg-red-950 p-4 text-sm leading-6 text-red-300"
                  role="alert"
                  data-testid="signin-error"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="signin-button"
              >
                {loading && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950"
                  />
                )}

                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default SignIn;