/* eslint-disable no-console */
import '../src/db/load-script-env';
import { connectToDatabase, disconnectFromDatabase } from '../src/db/connect';

/**
 * Additive seeder — upserts only, no deletes.
 *
 * `npm run db:seed` is destructive: `seedSampleLeads` opens with
 * `Lead.deleteMany({})` and `CounsellingBooking.deleteMany({})`, which removes real
 * enquiries alongside the demo ones. That makes it unusable against a live database.
 *
 * This script runs the subset that is safe to re-run at any time:
 *
 *   - form definitions      (upsert by `key`)
 *   - email / WhatsApp templates (upsert by `key`)
 *   - counsellor focus states    (field update on existing counsellors)
 *
 * Usage: npx tsx --conditions=react-server scripts/seed-additive.ts
 */
async function main() {
    await connectToDatabase();

    const { User } = await import('../src/db/models/user.model');
    const admin = await User.findOne({ roles: 'super_admin' }).select('_id email').lean();
    if (!admin) {
        throw new Error('No super_admin user found. Run the full seed on a scratch database first.');
    }
    console.log(`  Acting as ${admin.email}`);

    const { seedForms, seedCommunicationTemplates } = await import('../src/db/seeds/seed-core');
    await seedCommunicationTemplates(admin._id);
    await seedForms(admin._id);

    /*
     * Homepage sections.
     *
     * `$setOnInsert` for all the copy, so a section an editor has already tuned is
     * left exactly as it is — only sections that do not exist yet are created. That
     * is the difference between this and `seedHomepageSections`, which refreshes
     * every row from the packaged draft and would discard editor changes.
     */
    const { HomepageSection } = await import('../src/db/models/site.model');
    const { HOMEPAGE_SECTION_DRAFTS } = await import('../src/config/homepage-defaults');

    let createdSections = 0;
    for (const draft of HOMEPAGE_SECTION_DRAFTS) {
        const result = await HomepageSection.updateOne(
            { key: draft.key },
            {
                $setOnInsert: {
                    key: draft.key,
                    name: draft.name,
                    isEnabled: draft.isEnabled,
                    displayOrder: draft.displayOrder,
                    heading: draft.heading,
                    subheading: draft.subheading,
                    description: draft.description,
                    ctaLabel: draft.ctaLabel,
                    ctaUrl: draft.ctaUrl,
                    config: draft.config,
                    hasUnpublishedChanges: false,
                    publishedAt: new Date(),
                    createdBy: admin._id,
                },
            },
            { upsert: true },
        );
        if (result.upsertedCount > 0) createdSections += 1;
    }
    console.log(`  Created ${createdSections} missing homepage section(s)`);

    /*
     * Normalise `displayOrder` to the packaged order.
     *
     * Inserting new sections alongside rows that kept their original numbering leaves
     * duplicates — `sticky_cta` and `featured_colleges` both landing on 11, for
     * instance — which makes the builder list order arbitrary. This touches only the
     * ordering field, never copy or config, and the public page renders in a fixed
     * layout order regardless, so it is safe to re-apply.
     */
    let reordered = 0;
    for (const draft of HOMEPAGE_SECTION_DRAFTS) {
        const result = await HomepageSection.updateOne(
            { key: draft.key, displayOrder: { $ne: draft.displayOrder } },
            { $set: { displayOrder: draft.displayOrder } },
        );
        if (result.modifiedCount > 0) reordered += 1;
    }
    console.log(`  Normalised display order on ${reordered} section(s)`);

    // Homepage FAQs, upserted by question so re-running never duplicates and never
    // deletes an FAQ an editor added.
    const { FAQ } = await import('../src/db/models/content.model');
    const { HOMEPAGE_FAQ_SEEDS } = await import('../src/db/seeds/data/homepage-faq.data');

    for (const [index, faq] of HOMEPAGE_FAQ_SEEDS.entries()) {
        await FAQ.updateOne(
            { scope: 'homepage', question: faq.question },
            {
                $set: {
                    answerHtml: faq.answerHtml,
                    category: faq.category,
                    displayOrder: (index + 1) * 10,
                    isFeatured: true,
                    status: 'active',
                    updatedBy: admin._id,
                },
                $setOnInsert: { scope: 'homepage', question: faq.question, createdBy: admin._id },
            },
            { upsert: true },
        );
    }
    console.log(`  Upserted ${HOMEPAGE_FAQ_SEEDS.length} homepage FAQ(s)`);

    // Counsellor focus states, so /counselling/state/[slug] lists counsellors who
    // actually cover that state instead of falling back to the general list.
    const { State } = await import('../src/db/models/geo.model');
    const { Counsellor } = await import('../src/db/models/counselling.model');
    const { COUNSELLOR_SEEDS } = await import('../src/db/seeds/data/people-content.data');

    const stateIdBySlug = new Map(
        (await State.find().select('_id slug').lean()).map((s) => [s.slug, s._id]),
    );

    let updated = 0;
    for (const seed of COUNSELLOR_SEEDS) {
        const focusStates = seed.stateSlugs
            .map((slug) => stateIdBySlug.get(slug))
            .filter((id): id is NonNullable<typeof id> => Boolean(id));

        const result = await Counsellor.updateOne({ slug: seed.slug }, { $set: { focusStates } });
        if (result.matchedCount > 0) updated += 1;
    }
    console.log(`  Set focus states on ${updated} counsellors`);

    await disconnectFromDatabase();
    console.log('\n  Done. No documents were deleted.');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
