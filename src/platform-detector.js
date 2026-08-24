(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PlatformDetector = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PATTERNS = [
    // Anthropic / Claude
    { id: 'claude_bash', platform: 'Anthropic', term: 'Bash', capability: 'shellExecution', re: /\b(Bash|bash tool|use the bash tool)\b/i },
    { id: 'claude_computer_use', platform: 'Anthropic', term: 'computer_use', capability: 'computerUse', re: /\b(computer_use|computer tool|use the computer tool)\b/i },
    { id: 'claude_str_replace', platform: 'Anthropic', term: 'str_replace', capability: 'fileWrite', re: /\b(str_replace|str_replace_editor)\b/i },
    { id: 'claude_api', platform: 'Anthropic', term: 'Claude API', capability: 'cloudApi', re: /\b(claude api|anthropic api|anthropic\.messages)\b/i },
    { id: 'claude_sdk', platform: 'Anthropic', term: 'Anthropic SDK', capability: 'cloudApi', re: /\b(anthropic sdk|@anthropic-ai\/sdk|import anthropic)\b/i },
    { id: 'claude_code', platform: 'Anthropic', term: 'Claude Code', capability: 'platformRef', re: /\b(claude code|claude\.ai|claude CLI)\b/i },
    { id: 'claude_mnt_data', platform: 'Anthropic', term: '/mnt/data', capability: 'filesystemPath', re: /\/mnt\/(data|skills|user-data)\b/i },

    // OpenAI / Codex
    { id: 'openai_shell', platform: 'OpenAI', term: 'shell/terminal', capability: 'shellExecution', re: /\b(shell|terminal|run in terminal)\b/i },
    { id: 'openai_code_interpreter', platform: 'OpenAI', term: 'code_interpreter', capability: 'pythonExecution', re: /\b(code_interpreter|code interpreter|python interpreter)\b/i },
    { id: 'openai_file_search', platform: 'OpenAI', term: 'file_search', capability: 'fileRead', re: /\b(file_search|openai file search)\b/i },
    { id: 'openai_webrun', platform: 'OpenAI', term: 'web.run', capability: 'webAccess', re: /\b(web\.run|browser\.search|web_search)\b/i },
    { id: 'openai_api', platform: 'OpenAI', term: 'OpenAI API', capability: 'cloudApi', re: /\b(openai api|chatgpt api|completions\.create)\b/i },
    { id: 'openai_assistants', platform: 'OpenAI', term: 'Assistants API', capability: 'cloudApi', re: /\b(assistants api|responses api|gpt-4o|gpt-4|gpt-3\.5)\b/i },
    { id: 'openai_codex', platform: 'OpenAI', term: 'Codex', capability: 'platformRef', re: /\b(codex|chatgpt)\b/i },

    // Generic detection
    { id: 'mcp', platform: 'Generic', term: 'MCP', capability: 'mcpServer', re: /\b(mcp|model context protocol|mcp server|mcp tool)\b/i },
    { id: 'browser_automation', platform: 'Generic', term: 'browser automation', capability: 'browserAutomation', re: /\b(puppeteer|playwright|selenium|headless browser|open the browser)\b/i },
    { id: 'web_search', platform: 'Generic', term: 'web search', capability: 'webSearch', re: /\b(google search|bing search|duckduckgo|web search)\b/i },
    { id: 'http_api_requests', platform: 'Generic', term: 'HTTP/API requests', capability: 'networkAccess', re: /\b(requests\.get|fetch\(|axios|http\.request|curl |wget )\b/i },
    { id: 'env_variables', platform: 'Generic', term: 'environment variables', capability: 'environmentVars', re: /\b(process\.env|os\.environ|ENV_VAR|[A-Z0-9_]+_KEY)\b/ },
    { id: 'filesystem_paths', platform: 'Generic', term: 'filesystem paths', capability: 'filesystemPath', re: /(\/tmp\/|\/var\/|\/usr\/|\.\/scripts\/|\.\/references\/)/i },
    { id: 'cli_commands', platform: 'Generic', term: 'CLI commands', capability: 'cliCommand', re: /\b(npm run|pip install|pytest|git clone|python -m)\b/i },
    { id: 'tool_syntax', platform: 'Generic', term: 'tool call syntax', capability: 'toolCalling', re: /<function_calls>|<tool_call>|```json\s*\{\s*"tool"/i },
    { id: 'platform_xml', platform: 'Generic', term: 'platform XML syntax', capability: 'toolCalling', re: /<\/antThinking>|<\/antArtifact>|<thinking>/i },
  ];

  function detectPlatforms(text) {
    const lines = (text || '').split('\n');
    const detections = [];

    lines.forEach((lineText, lineIdx) => {
      const lineNum = lineIdx + 1;
      PATTERNS.forEach(pat => {
        if (pat.re.test(lineText)) {
          detections.push({
            id: pat.id,
            platform: pat.platform,
            term: pat.term,
            capability: pat.capability,
            line: lineNum,
            lineContent: lineText.trim()
          });
        }
      });
    });

    const detectedPlatforms = Array.from(new Set(detections.map(d => d.platform)));

    return {
      platforms: detectedPlatforms,
      detections
    };
  }

  return {
    PATTERNS,
    detectPlatforms
  };
}));
