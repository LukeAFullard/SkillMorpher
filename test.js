const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

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
    'pasteArea',
    'parsePasteBtn',
    'fileInput',
    'manifestCard',
    'copyName',
    'copyDesc',
    'copyInstr',
    'downloadBtn',
    'includeBlockedCheckbox',
    'bodyCredBanner'
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

test('Credential scanning and path sanitization helper functions', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, '<script> block should exist');

  const jsCode = scriptMatch[1];
  // Extract and evaluate scanForCredentials and sanitizeZipPath with dummy DOM
  const mockScript = jsCode
    .replace(/await /g, '')
    .replace(/\(function\(\)\{/, '(function(){\n  global.scanForCredentials = scanForCredentials;\n  global.sanitizeZipPath = sanitizeZipPath;\n');

  const fnEvaluator = new Function(`
    const dummyEl = { classList: { remove: () => {}, add: () => {} }, style: {}, addEventListener: () => {}, appendChild: () => {} };
    const document = {
      getElementById: () => dummyEl,
      querySelectorAll: () => [],
      createElement: () => dummyEl
    };
    ${mockScript}
    return { scanForCredentials: global.scanForCredentials, sanitizeZipPath: global.sanitizeZipPath };
  `);
  const { scanForCredentials, sanitizeZipPath } = fnEvaluator();

  // Test Anthropic key (literal secret)
  const antResult = scanForCredentials('KEY="sk-ant-api03-12345678901234567890"');
  assert.deepStrictEqual(antResult.secrets, ['Anthropic key']);

  // Test PEM private key block
  const pemResult = scanForCredentials('-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----');
  assert.deepStrictEqual(pemResult.secrets, ['private key block']);

  // Test fake sk-... value (literal secret)
  const secretResult = scanForCredentials('KEY="sk-123456789012345678901234"');
  assert.deepStrictEqual(secretResult.secrets, ['OpenAI key']);

  // Test placeholder string is NOT flagged as literal secret
  const placeholderResult = scanForCredentials('KEY="YOUR_API_KEY_HERE"');
  assert.deepStrictEqual(placeholderResult.secrets, []);

  // Test strict key reference (e.g. OPENAI_API_KEY, DB_PASSWORD)
  const envRefResult = scanForCredentials('This requires OPENAI_API_KEY to function.');
  assert.strictEqual(envRefResult.hasKeyReference, true);

  const pwdRefResult = scanForCredentials('Requires DB_PASSWORD setting');
  assert.strictEqual(pwdRefResult.hasKeyReference, true);

  // Test soft vs strict reference separation
  const softProseResult = scanForCredentials('Please supply your api_key here');
  assert.strictEqual(softProseResult.hasKeyReference, false, 'Bare "api_key" should not trigger strict hasKeyReference');

  const softProseIncludedResult = scanForCredentials('Please supply your api_key here', true);
  assert.strictEqual(softProseIncludedResult.hasKeyReference, true, 'Bare "api_key" should trigger soft hasKeyReference when includeSoft=true');

  // Test path sanitizer with ../../evil.js
  const sanitized = sanitizeZipPath('../../evil.js');
  assert.strictEqual(sanitized, 'evil.js');

  const sanitizedNested = sanitizeZipPath('foo/../bar/./baz/../../evil.js');
  assert.strictEqual(sanitizedNested, 'foo/bar/baz/evil.js');
});
