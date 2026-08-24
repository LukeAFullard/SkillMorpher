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
      instructions: 'When editing code files in the repository, use the Bash tool to inspect files in /mnt/skills/. Always use `str_replace` to update target lines in existing source files.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 2,
      category: 'OpenAI/Codex',
      name: 'openai-data-analyst',
      description: 'Processes datasets via OpenAI runtime.',
      instructions: 'Analyze structured dataset files using Code Interpreter. Execute Python data analysis scripts to summarize metrics and format results using ChatGPT and OpenAI Assistants API schemas.',
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
      instructions: 'Inspect source code files in /mnt/data/src/ and use `str_replace` to modify existing function signatures.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 10,
      category: 'OpenAI/Codex',
      name: 'openai-code-interpreter-plot',
      description: 'Generates chart plots using OpenAI code interpreter.',
      instructions: 'Read CSV data files and generate chart plots by executing Python scripts in `code_interpreter` environment.',
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
      instructions: 'Execute git version control workflows using the Bash tool to inspect commit history (`git log --oneline`), check working tree status (`git status`), and view modified lines (`git diff`).',
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
      instructions: 'To interact with desktop application user interfaces, use the `computer` tool to capture screenshots and perform mouse click actions.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 22,
      category: 'OpenAI/Codex',
      name: 'openai-assistants-file-search',
      description: 'Searches uploaded document files using OpenAI file_search tool.',
      instructions: 'Query policy PDF documents uploaded to the vector store by invoking the `file_search` tool function.',
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
    },
    {
      id: 31,
      category: 'MCP',
      name: 'mcp-context-retrieval-skill',
      description: 'Retrieves external context using Model Context Protocol (MCP) servers.',
      instructions: 'Connect to MCP server `mcp://filesystem` and query resource context.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 32,
      category: 'Claude',
      name: 'claude-web-search-researcher',
      description: 'Researches topics using Claude search integration.',
      instructions: 'Use the web_search tool to look up current documentation for Gemini Spark.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 33,
      category: 'OpenAI/Codex',
      name: 'openai-gpt4o-file-parser',
      description: 'Parses complex multi-modal PDF reports via GPT-4o.',
      instructions: 'Use ChatGPT file search tool and gpt-4o vision to analyze report diagrams.',
      files: [],
      expectedPlatform: 'OpenAI',
      expectedNeedsTranslation: true
    },
    {
      id: 34,
      category: 'Script-heavy',
      name: 'python-pandas-aggregator',
      description: 'Aggregates CSV metrics using Python pandas dataframe.',
      instructions: 'Run `scripts/aggregate.py` to calculate summary statistics.',
      files: [{ path: 'scripts/aggregate.py', content: 'import json\ndef agg(d): return sum(d)', status: 'ok' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 35,
      category: 'Reference-heavy',
      name: 'api-spec-openapi-checker',
      description: 'Checks OpenAPI 3.0 YAML specification against guidelines.',
      instructions: 'Read `references/openapi.yaml` and verify path definitions match standard rules.',
      files: [{ path: 'references/openapi.yaml', content: 'openapi: 3.0.0\ninfo:\n  title: API', status: 'ok' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 36,
      category: 'Browser-dependent',
      name: 'browser-selenium-screen-grabber',
      description: 'Takes website screenshots using headless Selenium chrome.',
      instructions: 'Use computer tool and browser driver to navigate to URL and capture viewport screenshot.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 37,
      category: 'API-dependent',
      name: 'slack-webhook-notifier',
      description: 'Sends notification messages via Slack incoming webhooks.',
      instructions: 'Execute `scripts/send_slack.py` using SLACK_WEBHOOK_URL token.',
      files: [{ path: 'scripts/send_slack.py', content: 'import urllib.request\nprint("sent")', status: 'warn', reason: 'script calls network' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 38,
      category: 'Unsupported capabilities',
      name: 'gui-interactive-mouse-clicker',
      description: 'Automates direct OS mouse clicks and desktop window control.',
      instructions: 'Use computer_use to move mouse cursor to (100, 200) and double click.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 39,
      category: 'Complex',
      name: 'full-stack-code-refactoring-suite',
      description: 'Multi-stage code refactoring skill across frontend, backend, and schemas.',
      instructions: 'Inspect `/mnt/data/src` using Bash tool, run `scripts/lint.py`, check `references/styles.json`, and apply `str_replace`.',
      files: [
        { path: 'scripts/lint.py', content: 'print("lint ok")', status: 'ok' },
        { path: 'references/styles.json', content: '{"indent": 2}', status: 'ok' }
      ],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 40,
      category: 'Claude',
      name: 'claude-prompt-caching-optimizer',
      description: 'Optimizes system prompts using Claude prompt caching headers.',
      instructions: 'Insert anthropic-beta prompt caching markers around stable instruction context.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 41,
      category: 'OpenAI/Codex',
      name: 'openai-custom-gpt-action',
      description: 'Invokes external GPT action schema endpoints.',
      instructions: 'Execute OpenAPI action request formatted for Assistants API runtime.',
      files: [],
      expectedPlatform: 'OpenAI',
      expectedNeedsTranslation: true
    },
    {
      id: 42,
      category: 'MCP',
      name: 'mcp-database-connector',
      description: 'Queries relational database tables via MCP database tool server.',
      instructions: 'Call MCP database tool `mcp://postgres/query` to select records.',
      files: [],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 43,
      category: 'Script-heavy',
      name: 'node-json-formatter',
      description: 'Formats and reformats JSON files using Node JS helper script.',
      instructions: 'Run `scripts/format.js` to normalize JSON key indentation.',
      files: [{ path: 'scripts/format.js', content: 'console.log("{}");', status: 'ok' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 44,
      category: 'Reference-heavy',
      name: 'graphql-schema-inspector',
      description: 'Inspects GraphQL query types against reference schema document.',
      instructions: 'Consult `references/schema.graphql` to verify query argument types.',
      files: [{ path: 'references/schema.graphql', content: 'type Query { id: ID }', status: 'ok' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 45,
      category: 'Browser-dependent',
      name: 'puppeteer-pdf-generator',
      description: 'Generates PDF files by rendering HTML in headless Chrome browser.',
      instructions: 'Launch Puppeteer browser instance, load template HTML, and output PDF.',
      files: [],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 46,
      category: 'API-dependent',
      name: 'github-graphql-api-fetcher',
      description: 'Queries GitHub GraphQL API for repository issue stats.',
      instructions: 'Run `scripts/fetch_issues.py` with GITHUB_TOKEN credential.',
      files: [{ path: 'scripts/fetch_issues.py', content: 'import requests\nprint("issues")', status: 'warn', reason: 'script calls network' }],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 47,
      category: 'Unsupported capabilities',
      name: 'hardware-usb-device-controller',
      description: 'Controls connected USB hardware devices directly.',
      instructions: 'Send raw webusb packets to connected hardware microcontroller.',
      files: [],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 48,
      category: 'Complex',
      name: 'devops-ci-pipeline-migration-skill',
      description: 'Migrates GitHub Actions workflow pipelines to Gemini Spark execution.',
      instructions: 'Parse `.github/workflows/ci.yml`, run `scripts/validate_workflow.py`, and check `references/spark_matrix.md`.',
      files: [
        { path: 'scripts/validate_workflow.py', content: 'print("valid")', status: 'ok' },
        { path: 'references/spark_matrix.md', content: '# Matrix', status: 'ok' }
      ],
      expectedPlatform: 'Generic',
      expectedNeedsTranslation: false
    },
    {
      id: 49,
      category: 'Claude',
      name: 'claude-thinking-budget-allocator',
      description: 'Allocates extended reasoning thinking token budget.',
      instructions: 'Configure Claude extended thinking budget to 4096 tokens for complex math.',
      files: [],
      expectedPlatform: 'Anthropic',
      expectedNeedsTranslation: true
    },
    {
      id: 50,
      category: 'Compliant',
      name: 'spark-standard-python-analytics-skill',
      description: 'Fully compliant Gemini Spark data analysis skill with clean Python script and markdown guide.',
      instructions: 'Inspect input CSV data files and execute `scripts/analyze.py` to generate summary reports.',
      files: [
        { path: 'scripts/analyze.py', content: 'def process(): pass', status: 'ok' },
        { path: 'references/guide.md', content: '# Analysis Guide', status: 'ok' }
      ],
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
