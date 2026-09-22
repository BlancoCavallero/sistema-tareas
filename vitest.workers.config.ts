import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(async () => {
	// Node-side: read the migration files once, pass them as a binding that the
	// worker-side setup file applies to the per-file isolated D1 database.
	const migrations = await readD1Migrations(path.join(here, 'migrations'));

	return {
		resolve: {
			alias: {
				$lib: path.join(here, 'src/lib')
			}
		},
		plugins: [
			cloudflareTest({
				// Picks up the `DB` D1 binding declared in wrangler.jsonc.
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: {
					bindings: { TEST_MIGRATIONS: migrations }
				}
			})
		],
		test: {
			name: 'workers',
			include: ['src/**/*.workers.test.ts'],
			expect: { requireAssertions: true },
			setupFiles: ['./src/test/setup-workers.ts']
		}
	};
});
