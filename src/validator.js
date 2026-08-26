(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./platform-detector'),
      require('./capabilities'),
      require('./targets'),
      require('./resource-graph'),
      require('./script-analyzer'),
      require('./description-validator')
    );
  } else {
    root.Validator = factory(
      root.PlatformDetector,
      root.Capabilities,
      root.Targets,
      root.ResourceGraph,
      root.ScriptAnalyzer,
      root.DescriptionValidator
    );
  }
}(typeof self !== 'undefined' ? self : this, function (PlatformDetector, Capabilities, Targets, ResourceGraph, ScriptAnalyzer, DescriptionValidator) {
  'use strict';

  // Frontmatter name validation regex as required:
  // name = /^(?!-)(?!.*--)[a-z0-9-]{1,64}(?<!-)$/
  const NAME_REGEX = /^(?!-)(?!.*--)[a-z0-9-]{1,64}(?<!-)$/;

  function validateSkill(skill, targetKey = 'geminiSpark') {
    const target = (Targets && Targets.TARGETS && Targets.TARGETS[targetKey]) || {
      id: 'geminiSpark',
      maxPackageSize: 100 * 1024 * 1024,
      disallowNetworkAccess: true
    };

    const results = {
      structure: { status: 'PASS', issues: [] },
      files: { status: 'PASS', issues: [] },
      security: { status: 'PASS', warnings: [], blockers: [] },
      gemini: { status: 'PASS', issues: [], needsTranslation: false },
      translation: { changesCount: 0, changes: [] },
      resourceGraph: null,
      scriptAnalyses: [],
      descriptionValidation: null
    };

    if (!skill) {
      results.structure.status = 'BLOCK';
      results.structure.issues.push('Skill object is null or undefined');
      return results;
    }

    // 1. Structure & Frontmatter Validation
    const name = skill.fixedName || skill.name || '';
    const desc = skill.description || '';
    const body = skill.instructions || skill.body || '';

    if (!name) {
      results.structure.status = 'BLOCK';
      results.structure.issues.push('Skill name is missing');
    } else if (!NAME_REGEX.test(name)) {
      results.structure.status = 'BLOCK';
      results.structure.issues.push(`Skill name "${name}" violates Spark naming constraints (must be lowercase alphanumeric hyphenated, 1-64 chars, no consecutive hyphens, no leading/trailing hyphens)`);
    }

    if (DescriptionValidator) {
      const descVal = DescriptionValidator.validateDescription(desc, name);
      results.descriptionValidation = descVal;
      if (!descVal.isValid) {
        descVal.issues.forEach(iss => {
          if (iss.includes('1024')) {
            results.structure.status = 'BLOCK';
            results.structure.issues.push(iss);
          } else {
            results.structure.status = results.structure.status === 'BLOCK' ? 'BLOCK' : 'WARN';
            results.structure.issues.push(iss);
          }
        });
      }
    }

    // Progressive disclosure check
    const bodyLines = body.split('\n').length;
    if (bodyLines > 500) {
      results.structure.status = results.structure.status === 'BLOCK' ? 'BLOCK' : 'WARN';
      results.structure.issues.push(`SKILL.md is ${bodyLines} lines long — consider moving detailed documentation into references/`);
    }

    // 2. Files & Resource Graph
    const files = skill.files || [];
    if (ResourceGraph) {
      const resGraph = ResourceGraph.buildResourceGraph(body, files);
      results.resourceGraph = resGraph;
      if (resGraph.hasBrokenReferences) {
        results.files.status = 'WARN';
        resGraph.missingOrBroken.forEach(mb => {
          results.files.issues.push(`Broken reference: ${mb.reference} (${mb.reason})`);
        });
      }
    }

    // 3. Script Analysis & Security
    files.forEach(f => {
      if (f.path.endsWith('.py') || f.path.endsWith('.sh') || f.path.endsWith('.js')) {
        if (ScriptAnalyzer) {
          const sa = ScriptAnalyzer.analyzeScript(f.path, f.content);
          results.scriptAnalyses.push(sa);
          if (sa.classification === 'INCOMPATIBLE' && target.disallowNetworkAccess) {
            results.security.status = 'BLOCK';
            results.security.blockers.push(`Script ${f.path} makes external website/network requests disallowed by Gemini Spark`);
          } else if (sa.classification === 'CONDITIONAL') {
            if (results.security.status !== 'BLOCK') results.security.status = 'WARN';
            results.security.warnings.push(`Script ${f.path}: ${sa.reasons.join(', ')}`);
          }
        }
      }

      if (f.status === 'blocked') {
        results.security.status = 'BLOCK';
        results.security.blockers.push(`File ${f.path} flagged: ${f.reason}`);
      } else if (f.status === 'warn') {
        if (results.security.status !== 'BLOCK') results.security.status = 'WARN';
        results.security.warnings.push(`File ${f.path}: ${f.reason}`);
      }
    });

    if (skill.bodySecrets && skill.bodySecrets.length) {
      results.security.status = 'BLOCK';
      results.security.blockers.push('SKILL.md body contains detected hardcoded secrets');
    }

    // 4. Gemini Detection & Translation Need
    if (PlatformDetector) {
      const pd = PlatformDetector.detectPlatforms(body + (desc ? '\n' + desc : ''));

      if (Capabilities && Capabilities.buildCapabilityRequirements) {
        results.capabilities = Capabilities.buildCapabilityRequirements(pd.detections);
      }

      const translationDetections = pd.detections.filter(d =>
        d.platform === 'Anthropic' || d.platform === 'OpenAI' || d.translationSignal === true
      );

      if (translationDetections.length > 0) {
        results.gemini.needsTranslation = true;
        results.gemini.status = 'NEEDS TRANSLATION';
        results.gemini.detections = translationDetections.map(d => ({
          term: d.term,
          platform: d.platform,
          line: d.line,
          lineContent: d.lineContent
        }));
        results.gemini.issues.push(
          `Detected ${translationDetections.length} pattern(s) needing translation: ` +
          translationDetections.map(d => `"${d.term}" (line ${d.line})`).join(', ')
        );
      } else {
        results.gemini.detections = [];
      }
    }

    return results;
  }

  return {
    NAME_REGEX,
    validateSkill
  };
}));
