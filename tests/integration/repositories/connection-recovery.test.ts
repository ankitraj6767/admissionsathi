import { describe, expect, it } from 'vitest';
import { connectToDatabase, mongoose } from '@/db/connect';

describe('MongoDB connection recovery with a real database', () => {
    it('reads existing documents after the underlying connection was closed externally', async () => {
        const Probe = mongoose.models.ConnectionRecoveryProbe ?? mongoose.model(
            'ConnectionRecoveryProbe', new mongoose.Schema({ label: String }),
        );
        await Probe.create({ label: 'survives reconnect' });

        // Bypass the application disconnect helper: its cached connection must
        // detect this lifecycle change on the next read.
        await mongoose.disconnect();
        const connection = await connectToDatabase();
        expect(connection.connection.readyState).toBe(1);
        expect(await Probe.findOne().lean()).toMatchObject({ label: 'survives reconnect' });
    });
});
