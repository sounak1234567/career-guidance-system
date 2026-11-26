import React from "react";
import { useState, useEffect, useRef } from "react";
import { HitlApprovalCard } from "./HitlApprovalCard";
import type { HitlInterruptPayload } from "./HitlApprovalCard";
import type { UserSession } from "./AuthScreen";
import { apiFetch, downloadResumePdf } from "../api/api";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
}

interface Props {
    user: UserSession;
    onLogout: () => void;
}

export function Workspace({ user, onLogout }: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: "welcome", 
        role: "assistant", 
        text: `Hi ${user.name}! Tell me about your career skills, projects, or target role or ask me to build and save your resume.`
    }]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [pendingInterrupt, setPendingInterrupt] = useState<HitlInterruptPayload | null>(null);
    const [profile, setProfile] = useState<Record<string, any> | null>({});
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const loadProfile = async () => {
        try {
            const data = await apiFetch<{ profile: Record<string, any> }>("/api/profile");
            setProfile(data.profile || {});
        } catch (error) {
            console.error("Error loading profile:", error);
        }
    };
    useEffect(() => {
        loadProfile();
    }, []);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, pendingInterrupt]);
    const handleSend = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || sending || pendingInterrupt) return;

        setStatusError(null);
        setInput("");
        setMessages((prev) => [...prev, {
            id: `${Date.now().toString()}k${crypto.randomUUID()}`,
            role: "user",
            text: trimmed
        }]);
        setSending(true);

        try {
            const newMessage: ChatMessage = {
                id: Date.now().toString(),
                role: "user",
                text: input.trim()
            };
            setMessages((prev) => [...prev, newMessage]);
            setInput("");
        } catch (error) {
            console.error("Error sending message:", error);
            setStatusError("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const handleHitlDescision = async (decision: { action: string; editedPatch?: any }) => {
        setSending(true);
        setStatusError(null);
        try {
            const res = await apiFetch<{
                status: "completed" | "interrupted";
                reply?: string;
                interruptedPayload?: any;
            }>("/api/chat/resume", {
                method: "POST",
                body: JSON.stringify({ decision }),
            });

            if(res.status === "interrupted") {
                setPendingInterrupt(res.interruptedPayload);
            }
            else {
                setPendingInterrupt(null);
                if(res.reply) {
                    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: res.reply! }])
                }
                await loadProfile();
            }
        }
        catch (err: any) {
            setStatusError(err.message || "Failed to resume workflow");
        }
        finally {
            setSending(false);
        }
    };

    const handlePdfDownload = async () => {
        setDownloadingPdf(true);
        setStatusError(null);
        try {
            await downloadResumePdf();
        }
        catch (err: any) {
            setStatusError(err.message || "Failed to download PDF");
        }
        finally {
            setDownloadingPdf(false);
        }
    };

    return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-indigo-400">Career AI</span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
            {user.email}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          Sign Out
        </button>
      </header>

      {/* Main Split Workspace */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
        {/* Left: Chat & Inline HITL Stream (7 cols) */}
        <section className="flex flex-col border-r border-slate-800 lg:col-span-7">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-800 bg-slate-900 text-slate-200"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {pendingInterrupt && (
              <HitlApprovalCard
                payload={pendingInterrupt}
                onDecision={handleHitlDescision}
                disabled={sending}
              />
            )}

            {sending && !pendingInterrupt && (
              <div className="text-xs text-slate-400 animate-pulse">
                Agent is thinking & updating state...
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {statusError && (
            <div className="mx-6 mb-2 rounded-lg bg-red-950/70 px-3 py-2 text-xs text-red-300">
              {statusError}
            </div>
          )}

          {/* Chat Input */}
          <form onSubmit={handleSend} className="border-t border-slate-800 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                disabled={sending || Boolean(pendingInterrupt)}
                placeholder={
                  pendingInterrupt
                    ? "Approve or reject the card above to continue..."
                    : "Ask for career advice, update skills, or say 'Build my resume'..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={sending || Boolean(pendingInterrupt) || !input.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </section>

        {/* Right: Long-Term Memory Profile & Resume Export (5 cols) */}
        <aside className="flex flex-col justify-between overflow-y-auto bg-slate-900/40 p-6 lg:col-span-5">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Stored Career Profile
              </h2>
              <button
                type="button"
                onClick={loadProfile}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Refresh
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm space-y-3">
              <div>
                <span className="text-xs text-slate-400">Target Role</span>
                <p className="font-medium text-slate-100">
                  {profile?.targetRole || user.targetRole || "Not set yet"}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-400">Education</span>
                <p className="text-slate-200">{profile?.education || "Not set yet"}</p>
              </div>

              <div>
                <span className="text-xs text-slate-400">Skills</span>
                {Array.isArray(profile?.skills) && profile.skills.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {profile?.skills.map((skill: string) => (
                      <span
                        key={skill}
                        className="rounded-md bg-indigo-950/80 border border-indigo-500/30 px-2 py-0.5 text-xs text-indigo-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    Mention your skills in chat to populate your profile.
                  </p>
                )}
              </div>

              {Array.isArray(profile?.projects) && profile?.projects.length > 0 && (
                <div>
                  <span className="text-xs text-slate-400">Projects</span>
                  <ul className="mt-1 list-disc pl-4 text-xs text-slate-300 space-y-1">
                    {profile?.projects.map((proj: string, idx: number) => (
                      <li key={idx}>{proj}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Resume Action Card */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-200">ATS Resume PDF</h3>
            <p className="mt-1 text-xs text-slate-400">
              Ask the assistant to generate your resume in chat, then download the compiled PDF here.
            </p>
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={downloadingPdf}
              className="mt-3 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {downloadingPdf ? "Compiling PDF..." : "Download Resume PDF"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
