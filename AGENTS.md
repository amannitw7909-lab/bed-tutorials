# AGENTS.md — B.Ed. Study Hub Engineering & Content Guidelines

This document is the authoritative engineering manual and operational specification for AI agents (and human engineers) modifying, authoring content, or extending the **B.Ed. Study Hub** codebase.

---

## 1. System Identity & Mission

**B.Ed. Study Hub** is a lightweight, zero-dependency, bilingual (English + Hindi) web platform designed to provide structured, high-scoring study notes and exam preparation material for Bachelor of Education (B.Ed.) student-teachers across Indian universities.

### Key Architectural Tenet
> **Zero Heavy Frameworks, Zero Fragile Build Steps, Maximum Portability.**
> The application must be able to run either from any static web server (e.g. GitHub Pages, Vercel, Node `serve`, Python HTTP) **or directly from the local file system (`file:///`) by simply double-clicking `index.html`**.

---

## 2. Technical Stack & File Responsibilities

| File / Directory | Responsibility |
| :--- | :--- |
| `index.html` | Semantic HTML5 single-page application shell. Houses the top navigation bar, collapsible sidebar navigation, dashboard grid, and topic viewer. |
| `css/style.css` | Comprehensive design system utilizing CSS Custom Properties (variables), modern CSS Grid, Flexbox, accessible color themes (Light/Dark), responsive breakpoints, and custom typography. |
| `js/app.js` | Core application logic: state store (`State`), DOM event routing, dynamic sidebar/dashboard rendering, search indexer, breadcrumbs, reading progress tracker (`localStorage`), and dual data-source loader. |
| `js/parser.js` | Custom client-side parser that splits Markdown files by topic block (`---`), extracts YAML frontmatter, and separates bilingual section pairs (`### EN` / `### HI`). Exposes `Parser.parseUnitFile()` in browser and Node environments. |
| `data/subjects.json` | Canonical curriculum definition. Declares semesters, course codes (e.g., CC2, CC3), subject names, total topics, and relative paths to unit Markdown files. |
| `data/content-store.js` | Pre-compiled static content bundle setting `window.PRELOADED_SUBJECTS` and `window.PRELOADED_CONTENT`. Guarantees seamless execution under the `file://` protocol where browser CORS security blocks `fetch()`. |
| `content/**/unit*.md` | Human-readable, version-controllable curriculum content authored in structured multi-topic Markdown. |
| `scripts/build-store.js` | Node.js synchronization script that parses `subjects.json` and all referenced unit `.md` files to compile `data/content-store.js`. |
| `package.json` | Convenience runner scripts for serving and building without external runtime dependencies. |

---

## 3. Data Loading & Dual Execution Architecture

Browsers enforce strict CORS / sandbox policies when pages are opened via `file:///`, which causes standard `fetch('./data/subjects.json')` or `fetch('./content/...')` calls to fail with `TypeError: Failed to fetch`.

To solve this while retaining dynamic development capabilities, the codebase implements a **dual data fallback pipeline**:

```text
[ Browser Launches init() ]
           │
           ▼
    Protocol check:
   window.location.protocol === 'file:'
           │
   ┌───────┴───────┐
   │ YES           │ NO (http: / https:)
   ▼               ▼
Use window.PRELOADED_SUBJECTS    Try fetch('./data/subjects.json')
(From data/content-store.js)               │
                                   ┌───────┴───────┐
                                   │ Success       │ Network Error / Blocked
                                   ▼               ▼
                             Use parsed JSON   Fallback to window.PRELOADED_SUBJECTS
```

### Agent Rule for Data & Content Updates
Whenever an agent updates, adds, or deletes any unit Markdown file or edits `data/subjects.json`, the agent **MUST** run:
```bash
node scripts/build-store.js
```
This ensures `data/content-store.js` is always in perfect synchronization with the individual Markdown source files.

---

## 4. Content Authoring Schema & Specification

Every unit file located at `content/<semId>/<subjectCode>/unit<N>.md` contains multiple topics separated by YAML frontmatter.

### 4.1. Topic Block Structure
Each topic block **must** strictly conform to this structure:

```markdown
---
topic_id: "U<UnitNum>T<TopicNum>"
unit: <UnitNum>
title_en: "Concise English Academic Title"
title_hi: "सटीक हिंदी शैक्षणिक शीर्षक"
priority: "High" | "Medium" | "Low"
tags: "comma, separated, search, keywords"
---

## Quick Concept
### EN
[2–3 sentences defining the core concept in clear, academic English.]

### HI
[2–3 वाक्य जो मूल अवधारणा को स्पष्ट, प्रामाणिक हिंदी में परिभाषित करें।]

## Short Answer (Section A: 100–150 Words)
### EN
- **Point 1:** Specific point with keywords.
- **Point 2:** Characteristic or classification.
- **Point 3:** Educational application.

### HI
- **बिंदु 1:** मुख्य शब्दावली के साथ विशिष्ट बिंदु।
- **बिंदु 2:** विशेषता या वर्गीकरण।
- **बिंदु 3:** शैक्षणिक अनुप्रयोग।

## Long Answer (Section B: 400–500 Words)
### EN
#### 1. Theoretical Background & Definitions
...
#### 2. Core Dimensions / Stages
```text
[ ASCII Architecture / Flowchart Diagram ]
```
#### 3. Educational Implications for Teachers
...

### HI
#### 1. सैद्धांतिक पृष्ठभूमि एवं परिभाषाएँ
...
#### 2. मुख्य आयाम / चरण
```text
[ हिंदी / द्विभाषी ASCII प्रवाह आरेख ]
```
#### 3. शिक्षकों के लिए शैक्षणिक निहितार्थ
...

## Suggested Exam Questions
### EN
1. Direct question (5 Marks)
2. Comprehensive essay question (10 Marks)

### HI
1. सीधा प्रश्न (5 अंक)
2. विस्तृत निबंधात्मक प्रश्न (10 अंक)
```

### 4.2. Heading Invariant Rules
The parser relies on exact regular expressions for section headers:
- `## Quick Concept`
- `## Short Answer (Section A: 100–150 Words)`
- `## Long Answer (Section B: 400–500 Words)` (or `300–400 Words`)
- `## Suggested Exam Questions`
- Subsections **must** be exactly `### EN` and `### HI`.
- Do not alter the level of these headings (`##` and `###`) as doing so breaks section tab splitting in `parser.js`.

### 4.3. Bilingual Quality Standard
- **No Machine-Jargon:** Avoid unnatural machine translations. Use established Indian educational terminology (e.g., use "शिक्षा मनोविज्ञान" for *Educational Psychology*, "अधिगम" for *Learning*, "विकास" for *Development*, "अभिप्रेरणा" for *Motivation*).
- **Dual Transliteration for Key Terms:** Provide English terms in parentheses inside Hindi text where it benefits the student, e.g.:
  `शिक्षा मनोविज्ञान (Educational Psychology) व्यवहार का विधायक विज्ञान (Positive Science) है।`

---

## 5. UI Architecture & CSS Principles

### 5.1. Desktop vs. Mobile Layout Invariants
- **Desktop (> 768px):**
  - Layout is controlled by `.layout { display: grid; grid-template-columns: var(--sidebar-w) minmax(0, 1fr); }`.
  - The `.sidebar` **MUST** remain a normal in-flow sticky grid column:
    ```css
    .sidebar {
      position: sticky;
      top: var(--topnav-h);
      height: calc(100vh - var(--topnav-h));
      overflow-y: auto;
    }
    ```
  - **CRITICAL:** Never set `.sidebar { position: fixed; }` in desktop view! Doing so takes the sidebar out-of-flow, causing the grid container to place `.main` in column 1 directly underneath the fixed sidebar, making the main content and dashboard completely invisible.
- **Mobile (<= 768px):**
  - Layout shifts to single column: `.layout { grid-template-columns: 1fr; }`.
  - The `.sidebar` switches to an off-canvas drawer:
    ```css
    .sidebar {
      position: fixed;
      top: var(--topnav-h);
      left: 0;
      transform: translateX(-100%);
      z-index: 150;
    }
    .sidebar.open {
      transform: translateX(0);
    }
    ```

### 5.2. CSS Custom Properties & Theming
All color, typography, and spacing values must use CSS variables defined in `:root` and overridden in `body.theme-dark`:
- Colors: `--clr-bg`, `--clr-surface`, `--clr-surface2`, `--clr-border`, `--clr-primary`, `--clr-accent`, `--clr-text`, `--clr-text-muted`.
- Dimensions: `--sidebar-w: 280px`, `--topnav-h: 60px`, `--radius: 12px`.
- Typography: Controlled via `body[data-fontsize="sm|md|lg|xl"]` with `--font-base`.

---

## 6. State Management & Storage Rules

The entire runtime state is centralized in the `State` object inside `js/app.js`:
```javascript
const State = {
  subjects: [],           // Array of subject manifests
  topicCache: {},         // Key: `${semId}/${code}/${unitIndex}` -> parsed topic array
  currentSubject: null,   // Active subject manifest object
  currentUnitIndex: null, // Active unit index (0-based)
  currentTopicIndex: null,// Active topic index within current unit
  currentTopics: [],      // Array of parsed topic objects for current unit
  lang: 'en' | 'hi',      // Active reading language
  theme: 'light' | 'dark',// Active color theme
  fontSize: 'sm'|'md'|'lg'|'xl',
  progress: {},           // Map of { [topic_id]: true }
};
```

### LocalStorage Keys
All persistent settings use the `agy_` prefix:
- `agy_lang`: `'en'` or `'hi'`
- `agy_theme`: `'light'` or `'dark'`
- `agy_fontsize`: `'sm'`, `'md'`, `'lg'`, or `'xl'`
- `agy_progress`: JSON stringified record of read topic IDs

---

## 7. Agent Operational Checklist

Before declaring any coding or content task complete, agents must verify each of the following:

- [ ] **Data Registration:** If a new `.md` file was created, is it registered with correct `index`, `name`, and `mdFile` in `data/subjects.json`?
- [ ] **Bundle Generation:** Was `node scripts/build-store.js` executed, and did it exit with code 0 without missing file warnings?
- [ ] **JS Syntax Validation:** Do all JavaScript files pass syntax checks (`node -c js/parser.js`, `node -c js/app.js`, `node -c data/content-store.js`)?
- [ ] **File Protocol Test:** Will the application display the dashboard hero, subject cards, and topics when opened via `file:///.../index.html`?
- [ ] **Layout Safety:** Does `.sidebar` retain `position: sticky` on desktop and `position: fixed` only inside `@media (max-width: 768px)`?
- [ ] **Bilingual Parity:** Does every added topic contain both `### EN` and `### HI` content for all sections?
- [ ] **Search Index:** Are newly added topics indexed and searchable via the top navigation search box?
