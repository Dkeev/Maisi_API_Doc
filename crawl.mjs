import { load } from 'cheerio';
import TurndownService from 'turndown';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const BASE = 'https://docs.uniapi.ai';
const OUT_DIR = './src';

const pages = [
  // index
  { url: '/', file: 'index.md' },
  // docs/about
  { url: '/docs/about/introduction.html', file: 'docs/about/introduction.md' },
  { url: '/docs/about/base_api.html', file: 'docs/about/base_api.md' },
  { url: '/docs/about/billing_instructions.html', file: 'docs/about/billing_instructions.md' },
  { url: '/docs/about/group.html', file: 'docs/about/group.md' },
  // docs/use
  { url: '/docs/use/quickstart.html', file: 'docs/use/quickstart.md' },
  { url: '/docs/use/token.html', file: 'docs/use/token.md' },
  { url: '/docs/use/api.html', file: 'docs/use/api.md' },
  { url: '/docs/use/openai_sdk.html', file: 'docs/use/openai_sdk.md' },
  { url: '/docs/use/claude_sdk.html', file: 'docs/use/claude_sdk.md' },
  { url: '/docs/use/gemini_sdk.html', file: 'docs/use/gemini_sdk.md' },
  { url: '/docs/use/special_usage.html', file: 'docs/use/special_usage.md' },
  { url: '/docs/use/reasoning.html', file: 'docs/use/reasoning.md' },
  { url: '/docs/use/chat.html', file: 'docs/use/chat.md' },
  // docs/use/api sub-pages
  { url: '/docs/use/api/openai_compatible.html', file: 'docs/use/api/openai_compatible.md' },
  { url: '/docs/use/api/chat_completions.html', file: 'docs/use/api/chat_completions.md' },
  { url: '/docs/use/api/responses.html', file: 'docs/use/api/responses.md' },
  { url: '/docs/use/api/images.html', file: 'docs/use/api/images.md' },
  { url: '/docs/use/api/audio.html', file: 'docs/use/api/audio.md' },
  { url: '/docs/use/api/claude.html', file: 'docs/use/api/claude.md' },
  { url: '/docs/use/api/gemini.html', file: 'docs/use/api/gemini.md' },
  { url: '/docs/use/api/ocr.html', file: 'docs/use/api/ocr.md' },
  { url: '/docs/use/api/midjourney.html', file: 'docs/use/api/midjourney.md' },
  { url: '/docs/use/api/suno.html', file: 'docs/use/api/suno.md' },
  { url: '/docs/use/api/falai.html', file: 'docs/use/api/falai.md' },
  { url: '/docs/use/api/kling.html', file: 'docs/use/api/kling.md' },
  { url: '/docs/use/api/replicate.html', file: 'docs/use/api/replicate.md' },
  { url: '/docs/use/api/bfl.html', file: 'docs/use/api/bfl.md' },
  // docs/error
  { url: '/docs/error.html', file: 'docs/error.md' },
  // integration
  { url: '/integration/', file: 'integration/index.md' },
  { url: '/integration/Chatgpt-web-midjourney-proxy.html', file: 'integration/chatgpt-web-midjourney-proxy.md' },
  { url: '/integration/next_chat.html', file: 'integration/next_chat.md' },
  { url: '/integration/lobe_chat.html', file: 'integration/lobe_chat.md' },
  { url: '/integration/utools.html', file: 'integration/utools.md' },
  { url: '/integration/chatbox.html', file: 'integration/chatbox.md' },
  { url: '/integration/cursor.html', file: 'integration/cursor.md' },
  { url: '/integration/Continue.html', file: 'integration/continue.md' },
  { url: '/integration/Cherry_Studio.html', file: 'integration/cherry_studio.md' },
  { url: '/integration/ChatWise.html', file: 'integration/chatwise.md' },
  { url: '/integration/claude_code.html', file: 'integration/claude_code.md' },
  { url: '/integration/openai_codex.html', file: 'integration/openai_codex.md' },
  { url: '/integration/gemini_cli.html', file: 'integration/gemini_cli.md' },
  { url: '/integration/open_code.html', file: 'integration/open_code.md' },
];

const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// Keep code blocks with language hints
td.addRule('fencedCodeBlock', {
  filter: (node) => node.nodeName === 'PRE' && node.querySelector('code'),
  replacement: (content, node) => {
    const code = node.querySelector('code');
    const langClass = code.className.match(/language-(\S+)/);
    const lang = langClass ? langClass[1] : '';
    const text = code.textContent.replace(/\n$/, '');
    return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
  },
});

// Remove header anchor links
td.addRule('removeAnchors', {
  filter: (node) => node.nodeName === 'A' && node.classList.contains('header-anchor'),
  replacement: () => '',
});

// Handle VitePress custom containers (tip, warning, danger, info)
td.addRule('customContainer', {
  filter: (node) => node.nodeName === 'DIV' && node.classList.contains('custom-block'),
  replacement: (content, node) => {
    let type = 'info';
    for (const cls of ['tip', 'warning', 'danger', 'info', 'details']) {
      if (node.classList.contains(cls)) { type = cls; break; }
    }
    const title = node.querySelector('.custom-block-title');
    const titleText = title ? title.textContent.trim() : '';
    const bodyContent = content.replace(titleText, '').trim();
    if (type === 'details') {
      return `\n\n::: details ${titleText}\n${bodyContent}\n:::\n\n`;
    }
    return `\n\n::: ${type}${titleText && titleText !== type.toUpperCase() ? ' ' + titleText : ''}\n${bodyContent}\n:::\n\n`;
  },
});

// Remove hidden LLM hints
td.addRule('removeHidden', {
  filter: (node) => node.getAttribute('hidden') === 'true' || node.style?.display === 'none',
  replacement: () => '',
});

function brandReplace(text) {
  return text
    .replace(/UniAPI/g, 'Maisi')
    .replace(/uniapi\.ai/g, 'maisi-ai.com')
    .replace(/uniapi\.io/g, 'maisi-ai.com')
    .replace(/uniapi/gi, 'maisi')
    .replace(/api\.maisi-ai\.com/g, 'maisi-ai.com')
    .replace(/hk\.maisi-ai\.com/g, 'api.maisi-ai.com')
    .replace(/docs\.maisi-ai\.com/g, 'docs.maisi-ai.com');
}

async function crawlPage(pageInfo) {
  const url = BASE + pageInfo.url;
  console.log(`Fetching: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  FAILED ${res.status}: ${url}`);
      return null;
    }
    const html = await res.text();
    const $ = load(html);

    // For homepage, extract the hero section + features
    if (pageInfo.url === '/') {
      return extractHomepage($);
    }

    // For doc pages, extract .vp-doc content
    const docEl = $('.vp-doc');
    if (!docEl.length) {
      console.error(`  No .vp-doc found: ${url}`);
      return null;
    }

    // Remove hidden elements
    docEl.find('[hidden], [style*="display:none"]').remove();
    // Remove iconify icons text but keep the text after
    docEl.find('iconify-icon').remove();

    const rawHtml = docEl.html();
    let md = td.turndown(rawHtml);
    md = brandReplace(md);
    // Clean up excessive newlines
    md = md.replace(/\n{3,}/g, '\n\n').trim();
    return md;
  } catch (e) {
    console.error(`  ERROR: ${url}: ${e.message}`);
    return null;
  }
}

function extractHomepage($) {
  // Build a VitePress homepage frontmatter from the hero section
  const heroTitle = $('.VPHero .name').text().trim() || 'Maisi';
  const heroTagline = $('.VPHero .tagline').text().trim() || '';
  const heroText = $('.VPHero .text').text().trim() || '';

  // Extract features with links
  const features = [];
  $('.VPFeature').each((_, el) => {
    const title = $(el).find('.title').text().trim();
    const details = $(el).find('.details').text().trim();
    const icon = $(el).find('.icon').text().trim();
    const link = $(el).attr('href') || '';
    if (title) {
      const feat = { icon: icon || '📌', title: brandReplace(title), details: brandReplace(details) };
      if (link) feat.link = brandReplace(link.replace(/\.html$/, ''));
      features.push(feat);
    }
  });

  // Extract action buttons
  const actions = [];
  $('.VPButton').each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href') || '/';
    const isBrand = $(el).classList?.contains('brand') || $(el).hasClass('brand');
    actions.push({ theme: isBrand ? 'brand' : 'alt', text: brandReplace(text), link: brandReplace(href.replace(/\.html$/, '')) });
  });

  let frontmatter = `---
layout: home
hero:
  name: "${brandReplace(heroTitle)}"
  text: "${brandReplace(heroText)}"
  tagline: "${brandReplace(heroTagline)}"
  actions:
`;
  for (const a of actions) {
    frontmatter += `    - theme: ${a.theme}\n      text: ${a.text}\n      link: ${a.link}\n`;
  }

  if (features.length) {
    frontmatter += `features:\n`;
    for (const f of features) {
      frontmatter += `  - icon: "${f.icon}"\n    title: "${f.title}"\n    details: "${f.details}"\n`;
      if (f.link) frontmatter += `    link: ${f.link}\n`;
    }
  }
  frontmatter += `---\n`;
  return brandReplace(frontmatter);
}

async function main() {
  console.log(`Starting crawl of ${pages.length} pages...`);
  const results = {};

  // Crawl in batches of 5
  for (let i = 0; i < pages.length; i += 5) {
    const batch = pages.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(p => crawlPage(p)));
    batch.forEach((p, idx) => {
      results[p.file] = batchResults[idx];
    });
  }

  // Write files
  let written = 0;
  for (const [file, content] of Object.entries(results)) {
    if (!content) continue;
    const outPath = join(OUT_DIR, file);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, content, 'utf-8');
    console.log(`Wrote: ${outPath}`);
    written++;
  }

  console.log(`\nDone! Wrote ${written}/${pages.length} files.`);
}

main().catch(console.error);
