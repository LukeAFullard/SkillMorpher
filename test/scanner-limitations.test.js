const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const ScriptAnalyzer = require('../src/script-analyzer');

// Extract helper functions from index.html for testing limit conditions
function getIndexHelpers() {
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error('No script block in index.html');

  const jsCode = scriptMatch[1];
  const mockScript = jsCode
    .replace(/await /g, '')
    .replace(/\(function\(\)\{/, '(function(){\n  global.scanForNetworkCalls = scanForNetworkCalls;\n  global.scanForCredentials = scanForCredentials;\n');

  const fnEvaluator = new Function(`
    const dummyEl = { classList: { remove: () => {}, add: () => {} }, style: {}, addEventListener: () => {}, appendChild: () => {} };
    const document = {
      getElementById: () => dummyEl,
      querySelectorAll: () => [],
      createElement: () => dummyEl
    };
    ${mockScript}
    return { scanForNetworkCalls: global.scanForNetworkCalls, scanForCredentials: global.scanForCredentials };
  `);
  return fnEvaluator();
}

const { scanForNetworkCalls, scanForCredentials } = getIndexHelpers();

test('Document Regex-Scanning Limitation: Indirect alias and split network call evasion', () => {
  // Aliased fetch call (assigning fetch to variable before invocation)
  const aliasedFetchJS = `
    const getNet = fetch;
    getNet("https://api.example.com/data");
  `;

  // Regex \bfetch\s*\( expects fetch directly before parenthesis
  const netDetected = scanForNetworkCalls(aliasedFetchJS);
  const scriptAnalysis = ScriptAnalyzer.analyzeScript('fetch.js', aliasedFetchJS);

  // Assert that regex scanner does NOT catch aliased/indirected calls (demonstrating limitation)
  assert.strictEqual(netDetected, false, 'Limitation: scanForNetworkCalls fails to catch indirected/aliased fetch calls');
  assert.strictEqual(scriptAnalysis.hasNetwork, false, 'Limitation: ScriptAnalyzer fails to catch indirected/aliased fetch calls');
  assert.strictEqual(scriptAnalysis.classification, 'SAFE', 'Limitation: Indirect fetch call is classified as SAFE');
});

test('Document Regex-Scanning Limitation: String-built and obfuscated network calls', () => {
  // String-built dynamic fetch call
  const stringBuiltJS = `
    const method = 'f' + 'etch';
    window[method]('https://api.example.com/endpoint');
  `;

  // Base64-encoded Python import
  const base64Python = `
    import base64
    import importlib
    req_mod = importlib.import_module(base64.b64decode('cmVxdWVzdHM=').decode('utf-8'))
  `;

  assert.strictEqual(scanForNetworkCalls(stringBuiltJS), false, 'Limitation: String-built JS fetch call evades regex scanner');
  assert.strictEqual(ScriptAnalyzer.analyzeScript('app.js', stringBuiltJS).hasNetwork, false, 'Limitation: String-built JS call evades ScriptAnalyzer');

  assert.strictEqual(scanForNetworkCalls(base64Python), false, 'Limitation: Base64-wrapped python import evades regex scanner');
  assert.strictEqual(ScriptAnalyzer.analyzeScript('app.py', base64Python).hasNetwork, false, 'Limitation: Base64-wrapped python import evades ScriptAnalyzer');
});

test('Document Regex-Scanning Limitation: Base64 and concatenated secret key evasion', () => {
  // Concatenated Anthropic key
  const concatSecret = `
    const apiKey = 'sk-ant-' + 'api03-' + '12345678901234567890';
  `;

  // Base64-encoded secret key
  const base64Secret = `
    const secret = atob('c2stYW50LWFwaTAzLTEyMzQ1Njc4OTAxMjM0NTY3ODkw');
  `;

  // Multi-line YAML secret split across lines
  const multilineYamlSecret = `
api_key: >-
  sk-ant-api03-
  12345678901234567890
  `;

  const concatRes = scanForCredentials(concatSecret);
  assert.strictEqual(concatRes.secrets.length, 0, 'Limitation: String concatenation evades literal secret regex scanning');

  const base64Res = scanForCredentials(base64Secret);
  assert.strictEqual(base64Res.secrets.length, 0, 'Limitation: Base64 encoding evades literal secret regex scanning');

  const multilineRes = scanForCredentials(multilineYamlSecret);
  assert.strictEqual(multilineRes.secrets.length, 0, 'Limitation: Multi-line string splitting evades literal secret regex scanning');
});
