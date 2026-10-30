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
	vite: {
		plugins: [tailwindcss()],
	},
});
