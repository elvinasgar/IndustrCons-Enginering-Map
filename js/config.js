/**
 * config.js — single place to edit site-wide constants.
 *
 * IMPORTANT: SITE_URL is a best guess based on prior screenshots
 * ("elvinasgar.github.io/In…"). Confirm your exact GitHub Pages URL
 * (Settings → Pages, once published) and update SITE_URL below — it
 * feeds the canonical tags, Organization schema, and sitemap.xml.
 * If it's wrong, search engines will still index the site fine; only
 * the canonical/OG URLs embedded in the HTML need correcting.
 */

const SITE_CONFIG = {
  siteUrl: 'https://elvinasgar.github.io/industrcons-map/',
  siteName: 'IndustrCons Engineering Map',
  description: 'A static, offline-capable map of construction projects, infrastructure and engineering organizations worldwide.',
  logo: 'assets/icons/logo-512.png',
  ogImage: 'assets/og/og-cover.png',
  ecosystem: [
    { label: 'Knowledge Center', url: 'https://industrconsestimator.netlify.app/', desc: 'Cost estimating tools & reference data' },
    { label: 'Docs', url: 'https://industrconsdocs.netlify.app/', desc: 'Platform documentation' },
    { label: 'AI', url: 'https://industrcons-ai.vercel.app/', desc: 'IndustrCons AI assistant' },
  ],
};

window.SITE_CONFIG = SITE_CONFIG;
