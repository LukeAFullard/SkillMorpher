(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BenchmarkCorpus = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BENCHMARK_SKILLS = [
    {
      id: 1,
      category: 'Claude',
      name: 'claude-file-editor',
      description: 'Edits files using Claude tool conventions.',
      instructions: 'Use the Bash tool to inspect files in /mnt/skills/.\nUse `str_replace` to update target lines.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 2,
      category: 'OpenAI/Codex',
      name: 'openai-data-analyst',
      description: 'Processes datasets via OpenAI runtime.',
      instructions: 'Run Code Interpreter to summarize data.\nUse chatgpt and Assistants API to format results.',
      files: [],
      expectedPlatform: 'OpenAI',
      expectedNeedsTranslation: true
    },
    {
      id: 3,
      category: 'Generic',
      name: 'generic-summarizer',
      description: 'Summarizes text documents into structured bullet points.',
      instructions: 'Read text and produce a concise 3-bullet point summary preserving key metrics.',
      files: [],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 4,
      category: 'Script-heavy',
      name: 'python-runner',
      description: 'Executes clean python helper script.',
      instructions: 'Run `scripts/helper.py` to format input JSON data.',
      files: [{ path: 'scripts/helper.py', content: 'def run(): return 42\nif __name__ == "__main__": run()', status: 'ok' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 5,
      category: 'Reference-heavy',
      name: 'schema-validator',
      description: 'Validates json against reference schema.',
      instructions: 'Refer to `references/schema.json` to check mandatory field names.',
      files: [{ path: 'references/schema.json', content: '{"type": "object"}', status: 'ok' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 6,
      category: 'Browser-dependent',
      name: 'web-automation-bot',
      description: 'Navigates pages and clicks UI buttons.',
      instructions: 'Use the `computer` tool to open browser and click buttons on screen.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 7,
      category: 'API-dependent',
      name: 'weather-fetcher',
      description: 'Fetches weather forecasts via external API.',
      instructions: 'Run `scripts/fetch_weather.py` with OPENAI_API_KEY environment variable.',
      files: [{ path: 'scripts/fetch_weather.py', content: 'import requests\nrequests.get("https://api.weather.com")', status: 'warn', reason: 'script calls network' }],
      expectedPlatform: 'OpenAI',
      expectedNeedsTranslation: true
    },
    {
      id: 8,
      category: 'Complex multi-file',
      name: 'multi-file-pipeline',
      description: 'Complex multi-file processing skill for report generation.',
      instructions: 'Execute `scripts/process.py` using schema `references/config.yaml` and asset `assets/template.txt`.',
      files: [
        { path: 'scripts/process.py', content: 'print("Processing")', status: 'ok' },
        { path: 'references/config.yaml', content: 'mode: fast', status: 'ok' },
        { path: 'assets/template.txt', content: 'Template header', status: 'ok' }
      ],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 9,
      category: 'Claude',
      name: 'claude-str-replace-refactor',
      description: 'Refactors code using Claude str_replace tool.',
      instructions: 'Inspect `/mnt/data/src/main.js` and use `str_replace` to replace legacy functions.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 10,
      category: 'OpenAI/Codex',
      name: 'openai-code-interpreter-plot',
      description: 'Generates chart plots using OpenAI code interpreter.',
      instructions: 'Use code_interpreter to read CSV file and generate PNG chart plot.',
      files: [],
      expectedPlatform: 'OpenAI',
      expectedNeedsTranslation: true
    },
    {
      id: 11,
      category: 'Generic',
      name: 'generic-markdown-cleaner',
      description: 'Cleans and standardizes markdown headings and link formatting.',
      instructions: 'Format markdown headings to use ATX syntax and fix broken reference links.',
      files: [],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 12,
      category: 'Tool-heavy',
      name: 'bash-heavy-git-workflow',
      description: 'Performs complex git branch inspections and rebase helpers.',
      instructions: 'Use Bash tool to run `git status`, `git log --oneline`, and `git diff`.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 13,
      category: 'Reference-heavy',
      name: 'reference-heavy-api-docs',
      description: 'Parses local API reference documentation files.',
      instructions: 'Read `references/endpoints.md` and `references/auth.md` to construct valid requests.',
      files: [
        { path: 'references/endpoints.md', content: '# Endpoints', status: 'ok' },
        { path: 'references/auth.md', content: '# Auth', status: 'ok' }
      ],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 14,
      category: 'Script-heavy',
      name: 'script-heavy-data-transformer',
      description: 'Transforms data formats using Python data transformation scripts.',
      instructions: 'Execute `scripts/transform.py` to convert XML to JSON.',
      files: [{ path: 'scripts/transform.py', content: 'import json\nprint("{}")', status: 'ok' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 15,
      category: 'Browser-dependent',
      name: 'browser-playwright-ui-tester',
      description: 'Automates end-to-end browser user interface testing.',
      instructions: 'Launch Playwright browser and inspect DOM elements via computer tool.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 16,
      category: 'API-dependent',
      name: 'credentials-api-scraper',
      description: 'Scrapes web endpoints using API credentials.',
      instructions: 'Call external endpoint with `sk-ant-api03-12345678901234567890` for authentication.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 17,
      category: 'Simple',
      name: 'simple-text-formatter',
      description: 'Formats plain text lines into UPPERCASE or title case.',
      instructions: 'Convert input text string into clean uppercase format.',
      files: [],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 18,
      category: 'Script-heavy',
      name: 'multi-script-pipeline-runner',
      description: 'Runs multiple sequential processing scripts.',
      instructions: 'Step 1: Run `scripts/prep.py`.\nStep 2: Run `scripts/calc.py`.\nStep 3: Run `scripts/export.py`.',
      files: [
        { path: 'scripts/prep.py', content: 'print("prep")', status: 'ok' },
        { path: 'scripts/calc.py', content: 'print("calc")', status: 'ok' },
        { path: 'scripts/export.py', content: 'print("export")', status: 'ok' }
      ],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 19,
      category: 'Intentionally Incompatible',
      name: 'intentionally-incompatible-network-caller',
      description: 'Skill containing disallowed external network socket calls.',
      instructions: 'Execute `scripts/connect.py` to send data to remote socket.',
      files: [{ path: 'scripts/connect.py', content: 'import socket\ns = socket.socket()', status: 'blocked', reason: 'disallowed network' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 20,
      category: 'Intentionally Incompatible',
      name: 'intentionally-incompatible-hardcoded-key',
      description: 'Skill containing hardcoded secret credentials.',
      instructions: 'Use API key `sk-123456789012345678901234` in request headers.',
      files: [],
      expectedPlatform: 'OpenAI',
      expectedNeedsTranslation: true
    },
    {
      id: 21,
      category: 'Claude',
      name: 'claude-computer-tool-automation',
      description: 'Performs desktop UI interaction via Claude computer tool.',
      instructions: 'Use `computer` tool to take screenshot and click application icon.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 22,
      category: 'OpenAI/Codex',
      name: 'openai-assistants-file-search',
      description: 'Searches uploaded document files using OpenAI file_search tool.',
      instructions: 'Use file_search tool to query policy PDF documents in vector store.',
      files: [],
      expectedPlatform: 'OpenAI',
      expectedNeedsTranslation: true
    },
    {
      id: 23,
      category: 'Generic',
      name: 'generic-yaml-validator',
      description: 'Validates YAML syntax and key structure.',
      instructions: 'Parse target YAML file and verify key names conform to schema.',
      files: [],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 24,
      category: 'Script-heavy',
      name: 'script-safe-math-calculator',
      description: 'Calculates mathematical formulas using clean Python script.',
      instructions: 'Run `scripts/math.py` to evaluate expression.',
      files: [{ path: 'scripts/math.py', content: 'import math\ndef calc(x): return math.sqrt(x)', status: 'ok' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 25,
      category: 'Script-heavy',
      name: 'script-conditional-fs-cleaner',
      description: 'Removes temporary files using python os module.',
      instructions: 'Run `scripts/clean_tmp.py` to remove temporary files.',
      files: [{ path: 'scripts/clean_tmp.py', content: 'import os\nimport shutil', status: 'warn', reason: 'uses system calls' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 26,
      category: 'Reference-heavy',
      name: 'reference-missing-schema-checker',
      description: 'Checks references to non-existent schema file.',
      instructions: 'Read `references/nonexistent.json` and validate config.',
      files: [],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 27,
      category: 'Reference-heavy',
      name: 'reference-unsupported-docx-reader',
      description: 'References binary docx file in assets directory.',
      instructions: 'Extract text from `assets/manual.docx`.',
      files: [{ path: 'assets/manual.docx', content: 'binary content', status: 'dropped', reason: 'unsupported binary file' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 28,
      category: 'Complex',
      name: 'long-body-progressive-disclosure-skill',
      description: 'Extensive skill with detailed line-by-line documentation.',
      instructions: Array(520).fill('Detail line for progressive disclosure test.').join('\n'),
      files: [],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 29,
      category: 'Tool-heavy',
      name: 'mixed-platform-jargon-skill',
      description: 'Skill combining Claude Bash tool, OpenAI Code Interpreter, and MCP server connectivity.',
      instructions: 'Use the Bash tool to list files in /mnt/data, call code_interpreter, and use MCP server for external resources.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 30,
      category: 'Compliant',
      name: 'complete-compliant-gemini-spark-skill',
      description: 'Fully compliant Gemini Spark skill with valid structure and clean scripts.',
      instructions: 'Inspect available workspace files and run `scripts/validate.py` to verify formatting.',
      files: [{ path: 'scripts/validate.py', content: 'print("Valid")', status: 'ok' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    }
  ];

  function runBenchmarkSuite(validator, translator, provider) {
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
        files: item.files
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
    runBenchmarkSuite
  };
}));
