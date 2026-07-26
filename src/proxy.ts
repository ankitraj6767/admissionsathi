import NextAuth from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '@/lib/auth/auth.config';

/**
 * Edge proxy (the Next.js 16 replacement for the deprecated `middleware` file
 * convention — same placement, same `config.matcher` semantics).
 *
 * Uses the database-free Auth.js config so it can run on the edge runtime.
 * This is coarse route protection only — every Server Action and service
 * re-checks permissions server-side.
 */
const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = ['/admin', '/dashboard'];

export default auth((request) => {
    const { nextUrl } = request;
    const isLoggedIn = Boolean(request.auth?.user);
    const roles = (request.auth?.user as { roles?: string[] } | undefined)?.roles ?? [];
    const isStaff = roles.some((role) => role !== 'student');

    const needsAuth = PROTECTED_PREFIXES.some((prefix) => nextUrl.pathname.startsWith(prefix));

    if (needsAuth && !isLoggedIn) {
        const loginUrl = new URL('/login', nextUrl.origin);
        loginUrl.searchParams.set('callbackUrl', `${nextUrl.pathname}${nextUrl.search}`);
        return NextResponse.redirect(loginUrl);
    }

    if (nextUrl.pathname.startsWith('/admin') && isLoggedIn && !isStaff) {
        return NextResponse.redirect(new URL('/403', nextUrl.origin));
    }

    // Signed-in users should not see the auth screens.
    if (isLoggedIn && ['/login', '/signup'].includes(nextUrl.pathname)) {
        return NextResponse.redirect(new URL(isStaff ? '/admin' : '/dashboard', nextUrl.origin));
    }

    /*
     * Nothing to do — fall through without constructing a response.
     *
     * Returning `NextResponse.next()` here would make the middleware response
     * the base for the route, which pins the status line to 200 and turns every
     * downstream `notFound()` into a soft 404.
     */
    return undefined;
}) as unknown as (request: NextRequest) => NextResponse | Promise<NextResponse>;

export const config = {
    matcher: [
        /*
         * Run on everything except static assets, images and the analytics collector
         * (which must stay as cheap as possible).
         */
        '/((?!api/analytics|_next/static|_next/image|favicon.ico|brand|resources|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|pdf)$).*)',
    ],
};
