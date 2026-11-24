const TOKEN_KEY = "career_ai_token";

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if(token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(path, { ...options, headers });

    if(res.status === 401){
        clearToken();
        window.dispatchEvent(new Event("auth: expired"));
    }
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "request failed");
    return data as T;
}

export async function downloadResumePdf(): Promise<void> {
    const token = getToken();
    const res = await fetch("/api/resume/pdf", {
        method: "GET",
        headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
    });
    if(!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to download PDF" }));
        throw new Error(err.error || "Failed to download PDF");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Career_Resume.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export { getToken, setToken, clearToken, apiFetch };
