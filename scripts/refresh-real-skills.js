const fs = require('node:fs');
const path = require('node:path');

const REPOS = [
  { owner: 'anthropics', repo: 'skills', shortName: 'anthropics', defaultCategory: 'Claude' },
  { owner: 'openai', repo: 'skills', shortName: 'openai', defaultCategory: 'OpenAI/Codex' },
  { owner: 'obra', repo: 'superpowers', shortName: 'obra', defaultCategory: 'Superpowers' }
];

async function fetchRepoTree(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
  let res = await fetch(url);
  if (!res.ok) {
    const urlMaster = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`;
    res = await fetch(urlMaster);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch tree for ${owner}/${repo}: ${res.status}`);
  }
  const data = await res.json();
  return { sha: data.sha || 'main', tree: data.tree };
}

function parseFrontmatter(content) {
  let name = '';
  let description = '';
  let instructions = content;

  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (fmMatch) {
    instructions = fmMatch[2];
    const yamlStr = fmMatch[1];

    // Simple regex extraction for frontmatter fields
    const nameMatch = yamlStr.match(/^name:\s*["']?([^"'\n]+)["']?/m);
    const descMatch = yamlStr.match(/^description:\s*["']?([^"'\n]+)["']?/m);

    if (nameMatch) name = nameMatch[1].trim();
    if (descMatch) description = descMatch[1].trim();
  }

  return { name, description, instructions };
}

async function refreshRealSkills() {
  console.log('Refreshing real skills snapshot from GitHub...');
  const fixturesDir = path.join(__dirname, '..', 'test', 'fixtures', 'real-skills');

  const benchmarkSkills = [];
  let skillId = 1;

  for (const item of REPOS) {
    console.log(`Fetching skills for ${item.owner}/${item.repo}...`);
    const repoDir = path.join(fixturesDir, item.shortName);
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
    }

    const { tree } = await fetchRepoTree(item.owner, item.repo);
    const skillMds = tree.filter(f => f.path.endsWith('SKILL.md'));

    for (const file of skillMds) {
      const rawUrl = `https://raw.githubusercontent.com/${item.owner}/${item.repo}/main/${file.path}`;
      let rawRes = await fetch(rawUrl);
      if (!rawRes.ok) {
        const rawUrlMaster = `https://raw.githubusercontent.com/${item.owner}/${item.repo}/master/${file.path}`;
        rawRes = await fetch(rawUrlMaster);
      }
      if (!rawRes.ok) {
        console.warn(`  Warning: Failed to fetch ${file.path}`);
        continue;
      }

      const content = await rawRes.text();

      // Determine skill slug for filename
      const pathParts = file.path.split('/');
      let slug = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'skill';
      if (slug.startsWith('.')) slug = slug.slice(1);

      const fixtureFilename = `${slug}.md`;
      const fixturePath = path.join(repoDir, fixtureFilename);
      fs.writeFileSync(fixturePath, content, 'utf8');

      const parsed = parseFrontmatter(content);
      const finalName = parsed.name || slug;
      const finalDesc = parsed.description || `Real skill ${finalName} from ${item.owner}/${item.repo}`;

      // Basic platform expectation heuristics
      let expectedPlatform = 'Generic';
      let expectedNeedsTranslation = false;
      if (item.shortName === 'anthropics') {
        expectedPlatform = 'Anthropic';
        expectedNeedsTranslation = true;
      } else if (item.shortName === 'openai') {
        expectedPlatform = 'OpenAI';
        expectedNeedsTranslation = true;
      }

      const relFixturePath = `test/fixtures/real-skills/${item.shortName}/${fixtureFilename}`;

      benchmarkSkills.push({
        id: skillId++,
        repo: `${item.owner}/${item.repo}`,
        path: file.path,
        category: item.defaultCategory,
        name: finalName,
        description: finalDesc,
        fixturePath: relFixturePath,
        instructions: parsed.instructions.trim(),
        files: [],
        expectedPlatform,
        expectedNeedsTranslation
      });
    }
  }

  // Disambiguate any duplicate skill names in the corpus by appending folder context
  const nameCounts = {};
  benchmarkSkills.forEach(s => {
    nameCounts[s.name] = (nameCounts[s.name] || 0) + 1;
  });
  benchmarkSkills.forEach(s => {
    if (nameCounts[s.name] > 1 && s.path) {
      const folderPath = s.path.replace(/\/?SKILL\.md$/i, '');
      if (folderPath) {
        s.name = `${s.name} (${folderPath})`;
      }
    }
  });

  console.log(`Fetched and vendored ${benchmarkSkills.length} skills into test/fixtures/real-skills/`);

  // Create lightweight metadata array (omit instructions text from exported JS file)
  const benchmarkSkillsMetadata = benchmarkSkills.map(s => {
    const { instructions, ...meta } = s;
    return meta;
  });

  // Regenerate src/benchmark-corpus.js
  const corpusContent = `(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BenchmarkCorpus = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Benchmark corpus loaded from real skills vendored snapshot (anthropics/skills, openai/skills, obra/superpowers)
  const BENCHMARK_SKILLS = ${JSON.stringify(benchmarkSkillsMetadata, null, 2)};

  function getSkillInstructions(item) {
    if (item._instructions) return item._instructions;
    if (typeof process !== 'undefined' && process.versions && process.versions.node && item.fixturePath) {
      try {
        const fs = require('node:fs');
        const path = require('node:path');
        const fullPath = path.join(__dirname, '..', item.fixturePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const fmMatch = content.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n([\\s\\S]*)$/);
        item._instructions = fmMatch ? fmMatch[2].trim() : content.trim();
        return item._instructions;
      } catch (e) {
        // Fallback to empty string if file read fails
      }
    }
    return item._instructions || '';
  }

  async function ensureCorpusLoaded() {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      BENCHMARK_SKILLS.forEach(item => getSkillInstructions(item));
      return BENCHMARK_SKILLS;
    }
    const promises = BENCHMARK_SKILLS.map(async item => {
      if (item._instructions) return item._instructions;
      let content = null;
      if (item.fixturePath) {
        try {
          const res = await fetch(item.fixturePath);
          if (res.ok) content = await res.text();
        } catch (e) { /* ignore and try fallback */ }
      }
      if (!content && item.repo && item.path) {
        try {
          const rawUrl = 'https://raw.githubusercontent.com/' + item.repo + '/main/' + item.path;
          const res = await fetch(rawUrl);
          if (res.ok) content = await res.text();
        } catch (e) { /* ignore */ }
      }
      if (content) {
        const fmMatch = content.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n([\\s\\S]*)$/);
        item._instructions = fmMatch ? fmMatch[2].trim() : content.trim();
      } else {
        item._instructions = item._instructions || '';
      }
      return item._instructions;
    });
    await Promise.all(promises);
    return BENCHMARK_SKILLS;
  }

  BENCHMARK_SKILLS.forEach(item => {
    Object.defineProperty(item, 'instructions', {
      get() {
        return getSkillInstructions(item);
      },
      set(val) {
        item._instructions = val;
      },
      configurable: true,
      enumerable: true
    });
  });

  async function runBenchmarkSuite(validator, translator, provider) {
    await ensureCorpusLoaded();
    const results = {
      totalSkills: BENCHMARK_SKILLS.length,
      passedInitialValidation: 0,
      passedPostValidation: 0,
      translationsCount: 0,
      manualReviewsTriggered: 0,
      scores: [],
      averageQualityScore: 0,
      summaryByCategory: {}
    };

    let totalScoreSum = 0;

    BENCHMARK_SKILLS.forEach(item => {
      const skill = {
        fixedName: item.name,
        name: item.name,
        description: item.description,
        instructions: item.instructions,
        files: item.files || []
      };

      const valInitial = validator ? validator.validateSkill(skill, 'geminiSpark') : null;
      if (valInitial && valInitial.structure.status !== 'BLOCK') {
        results.passedInitialValidation++;
      }

      let translatedRes = null;
      if (translator) {
        translatedRes = translator.translateSkill(skill, 'geminiSpark');
        results.translationsCount++;
        if (translatedRes.manualReviewCount > 0) {
          results.manualReviewsTriggered++;
        }
      }

      const postSkill = {
        ...skill,
        instructions: translatedRes ? translatedRes.translatedBody : skill.instructions
      };

      const valPost = validator ? validator.validateSkill(postSkill, 'geminiSpark') : null;
      if (valPost && valPost.structure.status !== 'BLOCK') {
        results.passedPostValidation++;
      }

      const quality = translator && translator.calculateQualityScore
        ? translator.calculateQualityScore(skill, translatedRes, valPost)
        : { overall: 80 };

      totalScoreSum += quality ? quality.overall : 80;

      const cat = item.category || 'Generic';
      if (!results.summaryByCategory[cat]) {
        results.summaryByCategory[cat] = { count: 0, totalScore: 0 };
      }
      results.summaryByCategory[cat].count++;
      results.summaryByCategory[cat].totalScore += (quality ? quality.overall : 80);

      results.scores.push({
        id: item.id,
        name: item.name,
        category: item.category,
        qualityScore: quality ? quality.overall : 80,
        manualReviewCount: translatedRes ? translatedRes.manualReviewCount : 0
      });
    });

    results.averageQualityScore = Math.round(totalScoreSum / BENCHMARK_SKILLS.length);
    return results;
  }

  return {
    BENCHMARK_SKILLS,
    runBenchmarkSuite,
    ensureCorpusLoaded
  };
}));
`;

  const benchmarkPath = path.join(__dirname, '..', 'src', 'benchmark-corpus.js');
  fs.writeFileSync(benchmarkPath, corpusContent, 'utf8');
  console.log(`Updated ${benchmarkPath} with ${benchmarkSkills.length} benchmark skills.`);
}

if (require.main === module) {
  refreshRealSkills().catch(err => {
    console.error('Error refreshing real skills:', err);
    process.exit(1);
  });
}

module.exports = { refreshRealSkills, parseFrontmatter };
