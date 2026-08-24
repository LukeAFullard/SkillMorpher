(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ResourceGraph = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function normalizePath(path) {
    const parts = (path || '').split('/');
    const stack = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (stack.length === 0) throw new Error('Path traversal');
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    return stack.join('/');
  }

  // Detect explicit file references in markdown like `scripts/foo.py`, `references/bar.md`, `assets/template.docx`
  // or markdown links `[text](scripts/foo.py)`
  const FILE_REF_RE = /(?:`|\(|"|'|\b)((?:scripts|references|assets)\/[a-zA-Z0-9_\-\.\/]+)(?:`|\)|"|'|\b)/gi;

  function buildResourceGraph(skillMdBody, bundledFiles) {
    const fileMap = new Map();
    (bundledFiles || []).forEach(f => {
      try {
        const norm = normalizePath(f.path);
        fileMap.set(norm, f);
      } catch (e) {
        fileMap.set(f.path, f);
      }
    });

    const references = [];
    const seenRefs = new Set();
    let match;

    while ((match = FILE_REF_RE.exec(skillMdBody)) !== null) {
      let rawRef = match[1];
      // strip trailing punctuation
      rawRef = rawRef.replace(/[\.,;:!]+$/, '');
      if (seenRefs.has(rawRef)) continue;
      seenRefs.add(rawRef);

      let normRef = rawRef;
      try {
        normRef = normalizePath(rawRef);
      } catch (e) {
        // traversal
      }

      const fileObj = fileMap.get(normRef);
      let exists = !!fileObj;
      let status = 'ok';
      let reason = null;

      if (!exists) {
        status = 'missing';
        reason = 'Referenced in SKILL.md but not present in package bundle';
      } else if (fileObj.status === 'dropped' || fileObj.status === 'blocked') {
        status = 'unsupported';
        reason = `Referenced file will be excluded (${fileObj.reason || fileObj.status})`;
      }

      references.push({
        reference: rawRef,
        normalizedPath: normRef,
        exists,
        status,
        reason,
        fileObj
      });
    }

    const missingOrBroken = references.filter(r => r.status !== 'ok');

    return {
      references,
      missingOrBroken,
      hasBrokenReferences: missingOrBroken.length > 0
    };
  }

  return {
    buildResourceGraph
  };
}));
