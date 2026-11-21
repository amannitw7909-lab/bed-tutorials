# 📚 B.Ed. Study Hub (शिक्षा अध्ययन केंद्र)

> **A modern, bilingual (English + Hindi), offline-first study companion and exam-preparation hub for B.Ed. (Bachelor of Education) teacher trainees.**

Designed specifically for Indian university B.Ed. curricula (NCTE, State Universities, Central Universities), providing high-yield, structured notes, concept summaries, and exam-oriented answers for every unit and topic.

---

## 🌟 Key Features

- **🌐 Complete Bilingual Parity (EN / हि):**
  - Switch between English and Hindi seamlessly with one click or view side-by-side.
  - Native Devanagari typography using `Noto Sans Devanagari` alongside clean `Inter` typography.
- **🎯 Exam-Oriented Sectional Layout:**
  Every topic is crafted around standard university exam patterns:
  1. **⚡ Quick Concept:** Crisp 2–3 sentence foundational summary for rapid revision.
  2. **📝 Short Answer (Section A: 100–150 Words):** Bulleted, high-scoring point-wise answers.
  3. **📖 Long Answer (Section B: 400–500 Words):** In-depth analytical essays featuring structured ASCII diagrams, comparative tables, and real-world classroom applications.
  4. **🎯 Suggested Exam Questions:** Past university questions and expected 5-mark and 10-mark questions.
- **🌓 Adaptive Theme & Font Scaling:**
  - Full Dark Mode and Light Mode support with smooth transitions.
  - Granular font resizing (`A-` / `A+`) to suit all screen distances and visual preferences.
  - User preferences persist across sessions in `localStorage`.
- **📊 Reading Progress & Bookmarking:**
  - Mark topics as read (`✓ Read`).
  - Real-time progress bar on the dashboard for each subject and unit.
- **🔍 Instant Full-Text & Tag Search:**
  - Debounced, client-side search across English and Hindi titles, topic tags, and subject codes.
- **📱 Fully Responsive:**
  - Desktop: 2-column layout with a persistent, independent sticky sidebar.
  - Mobile / Tablet: Clean off-canvas slide-in navigation drawer with backdrop overlay.
- **⚡ Zero-Dependency & Offline-First:**
  - Built with pure vanilla HTML5, CSS3, and ES6 JavaScript.
  - **Works out of the box** either via a web server (`http://`) or directly from local disk (`file:///`), with no mandatory build step or `node_modules` installation.

---

## 🏗️ Architecture & Project Structure

The project follows a clean, decoupled static architecture where content, presentation, logic, and data storage are strictly separated:

```text
bed-tutorials/
├── index.html               # Main single-page application shell
├── css/
│   └── style.css            # Design system, CSS grid layout, dark mode, typography
├── js/
│   ├── app.js               # Application state, UI controllers, search, and storage
│   └── parser.js            # YAML frontmatter and bilingual Markdown section parser
├── data/
│   ├── subjects.json        # Canonical course hierarchy (Semesters -> Subjects -> Units)
│   └── content-store.js     # Pre-compiled offline data store (enables file:// execution)
├── content/                 # Structured curriculum Markdown files
│   └── sem1/
│       ├── cc2/
│       │   ├── unit1.md     # Unit 1: Educational Psychology & Learner Development
│       │   ├── unit2.md     # Unit 2: Developmental Characteristics & Multiple Childhoods
│       │   ├── unit3.md     # Unit 3: Personality, Psychosocial & Emotional Development
│       │   └── unit4.md     # Unit 4: Socialization, Schooling & Inclusive Development
│       └── cc3/
│           ├── unit1.md     # Language Across Curriculum (Narrative & Descriptive Texts)
│           ├── unit2.md     # Language Across Curriculum (Expository & Note-Making)
│           └── unit3.md     # Language Across Curriculum (Journalistic Texts & Critical Reading)
├── scripts/
│   └── build-store.js       # Node.js utility to compile markdown into content-store.js
├── package.json             # Convenience npm scripts for local serving and bundling
├── AGENTS.md                # System architecture, design principles & AI agent guidelines
└── README.md                # Project documentation and user manual
```

---

## 🚀 Getting Started

You can run B.Ed. Study Hub in two ways:

### Method 1: Instant Local Open (Zero Setup / `file://`)
1. Download or clone this repository.
2. Double-click `index.html` (or drag and drop it into Chrome, Edge, Safari, or Firefox).
3. The app loads immediately using the embedded offline store (`data/content-store.js`).

### Method 2: Local Web Server (Recommended for Development)
Running through a local web server allows live editing of Markdown files without needing to rebuild the offline store:

```bash
# Using Node.js (via npm)
npm start
# or: npx serve .

# Using Python 3
python3 -m http.server 3000

# Using PHP
php -S localhost:3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📝 Content Authoring Format

Each unit is written as a multi-topic Markdown file located under `content/<semId>/<subjectCode>/unit<N>.md`.

Every topic starts with YAML frontmatter bounded by `---`, followed by structured `##` sections with `### EN` and `### HI` subsections:

```markdown
---
topic_id: "U1T1"
unit: 1
title_en: "Educational Psychology: Concept, Meaning, Scope & Functions"
title_hi: "शिक्षा मनोविज्ञान: अवधारणा, अर्थ, कार्यक्षेत्र और कार्य"
priority: "High"
tags: "educational psychology, scope, functions, teaching-learning"
---

## Quick Concept
### EN
Educational Psychology is an applied branch of psychology studying human learning...

### HI
शिक्षा मनोविज्ञान (Educational Psychology) मनोविज्ञान की एक व्यावहारिक शाखा है...

## Short Answer (Section A: 100–150 Words)
### EN
- **Concept & Meaning:** Combines Education and Psychology...
- **Nature:** Positive and applied behavioral science...

### HI
- **अवधारणा और अर्थ:** शिक्षा और मनोविज्ञान का संगम...
- **प्रकृति:** विधायक एवं व्यावहारिक विज्ञान...

## Long Answer (Section B: 400–500 Words)
### EN
#### 1. Concept and Meaning
Detailed explanation with references...

### HI
#### 1. अवधारणा और अर्थ
विस्तृत व्याख्या...

## Suggested Exam Questions
### EN
1. Explain the scope and significance of Educational Psychology for secondary school teachers. (10 Marks)

### HI
1. माध्यमिक विद्यालय के शिक्षकों के लिए शिक्षा मनोविज्ञान के कार्यक्षेत्र और महत्व की व्याख्या कीजिए। (10 अंक)
```

---

## 🔄 Adding New Subjects and Units

1. **Create the Markdown file:**
   Place new content in `content/<semId>/<subjectCode>/unit<N>.md` following the schema above.

2. **Register in `data/subjects.json`:**
   Add the subject and its unit entries:
   ```json
   {
     "semId": "sem1",
     "code": "CC1",
     "name": "Childhood and Growing Up",
     "shortName": "Childhood & Growing Up",
     "totalTopics": 4,
     "units": [
       {
         "index": 0,
         "name": "Unit 1: Learner as a Developing Individual",
         "mdFile": "./content/sem1/cc1/unit1.md"
       }
     ]
   }
   ```

3. **Rebuild the Offline Store:**
   ```bash
   npm run build:store
   # or: node scripts/build-store.js
   ```
   This regenerates `data/content-store.js` ensuring that users running directly from `file://` can immediately see the new topics.

---

## 🎨 Design & Accessibility Principles

- **Typography:** Uses high-clarity sans-serif fonts (`Inter` for Latin script and `Noto Sans Devanagari` for Hindi script) with balanced line-height (`1.65`) for prolonged reading comfort.
- **Color Contrast:** WCAG 2.1 AA compliant color palettes in both light and dark themes.
- **Cognitive Organization:** Information is structured chunk-by-chunk using badges, visual cards, collapsible accordions, and breadcrumbs.
- **Keyboard Navigation:** Full support for `ArrowLeft` and `ArrowRight` topic flipping, `Escape` to close drawers, and `Enter`/`Space` activation on subject cards.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Educational content is curated and aligned for non-commercial student learning and teacher training.
