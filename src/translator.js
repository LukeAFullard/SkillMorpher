(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./platform-detector'),
      require('./capabilities'),
      require('./platforms/gemini-spark')
    );
  } else {
    root.Translator = factory(
      root.PlatformDetector,
      root.Capabilities,
      root.GeminiSparkMappings
    );
  }
}(typeof self !== 'undefined' ? self : this, function (PlatformDetector, Capabilities, GeminiSparkMappings) {
  'use strict';

  function translateSkill(skill, targetKey = 'geminiSpark') {
    if (!skill) return null;

    const originalBody = skill.instructions || skill.body || '';
    const originalDesc = skill.description || '';

    let translatedBody = originalBody;
    let translatedDesc = originalDesc;

    const changes = [];
    const warnings = [];
    let manualReviewCount = 0;

    const mappings = (GeminiSparkMappings && GeminiSparkMappings.MAPPINGS) || [];
    const manualBlockers = (GeminiSparkMappings && GeminiSparkMappings.MANUAL_REVIEW_BLOCKERS) || [];

    // 1. Concrete Mapping Replacements
    mappings.forEach(m => {
      if (m.pattern.test(translatedBody)) {
        const matches = translatedBody.match(m.pattern);
        translatedBody = translatedBody.replace(m.pattern, m.replacement);

        const conf = m.confidence || (m.manualReviewRequired ? 'NONE' : 'HIGH');
        if (m.manualReviewRequired || conf === 'NONE') {
          manualReviewCount++;
        }

        changes.push({
          platform: m.platform,
          sourceTerm: m.sourceTerm,
          original: matches ? matches[0] : m.sourceTerm,
          replacement: m.replacement,
          confidence: conf,
          manualReviewRequired: !!m.manualReviewRequired
        });
      }
    });

    // 2. Terminology & Filesystem Rewriting
    const termRewrites = [
      { pattern: /\bClaude Code\b/gi, replacement: 'Gemini', confidence: 'HIGH', term: 'Claude Code' },
      { pattern: /\bclaude\.ai\b/gi, replacement: 'Gemini', confidence: 'HIGH', term: 'claude.ai' },
      { pattern: /\b\/mnt\/data\b/gi, replacement: 'skill/workspace file path', confidence: 'HIGH', term: '/mnt/data' },
      { pattern: /\b\/mnt\/skills\b/gi, replacement: 'skill folder', confidence: 'HIGH', term: '/mnt/skills' },
      { pattern: /\b\/mnt\/user-data\b/gi, replacement: 'user workspace', confidence: 'HIGH', term: '/mnt/user-data' },
      { pattern: /\bchatgpt\b/gi, replacement: 'Gemini', confidence: 'MEDIUM', term: 'chatgpt' },
      { pattern: /\bcodex\b/gi, replacement: 'Gemini execution runtime', confidence: 'MEDIUM', term: 'codex' }
    ];

    termRewrites.forEach(tr => {
      if (tr.pattern.test(translatedBody)) {
        translatedBody = translatedBody.replace(tr.pattern, tr.replacement);
        changes.push({
          platform: 'Generic',
          sourceTerm: tr.term,
          original: tr.term,
          replacement: tr.replacement,
          confidence: tr.confidence,
          manualReviewRequired: false
        });
      }
    });

    // 3. Check Manual Review Blockers
    manualBlockers.forEach(mb => {
      if (mb.pattern.test(translatedBody) || mb.pattern.test(translatedDesc)) {
        manualReviewCount++;
        warnings.push({
          blocker: mb.name,
          message: `Capability "${mb.name}" detected which requires manual review (no automatic Gemini Spark equivalent).`
        });
      }
    });

    // 4. Generate Translation Diff
    const diff = [];
    const origLines = originalBody.split('\n');
    const transLines = translatedBody.split('\n');
    const maxLen = Math.max(origLines.length, transLines.length);

    for (let i = 0; i < maxLen; i++) {
      const o = origLines[i] || '';
      const t = transLines[i] || '';
      if (o !== t) {
        diff.push({
          line: i + 1,
          original: o,
          translated: t
        });
      }
    }

    // Confidence Summary
    const confidenceCounts = {
      HIGH: changes.filter(c => c.confidence === 'HIGH').length,
      MEDIUM: changes.filter(c => c.confidence === 'MEDIUM').length,
      LOW: changes.filter(c => c.confidence === 'LOW').length,
      NONE: changes.filter(c => c.confidence === 'NONE' || c.manualReviewRequired).length
    };

    return {
      translatedBody,
      translatedDesc,
      changesCount: changes.length,
      changes,
      warnings,
      manualReviewCount,
      confidenceCounts,
      diff
    };
  }

  return {
    translateSkill
  };
}));
