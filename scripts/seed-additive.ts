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
