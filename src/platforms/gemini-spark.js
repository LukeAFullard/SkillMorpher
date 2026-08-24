(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GeminiSparkMappings = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAPPINGS = [
    {
      platform: 'Anthropic',
      sourceTerm: 'Bash tool',
      pattern: /\buse\s+(the\s+)?bash\s+tool\s+to\s+inspect\b[^\n.]*/i,
      replacement: 'Inspect the repository files available to you',
      targetCapability: 'shellExecution',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'Bash command',
      pattern: /\b(run|use):?\s*`find\s+\.\s+-type\s+f`/i,
      replacement: 'When you need to understand the repository structure, inspect the available files and directories.',
      targetCapability: 'shellExecution',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'Claude Read tool',
      pattern: /\buse\s+(the\s+)?claude\s+read\s+tool\s+to\s+inspect\b[^\n.]*/i,
      replacement: 'Read the relevant files before making changes.',
      targetCapability: 'fileRead',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'str_replace',
      pattern: /\buse\s+`str_replace`\s+to\s+modify\b[^\n.]*/i,
      replacement: 'Modify the target file directly while preserving unrelated content.',
      targetCapability: 'fileWrite',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'str_replace general',
      pattern: /`str_replace`/i,
      replacement: 'direct file editing',
      targetCapability: 'fileWrite',
      confidence: 'HIGH'
    },
    {
      platform: 'OpenAI',
      sourceTerm: 'file_search',
      pattern: /\buse (the )?`?file_search`? (tool|function)?\b/i,
      replacement: 'search and read bundled reference files',
      targetCapability: 'fileRead',
      confidence: 'HIGH'
    },
    {
      platform: 'OpenAI',
      sourceTerm: 'code_interpreter',
      pattern: /\buse (the )?`?code_interpreter`? (tool|function)?\b/i,
      replacement: 'execute supported local code where available',
      targetCapability: 'pythonExecution',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'Claude Read general',
      pattern: /\bClaude Read( tool)?\b/i,
      replacement: 'read/access relevant skill files',
      targetCapability: 'fileRead',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'Bash tool general',
      pattern: /\bBash tool\b/i,
      replacement: 'command execution',
      targetCapability: 'shellExecution',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'computer_use / computer tool',
      pattern: /\bUse the `?computer`?( tool)? to [^\n]+/i,
      replacement: `## Manual review required\nThis workflow requires interactive browser/UI access. Gemini Spark does not provide an equivalent capability in the skill package.\nDo not claim that browser interaction has been performed unless the required capability is available.\nDo not silently invent an equivalent.`,
      targetCapability: 'computerUse',
      confidence: 'NONE',
      manualReviewRequired: true
    },
    {
      platform: 'Generic',
      sourceTerm: 'MCP server / tool',
      pattern: /\b(use|call)\s+(the\s+)?mcp\s+(server|tool|protocol)\b/i,
      replacement: `## Manual review required\nThis workflow requires Model Context Protocol (MCP) server connectivity. Gemini Spark does not support external MCP server connections.`,
      targetCapability: 'mcpConnectivity',
      confidence: 'NONE',
      manualReviewRequired: true
    }
  ];

  const MANUAL_REVIEW_BLOCKERS = [
    { name: 'computer_use', pattern: /\b(computer_use|computer tool)\b/i },
    { name: 'browser automation', pattern: /\b(puppeteer|playwright|selenium|headless browser)\b/i },
    { name: 'external HTTP APIs', pattern: /\b(http api|external api|rest api)\b/i },
    { name: 'web search', pattern: /\b(web_search|google search|bing search)\b/i },
    { name: 'MCP servers', pattern: /\b(mcp|mcp server|model context protocol)\b/i },
    { name: 'external databases', pattern: /\b(postgresql|mysql|mongodb|redis|remote database)\b/i },
    { name: 'cloud APIs', pattern: /\b(aws api|gcp api|azure api|claude api|openai api)\b/i }
  ];

  return {
    MAPPINGS,
    MANUAL_REVIEW_BLOCKERS
  };
}));
