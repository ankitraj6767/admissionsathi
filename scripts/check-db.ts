/* eslint-disable no-console */
import '@/db/load-script-env';
import { connectToDatabase, disconnectFromDatabase, mongoose } from '@/db/connect';
import '@/db/models';

/** Reports which database the app is actually pointed at, and what is in it. */
async function main() {
    await connectToDatabase();
    const db = mongoose.connection.db!;
    console.log('host      :', mongoose.connection.host);
    console.log('database  :', db.databaseName);

    const collections = await db.collections();
    if (collections.length === 0) {
        console.log('\nEMPTY — no collections. Run db:indexes then db:seed.');
        await disconnectFromDatabase();
        return;
    }

    const rows = await Promise.all(
        collections.map(async (c) => ({
            name: c.collectionName,
            count: await c.estimatedDocumentCount(),
        })),
    );

    console.log('\ncollections:');
    for (const row of rows.sort((a, b) => b.count - a.count)) {
        console.log(`  ${String(row.count).padStart(6)}  ${row.name}`);
    }
    console.log('\ntotal documents:', rows.reduce((sum, r) => sum + r.count, 0));

    await disconnectFromDatabase();
}

main().catch(async (error) => {
    console.error('\nFAILED:', error instanceof Error ? error.message : error);
    await disconnectFromDatabase().catch(() => undefined);
    process.exit(1);
});
