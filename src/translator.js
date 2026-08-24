(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./platform-detector'),
      require('./capabilities'),
      require('./platforms/gemini-spark'),
      require('./providers/browser-local-provider')
    );
  } else {
    root.Translator = factory(
      root.PlatformDetector,
      root.Capabilities,
      root.GeminiSparkMappings,
      root.BrowserLocalProvider
    );
  }
}(typeof self !== 'undefined' ? self : this, function (PlatformDetector, Capabilities, GeminiSparkMappings, BrowserLocalProvider) {
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

  function generateAIPrompt(skill, targetKey = 'geminiSpark') {
    const body = skill.instructions || skill.body || '';
    const desc = skill.description || '';
    return `You are a Gemini Agent Skill Translator.
Rewrite the following Agent Skill instructions into instructions functionally equivalent for ${targetKey === 'geminiCli' ? 'Gemini CLI' : 'Gemini Spark'}.

Constraints:
1. Replace Claude/OpenAI tool names (Bash tool, str_replace, file_search, code_interpreter) with standard Gemini equivalent instructions.
2. If browser automation or computer_use is required, add a clear "## Manual review required" block stating that interactive UI/browser access is unavailable in Gemini Spark. Do not invent fake capabilities.
3. Keep instructions concise and preserve progressive disclosure.

Skill Description: ${desc}

Original Instructions:
${body}

Return ONLY the updated instructions string.`;
  }

  async function translateSkillAI(skill, apiKey, targetKey = 'geminiSpark') {
    if (!apiKey) {
      return { ...translateSkill(skill, targetKey), isAI: false };
    }

    try {
      const prompt = generateAIPrompt(skill, targetKey);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!res.ok) throw new Error(`Gemini API returned ${res.status}`);
      const data = await res.json();
      const llmText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!llmText) throw new Error('Empty response from Gemini API');

      const aiSkill = { ...skill, instructions: llmText.trim() };
      const deterministicRes = translateSkill(aiSkill, targetKey);
      return {
        ...deterministicRes,
        isAI: true
      };
    } catch (e) {
      const det = translateSkill(skill, targetKey);
      return {
        ...det,
        isAI: false,
        aiError: e.message
      };
    }
  }

  async function translateWithProvider({ provider, model, skill, analysis, targetKey = 'geminiSpark' }) {
    if (!provider || typeof provider.translate !== 'function') {
      return { ...translateSkill(skill, targetKey), mode: 'deterministic' };
    }

    try {
      const res = await provider.translate({ skill, analysis, target: targetKey, model });
      const aiSkill = { ...skill, instructions: res.translatedBody };
      const deterministicPost = translateSkill(aiSkill, targetKey);
      return {
        ...deterministicPost,
        mode: 'provider',
        providerId: provider.id,
        model,
        providerChanges: res.changes,
        providerManualReview: res.manualReview
      };
    } catch (err) {
      const det = translateSkill(skill, targetKey);
      return {
        ...det,
        mode: 'deterministic-fallback',
        providerError: err.message
      };
    }
  }

  return {
    translateSkill,
    generateAIPrompt,
    translateSkillAI,
    translateWithProvider
  };
}));
