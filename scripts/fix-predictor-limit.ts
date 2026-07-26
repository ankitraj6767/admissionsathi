/* eslint-disable no-console */
import '@/db/load-script-env';
import { connectToDatabase, disconnectFromDatabase, mongoose } from '@/db/connect';
import '@/db/models';
import { HomepageSection } from '@/db/models/site.model';

/**
 * One-off: lowers the stored `college_predictor` card limit to 4.
 *
 * The seeded row carries `config.limit = 6`, which pre-dates the layout fix and
 * is what the live homepage reads — changing the default in
 * `config/homepage-defaults.ts` only affects fresh installs. Editable afterwards
 * from /admin/homepage.
 */
const TARGET = 4;

async function main() {
    await connectToDatabase();
    console.log('database:', mongoose.connection.db?.databaseName);

    const section = await HomepageSection.findOne({ key: 'college_predictor' }).exec();
    if (!section) {
        console.log('No college_predictor section stored — nothing to do (defaults apply).');
        await disconnectFromDatabase();
        return;
    }

    const config = (section.config ?? {}) as Record<string, unknown>;
    const draft = (section.draftConfig ?? undefined) as Record<string, unknown> | undefined;
    console.log('current config.limit     :', config.limit);
    console.log('current draftConfig.limit:', draft?.limit ?? '(no draft)');

    if (config.limit === TARGET && (!draft || draft.limit === TARGET)) {
        console.log(`\nAlready ${TARGET}. No change.`);
        await disconnectFromDatabase();
        return;
    }

    const update: Record<string, unknown> = { 'config.limit': TARGET };
    if (draft) update['draftConfig.limit'] = TARGET;

    await HomepageSection.updateOne({ _id: section._id }, { $set: update }).exec();

    const after = await HomepageSection.findOne({ key: 'college_predictor' })
        .select({ config: 1, draftConfig: 1 })
        .lean()
        .exec();

    console.log('\nupdated config.limit     :', (after?.config as { limit?: number })?.limit);
    console.log('updated draftConfig.limit:', (after?.draftConfig as { limit?: number })?.limit ?? '(no draft)');

    await disconnectFromDatabase();
}

main().catch(async (error) => {
    console.error('\nFAILED:', error instanceof Error ? error.message : error);
    await disconnectFromDatabase().catch(() => undefined);
    process.exit(1);
});
