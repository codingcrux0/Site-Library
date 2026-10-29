// @ts-check

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// Static output: every page is built ahead of time into plain HTML files.
	// That is what makes pages fast and lets Cloudflare Pages serve them for free.
	output: 'static',
	// React is only used for "islands": small interactive pieces on a page.
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()],
	},
});
