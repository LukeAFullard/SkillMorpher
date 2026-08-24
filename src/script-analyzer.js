(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ScriptAnalyzer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const NETWORK_IMPORTS = [
    /\bimport\s+(requests|httpx|urllib|urllib3|aiohttp|socket|http\.client|undici|axios|node-fetch|got|request)\b/i,
    /\bfrom\s+(urllib|http|requests|httpx|aiohttp)\b/i,
    /\b(require|import)\s*\(?['"](http|https|undici|axios|node-fetch|got|request)['"]\)?/i
  ];

  const NETWORK_CALLS = [
    /\b(requests\.(get|post|put|delete|patch|head|options|request)|urllib\.request\.urlopen)\b/i,
    /\b(curl|wget)\b/i,
    /\bfetch\s*\(/i,
    /\b(axios|XMLHttpRequest)\b/i
  ];

  const SUBPROCESS_RE = /\b(subprocess|os\.system|os\.popen|child_process|execSync|spawnSync)\b/i;

  function analyzeScript(filename, content) {
    if (!content || typeof content !== 'string') {
      return {
        filename,
        classification: 'UNKNOWN',
        reasons: ['File content unavailable or empty'],
        hasNetwork: false,
        hasSubprocess: false
      };
    }

    const hasNetImport = NETWORK_IMPORTS.some(re => re.test(content));
    const hasNetCall = NETWORK_CALLS.some(re => re.test(content));
    const hasSubproc = SUBPROCESS_RE.test(content);

    const reasons = [];
    if (hasNetCall) reasons.push('External HTTP/network calls detected');
    else if (hasNetImport) reasons.push('Network library import detected');
    if (hasSubproc) reasons.push('Subprocess / OS command execution detected');

    let classification = 'SAFE';
    if (hasNetCall) {
      classification = 'INCOMPATIBLE';
    } else if (hasNetImport || hasSubproc) {
      classification = 'CONDITIONAL';
    }

    return {
      filename,
      classification,
      reasons,
      hasNetwork: hasNetCall || hasNetImport,
      hasSubprocess: hasSubproc
    };
  }

  return {
    analyzeScript
  };
}));
