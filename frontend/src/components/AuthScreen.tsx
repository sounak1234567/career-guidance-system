import { useState } from "react";
import React from "react";
import { apiFetch, setToken } from "../api/api";

export interface UserSession {
  id: number;
  name: string;
  email: string;
  targetRole?: string;
}

interface Props {
  onSuccess: (userSession: UserSession) => void;
}

export function AuthScreen({ onSuccess }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? "api/auth/register" : "api/auth/login";
      const body = isRegister
        ? { name, email, password, targetRole }
        : { email, password };

      const res = await apiFetch<{ user: UserSession; token: string }>(
        endpoint,
        { method: "POST", body: JSON.stringify(body) },
      );

      setToken(res.token);
      // onSuccess(res.user);
      console.log(res.user);
    } catch (err: any) {
      console.log(err);
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <h1 className="text-2xl font-bold tracking-tight">
            Career AI Workspace
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {isRegister
              ? "Create an account to build your profile & resume"
              : "Sign in to continue your session"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mr-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Target Role (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI/ML Engineer, Full-Stack Developer"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-950/60 p-2.5 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsRegister((prev) => !prev);
              setError(null);
            }}
            className="mt-5 w-full text-center text-xs text-slate-400 hover:text-slate-200"
          >
            {isRegister
              ? "Already have an account? Sign in"
              : "Need an account? Register"}
          </button>
        </div>
      </div>
    </>
  );
}
