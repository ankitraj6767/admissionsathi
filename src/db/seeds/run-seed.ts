/* eslint-disable no-console */
import '@/db/load-script-env';
import { connectToDatabase, disconnectFromDatabase } from '@/db/connect';
import '@/db/models';
import {
    log,
    resetDatabase,
    seedCommunicationTemplates,
    seedGeo,
    seedHomepageSections,
    seedNavigation,
    seedRolesAndPermissions,
    seedSettings,
    seedStaticPages,
    seedUsers,
} from './seed-core';
import {
    recomputeCounters,
    seedCategories,
    seedColleges,
    seedCourses,
    seedExams,
} from './seed-catalog';
import {
    seedContent,
    seedCounsellors,
    seedFinance,
    seedPredictors,
    seedSampleLeads,
} from './seed-modules';
import { STATE_SEEDS } from './data/geo.data';

/**
 * Development seed script.
 *
 * Usage:
 *   npm run db:seed          # upsert (safe to re-run)
 *   npm run db:seed:fresh    # clear all collections first
 *
 * Every record inserted here is demonstration data. Fees, cut-offs, rankings,
 * ratings and placement figures are illustrative samples and must be replaced
 * with verified information before production use.
 */
async function main() {
    const fresh = process.argv.includes('--fresh');
    const started = Date.now();

    console.log('\n🌱  Admission Sathi — seeding demonstration data\n');
    await connectToDatabase();
    log('Connected to MongoDB');

    if (fresh) {
        console.log('\n▸ Resetting collections');
        await resetDatabase();
    }

    console.log('\n▸ Access control');
    await seedRolesAndPermissions();
    const adminId = await seedUsers();

    console.log('\n▸ Platform configuration');
    await seedSettings(adminId);
    await seedHomepageSections(adminId);
    await seedNavigation(adminId);
    await seedStaticPages(adminId);
    await seedCommunicationTemplates(adminId);

    console.log('\n▸ Geography');
    const { stateIdBySlug, cityIdBySlug } = await seedGeo(adminId, STATE_SEEDS);

    console.log('\n▸ Catalogue');
    const categoryIdBySlug = await seedCategories(adminId);
    const examIdBySlug = await seedExams(adminId, categoryIdBySlug);
    const courseIdBySlug = await seedCourses(adminId, categoryIdBySlug, examIdBySlug);
    const collegeIdBySlug = await seedColleges(adminId, {
        cityIdBySlug,
        categoryIdBySlug,
        courseIdBySlug,
        examIdBySlug,
    });

    console.log('\n▸ Modules');
    await seedPredictors(adminId, { examIdBySlug });
    await seedFinance(adminId, { courseIdBySlug, stateIdBySlug });
    await seedCounsellors(adminId, { categoryIdBySlug });
    await seedContent(adminId, { examIdBySlug, collegeIdBySlug, courseIdBySlug, stateIdBySlug });
    await seedSampleLeads(adminId);

    console.log('\n▸ Post-processing');
    await recomputeCounters();

    console.log(`\n✅  Seed complete in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
    console.log('   Admin login:   ', process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@admissionsathi.org');
    console.log('   Admin password:', process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'Admin@12345');
    console.log('   Student login: ', process.env.SEED_STUDENT_EMAIL ?? 'student@admissionsathi.org');
    console.log('   Staff logins:  content@ / colleges@ / exams@ / predictors@ / leads@ / finance@ / support@ / analyst@admissionsathi.org (password: Staff@12345)');
    console.log('\n   ⚠️  All seeded records are demonstration data. Replace before production use.\n');

    await disconnectFromDatabase();
    process.exit(0);
}

main().catch(async (error) => {
    console.error('\n❌  Seed failed\n', error);
    await disconnectFromDatabase().catch(() => undefined);
    process.exit(1);
});
