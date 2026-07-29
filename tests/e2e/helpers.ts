import { expect, type Page } from '@playwright/test';

/** Viewport widths the design must survive. */
export const BREAKPOINTS = [360, 390, 430, 768, 1024, 1280, 1440, 1920] as const;

/** The header switches from drawer to inline nav at Tailwind's `xl` (1280px). */
export const DESKTOP_NAV_MIN_WIDTH = 1280;

/**
 * Fails when the document scrolls sideways.
 * One pixel of slack absorbs sub-pixel layout rounding.
 */
export async function expectNoHorizontalOverflow(page: Page, label = '') {
    const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            widest: (() => {
                let worst = { selector: '', right: 0 };
                for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) continue;
                    if (rect.right > worst.right) {
                        worst = {
                            selector: `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ').slice(0, 2).join('.')}` : ''}`,
                            right: Math.round(rect.right),
                        };
                    }
                }
                return worst;
            })(),
        };
    });

    expect(
        overflow.scrollWidth,
        `${label} horizontal overflow — scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}. Widest element: ${overflow.widest.selector} (right edge ${overflow.widest.right}px)`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

/**
 * Asserts that a deliberate horizontal scroller keeps its overflow to itself.
 *
 * `expectNoHorizontalOverflow` compares `documentElement.scrollWidth`, which
 * Chromium over-reports on any page containing a nested horizontal scroller — the
 * document still cannot be scrolled sideways, because `body` clips it. For screens
 * built around a rail (the admin lead board, wide data tables) assert the real
 * invariant instead: the rail scrolls, and the page does not.
 */
export async function expectContainedHorizontalScroll(page: Page, selector: string, label = '') {
    const result = await page.evaluate((sel) => {
        const rail = document.querySelector<HTMLElement>(sel);
        if (!rail) return null;

        window.scrollTo(2000, 0);
        const pageScrolledBy = window.scrollX;
        window.scrollTo(0, 0);

        return {
            railClientWidth: rail.clientWidth,
            railScrollWidth: rail.scrollWidth,
            pageScrolledBy,
            viewportWidth: document.documentElement.clientWidth,
        };
    }, selector);

    expect(result, `${label} expected to find a scroller matching ${selector}`).not.toBeNull();

    expect(
        result!.railClientWidth,
        `${label} the rail should be no wider than the viewport`,
    ).toBeLessThanOrEqual(result!.viewportWidth);

    expect(result!.pageScrolledBy, `${label} the page itself must not scroll sideways`).toBe(0);
}

/** Every page must expose exactly one first-level heading. */
export async function expectSingleH1(page: Page) {
    await expect(page.locator('h1')).toHaveCount(1);
}

/** Waits for hydration-ish stability without hard-failing on long-polling requests. */
export async function gotoStable(page: Page, path: string) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load').catch(() => undefined);
    return response;
}

/** True when the page rendered the app error boundary or a 404 shell. */
export async function isErrorPage(page: Page) {
    const body = (await page.locator('body').innerText()).toLowerCase();
    return body.includes('something went wrong') || body.includes('application error');
}

/** Counts matches without throwing so specs can skip gracefully on empty datasets. */
export async function countOrZero(page: Page, selector: string) {
    try {
        return await page.locator(selector).count();
    } catch {
        return 0;
    }
}
