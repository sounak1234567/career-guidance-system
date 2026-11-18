export interface UserDTO{
    id: number;
    name: string;
    email: string;
    targetRole?: string | null;
}

export interface HitlInterruptPayload {
    type: "MEMORY_UPDATE_CONFIRMATION" | "RESUME_GENERATION_CONFIRMATION";
    message: string;
    proposedChanges: Record<string, unknown>;
}

export interface HitlDecision{
    action: "approve" | "edit" | "reject";
    editedPatch?: Record<string, unknown>;
}

export interface ChatResponse{
    status: "completed" | "interrupted";
    reply?: string;
    interruptPayload?: HitlInterruptPayload;
}
