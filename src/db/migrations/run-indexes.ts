/* eslint-disable no-console */
import '@/db/load-script-env';
import { connectToDatabase, disconnectFromDatabase, mongoose } from '@/db/connect';
import '@/db/models';

/**
 * Index migration.
 *
 * Production builds run with `autoIndex: false`, so indexes are created here
 * explicitly. Safe to re-run: Mongoose only creates what is missing.
 *
 *   npm run db:indexes
 */
async function main() {
    console.log('\n🔧  Admission Sathi — synchronising MongoDB indexes\n');
    await connectToDatabase();

    const names = Object.keys(mongoose.models).sort();
    let created = 0;
    let failed = 0;

    for (const name of names) {
        const model = mongoose.models[name]!;
        try {
            await model.createIndexes();
            const indexes = await model.collection.indexes().catch(() => []);
            created += indexes.length;
            console.log(`  ✓ ${name.padEnd(22)} ${indexes.length} indexes`);
        } catch (error) {
            failed += 1;
            console.error(`  ✗ ${name}:`, error instanceof Error ? error.message : error);
        }
    }

    console.log(`\n✅  ${names.length} models processed, ${created} indexes present, ${failed} failures\n`);
    await disconnectFromDatabase();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (error) => {
    console.error('\n❌  Index migration failed\n', error);
    await disconnectFromDatabase().catch(() => undefined);
    process.exit(1);
});
