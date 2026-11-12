import type { ReactElement } from "react";

import { useSignedIn } from "./auth";
import { MemberApp } from "./MemberApp";
import { PublicApp } from "./PublicApp";

/** Visitors read without an account; signing in switches to the member app (and signing out back). */
export function App(): ReactElement {
    return useSignedIn() ? <MemberApp /> : <PublicApp />;
}
