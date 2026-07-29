import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { gotoStable } from './helpers';

/**
 * Credentials for the seeded demo accounts.
 *
 * The admin workflows need a real signed-in staff session, which means a seeded
 * database (`npm run db:seed`). When the environment has not been provisioned the
 * specs skip instead of failing, matching how the public specs tolerate an empty
 * dataset.
 */
export const ADMIN_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@admissionsathi.org';
export const ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'Admin@12345';

/** A seeded staff account with a narrower role, for permission-boundary checks. */
export const CONTENT_MANAGER_EMAIL = 'content@admissionsathi.org';

export interface SignInResult {
    signedIn: boolean;
    landedOn: string;
}

/** Submits the credentials login form and waits for the post-login redirect. */
export async function signIn(page: Page, email: string, password: string): Promise<SignInResult> {
    await gotoStable(page, '/login');

    await page.getByLabel(/email/i).first().fill(email);
    await page.getByLabel(/password/i).first().fill(password);
    await page
        .getByRole('button', { name: /sign in|log in|login|continue/i })
        .first()
        .click();

    await page.waitForURL(/\/(admin|dashboard|account)/, { timeout: 25_000 }).catch(() => undefined);

    const pathname = new URL(page.url()).pathname;
    return { signedIn: !pathname.startsWith('/login'), landedOn: pathname };
}

/**
 * Where the reusable admin session cookies are cached between tests.
 *
 * `loginAction` rate-limits to ten attempts per email per fifteen minutes — brute
 * force protection we deliberately want in production. Signing in once per test
 * exhausts that budget partway through the admin suite and the rest of the specs
 * skip, so the session is captured once and replayed instead.
 */
const SESSION_CACHE = join(process.cwd(), 'test-results', '.auth', 'admin-session.json');

interface CachedCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
}

function readCachedCookies(): CachedCookie[] | null {
    try {
        const cookies = JSON.parse(readFileSync(SESSION_CACHE, 'utf8')) as CachedCookie[];
        // A session cookie has `expires: -1`; anything dated must still be in future.
        const usable = cookies.filter((cookie) => cookie.expires === -1 || cookie.expires * 1000 > Date.now());
        return usable.length > 0 ? usable : null;
    } catch {
        return null;
    }
}

function writeCachedCookies(cookies: CachedCookie[]): void {
    try {
        mkdirSync(dirname(SESSION_CACHE), { recursive: true });
        writeFileSync(SESSION_CACHE, JSON.stringify(cookies), 'utf8');
    } catch {
        // Caching is an optimisation; a failure here just means another login.
    }
}

/** True when the current context can open /admin. */
async function canReachAdmin(page: Page): Promise<boolean> {
    await gotoStable(page, '/admin');
    return new URL(page.url()).pathname === '/admin';
}

/**
 * Signs in as the seeded super admin, or skips the test.
 *
 * Skipping (rather than failing) keeps the suite meaningful on a machine without a
 * seeded MongoDB while still exercising the real login flow in CI. The first call
 * in a run performs a real credentials login; later calls replay its cookies, and
 * only fall back to a fresh login if the replayed session no longer works.
 */
export async function signInAsAdmin(page: Page, testInfo: TestInfo): Promise<void> {
    const cached = readCachedCookies();
    if (cached) {
        await page.context().addCookies(cached);
        if (await canReachAdmin(page)) return;
        await page.context().clearCookies();
    }

    const result = await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    if (!result.signedIn) {
        testInfo.skip(
            true,
            `Could not sign in as ${ADMIN_EMAIL}. Run \`npm run db:seed\` against a reachable MongoDB first, and note that login is rate-limited to 10 attempts per 15 minutes.`,
        );
    }

    if (!(await canReachAdmin(page))) {
        testInfo.skip(true, 'Signed-in account cannot reach /admin — reseed the demo staff users.');
    }

    writeCachedCookies((await page.context().cookies()) as CachedCookie[]);
}

/** Fills a labelled admin form field when it exists, ignoring optional ones. */
export async function fillIfPresent(page: Page, label: RegExp, value: string): Promise<boolean> {
    const field = page.getByLabel(label).first();
    if ((await field.count()) === 0) return false;
    await field.fill(value);
    return true;
}

/** Chooses a select option by its visible label when the control is present. */
export async function selectIfPresent(page: Page, label: RegExp, value: string): Promise<boolean> {
    const field = page.getByLabel(label).first();
    if ((await field.count()) === 0) return false;
    await field.selectOption({ label: value }).catch(async () => {
        await field.selectOption(value).catch(() => undefined);
    });
    return true;
}

/** Asserts the admin surface reported a successful mutation. */
export async function expectSaveSucceeded(page: Page): Promise<void> {
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(
        /saved|created|updated|published|success|imported|deleted/.test(body),
        `expected a success confirmation, page said:\n${body.slice(0, 600)}`,
    ).toBe(true);
}

/** A slug-safe unique suffix so repeated runs never collide. */
export function uniqueSuffix(): string {
    return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}
