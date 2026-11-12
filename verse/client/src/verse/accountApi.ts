export interface SignupInput {
    readonly email: string;
    readonly displayName: string;
    readonly password: string;
    readonly over18: boolean;
}

/** Creates the account on the server. Rejects with the server's plain-language message. */
export async function signup(input: SignupInput): Promise<void> {
    const response = await fetch("/api/v1/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(input)
    });
    if (response.status === 201) {
        return;
    }
    let message = "Something went wrong. Please try again.";
    try {
        const body = (await response.json()) as { detail?: string; message?: string };
        if (body.detail ?? body.message) {
            message = (body.detail ?? body.message) as string;
        }
    } catch {
        // keep the generic message
    }
    throw new Error(message);
}

export { signIn } from "./auth";
