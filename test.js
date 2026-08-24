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

test('index.html exists and is non-empty', () => {
  const content = fs.readFileSync('index.html', 'utf8');
  assert.ok(content.length > 0, 'index.html should not be empty');
  assert.ok(content.includes('<!doctype html>'), 'index.html should start with doctype');
  assert.ok(content.includes('SkillMorpher'), 'index.html should contain title header');
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
    'modelTestStatus'
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

test('BrowserLocalProvider Gemma 4 model ladder, prompt formatting and hardware checking', async () => {
  const provider = new BrowserLocalProvider();
  const models = BrowserLocalProvider.getModels();

  assert.strictEqual(models.length, 2);
  const defaultModel = models.find(m => m.recommended);
  assert.ok(defaultModel);
  assert.strictEqual(defaultModel.id, 'gemma-4-e4b-it-webgpu');
  assert.strictEqual(defaultModel.context, '128K');

  const e2b = models.find(m => m.id === 'gemma-4-e2b-it-webgpu');
  assert.ok(e2b);
  assert.strictEqual(e2b.context, '128K');

  const skill = { instructions: 'Use the Bash tool to check code.', description: 'Test skill' };
  const analysis = { gemini: { sourcePlatform: 'anthropic' }, capabilities: ['shellExecution'] };

  const structuredPrompt = provider.buildStructuredPrompt({ skill, analysis, target: 'gemini-spark' });
  assert.ok(structuredPrompt.includes('Gemma 4 Agent Skill Translator'));
  assert.ok(structuredPrompt.includes('"source_platform": "anthropic"'));
  assert.ok(structuredPrompt.includes('"translated_skill_md"'));

  const hw = await provider.checkHardwareSupport();
  assert.strictEqual(hw.supported, false); // Node environment has no navigator.gpu
  assert.strictEqual(hw.status, 'UNSUPPORTED');
});

test('Translator translateWithProvider routing and fallback behavior for Gemma 4', async () => {
  const skill = { instructions: 'Use the Bash tool to inspect the repository.', description: 'Test' };

  // Mock failing provider (e.g. browser without WebGPU / WebLLM)
  const failingProvider = new BrowserLocalProvider();

  const resFailing = await Translator.translateWithProvider({
    provider: failingProvider,
    model: 'gemma-4-e4b-it-webgpu',
    skill,
    targetKey: 'geminiSpark'
  });

  assert.strictEqual(resFailing.mode, 'deterministic-fallback');
  assert.ok(resFailing.providerError.includes('WebLLM'));
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
    model: 'gemma-4-e4b-it-webgpu',
    skill,
    targetKey: 'geminiSpark'
  });

  assert.strictEqual(resSuccess.mode, 'provider');
  assert.strictEqual(resSuccess.providerId, 'browser-local');
  assert.strictEqual(resSuccess.model, 'gemma-4-e4b-it-webgpu');
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
    .replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.renderManifest = renderManifest;\n  globalThis.state = state;\n  refreshRateLimit();\n})();');

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
    .replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.parseSkillMd = parseSkillMd;\n  refreshRateLimit();\n})();');

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
    .replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.scanForNetworkCalls = scanForNetworkCalls;\n  refreshRateLimit();\n})();');

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
    .replace(/refreshRateLimit\(\);\s*\}\)\(\);/, 'globalThis.calculatePackageSize = calculatePackageSize;\n  globalThis.MAX_TOTAL_UNCOMPRESSED_SIZE = MAX_TOTAL_UNCOMPRESSED_SIZE;\n  refreshRateLimit();\n})();');

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

test('Benchmark Corpus of 30 Representative Skills and Benchmark Runner Suite', () => {
  assert.ok(BenchmarkCorpus, 'BenchmarkCorpus module should exist');
  assert.strictEqual(BenchmarkCorpus.BENCHMARK_SKILLS.length, 30, 'Benchmark corpus must contain exactly 30 representative skills');

  const categories = new Set(BenchmarkCorpus.BENCHMARK_SKILLS.map(s => s.category));
  assert.ok(categories.has('Claude'), 'Corpus should contain Claude skills');
  assert.ok(categories.has('OpenAI/Codex'), 'Corpus should contain OpenAI skills');
  assert.ok(categories.has('Script-heavy'), 'Corpus should contain Script-heavy skills');
  assert.ok(categories.has('Browser-dependent'), 'Corpus should contain Browser-dependent skills');

  const benchmarkResults = BenchmarkCorpus.runBenchmarkSuite(Validator, Translator, new BrowserLocalProvider());

  assert.strictEqual(benchmarkResults.totalSkills, 30);
  assert.ok(benchmarkResults.passedInitialValidation > 20);
  assert.ok(benchmarkResults.passedPostValidation > 20);
  assert.ok(benchmarkResults.averageQualityScore >= 80, `Average quality score should be >= 80 (was ${benchmarkResults.averageQualityScore})`);
  assert.ok(benchmarkResults.manualReviewsTriggered > 0, 'Manual reviews should be triggered for browser-dependent or incompatible tools');
});
