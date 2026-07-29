import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectSingleH1, gotoStable, isErrorPage } from './helpers';

/**
 * SEO landing pages and their directory indexes.
 *
 * Each index must render even on an empty database — that is the whole point of an
 * empty state — so these specs assert the page resolves and is well-formed rather
 * than asserting on seeded rows.
 */
const DIRECTORY_INDEXES = [
    { path: '/colleges/state', heading: /colleges by state/i },
    { path: '/colleges/city', heading: /colleges by city/i },
    { path: '/colleges/course', heading: /colleges by course/i },
    { path: '/colleges/exam', heading: /colleges by entrance exam/i },
    { path: '/courses/category', heading: /courses by stream/i },
    { path: '/courses/level', heading: /courses by level/i },
    { path: '/exams/category', heading: /entrance exams by category/i },
    { path: '/scholarships/course', heading: /scholarships by course/i },
    { path: '/counselling/state', heading: /counselling by state/i },
];

for (const index of DIRECTORY_INDEXES) {
    test(`directory index ${index.path} renders`, async ({ page }) => {
        const response = await gotoStable(page, index.path);

        expect(response?.status(), `${index.path} should not error`).toBeLessThan(400);
        expect(await isErrorPage(page)).toBe(false);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(index.heading);
        await expectSingleH1(page);
        await expectNoHorizontalOverflow(page, index.path);
    });
}

test('enum-backed landings resolve without a database lookup', async ({ page }) => {
    for (const path of ['/courses/level/undergraduate', '/exams/category/engineering']) {
        const response = await gotoStable(page, path);
        expect(response?.status(), `${path} should resolve`).toBeLessThan(400);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
});

test('an unknown level slug returns a not-found page rather than an empty listing', async ({ page }) => {
    const response = await gotoStable(page, '/courses/level/post-doctorate');
    expect(response?.status()).toBe(404);
});

test('an unknown exam category slug returns not found', async ({ page }) => {
    const response = await gotoStable(page, '/exams/category/astrology');
    expect(response?.status()).toBe(404);
});

test('the static directory segment wins over the sibling dynamic route', async ({ page }) => {
    // `/exams/category` must render the index, not `/exams/[slug]` with slug="category".
    await gotoStable(page, '/exams/category');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/entrance exams by category/i);

    await gotoStable(page, '/courses/level');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/courses by level/i);
});

test('the footer links every directory index', async ({ page }) => {
    await gotoStable(page, '/');
    const footer = page.locator('footer');

    for (const index of DIRECTORY_INDEXES) {
        await expect(
            footer.locator(`a[href="${index.path}"]`).first(),
            `footer should link ${index.path}`,
        ).toHaveCount(1);
    }
});

test('sitemap index advertises the taxonomy shard', async ({ page }) => {
    const response = await page.request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('/sitemaps/taxonomy.xml');
});

test('the taxonomy shard lists the enum-backed landings', async ({ page }) => {
    const response = await page.request.get('/sitemaps/taxonomy.xml');
    expect(response.status()).toBe(200);

    const xml = await response.text();
    expect(xml).toContain('/courses/level/undergraduate');
    expect(xml).toContain('/exams/category/engineering');
});
