(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DescriptionValidator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PLATFORM_TERMS_RE = /\b(claude|anthropic|openai|chatgpt|codex|gpt-4|gpt-3\.5|spark)\b/i;
  const TRIGGER_WORDS_RE = /\b(when|use|if|mentions|requires|helps|for|allows|provides|handles|extracts|creates|modifies|converts)\b/i;

  function validateDescription(desc, name) {
    desc = (desc || '').trim();
    const issues = [];
    const suggestions = [];

    if (!desc) {
      issues.push('Description is empty');
    } else {
      if (desc.length > 1024) {
        issues.push(`Description length (${desc.length} chars) exceeds 1024 limit`);
      }

      if (PLATFORM_TERMS_RE.test(desc)) {
        issues.push('Description contains platform-specific terminology');
      }

      if (desc.length < 20 || !TRIGGER_WORDS_RE.test(desc)) {
        issues.push('Weak trigger description: should describe capability AND trigger conditions (when to use)');
      }
    }

    const isWeak = issues.some(i => i.includes('Weak trigger') || i.includes('empty'));

    let suggested = desc;
    if (isWeak || !desc) {
      const cleanName = (name || 'this-skill').replace(/-/g, ' ');
      suggested = `Automates tasks related to ${cleanName}. Use when the user mentions ${cleanName}, request file processing, or need automated workflows for ${cleanName}.`;
    }

    return {
      isValid: issues.length === 0,
      issues,
      isWeakTrigger: isWeak,
      suggestedDescription: suggested
    };
  }

  return {
    validateDescription
  };
}));
