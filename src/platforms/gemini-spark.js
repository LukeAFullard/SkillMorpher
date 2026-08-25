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
      sourceTerm: 'Bash tool inspect',
      pattern: /\buse\s+(the\s+)?bash\s+tool\s+to\s+inspect\b[^\n.]*/i,
      replacement: 'Inspect the repository files available to you',
      targetCapability: 'shellExecution',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'Bash tool variant',
      pattern: /\b(using|via|execute with)\s+(the\s+)?bash\s+tool\b/i,
      replacement: 'via standard file/command inspection',
      targetCapability: 'shellExecution',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'Bash command run',
      pattern: /\b(run|use):?\s*`find\s+\.\s+-type\s+f`/i,
      replacement: 'When you need to understand the repository structure, inspect the available files and directories.',
      targetCapability: 'shellExecution',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'Bash execution phrasing',
      pattern: /\b(run|execute|use)\b[^\n.]*\b(in\s+|via\s+)?bash\s+(commands?|scripts?|terminal)?\b/i,
      replacement: 'execute required local commands where shell access is available',
      targetCapability: 'shellExecution',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'Claude Read tool inspect',
      pattern: /\buse\s+(the\s+)?claude\s+read\s+tool\s+to\s+inspect\b[^\n.]*/i,
      replacement: 'Read the relevant files before making changes.',
      targetCapability: 'fileRead',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'Read tool variant',
      pattern: /\b(using|use)\s+(the\s+)?(Read|File\s+Read)\s+tool\b/i,
      replacement: 'by inspecting and reading the specified file',
      targetCapability: 'fileRead',
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
      sourceTerm: 'str_replace modify',
      pattern: /\buse\s+`str_replace`\s+to\s+modify\b[^\n.]*/i,
      replacement: 'Modify the target file directly while preserving unrelated content.',
      targetCapability: 'fileWrite',
      confidence: 'HIGH'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'File edit tool variants',
      pattern: /\b(use|using)\s+`?(create_file|str_replace_editor|Write tool|Edit tool)`?\b/i,
      replacement: 'direct file editing',
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
      sourceTerm: 'code_interpreter tool',
      pattern: /\buse (the )?`?code_interpreter`? (tool|function)?\b/i,
      replacement: 'execute supported local code where available',
      targetCapability: 'pythonExecution',
      confidence: 'HIGH'
    },
    {
      platform: 'OpenAI',
      sourceTerm: 'Code Interpreter environment phrasing',
      pattern: /\b(in|via|using)\s+(the\s+)?Code\s+Interpreter(\s+environment|\s+runtime|\s+tool)?\b/i,
      replacement: 'executing local code in the available runtime',
      targetCapability: 'pythonExecution',
      confidence: 'HIGH'
    },
    {
      platform: 'OpenAI',
      sourceTerm: 'ChatGPT Apps SDK',
      pattern: /\bChatGPT\s+(Apps?\s+SDK|developer\s+mode|UI)\b/i,
      replacement: 'Gemini Spark custom skill environment',
      targetCapability: 'skillExecution',
      confidence: 'MEDIUM'
    },
    {
      platform: 'OpenAI',
      sourceTerm: 'OpenAI Assistants / Codex runtime',
      pattern: /\b(OpenAI\s+Assistants?\s+API|OpenAI\s+Assistant|Codex\s+(agent|runtime|project))\b/i,
      replacement: 'Gemini agent environment',
      targetCapability: 'skillExecution',
      confidence: 'MEDIUM'
    },
    {
      platform: 'OpenAI',
      sourceTerm: 'Playwright CLI',
      pattern: /\b(via|using|run)\s+`?(playwright-cli|playwright\s+cli|playwright\s+wrapper)`?\b/i,
      replacement: `## Manual review required\nThis workflow requires automated browser testing via Playwright. Gemini Spark does not support live browser automation.`,
      targetCapability: 'browserAutomation',
      confidence: 'NONE',
      manualReviewRequired: true
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'Claude web interface / model references',
      pattern: /\b(in\s+claude\.ai|Claude\s+(Sonnet|Opus|Haiku|Fable|Mythos))\b/i,
      replacement: 'Gemini workspace / Gemini model',
      targetCapability: 'llmInference',
      confidence: 'MEDIUM'
    },
    {
      platform: 'Anthropic',
      sourceTerm: 'Claude sub-agents',
      pattern: /\b(sub-agents?\s+in\s+Claude\s+Code|fresh\s+Claude\s+instance|Reader\s+Claude)\b/i,
      replacement: 'sub-agent or reviewer instance',
      targetCapability: 'subAgentExecution',
      confidence: 'MEDIUM'
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
      pattern: /\b(use|call|connect\s+to|test\s+with|scaffold\s+a[n]?)\s+(the\s+)?mcp\s+(server|tool|protocol|inspector)\b/i,
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
