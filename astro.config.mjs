// @ts-check

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import preloadIslands from './scripts/preload-islands.mjs';

// https://astro.build/config
export default defineConfig({
	// Static output: every page is built ahead of time into plain HTML files.
	// That is what makes pages fast and lets Cloudflare Pages serve them for free.
	output: 'static',
	// Astro's developer toolbar (the dark bar at the bottom of `npm run dev`) is switched off: it is not part of this website.
	devToolbar: { enabled: false },
	// React is only used for "islands": small interactive pieces on a page.
	integrations: [react(), preloadIslands()],
	// Put the (small) stylesheet inside each page instead of a separate file: the browser will not start the page's scripts until a
	// stylesheet has downloaded, so on a slow connection that one file delayed everything behind it.
	build: { inlineStylesheets: 'always' },
	// Content Security Policy: the browser runs ONLY this site's own scripts (Astro lists a fingerprint of each inline script in a <meta> tag
	// at build time), so a script injected by someone else would be refused. Styles allow inline, because the pages use style="..." for the
	// drop-in delays; that is much lower risk than scripts. Everything else may only come from this site itself (no outside fonts or trackers, and pictures only
	// from the two places a profile picture can come from: Google and GitHub). frame-ancestors cannot go in a <meta> tag, so it is in public/_headers.
	security: {
		csp: {
			directives: [
				"default-src 'self'",
				"img-src 'self' data: https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
				"connect-src 'self' https://xqvqsdoxtcgeuwwbfhbg.supabase.co",
				"object-src 'none'",
				"base-uri 'self'",
				"form-action 'self'",
			],
			styleDirective: { resources: ["'self'", "'unsafe-inline'"] },
		},
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
