/** Explicit dbName wins; otherwise honour the database in the connection URI. */
export function resolveMongoDatabaseName(uri: string, override?: string): string {
    if (override?.trim()) return override.trim();
    // Avoid URL(): valid MongoDB replica-set URIs may contain multiple hosts.
    const database = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/#]+)/i.exec(uri)?.[1];
    return database ? decodeURIComponent(database) : 'admission-sathi';
}
