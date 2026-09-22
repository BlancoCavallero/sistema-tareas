/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { applyD1Migrations, env } from 'cloudflare:test';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';

// Worker-side setup: apply every un-applied migration to the isolated D1
// database of the current test file (isolatedStorage isolates per file).
const migrations = env.TEST_MIGRATIONS as unknown as D1Migration[];
await applyD1Migrations(env.DB, migrations);
