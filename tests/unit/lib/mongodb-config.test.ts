import { describe, expect, it } from 'vitest';
import { resolveMongoDatabaseName } from '@/lib/mongodb-config';

describe('MongoDB database selection', () => {
    it('honours an explicit override', () => {
        expect(resolveMongoDatabaseName('mongodb+srv://example.test/uri-db', 'admissionssathi')).toBe('admissionssathi');
    });
    it('uses the URI database instead of silently overriding it with a default', () => {
        expect(resolveMongoDatabaseName('mongodb+srv://example.test/admissionssathi?retryWrites=true')).toBe('admissionssathi');
    });
    it('supports multiple replica-set hosts and escaped database names', () => {
        expect(resolveMongoDatabaseName('mongodb://one:27017,two:27017/my%2Ddatabase?replicaSet=rs')).toBe('my-database');
    });
    it('keeps the legacy default only when neither setting supplies a database', () => {
        expect(resolveMongoDatabaseName('mongodb://localhost:27017/?retryWrites=true')).toBe('admission-sathi');
        expect(resolveMongoDatabaseName('mongodb://localhost:27017')).toBe('admission-sathi');
    });
});
