/**
 * parser.js
 * Parses multi-topic .md files with YAML frontmatter + EN/HI section pairs.
 *
 * File format per topic block:
 *   ---
 *   topic_id: "U1T1"
 *   unit: 1
 *   title_en: "..."
 *   title_hi: "..."
 *   priority: "High"
 *   tags: "tag1, tag2"
 *   ---
 *
 *   ## Quick Concept
 *   ### EN
 *   ...english content...
 *   ### HI
 *   ...hindi content...
 *
 *   ## Short Answer (Section A: 100–150 Words)
 *   ...
 *
 * Topics are separated by a line that is EXACTLY "---" (after the first closing frontmatter).
 */

const Parser = (() => {

  /**
   * Split raw markdown into topic blocks.
   * Each block starts with "---\ntopic_id:" frontmatter.
   */
  function splitIntoBlocks(raw) {
    // Normalize line endings
    const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const blocks = [];
    // Find blocks that start with "---\ntopic_id"
    const blockStartRegex = /^---\s*\n\s*topic_id:/gm;
    const startMatches = [...text.matchAll(blockStartRegex)];

    for (let i = 0; i < startMatches.length; i++) {
      const start = startMatches[i].index;
      const end = i + 1 < startMatches.length ? startMatches[i + 1].index : text.length;
      blocks.push(text.slice(start, end).trim());
    }

    return blocks;
  }

  /**
   * Parse YAML-like frontmatter from a block.
   * Returns { meta, body }
   */
  function parseFrontmatter(block) {
    const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*(?:\n([\s\S]*))?$/;
    const match = block.match(fmRegex);
    if (!match) return { meta: {}, body: block };

    const fmRaw = match[1];
    const body = match[2] || '';

    const meta = {};
    for (const line of fmRaw.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      // Strip surrounding quotes
      val = val.replace(/^["']|["']$/g, '');
      // Convert numeric fields
      if (key === 'unit') meta[key] = parseInt(val, 10);
      else meta[key] = val;
    }
    return { meta, body };
  }

  /**
   * Parse the body into named sections.
   * Each section is a ## heading followed by optional ### EN / ### HI sub-sections.
   */
  function parseSections(body) {
    const sections = {};
    // Split on ## headings
    const sectionRegex = /^## (.+)$/gm;
    const sectionMatches = [...body.matchAll(sectionRegex)];

    for (let i = 0; i < sectionMatches.length; i++) {
      const heading = sectionMatches[i][1].trim();
      const start = sectionMatches[i].index + sectionMatches[i][0].length;
      const end = i + 1 < sectionMatches.length ? sectionMatches[i + 1].index : body.length;
      const content = body.slice(start, end).trim();

      // Check for ### EN / ### HI sub-sections
      const subMatches = [...content.matchAll(/^### (EN|HI)\s*$/gim)];
      if (subMatches.length > 0) {
        const secData = { en: '', hi: '' };
        for (let j = 0; j < subMatches.length; j++) {
          const lang = subMatches[j][1].toLowerCase();
          const subStart = subMatches[j].index + subMatches[j][0].length;
          const subEnd = j + 1 < subMatches.length ? subMatches[j + 1].index : content.length;
          const chunk = content.slice(subStart, subEnd).trim();
          secData[lang] = secData[lang] ? (secData[lang] + '\n\n' + chunk) : chunk;
        }
        sections[heading] = secData;
      } else {
        sections[heading] = { en: content, hi: '' };
      }
    }

    return sections;
  }

  /**
   * Parse a single topic block.
   */
  function parseTopic(block) {
    const { meta, body } = parseFrontmatter(block);
    const sections = parseSections(body);
    return { ...meta, sections };
  }

  /**
   * Parse a full unit .md file.
   * Returns array of topic objects.
   */
  function parseUnitFile(raw) {
    const blocks = splitIntoBlocks(raw);
    return blocks.map(parseTopic).filter(t => t.topic_id);
  }

  const api = { parseUnitFile, parseTopic, parseFrontmatter, parseSections };
  if (typeof window !== 'undefined') window.Parser = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
