/**
 * scripts/build-store.js
 * Reads subjects.json and all referenced Markdown content files,
 * then generates data/content-store.js.
 *
 * This allows the application to run seamlessly offline and under
 * the file:// protocol in any browser without CORS restrictions.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SUBJECTS_PATH = path.join(ROOT_DIR, 'data', 'subjects.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'content-store.js');

function buildStore() {
  if (!fs.existsSync(SUBJECTS_PATH)) {
    console.error(`Error: subjects.json not found at ${SUBJECTS_PATH}`);
    process.exit(1);
  }

  const subjects = JSON.parse(fs.readFileSync(SUBJECTS_PATH, 'utf-8'));
  const contentStore = {};

  let totalUnits = 0;
  let totalTopicsCounted = 0;

  for (const subj of subjects) {
    let subjTopics = 0;
    for (const unit of subj.units) {
      totalUnits++;
      const relativeFile = unit.mdFile; // e.g. "./content/sem1/cc3/unit1.md"
      const absPath = path.resolve(ROOT_DIR, relativeFile);

      if (fs.existsSync(absPath)) {
        const raw = fs.readFileSync(absPath, 'utf-8');
        contentStore[relativeFile] = raw;

        // Count topics in file (by topic_id)
        const topicMatches = raw.match(/^topic_id:/gm);
        const count = topicMatches ? topicMatches.length : 0;
        subjTopics += count;
        totalTopicsCounted += count;
        console.log(`[Store] Loaded ${relativeFile} (${count} topics)`);
      } else {
        console.warn(`[Store] Warning: file not found: ${absPath}`);
      }
    }
    if (subjTopics > 0) {
      subj.totalTopics = subjTopics;
    }
  }

  const fileContent = `/**
 * Auto-generated B.Ed. Study Hub Preloaded Content Store
 * Generated on: ${new Date().toISOString()}
 * 
 * Provides offline & file:// compatibility for browsers where local fetch()
 * is restricted by security policies.
 */

window.PRELOADED_SUBJECTS = ${JSON.stringify(subjects, null, 2)};

window.PRELOADED_CONTENT = ${JSON.stringify(contentStore, null, 2)};
`;

  fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf-8');
  console.log(`\n Successfully generated ${OUTPUT_PATH}`);
  console.log(`   - Subjects: ${subjects.length}`);
  console.log(`   - Units: ${totalUnits}`);
  console.log(`   - Total Topics: ${totalTopicsCounted}\n`);
}

buildStore();
