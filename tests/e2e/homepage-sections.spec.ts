import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectSingleH1, gotoStable } from './helpers';

/**
 * Homepage sections added to the builder.
 *
 * Every section renders nothing when its data list is empty, so these assertions
 * double as a check that the seeded catalogue actually reaches the page. They are
 * written against the section landmark rather than exact copy, because the headings
 * are editable from `/admin/homepage`.
 */
const SECTIONS = [
    { label: 'featured colleges', href: /^\/colleges\/[a-z0-9-]+$/ },
    { label: 'scholarships', href: /^\/scholarships\/[a-z0-9-]+$/ },
    { label: 'articles', href: /^\/articles\/[a-z0-9-]+$/ },
    { label: 'counsellors', href: /^\/counsellors\/[a-z0-9-]+$/ },
];

test.describe('homepage sections', () => {
    test('still renders exactly one h1 with all sections enabled', async ({ page }) => {
        await gotoStable(page, '/');
        await expectSingleH1(page);
    });

    for (const section of SECTIONS) {
        test(`links out to ${section.label} detail pages`, async ({ page }) => {
            await gotoStable(page, '/');

            const hrefs = await page.locator('main a').evaluateAll((nodes) =>
                nodes.map((node) => node.getAttribute('href') ?? ''),
            );

            expect(
                hrefs.filter((href) => section.href.test(href)).length,
                `expected at least one ${section.label} link on the homepage`,
            ).toBeGreaterThan(0);
        });
    }

    test('surfaces the SEO landing pages for internal linking', async ({ page }) => {
        await gotoStable(page, '/');
        const main = page.locator('main');

        // The directory block is the homepage's link into the landing-page families.
        await expect(main.locator('a[href^="/colleges/state/"]').first()).toBeAttached();
        await expect(main.locator('a[href^="/colleges/city/"]').first()).toBeAttached();
        await expect(main.locator('a[href^="/courses/level/"]').first()).toBeAttached();
        await expect(main.locator('a[href^="/colleges/exam/"]').first()).toBeAttached();
    });

    test('emits FAQPage structured data for the FAQ section', async ({ page }) => {
        await gotoStable(page, '/');

        const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
        const faqBlock = blocks.find((block) => block.includes('FAQPage'));

        expect(faqBlock, 'expected a FAQPage JSON-LD block').toBeTruthy();
        const parsed = JSON.parse(faqBlock!) as { mainEntity?: unknown[] };
        expect(Array.isArray(parsed.mainEntity) && parsed.mainEntity.length).toBeGreaterThan(0);
    });

    test('shows a countdown on the upcoming dates section', async ({ page }) => {
        await gotoStable(page, '/');

        // Either a relative countdown or "today" — both prove the date maths ran.
        await expect(page.getByText(/in \d+ days?|• today/).first()).toBeVisible();
    });

    test('renders the loan promo card that closes the right rail gap', async ({ page }) => {
        await gotoStable(page, '/');

        const promo = page.locator('section[aria-labelledby="loan-promo-heading"]');
        await expect(promo).toBeVisible();
        await expect(promo.getByRole('link')).toHaveAttribute('href', /education-loans/);
    });

    // The homepage is the page most likely to break at a narrow width, and it now
    // carries far more content than it did.
    for (const width of [360, 390, 768, 1280, 1920]) {
        test(`has no horizontal overflow at ${width}px with every section on`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await gotoStable(page, '/');
            await expectNoHorizontalOverflow(page, `homepage @${width}`);
        });
    }
});
