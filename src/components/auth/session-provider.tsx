'use client';

import { SessionProvider } from 'next-auth/react';

/** Keeps public page rendering static while the header resolves the visitor's session in the browser. */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}
