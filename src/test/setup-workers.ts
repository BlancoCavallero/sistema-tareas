/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { applyD1Migrations, env } from 'cloudflare:test';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';

// Worker-side setup: apply every un-applied migration to the isolated D1
// database of the current test file (isolatedStorage isolates per file).
// TEST_MIGRATIONS is injected at runtime by the pool, not declared in Env.
const migrations = (
	env as unknown as { TEST_MIGRATIONS: D1Migration[] }
).TEST_MIGRATIONS;
await applyD1Migrations(env.DB, migrations);
