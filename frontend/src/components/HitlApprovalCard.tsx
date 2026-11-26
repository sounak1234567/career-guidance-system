import { useState } from "react";
import type { HitlDecision } from "../../../shared/types";

export interface HitlInterruptPayload {
  message?: string;
  proposedChanges?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Props {
  payload: HitlInterruptPayload;
  onDecision: (decision: HitlDecision) => void;
  disabled?: boolean;
}

export function HitlApprovalCard({ payload, onDecision, disabled }: Props) {
  const initialData = payload.proposedChanges ?? payload;
  const [isEditing, setIsEditing] = useState(false);
  const [rawJson, setRawJson] = useState(() =>
    JSON.stringify(initialData, null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  const handleApprove = async () => {
    if (!isEditing) {
      await onDecision({ action: "approve" });
      return;
    }
    try {
      const editedPatch = JSON.parse(rawJson);
      await onDecision({ action: "approve", editedPatch: editedPatch });
    } catch (err) {
      setError("Invalid JSON format");
    }
  };

  return (
    <>
      <div className="my-3 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-sm shadow-md">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Profile Update Approval Required
          </span>
          <button
            type="button"
            onClick={() => {
              setIsEditing((prev) => !prev);
              setError(null);
            }}
            disabled={disabled}
            className="text-xs font-medium text-amber-400 underline hover:text-amber-300 disabled:opacity-50"
          >
            {isEditing ? "Cancel Edit" : "Edit JSON"}
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-300">
          {payload.message ||
            "The assistant wants to save the following details to your long-term profile:"}
        </p>

        {isEditing ? (
          <textarea
            rows={6}
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
          />
        ) : (
          <pre className="max-h-56 overflow-auto rounded-lg border border-slate-800 bg-slate-950/90 p-3 font-mono text-xs text-emerald-300">
            {JSON.stringify(initialData, null, 2)}
          </pre>
        )}

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={handleApprove}
            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {disabled ? "Resuming..." : isEditing ? "Save & Resume" : "Approve"}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onDecision({ action: "reject" })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </>
  );
}
