const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

// Import modular pipeline scripts
const PlatformDetector = require('./src/platform-detector');
const Capabilities = require('./src/capabilities');
const Targets = require('./src/targets');
const ResourceGraph = require('./src/resource-graph');
const ScriptAnalyzer = require('./src/script-analyzer');
const DescriptionValidator = require('./src/description-validator');
const Validator = require('./src/validator');
const BrowserLocalProvider = require('./src/providers/browser-local-provider');
const TranslationProviders = require('./src/providers/index');
const Translator = require('./src/translator');
const BenchmarkCorpus = require('./src/benchmark-corpus');

test('index.html exists and contains no WebLLM CDN references', () => {
  const content = fs.readFileSync('index.html', 'utf8');
  assert.ok(content.length > 0, 'index.html should not be empty');
  assert.ok(content.includes('<!doctype html>'), 'index.html should start with doctype');
  assert.ok(content.includes('SkillMorpher'), 'index.html should contain title header');
  assert.strictEqual(content.includes('transformers.min.js'), false, 'index.html must not import classic transformers.min.js script');
  assert.strictEqual(content.includes('web-llm'), false, 'index.html must not import WebLLM CDN script');
});

test('browser-test.html exists and contains Gemma 4 E2B/E4B LiteRT-LM verification suite', () => {
  assert.ok(fs.existsSync('browser-test.html'), 'browser-test.html should exist');
  const content = fs.readFileSync('browser-test.html', 'utf8');
  assert.strictEqual(content.includes('transformers.min.js'), false, 'browser-test.html must not import classic transformers.min.js script');
  assert.ok(content.includes('gemma-4-e2b-it-litert'), 'browser-test.html must test Gemma 4 E2B LiteRT-LM model');
  assert.ok(content.includes('gemma-4-e4b-it-litert'), 'browser-test.html must test Gemma 4 E4B LiteRT-LM model');
});

test('index.html contains expected DOM element IDs and script logic', () => {
  const html = fs.readFileSync('index.html', 'utf8');

  // Verify critical UI elements exist in markup
  const expectedIds = [
    'customRepo',
    'loadRepoBtn',
    'auditAllBtn',
    'auditStatus',
    'pasteArea',
    'parsePasteBtn',
    'fileInput',
    'manifestCard',
    'copyName',
    'copyDesc',
    'copyInstr',
    'downloadBtn',
    'includeBlockedCheckbox',
    'bodyCredBanner',
    'platformBanner',
    'downloadStatus',
    'targetProfileSelect',
    'pipelineStages',
    'translateBtn',
    'translationSummary',
    'diffContainer',
    'providerSelect',
    'gpuStatusBadge',
    'localModelBox',
    'localModelSelect',
    'downloadModelBtn',
    'clearCacheBtn',
    'modelSpecsInfo',
    'modelTestStatus',
    'webgpuModal',
    'closeWebgpuModalBtn'
  ];

  for (const id of expectedIds) {
    assert.ok(html.includes(`id="${id}"`), `DOM element id="${id}" should exist in index.html`);
  }

  // Verify helper functions are present in inline JS script
  const expectedFunctions = [
    'classifyFile',
    'toKebabCase',
    'scanForNetworkCalls',
    'scanForCredentials',
    'scanForPlatformJargon',
    'extractTopics',
    'sanitizeZipPath',
    'parseSkillMd',
    'renderManifest'
  ];

  for (const fn of expectedFunctions) {
    assert.ok(html.includes(`function ${fn}`), `Function ${fn} should exist in JavaScript script`);
  }
});

test('JavaScript syntax is valid in index.html', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, '<script> block should exist');

  const jsCode = scriptMatch[1];
  // Verify function construction succeeds without SyntaxError
  assert.doesNotThrow(() => {
    new Function(jsCode.replace(/await /g, ''));
  }, 'Inline JavaScript should compile without syntax errors');
});

test('PlatformDetector module correctly identifies platform terms', () => {
  const text = 'Use the Bash tool to run commands in /mnt/data.\nAlso call OpenAI code_interpreter and MCP server.';
  const res = PlatformDetector.detectPlatforms(text);

  assert.ok(res.platforms.includes('Anthropic'));
  assert.ok(res.platforms.includes('OpenAI'));
  assert.ok(res.platforms.includes('Generic'));

  const bashDet = res.detections.find(d => d.term === 'Bash');
  assert.ok(bashDet);
  assert.strictEqual(bashDet.line, 1);
});

test('Capabilities module builds capability requirements correctly', () => {
  const detections = [
    { platform: 'Anthropic', term: 'Bash', capability: 'shellExecution', line: 5, lineContent: 'Use Bash tool' }
  ];
  const reqs = Capabilities.buildCapabilityRequirements(detections);
  assert.strictEqual(reqs.length, 1);
  assert.strictEqual(reqs[0].capability, 'shellExecution');
  assert.strictEqual(reqs[0].confidence, 0.99);
  assert.strictEqual(reqs[0].location, 'SKILL.md:5');
});

test('ResourceGraph identifies missing and unsupported files', () => {
  const body = 'Refer to `scripts/fetch.py` and `references/schema.md` and `assets/template.docx`.';
  const bundledFiles = [
    { path: 'scripts/fetch.py', status: 'ok' },
    { path: 'assets/template.docx', status: 'dropped', reason: 'unsupported extension' }
  ];

  const graph = ResourceGraph.buildResourceGraph(body, bundledFiles);

  assert.strictEqual(graph.references.length, 3);
  assert.strictEqual(graph.missingOrBroken.length, 2);

  const missingSchema = graph.missingOrBroken.find(r => r.reference === 'references/schema.md');
  assert.ok(missingSchema);
  assert.strictEqual(missingSchema.status, 'missing');

  const droppedDocx = graph.missingOrBroken.find(r => r.reference === 'assets/template.docx');
  assert.ok(droppedDocx);
  assert.strictEqual(droppedDocx.status, 'unsupported');
});

test('ScriptAnalyzer classifies scripts into SAFE, CONDITIONAL, INCOMPATIBLE', () => {
  const safeScript = ScriptAnalyzer.analyzeScript('clean.py', 'def add(a, b):\n    return a + b');
  assert.strictEqual(safeScript.classification, 'SAFE');

  const conditionalScript = ScriptAnalyzer.analyzeScript('os.py', 'import subprocess\nprint("hello")');
  assert.strictEqual(conditionalScript.classification, 'CONDITIONAL');

  const incompatibleScript = ScriptAnalyzer.analyzeScript('fetch.py', 'import requests\nrequests.get("https://api.com")');
  assert.strictEqual(incompatibleScript.classification, 'INCOMPATIBLE');
  assert.strictEqual(incompatibleScript.hasNetwork, true);
});

test('DescriptionValidator validates description rules and offers suggested trigger description', () => {
  const weak = DescriptionValidator.validateDescription('Helps with PDFs.', 'pdf-helper');
  assert.strictEqual(weak.isValid, false);
  assert.strictEqual(weak.isWeakTrigger, true);
  assert.ok(weak.suggestedDescription.includes('pdf helper'));

  const valid = DescriptionValidator.validateDescription('Extracts text and tables from PDF files, fills PDF forms, and merges documents. Use when the user mentions PDFs, form filling, or document extraction.', 'pdf-helper');
  assert.strictEqual(valid.isValid, true);
});

test('Validator checks frontmatter regex name and pipeline results', () => {
  const invalidSkill = { fixedName: '-invalid-name-', description: 'desc', instructions: 'body', files: [] };
  const valResult1 = Validator.validateSkill(invalidSkill, 'geminiSpark');
  assert.strictEqual(valResult1.structure.status, 'BLOCK');

  const validSkill = {
    fixedName: 'my-valid-skill',
    description: 'Processes data when user requests analytics.',
    instructions: 'Use the Bash tool to inspect the repository.\nRun:\n`find . -type f`',
    files: []
  };
  const valResult2 = Validator.validateSkill(validSkill, 'geminiSpark');
  assert.strictEqual(valResult2.structure.status, 'PASS');
  assert.strictEqual(valResult2.gemini.needsTranslation, true);
});

test('Translator engine performs concrete Gemini translations, manual review warnings, and diff generation', () => {
  const skill = {
    instructions: 'Use the Bash tool to inspect the repository.\nRun:\n`find . -type f`\nUse `str_replace` to modify the target file.\nUse the `computer` tool to open browser.',
    description: 'Helps with repository editing.'
  };

  const res = Translator.translateSkill(skill, 'geminiSpark');

  assert.ok(res.translatedBody.includes('Inspect the repository files available to you'));
  assert.ok(res.translatedBody.includes('Modify the target file directly while preserving unrelated content'));
  assert.ok(res.translatedBody.includes('Manual review required'));
  assert.strictEqual(res.changesCount, 4);
  assert.ok(res.diff.length > 0);
  assert.strictEqual(res.confidenceCounts.HIGH, 3);
  assert.strictEqual(res.confidenceCounts.NONE, 1);
});

test('Gemini Spark deterministic mappings: Widened pattern tests on realistic skill phrasing', () => {
  const testCases = [
    {
      input: 'Execute diagnostic steps in bash commands to inspect workspace state.',
      expected: 'execute required local commands where shell access is available'
    },
    {
      input: 'Read templates/viewer.html using the Read tool.',
      expected: 'by inspecting and reading the specified file'
    },
    {
      input: 'Use create_file to scaffold the initial template.',
      expected: 'direct file editing'
    },
    {
      input: 'Run data processing scripts in the Code Interpreter environment.',
      expected: 'executing local code in the available runtime'
    },
    {
      input: 'Scaffold interactive components for ChatGPT Apps SDK.',
      expected: 'Gemini Spark custom skill environment'
    },
    {
      input: 'Configure workflows for OpenAI Assistants API.',
      expected: 'Gemini agent environment'
    },
    {
      input: 'Run verification tests via playwright-cli in headful mode.',
      expected: 'Manual review required'
    },
    {
      input: 'Validate doc accessibility in claude.ai with a fresh Claude instance.',
      expected: 'Gemini workspace / Gemini model'
    },
    {
      input: 'Connect to the mcp server to query external schemas.',
      expected: 'Manual review required'
    }
  ];

  for (const tc of testCases) {
    const res = Translator.translateSkill({ instructions: tc.input, description: 'Test' }, 'geminiSpark');
    assert.ok(
      res.translatedBody.includes(tc.expected),
      `Expected "${tc.input}" to translate to contain "${tc.expected}", got:\n${res.translatedBody}`
    );
  }
});

test('Translator AI prompt generation and unconfigured/offline fallback handling', async () => {
  const skill = {
    instructions: 'Use the Bash tool to inspect the repository.',
    description: 'A test skill'
  };

  const prompt = Translator.generateAIPrompt(skill, 'geminiSpark');
  assert.ok(prompt.includes('Gemini Agent Skill Translator'));
  assert.ok(prompt.includes('Original Instructions:\nUse the Bash tool to inspect the repository.'));

  // Calling translateSkillAI without key returns deterministic result
  const fallbackRes = await Translator.translateSkillAI(skill, null, 'geminiSpark');
  assert.strictEqual(fallbackRes.isAI, false);
  assert.ok(fallbackRes.translatedBody.includes('Inspect the repository files available to you'));
});

test('BrowserLocalProvider: loadModel times out on a hung download', async () => {
  let timerId = null;
  global.litertCore = {
    Engine: {
      create: (opts) => new Promise((resolve) => {
        timerId = setTimeout(resolve, 10000);
      })
    }
  };

  const provider = new BrowserLocalProvider();
  provider.loadTimeoutMs = 100;
  provider.checkHardwareSupport = async () => ({ supported: true });

  const start = Date.now();
  await assert.rejects(
    () => provider.loadModel('gemma-4-e2b-it-litert'),
    /timed out after 100ms/
  );
  const elapsed = Date.now() - start;

  if (timerId) clearTimeout(timerId);
  assert.ok(elapsed < 1000, `Expected timeout in wall-clock bound (< 1000ms), took ${elapsed}ms`);

  delete global.litertCore;
});

test('BrowserLocalProvider: filters empty/padding chunks and emits staged progress status', async () => {
  const reports = [];
  const mockEngine = {
    createConversation: async () => ({
      sendMessageStreaming: async function* () {
        // Yield empty/padding chunks first (simulating issue #2126 upstream control spam)
        yield '';
        yield '   ';
        yield null;
        yield { text: '' };
        // Yield real text content
        yield '{"translated_skill_md": "Clean translated output"}';
      },
      delete: async () => {}
    })
  };

  const provider = new BrowserLocalProvider();
  provider.loadedEngine = mockEngine;
  provider.currentModelId = 'gemma-4-e2b-it-litert';

  const skill = { instructions: 'Use the `computer` tool to open browser.', description: 'Test' };
  const res = await provider.translate({
    skill,
    target: 'gemini-spark',
    model: 'gemma-4-e2b-it-litert',
    progressCallback: (r) => reports.push(r)
  });

  assert.strictEqual(res.translatedBody, 'Clean translated output');
  assert.ok(reports.length >= 3, 'Should emit progress reports for initializing, warming, and generating phases');

  // Verify initializing phase
  assert.strictEqual(reports[0].phase, 'initializing');
  assert.ok(reports[0].text.includes('Initializing model session…'));

  // Verify warming phase
  assert.strictEqual(reports[1].phase, 'warming');
  assert.ok(reports[1].text.includes('Warming up (this can take up to a minute)…'));

  // Verify generating phase (emitted only when non-empty text arrives)
  const genReport = reports.find(r => r.phase === 'generating');
  assert.ok(genReport, 'Progress report for generating phase should exist');
  assert.ok(genReport.charsGenerated > 0, 'charsGenerated should count only non-empty content');
  assert.ok(genReport.text.includes('Generating… ('), 'Status text should reflect generating state');
});

test('Translator.translateWithProvider forwards progressCallback to provider', async () => {
  let callbackReceived = false;
  const mockProvider = {
    id: 'mock-provider',
    translate: async ({ progressCallback }) => {
      if (typeof progressCallback === 'function') {
        progressCallback({ status: 'generating', text: 'Forwarded progress test' });
      }
      return {
        translatedBody: 'Translated text',
        changes: [],
        manualReview: []
      };
    }
  };

  const skill = { instructions: 'Clean text', description: 'Test' };
  await Translator.translateWithProvider({
    provider: mockProvider,
    model: 'mock-model',
    skill,
    targetKey: 'geminiSpark',
    progressCallback: (r) => {
      if (r.text === 'Forwarded progress test') {
        callbackReceived = true;
      }
    }
  });

  assert.strictEqual(callbackReceived, true, 'translateWithProvider should forward progressCallback to provider');
});

test('BrowserLocalProvider: generation timeout deletes chat session and retains engine', async () => {
  let chatDeleted = false;
  let engineDeleted = false;

  const mockEngine = {
    createConversation: async () => ({
      sendMessageStreaming: async function* () {
        // Yield one chunk, then stall forever
        yield '{"translated_skill_md": "';
        await new Promise((resolve) => setTimeout(resolve, 5000));
      },
      delete: async () => {
        chatDeleted = true;
      }
    }),
    delete: async () => {
      engineDeleted = true;
    }
  };

  global.litertCore = {
    Engine: { create: async () => mockEngine }
  };

  const provider = new BrowserLocalProvider();
  provider.generateTimeoutMs = 100;
  provider.loadedEngine = mockEngine;
  provider.currentModelId = 'gemma-4-e2b-it-litert';

  const skill = { instructions: 'Use the `computer` tool to open browser.', description: 'Test' };

  await assert.rejects(
    () => provider.translate({ skill, target: 'gemini-spark', model: 'gemma-4-e2b-it-litert' }),
    /Generation timed out after 100ms/
  );

  assert.strictEqual(chatDeleted, true, 'Chat session delete should be called upon generation timeout');
  assert.strictEqual(engineDeleted, false, 'Loaded engine should NOT be deleted on generation timeout');
  assert.strictEqual(provider.loadedEngine, mockEngine, 'Loaded engine reference should be retained after timeout');

  delete global.litertCore;
});

test('BrowserLocalProvider Gemma 4 model ladder, prompt formatting, hardware checking, and simultaneous load guard', async () => {
  const provider = new BrowserLocalProvider();
  const models = BrowserLocalProvider.getModels();

  assert.strictEqual(models.length, 2);
  const defaultModel = models.find(m => m.recommended);
  assert.ok(defaultModel);
  assert.strictEqual(defaultModel.id, 'gemma-4-e2b-it-litert');
  assert.strictEqual(defaultModel.sizeBytes, 2008432640);

  const e2b = models.find(m => m.id === 'gemma-4-e2b-it-litert');
  assert.ok(e2b);
  assert.strictEqual(e2b.context, '128K');

  const e4b = models.find(m => m.id === 'gemma-4-e4b-it-litert');
  assert.ok(e4b);
  assert.strictEqual(e4b.sizeBytes, 2969059328);

  const skill = { instructions: 'Use the Bash tool to check code.', description: 'Test skill' };
  const analysis = { gemini: { sourcePlatform: 'anthropic' }, capabilities: ['shellExecution'] };

  const structuredPrompt = provider.buildStructuredPrompt({ skill, analysis, target: 'gemini-spark' });
  assert.ok(structuredPrompt.includes('Gemma 4 Agent Skill Translator'));
  assert.ok(structuredPrompt.includes('"source_platform": "anthropic"'));
  assert.ok(structuredPrompt.includes('"translated_skill_md"'));

  const hw = await provider.checkHardwareSupport();
  if (typeof navigator !== 'undefined' && !navigator.gpu) {
    assert.strictEqual(hw.supported, false);
    assert.strictEqual(hw.status, 'UNSUPPORTED');
  } else if (typeof navigator === 'undefined') {
    assert.strictEqual(hw.supported, false);
    assert.strictEqual(hw.status, 'UNSUPPORTED');
  }

  // Test WebGPU hardware checks with simulated navigator.gpu and buffer limits
  const origNavDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    // Case 1: Standard / integrated WebGPU adapter (limited buffer limits <= 512MB) -> conservative E2B
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        gpu: {
          requestAdapter: async () => ({
            isFallbackAdapter: false,
            limits: { maxBufferSize: 268435456, maxStorageBufferBindingSize: 268435456 }
          })
        },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        deviceMemory: 8
      },
      configurable: true,
      writable: true
    });
    const hwStandard = await provider.checkHardwareSupport();
    assert.strictEqual(hwStandard.supported, true);
    assert.strictEqual(hwStandard.recommendedModel, 'gemma-4-e2b-it-litert', 'Standard integrated GPU should recommend conservative E2B');
    assert.strictEqual(hwStandard.adapterLimits.maxBufferSize, 268435456);

    // Case 2: High VRAM discrete WebGPU adapter (maxBufferSize >= 1GB & maxStorageBufferBindingSize >= 1GB) -> E4B
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        gpu: {
          requestAdapter: async () => ({
            isFallbackAdapter: false,
            limits: { maxBufferSize: 2147483648, maxStorageBufferBindingSize: 2147483648 }
          })
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        deviceMemory: 16
      },
      configurable: true,
      writable: true
    });
    const hwDiscrete = await provider.checkHardwareSupport();
    assert.strictEqual(hwDiscrete.supported, true);
    assert.strictEqual(hwDiscrete.recommendedModel, 'gemma-4-e4b-it-litert', 'High VRAM GPU with large buffer limits should recommend E4B');

    // Case 3: Navigator without GPU -> Unsupported (No CPU fallback for Gemma 4)
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0', deviceMemory: 8 },
      configurable: true,
      writable: true
    });
    const hwCpu = await provider.checkHardwareSupport();
    assert.strictEqual(hwCpu.supported, false);
    assert.strictEqual(hwCpu.status, 'UNSUPPORTED');
    assert.ok(hwCpu.reason.includes('Gemma 4 requires WebGPU'));
  } finally {
    if (origNavDesc) {
      Object.defineProperty(globalThis, 'navigator', origNavDesc);
    } else {
      delete globalThis.navigator;
    }
  }

  // Test simultaneous load guard flag
  provider.isModelLoading = true;
  await assert.rejects(
    async () => { await provider.loadModel('gemma-4-e4b-it-litert'); },
    /Another model is currently downloading/
  );
  provider.isModelLoading = false;
});

test('BrowserLocalProvider resource lifecycle, prompt capping, decoding slice, and hardware enforcement', async () => {
  const provider = new BrowserLocalProvider();

  // Test 1: Prompt capping
  const hugeBody = 'A'.repeat(15000);
  const prompt = provider.buildStructuredPrompt({ skill: { instructions: hugeBody }, target: 'gemini-spark' });
  assert.ok(prompt.includes('[... truncated for local browser inference ...]'), 'buildStructuredPrompt should truncate long skill instructions');
  assert.ok(!prompt.includes('A'.repeat(10000)), 'buildStructuredPrompt should not include huge body un-truncated');

  // Test 2: unloadModel error resilience
  let deleteCalled = false;
  provider.loadedEngine = { delete: async () => { deleteCalled = true; } };

  const unloaded = await provider.unloadModel();
  assert.strictEqual(unloaded, true);
  assert.strictEqual(deleteCalled, true);
  assert.strictEqual(provider.getStatus().loaded, false, 'getStatus().loaded should be false after unloadModel');

  // Test 3: loadModel idempotency and previous model unloading
  let previousUnloaded = false;
  provider.checkHardwareSupport = async () => ({ supported: true, status: 'SUPPORTED' });

  provider.currentModelId = 'gemma-4-e2b-it-litert';
  provider.loadedEngine = { delete: async () => { previousUnloaded = true; } };

  // Re-entry of same loaded model is no-op
  const sameRes = await provider.loadModel('gemma-4-e2b-it-litert');
  assert.strictEqual(previousUnloaded, false, 'Same model re-entry should not unload');

  // Switching model unloads previous model
  global.litertCore = { Engine: { create: async () => ({ delete: async () => {} }) } };
  await provider.loadModel('gemma-4-e4b-it-litert');
  assert.strictEqual(previousUnloaded, true, 'Switching model should unload previous model');

  // Test 4: loadModel failure cleanup on generic exception
  let unloadCalledOnCatch = false;
  const originalUnloadModel = provider.unloadModel.bind(provider);

  global.litertCore = {
    Engine: {
      create: async () => { throw new Error('Simulated download failure mid-way'); }
    }
  };

  provider.unloadModel = async function() {
    unloadCalledOnCatch = true;
    return await originalUnloadModel();
  };

  await assert.rejects(
    () => provider.loadModel('gemma-4-e2b-it-litert'),
    /Simulated download failure mid-way/
  );
  assert.strictEqual(unloadCalledOnCatch, true, 'loadModel should call unloadModel on any exception');
  provider.unloadModel = originalUnloadModel;
  delete global.litertCore;

  // Test 5: Hardware marginal model substitution
  provider.checkHardwareSupport = async () => ({
    supported: true,
    status: 'MARGINAL',
    recommendedModel: 'gemma-4-e2b-it-litert',
    memoryWarning: 'System memory is low'
  });

  global.litertCore = { Engine: { create: async () => ({ delete: async () => {} }) } };
  const loadedRes = await provider.loadModel('gemma-4-e4b-it-litert');
  assert.strictEqual(provider.currentModelId, 'gemma-4-e2b-it-litert', 'Low-memory marginal device should substitute E2B when E4B is requested');
  delete global.litertCore;
});

test('BrowserLocalProvider targeted span translation vs full-document fallback', async () => {
  const provider = new BrowserLocalProvider();
  provider.loadedEngine = {
    createConversation: async () => ({
      sendMessageStreaming: async function* (prompt) {
        if (prompt.includes('Translate only the specific platform-dependent snippets')) {
          yield '{"changes": [{"original": "Use the Bash tool to inspect the repository.", "replacement": "Inspect the repository files available to you.", "reason": "Gemini tool equivalent", "confidence": "high"}], "manual_review": []}';
        } else {
          yield '{"translated_skill_md": "Full document fallback text.", "changes": [], "manual_review": []}';
        }
      },
      delete: async () => {}
    })
  };

  // Targeted translation path when candidate spans exist and no manual review blockers
  const skillTargeted = {
    instructions: 'Use the Bash tool to inspect the repository.\nPerform standard operations.',
    description: 'Targeted test'
  };
  const targetedRes = await provider.translate({
    skill: skillTargeted,
    target: 'gemini-spark',
    model: 'gemma-4-e2b-it-litert'
  });

  assert.strictEqual(targetedRes.targeted, true);
  assert.ok(targetedRes.translatedBody.includes('Inspect the repository files available to you.'));
  assert.strictEqual(targetedRes.changes.length, 1);

  // Full-document fallback path when manual review blocker is present
  const skillFallback = {
    instructions: 'Use the `computer` tool to open browser.',
    description: 'Fallback test'
  };
  const fallbackRes = await provider.translate({
    skill: skillFallback,
    target: 'gemini-spark',
    model: 'gemma-4-e2b-it-litert'
  });

  assert.strictEqual(fallbackRes.targeted, false);
  assert.strictEqual(fallbackRes.translatedBody, 'Full document fallback text.');
});

test('Translator translateWithProvider routing and fallback behavior for Gemma 4', async () => {
  const skill = { instructions: 'Use the Bash tool to inspect the repository.', description: 'Test' };

  // Mock failing provider (e.g. browser without WebGPU / WebLLM)
  const failingProvider = new BrowserLocalProvider();

  const resFailing = await Translator.translateWithProvider({
    provider: failingProvider,
    model: 'gemma-4-e4b-it-litert',
    skill,
    targetKey: 'geminiSpark'
  });

  assert.strictEqual(resFailing.mode, 'deterministic-fallback');
  assert.ok(resFailing.providerError && resFailing.providerError.length > 0);
  assert.ok(resFailing.translatedBody.includes('Inspect the repository files available to you'));

  // Mock successful provider
  const successProvider = {
    id: 'browser-local',
    translate: async () => ({
      translatedBody: 'Inspect the repository available files.',
      changes: [{ original: 'Use the Bash tool', replacement: 'Inspect files', reason: 'Translated', confidence: 'high' }],
      manualReview: []
    })
  };

  const resSuccess = await Translator.translateWithProvider({
    provider: successProvider,
    model: 'gemma-4-e4b-it-litert',
    skill,
    targetKey: 'geminiSpark'
  });

  assert.strictEqual(resSuccess.mode, 'provider');
  assert.strictEqual(resSuccess.providerId, 'browser-local');
  assert.strictEqual(resSuccess.model, 'gemma-4-e4b-it-litert');
});

test('AI Translation Failure Paths: generateAndParse retry logic and mid-generation provider fallback', async () => {
  const generateAndParse = BrowserLocalProvider.generateAndParse;
  assert.strictEqual(typeof generateAndParse, 'function', 'generateAndParse should be exported on BrowserLocalProvider');

  // Test 1: Garbage JSON triggers retry and throws useful error if retry fails
  const promptsSeenGarbage = [];
  const garbageGen = async (prompt) => {
    promptsSeenGarbage.push(prompt);
    return promptsSeenGarbage.length === 1 ? 'NOT_JSON_GARBAGE' : 'STILL_GARBAGE';
  };

  await assert.rejects(
    () => generateAndParse(garbageGen, 'initial prompt', 1),
    (err) => {
      assert.ok(err.message.includes('Gemma output was not valid JSON: STILL_GARBAGE'));
      return true;
    }
  );
  assert.strictEqual(promptsSeenGarbage.length, 2, 'generateAndParse should retry exactly once on bad JSON');
  assert.ok(promptsSeenGarbage[1].includes('Your previous output was not valid JSON'), 'Retry prompt should contain corrective instruction');

  // Test 2: Truncated JSON triggers retry
  const promptsSeenTruncated = [];
  const truncatedGen = async (prompt) => {
    promptsSeenTruncated.push(prompt);
    return '{"translated_skill_md": "Truncated string...';
  };

  await assert.rejects(
    () => generateAndParse(truncatedGen, 'initial prompt', 1),
    /Gemma output was not valid JSON/
  );
  assert.strictEqual(promptsSeenTruncated.length, 2, 'Truncated JSON should trigger retry');

  // Test 3: Markdown-fenced invalid JSON triggers retry
  const promptsSeenFenced = [];
  const fencedGen = async (prompt) => {
    promptsSeenFenced.push(prompt);
    return '```json\n{ "translated_skill_md": invalid_value }\n```';
  };

  await assert.rejects(
    () => generateAndParse(fencedGen, 'initial prompt', 1),
    /Gemma output was not valid JSON/
  );
  assert.strictEqual(promptsSeenFenced.length, 2, 'Markdown-fenced invalid JSON should trigger retry');

  // Test 4: Successful recovery on retry
  const promptsSeenRecovery = [];
  const recoveryGen = async (prompt) => {
    promptsSeenRecovery.push(prompt);
    if (promptsSeenRecovery.length === 1) {
      return '```json\n{ "translated_skill_md": invalid_value }\n```';
    }
    return '{"translated_skill_md": "Successfully recovered body text", "changes": []}';
  };

  const recoveredRes = await generateAndParse(recoveryGen, 'initial prompt', 1);
  assert.strictEqual(promptsSeenRecovery.length, 2, 'Recovery should take 2 attempts');
  assert.strictEqual(recoveredRes.translated_skill_md, 'Successfully recovered body text');

  // Test 5: translateWithProvider mid-generation failure fallback to deterministic engine
  const midGenErrorProvider = {
    id: 'browser-local',
    translate: async () => {
      throw new Error('WebGPU OOM exception mid-generation during model.generate()');
    }
  };

  const skill = { instructions: 'Use the Bash tool to inspect files.', description: 'Mid-generation test' };
  const fallbackRes = await Translator.translateWithProvider({
    provider: midGenErrorProvider,
    model: 'gemma-4-e4b-it-webgpu',
    skill,
    targetKey: 'geminiSpark'
  });

  assert.strictEqual(fallbackRes.mode, 'deterministic-fallback');
  assert.strictEqual(fallbackRes.providerError, 'WebGPU OOM exception mid-generation during model.generate()');
  assert.ok(fallbackRes.translatedBody.includes('Inspect the repository files available to you'), 'Fallback should output deterministic translation');
});

test('Credential scanning, platform jargon detection, extractTopics, and path sanitization helper functions', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, '<script> block should exist');

  const jsCode = scriptMatch[1];
  // Extract and evaluate scanForCredentials, scanForPlatformJargon, extractTopics, and sanitizeZipPath with dummy DOM
  const mockScript = jsCode
    .replace(/await /g, '')
    .replace(/\(function\(\)\{/, '(function(){\n  global.scanForCredentials = scanForCredentials;\n  global.scanForPlatformJargon = scanForPlatformJargon;\n  global.extractTopics = extractTopics;\n  global.sanitizeZipPath = sanitizeZipPath;\n');

  const fnEvaluator = new Function(`
    const dummyEl = { classList: { remove: () => {}, add: () => {} }, style: {}, addEventListener: () => {}, appendChild: () => {} };
    const document = {
      getElementById: () => dummyEl,
      querySelectorAll: () => [],
      createElement: () => dummyEl
    };
    ${mockScript}
    return { scanForCredentials: global.scanForCredentials, scanForPlatformJargon: global.scanForPlatformJargon, extractTopics: global.extractTopics, sanitizeZipPath: global.sanitizeZipPath };
  `);
  const { scanForCredentials, scanForPlatformJargon, extractTopics, sanitizeZipPath } = fnEvaluator();

  // Test Anthropic key (literal secret)
  const antResult = scanForCredentials('KEY="sk-ant-api03-12345678901234567890"');
  assert.deepStrictEqual(antResult.secrets, [{ name: 'Anthropic key', line: 1, preview: 'sk-a…90' }]);

  // Test PEM private key block
  const pemResult = scanForCredentials('-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----');
  assert.deepStrictEqual(pemResult.secrets, [{ name: 'private key block', line: 1, preview: null }]);

  // Test fake sk-... value (literal secret)
  const secretResult = scanForCredentials('KEY="sk-123456789012345678901234"');
  assert.deepStrictEqual(secretResult.secrets, [{ name: 'OpenAI key', line: 1, preview: 'sk-1…34' }]);

  // Test placeholder string is NOT flagged as literal secret
  const placeholderResult = scanForCredentials('KEY="YOUR_API_KEY_HERE"');
  assert.deepStrictEqual(placeholderResult.secrets, []);

  // Test strict key reference (e.g. OPENAI_API_KEY, DB_PASSWORD)
  const envRefResult = scanForCredentials('This requires OPENAI_API_KEY to function.');
  assert.strictEqual(envRefResult.hasKeyReference, true);

  const pwdRefResult = scanForCredentials('Requires DB_PASSWORD setting');
  assert.strictEqual(pwdRefResult.hasKeyReference, true);

  // Test assignment-shaped key patterns (camelCase / lowercase / yaml / json style)
  const yamlKeyResult = scanForCredentials('apiKey: my-placeholder');
  assert.strictEqual(yamlKeyResult.hasKeyReference, true, 'apiKey: assignment should trigger strict reference detection');

  const eqSecretResult = scanForCredentials('client_secret=some_value');
  assert.strictEqual(eqSecretResult.hasKeyReference, true, 'client_secret= assignment should trigger strict reference detection');

  // Test soft vs strict reference separation
  const softProseResult = scanForCredentials('Please supply your api_key here');
  assert.strictEqual(softProseResult.hasKeyReference, false, 'Bare "api_key" should not trigger strict hasKeyReference');

  const softProseIncludedResult = scanForCredentials('Please supply your api_key here', true);
  assert.strictEqual(softProseIncludedResult.hasKeyReference, true, 'Bare "api_key" should trigger soft hasKeyReference when includeSoft=true');

  // Test platform jargon detection
  const claudeJargon = scanForPlatformJargon('Use the bash tool in /mnt/skills/ dir');
  assert.deepStrictEqual(claudeJargon, ['Claude/Anthropic-specific']);

  const openaiJargon = scanForPlatformJargon('Run Code Interpreter and call Assistants API');
  assert.deepStrictEqual(openaiJargon, ['OpenAI-specific']);

  const bothJargon = scanForPlatformJargon('Use chatgpt and claude.ai');
  assert.deepStrictEqual(bothJargon, ['Claude/Anthropic-specific', 'OpenAI-specific']);

  const cleanJargon = scanForPlatformJargon('Standard instructions for gemini spark');
  assert.deepStrictEqual(cleanJargon, []);

  // Test path sanitizer with ../../evil.js
  const sanitized = sanitizeZipPath('../../evil.js');
  assert.strictEqual(sanitized, 'evil.js');

  const sanitizedNested = sanitizeZipPath('foo/../bar/./baz/../../evil.js');
  assert.strictEqual(sanitizedNested, 'evil.js');

  // Test extractTopics keyword matching
  assert.deepStrictEqual(extractTopics('excel-data-exporter spreadsheets'), ['spreadsheets', 'data']);
  assert.deepStrictEqual(extractTopics('pdf-generator-tool'), ['pdf']);
  assert.deepStrictEqual(extractTopics('web-scraper-pipeline'), ['web', 'automation']);
  assert.deepStrictEqual(extractTopics('some-random-folder'), []);
});

test('renderManifest and body credential scanning state/UI behavior', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, '<script> block should exist');

  const jsCode = scriptMatch[1];

  // Create a minimal mock DOM environment to test renderManifest
  const createMockElement = (id = '') => {
    const el = {
      id,
      style: {},
      classList: {
        add: function(c) { el.classes.add(c); },
        remove: function(c) { el.classes.delete(c); }
      },
      classes: new Set(),
      children: [],
      _innerHTML: '',
      get innerHTML() {
        if (this._innerHTML) return this._innerHTML;
        const classStr = Array.from(this.classes).join(' ');
        const attrStr = classStr ? ` class="${classStr}"` : '';
        const childStr = this.children.length
          ? this.children.map(c => c.innerHTML || c.textContent || '').join('')
          : (this.textContent || '');
        return classStr || this.children.length ? `<span${attrStr}>${childStr}</span>` : childStr;
      },
      set innerHTML(val) {
        this._innerHTML = val;
        if (val === '') this.children = [];
      },
      get className() { return Array.from(this.classes).join(' '); },
      set className(val) {
        this.classes = new Set((val || '').split(' ').filter(Boolean));
      },
      value: '',
      _textContent: '',
      get textContent() { return this._textContent; },
      set textContent(val) {
        this._textContent = val;
        if (val === '') this.children = [];
      },
      checked: false,
      addEventListener: () => {},
      scrollIntoView: () => {},
      appendChild: function(child) {
        this.children.push(child);
      }
    };
    return el;
  };

  const elements = {};
  const mockDoc = {
    getElementById: (id) => {
      if (!elements[id]) {
        elements[id] = createMockElement(id);
      }
      return elements[id];
    },
    querySelectorAll: () => [],
    createElement: (tag) => createMockElement()
  };

  const mockScript = jsCode
    .replace(/await /g, '')
    .replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.renderManifest = renderManifest;\n  globalThis.state = state;\n})();');

  const evalContext = new Function('document', 'window', 'globalThis', `
    ${mockScript}
    return { renderManifest: globalThis.renderManifest, state: globalThis.state };
  `);

  const { renderManifest, state } = evalContext(mockDoc, {}, globalThis);

  // Test 1: Clean body
  renderManifest('test source', { name: 'my-skill', description: 'Clean description' }, 'Clean instructions', []);
  assert.strictEqual(state.currentSkill.bodyKeyReference, false);
  assert.deepStrictEqual(state.currentSkill.bodySecrets, []);
  assert.strictEqual(mockDoc.getElementById('bodyCredBanner').style.display, 'none');
  assert.strictEqual(mockDoc.getElementById('platformBanner').style.display, 'none');

  const fileListClean = mockDoc.getElementById('fileManifest');
  assert.ok(fileListClean.children[0].innerHTML.includes('SKILL.md'));
  assert.ok(fileListClean.children[0].innerHTML.includes('stamp-tag ok'));

  // Test 1b: Body with platform jargon
  renderManifest('test source', { name: 'my-skill', description: 'Use the bash tool' }, 'Instructions on claude.ai', []);
  assert.strictEqual(mockDoc.getElementById('platformBanner').style.display, 'block');
  assert.ok(mockDoc.getElementById('platformBanner').textContent.includes('Claude/Anthropic-specific'));

  // Test 2: Body with key reference (OPENAI_API_KEY example)
  renderManifest('test source', { name: 'my-skill', description: 'OPENAI_API_KEY required' }, 'Instructions here', []);
  assert.strictEqual(state.currentSkill.bodyKeyReference, true);
  assert.deepStrictEqual(state.currentSkill.bodySecrets, []);
  assert.strictEqual(mockDoc.getElementById('bodyCredBanner').style.display, 'block');
  assert.strictEqual(mockDoc.getElementById('bodyCredBanner').className, 'cred-banner');
  assert.ok(mockDoc.getElementById('bodyCredBanner').textContent.includes('reference a third-party API key'));

  const fileListRef = mockDoc.getElementById('fileManifest');
  assert.ok(fileListRef.children[0].innerHTML.includes('stamp-tag warn'));

  // Test 3: Body with literal secret (Anthropic key)
  renderManifest('test source', { name: 'my-skill', description: 'Desc' }, 'Here is my key sk-ant-api03-12345678901234567890', []);
  assert.deepStrictEqual(state.currentSkill.bodySecrets, [{ name: 'Anthropic key', line: 1, preview: 'sk-a…90' }]);
  assert.strictEqual(mockDoc.getElementById('bodyCredBanner').style.display, 'block');
  assert.strictEqual(mockDoc.getElementById('bodyCredBanner').className, 'cred-banner cred-banner-blocked');
  assert.ok(mockDoc.getElementById('bodyCredBanner').textContent.includes('real Anthropic key sk-a…90 (line 1)'));

  const fileListBlocked = mockDoc.getElementById('fileManifest');
  assert.ok(fileListBlocked.children[0].innerHTML.includes('stamp-tag blocked'));

  // Test 4: Reset checkbox on renderManifest
  mockDoc.getElementById('includeBlockedCheckbox').checked = true;
  renderManifest('test source 2', { name: 'my-skill-2', description: 'Desc 2' }, 'Clean instructions', []);
  assert.strictEqual(mockDoc.getElementById('includeBlockedCheckbox').checked, false, 'includeBlockedCheckbox should reset to false on renderManifest');
});

test('Audit button label, summary text, and audit status clearing on repo load', () => {
  const html = fs.readFileSync('index.html', 'utf8');

  // Check markup for updated button text
  assert.ok(
    html.includes('<button id="auditAllBtn" class="ghost">Audit all (SKILL.md text only)</button>'),
    'Audit button should specify (SKILL.md text only)'
  );

  // Check audit summary text in script
  assert.ok(
    html.includes(' (SKILL.md text only — sibling files not checked).'),
    'Audit summary text should clarify scope'
  );

  // Check handleLoadRepo clears auditStatus
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, '<script> block should exist');
  const jsCode = scriptMatch[1];

  assert.ok(
    /async function handleLoadRepo[\s\S]*?el\('auditStatus'\)\.textContent = '';/.test(jsCode),
    'handleLoadRepo should clear auditStatus'
  );
});

test('Security: Path normalization and traversal handling', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch);
  const jsCode = scriptMatch[1];

  const mockScript = jsCode
    .replace(/await /g, '')
    .replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.normalizePath = normalizePath;\n  globalThis.sanitizeZipPath = sanitizeZipPath;\n  refreshRateLimit();\n})();');

  const fnEvaluator = new Function('document', `
    ${mockScript}
    return { normalizePath: globalThis.normalizePath, sanitizeZipPath: globalThis.sanitizeZipPath };
  `);
  const dummyEl = { classList: { remove: () => {}, add: () => {} }, style: {}, addEventListener: () => {}, appendChild: () => {} };
  const mockDoc = { getElementById: () => dummyEl, querySelectorAll: () => [], createElement: () => dummyEl };

  const { normalizePath, sanitizeZipPath } = fnEvaluator(mockDoc);

  // Test normal paths
  assert.strictEqual(normalizePath('a/b/c.py'), 'a/b/c.py');
  assert.strictEqual(normalizePath('a/./b/../c.py'), 'a/c.py');
  assert.strictEqual(normalizePath('./foo/bar.txt'), 'foo/bar.txt');

  // Test root-level path traversal throws error
  assert.throws(() => normalizePath('../secret.txt'), /Path traversal/);
  assert.throws(() => normalizePath('a/../../secret.txt'), /Path traversal/);

  // Test sanitizeZipPath fallbacks
  assert.strictEqual(sanitizeZipPath('a/../b.txt'), 'b.txt');
});

test('Security: Frontmatter schema validation', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  const jsCode = scriptMatch[1];

  const mockScript = jsCode
    .replace(/await /g, '')
    .replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.parseSkillMd = parseSkillMd;\n})();');

  const fnEvaluator = new Function('document', 'jsyaml', `
    ${mockScript}
    return { parseSkillMd: globalThis.parseSkillMd };
  `);

  const mockJsyaml = {
    load: (str) => {
      if (str.includes('invalid_type')) return "just a string";
      if (str.includes('name_num')) return { name: 123, description: "desc" };
      if (str.includes('desc_bool')) return { name: "valid-name", description: true };
      return { name: "my-skill", description: "A test skill" };
    }
  };

  const dummyEl = { classList: { remove: () => {}, add: () => {} }, style: {}, addEventListener: () => {}, appendChild: () => {} };
  const mockDoc = { getElementById: () => dummyEl, querySelectorAll: () => [], createElement: () => dummyEl };

  const { parseSkillMd } = fnEvaluator(mockDoc, mockJsyaml);

  // Valid frontmatter
  const valid = parseSkillMd('---\nname: my-skill\ndescription: A test skill\n---\nBody instructions');
  assert.strictEqual(valid.frontmatter.name, 'my-skill');
  assert.strictEqual(valid.body, 'Body instructions');

  // Invalid non-object frontmatter
  assert.throws(
    () => parseSkillMd('---\ninvalid_type: true\n---\nBody'),
    /Invalid frontmatter/
  );

  // Invalid name type
  assert.throws(
    () => parseSkillMd('---\nname_num: true\n---\nBody'),
    /frontmatter field "name" must be a string/
  );

  // Invalid description type
  assert.throws(
    () => parseSkillMd('---\ndesc_bool: true\n---\nBody'),
    /frontmatter field "description" must be a string/
  );
});

test('Security: Network detection across Python and JS patterns', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  const jsCode = scriptMatch[1];

  const mockScript = jsCode
    .replace(/await /g, '')
    .replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.scanForNetworkCalls = scanForNetworkCalls;\n})();');

  const fnEvaluator = new Function('document', mockScript + '\nreturn { scanForNetworkCalls: globalThis.scanForNetworkCalls };');

  const dummyEl = { classList: { remove: () => {}, add: () => {} }, style: {}, addEventListener: () => {}, appendChild: () => {} };
  const mockDoc = { getElementById: () => dummyEl, querySelectorAll: () => [], createElement: () => dummyEl };

  const { scanForNetworkCalls } = fnEvaluator(mockDoc);

  // Python imports and requests
  assert.strictEqual(scanForNetworkCalls('import requests\nrequests.get("https://example.com")'), true);
  assert.strictEqual(scanForNetworkCalls('from urllib.request import urlopen'), true);
  assert.strictEqual(scanForNetworkCalls('import socket'), true);
  assert.strictEqual(scanForNetworkCalls('import httpx'), true);
  assert.strictEqual(scanForNetworkCalls('subprocess.run(["curl", "https://evil.com"])'), true);

  // JS imports and calls
  assert.strictEqual(scanForNetworkCalls('const axios = require("axios");'), true);
  assert.strictEqual(scanForNetworkCalls('fetch("https://api.com")'), true);
  assert.strictEqual(scanForNetworkCalls('import http from "http"'), true);

  // Clean script
  assert.strictEqual(scanForNetworkCalls('def process_data(x):\n    return x * 2'), false);
});

test('Security & Limits: Package size calculation and limit enforcement', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  const jsCode = scriptMatch[1];

  const mockScript = jsCode
    .replace(/await /g, '')
    .replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.calculatePackageSize = calculatePackageSize;\n  globalThis.MAX_TOTAL_UNCOMPRESSED_SIZE = MAX_TOTAL_UNCOMPRESSED_SIZE;\n})();');

  const fnEvaluator = new Function('document', `
    ${mockScript}
    return { calculatePackageSize: globalThis.calculatePackageSize, MAX_TOTAL_UNCOMPRESSED_SIZE: globalThis.MAX_TOTAL_UNCOMPRESSED_SIZE };
  `);

  const dummyEl = { classList: { remove: () => {}, add: () => {} }, style: {}, addEventListener: () => {}, appendChild: () => {} };
  const mockDoc = { getElementById: () => dummyEl, querySelectorAll: () => [], createElement: () => dummyEl };

  const { calculatePackageSize, MAX_TOTAL_UNCOMPRESSED_SIZE } = fnEvaluator(mockDoc);

  assert.strictEqual(MAX_TOTAL_UNCOMPRESSED_SIZE, 100 * 1024 * 1024);

  const smallSkill = {
    fixedName: 'small-skill',
    description: 'Small desc',
    instructions: 'Small body',
    files: [{ path: 'helper.py', content: 'print("hello")', status: 'ok' }]
  };

  const smallSize = calculatePackageSize(smallSkill, false);
  assert.ok(smallSize > 0 && smallSize < 1000);

  const largeContent = 'a'.repeat(101 * 1024 * 1024);
  const hugeSkill = {
    fixedName: 'huge-skill',
    description: 'Huge',
    instructions: 'Huge',
    files: [{ path: 'big.txt', content: largeContent, status: 'ok' }]
  };

  const hugeSize = calculatePackageSize(hugeSkill, false);
  assert.ok(hugeSize > MAX_TOTAL_UNCOMPRESSED_SIZE);
});

// Real Skill Integration Tests (Phase 10: 8 test scenarios)
const REAL_TEST_SKILLS = [
  {
    name: '1. Claude skill',
    skill: {
      name: 'claude-file-editor',
      description: 'Edits files using Claude tool conventions.',
      instructions: 'Use the Bash tool to inspect files in /mnt/skills/.\nUse `str_replace` to update target lines.',
      files: []
    }
  },
  {
    name: '2. OpenAI/Codex skill',
    skill: {
      name: 'openai-data-analyst',
      description: 'Processes datasets via OpenAI runtime.',
      instructions: 'Run Code Interpreter to summarize data.\nUse chatgpt and Assistants API to format results.',
      files: []
    }
  },
  {
    name: '3. Generic Agent Skill',
    skill: {
      name: 'generic-summarizer',
      description: 'Summarizes text documents.',
      instructions: 'Read text and produce a concise 3-bullet point summary.',
      files: []
    }
  },
  {
    name: '4. Skill with scripts',
    skill: {
      name: 'python-runner',
      description: 'Executes clean python helper script.',
      instructions: 'Run `scripts/helper.py` to format input.',
      files: [{ path: 'scripts/helper.py', content: 'def run(): return 42\nif __name__ == "__main__": run()', status: 'ok' }]
    }
  },
  {
    name: '5. Skill with references',
    skill: {
      name: 'schema-validator',
      description: 'Validates json against reference schema.',
      instructions: 'Refer to `references/schema.json` to check fields.',
      files: [{ path: 'references/schema.json', content: '{"type": "object"}', status: 'ok' }]
    }
  },
  {
    name: '6. Browser-dependent skill',
    skill: {
      name: 'web-automation-bot',
      description: 'Navigates pages and clicks buttons.',
      instructions: 'Use the `computer` tool to open browser and click buttons on screen.',
      files: []
    }
  },
  {
    name: '7. API/network-dependent skill',
    skill: {
      name: 'weather-fetcher',
      description: 'Fetches weather forecasts.',
      instructions: 'Run `scripts/fetch_weather.py` with OPENAI_API_KEY.',
      files: [{ path: 'scripts/fetch_weather.py', content: 'import requests\nrequests.get("https://api.weather.com")', status: 'warn', reason: 'script calls network' }]
    }
  },
  {
    name: '8. Complex multi-file skill',
    skill: {
      name: 'multi-file-pipeline',
      description: 'Complex multi-file processing skill.',
      instructions: 'Execute `scripts/process.py` using schema `references/config.yaml` and asset `assets/template.txt`.',
      files: [
        { path: 'scripts/process.py', content: 'print("Processing")', status: 'ok' },
        { path: 'references/config.yaml', content: 'mode: fast', status: 'ok' },
        { path: 'assets/template.txt', content: 'Template header', status: 'ok' }
      ]
    }
  }
];

test('End-to-End Pipeline on 8 Real Test Skills (Import -> Analyse -> Local Translate -> Validate -> Export -> Verify)', async () => {
  for (const item of REAL_TEST_SKILLS) {
    const rawSkill = item.skill;

    // 1. Validate initial skill
    const initialVal = Validator.validateSkill({
      fixedName: rawSkill.name,
      description: rawSkill.description,
      instructions: rawSkill.instructions,
      files: rawSkill.files
    }, 'geminiSpark');

    assert.ok(initialVal.structure.status, 'Validation result should have structure status');

    // 2. Local Provider / Deterministic Translation
    const provider = new BrowserLocalProvider();
    const transRes = await Translator.translateWithProvider({
      provider,
      model: 'gemma-4-e4b-it-webgpu',
      skill: {
        instructions: rawSkill.instructions,
        description: rawSkill.description
      },
      analysis: initialVal,
      targetKey: 'geminiSpark'
    });

    assert.ok(transRes.translatedBody, 'Translated body should be generated');

    // 3. Post-translation Validation
    const postVal = Validator.validateSkill({
      fixedName: rawSkill.name,
      description: rawSkill.description,
      instructions: transRes.translatedBody,
      files: rawSkill.files
    }, 'geminiSpark');

    assert.notStrictEqual(postVal.structure.status, 'BLOCK', `Skill ${rawSkill.name} structure should pass after translation`);

    // 4. Package structure verification
    const packageFiles = new Map();
    const skillMdContent = `---\nname: ${rawSkill.name}\ndescription: ${rawSkill.description}\n---\n\n${transRes.translatedBody}\n`;
    packageFiles.set('SKILL.md', skillMdContent);
    rawSkill.files.forEach(f => packageFiles.set(f.path, f.content));

    assert.ok(packageFiles.has('SKILL.md'), 'Package should contain SKILL.md');
    const unzippedMd = packageFiles.get('SKILL.md');
    assert.ok(unzippedMd.includes(rawSkill.name), 'Exported SKILL.md should include skill name');
    rawSkill.files.forEach(f => {
      assert.ok(packageFiles.has(f.path), `Package should contain file ${f.path}`);
    });
  }
});

test('Regression: fetchSkillFiles marks 404/failed fetch as blocked', async () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, '<script> block should exist');

  const jsCode = scriptMatch[1];
  const mockScript = jsCode.replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.fetchSkillFiles = fetchSkillFiles;\n})();');

  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  const fnEvaluator = new AsyncFunction('document', 'fetch', 'jsyaml', `
    ${mockScript}
    return { fetchSkillFiles: globalThis.fetchSkillFiles };
  `);

  const createMockEl = () => ({
    classList: { remove: () => {}, add: () => {} },
    style: {},
    addEventListener: () => {},
    appendChild: () => {},
    scrollIntoView: () => {}
  });
  const mockDoc = { getElementById: () => createMockEl(), querySelectorAll: () => [], createElement: () => createMockEl() };

  const mockFetch = async (url) => {
    return {
      ok: false,
      status: 404,
      text: async () => '404 Not Found'
    };
  };

  const { fetchSkillFiles } = await fnEvaluator(mockDoc, mockFetch, {});
  const tree = [
    { type: 'blob', path: 'my-skill/SKILL.md' },
    { type: 'blob', path: 'my-skill/helper.py' }
  ];

  const files = await fetchSkillFiles('owner', 'repo', 'main', tree, 'my-skill/SKILL.md');
  assert.strictEqual(files.length, 1);
  assert.strictEqual(files[0].path, 'helper.py');
  assert.strictEqual(files[0].status, 'blocked');
  assert.ok(files[0].reason.includes('fetch failed (404)'), `Expected reason to include fetch failed (404), got: ${files[0].reason}`);
  assert.strictEqual(files[0].content, null);
});

test('Regression: translateSkillAI uses gemini-flash-latest and x-goog-api-key header', async () => {
  const skill = { instructions: 'Test instructions', description: 'Test desc' };
  let capturedUrl = '';
  let capturedHeaders = {};

  const originalFetch = global.fetch;
  global.fetch = async (url, opts) => {
    capturedUrl = url;
    capturedHeaders = opts.headers || {};
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Translated instructions' }] } }]
      })
    };
  };

  try {
    const res = await Translator.translateSkillAI(skill, 'test-api-key', 'geminiSpark');
    assert.strictEqual(res.isAI, true);
    assert.ok(capturedUrl.includes('gemini-flash-latest'), `URL should contain gemini-flash-latest (was ${capturedUrl})`);
    assert.strictEqual(capturedUrl.includes('key='), false, 'URL should not contain API key in query string');
    assert.strictEqual(capturedHeaders['x-goog-api-key'], 'test-api-key', 'Header x-goog-api-key should match passed API key');
  } finally {
    global.fetch = originalFetch;
  }
});

test('Regression: renderManifest preserves unknown frontmatter fields on export', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch);
  const jsCode = scriptMatch[1];

  const mockScript = jsCode
    .replace(/await /g, '')
    .replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.renderManifest = renderManifest;\n  globalThis.calculatePackageSize = calculatePackageSize;\n  globalThis.state = state;\n})();');

  const evalContext = new Function('document', 'window', 'globalThis', 'jsyaml', `
    ${mockScript}
    return { renderManifest: globalThis.renderManifest, calculatePackageSize: globalThis.calculatePackageSize, state: globalThis.state };
  `);

  const createMockEl = () => ({
    classList: { remove: () => {}, add: () => {} },
    style: {},
    addEventListener: () => {},
    appendChild: () => {},
    scrollIntoView: () => {}
  });
  const mockDoc = { getElementById: () => createMockEl(), querySelectorAll: () => [], createElement: () => createMockEl() };

  const mockJsyaml = {
    dump: (obj) => JSON.stringify(obj)
  };

  const { renderManifest, state } = evalContext(mockDoc, {}, globalThis, mockJsyaml);

  const rawFrontmatter = {
    name: 'custom-skill',
    description: 'Custom desc',
    author: 'Jane Doe',
    version: '1.2.3',
    license: 'MIT'
  };

  renderManifest('test source', rawFrontmatter, 'Instructions', []);

  assert.ok(state.currentSkill.rawFrontmatter);
  assert.strictEqual(state.currentSkill.rawFrontmatter.author, 'Jane Doe');
  assert.strictEqual(state.currentSkill.rawFrontmatter.version, '1.2.3');

  // Verify export frontmatter object in download logic pattern
  const exportedFm = { ...(state.currentSkill.rawFrontmatter || {}), name: state.currentSkill.fixedName, description: state.currentSkill.description };
  assert.strictEqual(exportedFm.author, 'Jane Doe');
  assert.strictEqual(exportedFm.version, '1.2.3');
  assert.strictEqual(exportedFm.license, 'MIT');
  assert.strictEqual(exportedFm.name, 'custom-skill');
});

test('Benchmark Corpus of Real Skills and Benchmark Runner Suite', async () => {
  assert.ok(BenchmarkCorpus, 'BenchmarkCorpus module should exist');
  assert.ok(BenchmarkCorpus.BENCHMARK_SKILLS.length >= 50, 'Benchmark corpus must contain at least 50 real skills');

  const categories = new Set(BenchmarkCorpus.BENCHMARK_SKILLS.map(s => s.category));
  assert.ok(categories.has('Claude'), 'Corpus should contain Claude skills');
  assert.ok(categories.has('OpenAI/Codex'), 'Corpus should contain OpenAI skills');
  assert.ok(categories.has('Superpowers'), 'Corpus should contain Superpowers skills');

  const loadedSkills = await BenchmarkCorpus.ensureCorpusLoaded();
  assert.strictEqual(loadedSkills.length, BenchmarkCorpus.BENCHMARK_SKILLS.length);
  assert.ok(loadedSkills[0].instructions.length > 0, 'Loaded skill instructions should not be empty');

  const benchmarkResults = await BenchmarkCorpus.runBenchmarkSuite(Validator, Translator, new BrowserLocalProvider());

  assert.strictEqual(benchmarkResults.totalSkills, BenchmarkCorpus.BENCHMARK_SKILLS.length);
  assert.ok(benchmarkResults.passedInitialValidation > 20);
  assert.ok(benchmarkResults.passedPostValidation > 20);
  assert.ok(benchmarkResults.averageQualityScore >= 80, `Average quality score should be >= 80 (was ${benchmarkResults.averageQualityScore})`);
  assert.ok(benchmarkResults.manualReviewsTriggered > 0, 'Manual reviews should be triggered for browser-dependent or incompatible tools');
});

test('Benchmark Corpus browser ensureCorpusLoaded() primary fetch and GitHub raw fallback', async () => {
  const originalVersions = process.versions;
  const originalFetch = global.fetch;

  try {
    Object.defineProperty(process, 'versions', {
      value: { ...originalVersions, node: undefined },
      configurable: true
    });

    const calls = [];
    global.fetch = async (url) => {
      calls.push(url);
      if (url.startsWith('test/fixtures/real-skills/')) {
        return { ok: false, status: 404 };
      }
      if (url.startsWith('https://raw.githubusercontent.com/')) {
        return {
          ok: true,
          status: 200,
          text: async () => '---\nname: fallback-skill\n---\nGitHub raw fallback content'
        };
      }
      return { ok: false, status: 404 };
    };

    BenchmarkCorpus.BENCHMARK_SKILLS.forEach(item => {
      delete item._instructions;
    });

    const loaded = await BenchmarkCorpus.ensureCorpusLoaded();
    assert.ok(loaded.length > 0);

    const githubCall = calls.find(url => url.startsWith('https://raw.githubusercontent.com/'));
    assert.ok(githubCall, 'Fallback branch should call raw.githubusercontent.com URL');

    const firstItem = loaded[0];
    assert.ok(firstItem.repo && firstItem.path, 'Corpus items must retain repo and path');
    assert.strictEqual(firstItem.instructions, 'GitHub raw fallback content', 'Instructions should be loaded from GitHub raw fallback');

    // Test primary fetch path when fixturePath returns ok
    calls.length = 0;
    BenchmarkCorpus.BENCHMARK_SKILLS.forEach(item => {
      delete item._instructions;
    });

    global.fetch = async (url) => {
      calls.push(url);
      if (url.startsWith('test/fixtures/real-skills/')) {
        return {
          ok: true,
          status: 200,
          text: async () => '---\nname: primary-skill\n---\nPrimary fixture content'
        };
      }
      return { ok: false, status: 404 };
    };

    const loadedPrimary = await BenchmarkCorpus.ensureCorpusLoaded();
    assert.strictEqual(loadedPrimary[0].instructions, 'Primary fixture content', 'Instructions should be loaded from primary fixture path');
    assert.strictEqual(calls.some(url => url.startsWith('https://raw.githubusercontent.com/')), false, 'Primary path should not trigger fallback when fixture fetch succeeds');

  } finally {
    Object.defineProperty(process, 'versions', {
      value: originalVersions,
      configurable: true
    });
    global.fetch = originalFetch;

    BenchmarkCorpus.BENCHMARK_SKILLS.forEach(item => {
      delete item._instructions;
    });
    await BenchmarkCorpus.ensureCorpusLoaded();
  }
});

test('renderManifest and clearBtn unload localProviderInstance and reset translation UI state', async () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch);
  const jsCode = scriptMatch[1];

  const mockScript = jsCode
    .replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.renderManifest = renderManifest;\n  globalThis.state = state;\n  globalThis.getLocalProviderInstance = () => localProviderInstance;\n  globalThis.setLocalProviderInstance = (inst) => { localProviderInstance = inst; };\n})();');

  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  const evalContext = new AsyncFunction('document', 'window', 'globalThis', 'jsyaml', 'fetch', `
    ${mockScript}
    return {
      renderManifest: globalThis.renderManifest,
      state: globalThis.state,
      getLocalProviderInstance: globalThis.getLocalProviderInstance,
      setLocalProviderInstance: globalThis.setLocalProviderInstance
    };
  `);

  const createMockEl = (id = '') => {
    const el = {
      id,
      style: {},
      classList: {
        add: function(c) { el.classes.add(c); },
        remove: function(c) { el.classes.delete(c); }
      },
      classes: new Set(),
      children: [],
      _innerHTML: '',
      get innerHTML() { return this._innerHTML; },
      set innerHTML(val) { this._innerHTML = val; },
      value: '',
      _textContent: '',
      get textContent() { return this._textContent; },
      set textContent(val) { this._textContent = val; },
      checked: false,
      listeners: {},
      addEventListener: function(evt, fn) { el.listeners[evt] = fn; },
      scrollIntoView: () => {},
      appendChild: function(child) { el.children.push(child); }
    };
    return el;
  };

  const elements = {};
  const mockDoc = {
    getElementById: (id) => {
      if (!elements[id]) {
        elements[id] = createMockEl(id);
      }
      return elements[id];
    },
    querySelectorAll: () => [],
    createElement: (tag) => createMockEl()
  };

  const mockJsyaml = {
    dump: (obj) => JSON.stringify(obj)
  };

  const mockFetch = async () => ({ ok: false });
  const { renderManifest, state, setLocalProviderInstance } = await evalContext(mockDoc, {}, globalThis, mockJsyaml, mockFetch);

  let unloadCount = 0;
  const mockProvider = {
    unloadModel: async () => { unloadCount++; return true; }
  };
  setLocalProviderInstance(mockProvider);

  // Set up mock DOM elements with stale translation UI state
  mockDoc.getElementById('translationSummary').textContent = 'Stale summary text';
  mockDoc.getElementById('qualityScoreCard').style.display = 'block';
  mockDoc.getElementById('diffContainer').style.display = 'block';
  mockDoc.getElementById('diffTbody').innerHTML = '<tr><td>1</td></tr>';

  // Call renderManifest to simulate skill switch
  await renderManifest('source A', { name: 'skill-a' }, 'Instructions A', []);

  assert.strictEqual(unloadCount, 1, 'renderManifest should unload localProviderInstance');
  assert.strictEqual(mockDoc.getElementById('translationSummary').textContent, '', 'translationSummary should be cleared');
  assert.strictEqual(mockDoc.getElementById('qualityScoreCard').style.display, 'none', 'qualityScoreCard should be hidden');
  assert.strictEqual(mockDoc.getElementById('diffContainer').style.display, 'none', 'diffContainer should be hidden');
  assert.strictEqual(mockDoc.getElementById('diffTbody').innerHTML, '', 'diffTbody should be cleared');

  // Set stale translation state again and test clearBtn handler
  mockDoc.getElementById('translationSummary').textContent = 'Another summary text';
  mockDoc.getElementById('qualityScoreCard').style.display = 'block';
  mockDoc.getElementById('diffContainer').style.display = 'block';
  mockDoc.getElementById('diffTbody').innerHTML = '<tr><td>2</td></tr>';

  const clearHandler = mockDoc.getElementById('clearBtn').listeners['click'];
  assert.ok(clearHandler, 'clearBtn click handler should be registered');
  await clearHandler();

  assert.strictEqual(unloadCount, 2, 'clearBtn handler should unload localProviderInstance');
  assert.strictEqual(state.currentSkill, null);
  assert.strictEqual(mockDoc.getElementById('translationSummary').textContent, '');
  assert.strictEqual(mockDoc.getElementById('qualityScoreCard').style.display, 'none');
  assert.strictEqual(mockDoc.getElementById('diffContainer').style.display, 'none');
  assert.strictEqual(mockDoc.getElementById('diffTbody').innerHTML, '');
});
