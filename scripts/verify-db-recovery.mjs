import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
const root = fileURLToPath(new URL('..', import.meta.url));
const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const origin = `http://localhost:${port}`;

(async () => {
  // No production database is touched: the app gets an isolated MongoDB URI.
  // Set MONGOMS_SYSTEM_BINARY to use an installed mongod instead of downloading one.
  const mongo = await MongoMemoryServer.create({
    instance: { dbName: 'recovery-verification' },
  });
  const mongoUri = mongo.getUri();
  const client = await MongoClient.connect(mongoUri);
  await client.db('recovery-verification').collection('colleges').insertOne({
    name: 'Recovery Probe University', slug: 'recovery-probe-university',
    status: 'published', cityName: 'Test City', stateName: 'Test State',
    ownership: 'Private', isFeatured: true, approvals: [], accreditation: [],
    categories: [], courses: [], examsAccepted: [], feeRange: { min: 100000 },
  });
  await client.close();
  fs.mkdirSync(new URL('../.playwright', import.meta.url), { recursive: true });
  const logPath = new URL('../.playwright/db-recovery-server.log', import.meta.url);
  const log = fs.openSync(logPath, 'w', 0o600);
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
    cwd: root,
    env: { ...process.env, MONGODB_URI: mongoUri, MONGODB_DB_NAME: 'recovery-verification',
      AUTH_SECRET: 'isolated-recovery-verification-secret', AUTH_URL: origin,
      NEXT_PUBLIC_SITE_URL: origin, NODE_ENV: 'production' },
    stdio: ['ignore', log, log],
  });
  const read = async (pathname) => {
    const response = await fetch(origin + pathname);
    return { status: response.status, body: await response.text() };
  };
  try {
    let healthy;
    for (let i = 0; i < 30; i++) {
      try { healthy = await read('/colleges'); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    assert(healthy?.body.includes('Recovery Probe University'), 'Isolated fixture must render');
    console.log('PASS healthy MongoDB → repository → server cache → rendered college card');

    await mongo.stop({ doCleanup: false, force: false });
    const warmDuringOutage = await read('/colleges');
    assert(warmDuringOutage.body.includes('Recovery Probe University'), 'Good cached content must survive MongoDB going offline');
    console.log('PASS last good cached listing remains available while MongoDB is stopped');

    const coldPath = '/colleges?q=Recovery%20Probe';
    const coldDuringOutage = await read(coldPath);
    assert(coldDuringOutage.body.includes('No colleges match these filters'), 'Cold outage should use the graceful listing fallback');
    console.log('PASS cold outage returns graceful fallback without crashing');

    const detailDuringOutage = await read('/colleges/recovery-probe-university');
    assert.notEqual(detailDuringOutage.status, 404, 'An unavailable database must not create a false 404');
    console.log('PASS unavailable detail lookup is not reported as a nonexistent college');

    await mongo.start(true);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const recovered = await read(coldPath);
    assert(recovered.body.includes('Recovery Probe University'), 'The outage fallback must not be cached for the 60-second TTL');
    console.log('PASS same cold URL immediately renders real data after MongoDB restarts; no cache TTL wait');

    const recoveredDetail = await read('/colleges/recovery-probe-university');
    assert.equal(recoveredDetail.status, 200);
    assert(recoveredDetail.body.includes('Recovery Probe University'));
    console.log('PASS detail page recovers after MongoDB restarts');
  } finally {
    server.kill('SIGTERM');
    await mongo.stop();
    fs.closeSync(log);
  }
})().catch(error => { console.error(error); console.error('Server log: .playwright/db-recovery-server.log'); process.exitCode = 1; });
