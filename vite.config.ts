import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		}),
		svelteTesting()
	],
	test: {
		projects: [
			{
				// Unit + component tests: jsdom (WebCrypto polyfilled via setup file).
				// `extends: true` inherits the root sveltekit + svelteTesting plugins
				// (required for compiling .svelte components). Default only in Vitest 5.
				extends: true,
				test: {
					name: 'unit',
					environment: 'jsdom',
					expect: { requireAssertions: true },
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['**/node_modules/**', 'src/**/*.workers.test.ts'],
					setupFiles: ['./src/test/setup-jsdom.ts']
				}
			},
			// D1 integration tests: @cloudflare/vitest-pool-workers (workerd).
			'./vitest.workers.config.ts'
		]
	}
});
