import './App.css';
import { useState, useEffect } from "react";
import { Workspace } from './components/Workspace';
import { AuthScreen, type UserSession } from './components/AuthScreen';
import { apiFetch, getToken, clearToken } from "./api/api";

const USER_STORAGE_KEY = "career_ai_user";

function App() {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved && getToken() ? JSON.parse(saved) : null;
  });
  const [verifying, setVerifying] = useState<boolean>(() => Boolean(getToken()));

  useEffect(() => {
    const handleExpired = () => {
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
    };
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  useEffect(() => {
    if(!getToken()) {
      setVerifying(false);
      return;
    }
    apiFetch<{ user: UserSession }>("/api/auth/me")
      .then((res) => {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
      })
      .catch(() => {
        clearToken();
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      })
      .finally(() => setVerifying(false));
  }, []);

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  };

  if(verifying) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
          Restoring workspace session...
        </div>
      </>
    );
  }

  if(!user) {
    return <AuthScreen onSuccess={handleLogout} />;
  }

  return <Workspace user={user} onLogout={handleLogout} />;
}

export default App
