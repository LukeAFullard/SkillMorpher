(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OllamaProvider = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class OllamaProvider {
    constructor(baseUrl = 'http://localhost:11434') {
      this.id = 'ollama';
      this.name = 'Ollama (Local)';
      this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    async checkConnection() {
      try {
        const res = await fetch(`${this.baseUrl}/api/tags`);
        if (!res.ok) return { connected: false, error: `HTTP ${res.status}` };
        const data = await res.json();
        const models = (data.models || []).map(m => {
          let context = '128K';
          if (m.name.includes('gemma4') || m.name.includes('gemma:')) {
            if (m.name.includes('12b') || m.name.includes('26b') || m.name.includes('31b')) {
              context = '256K';
            }
          }
          return {
            id: m.name,
            name: m.name,
            context,
            isLocal: true,
            size: m.size
          };
        });
        return { connected: true, models };
      } catch (err) {
        return { connected: false, error: err.message || 'Ollama not detected' };
      }
    }

    async testModel(modelId) {
      try {
        const prompt = 'Return JSON: {"status": "ok", "test": true}';
        const res = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
            format: 'json'
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const content = data.message?.content || '';
        const parsed = JSON.parse(content);
        return { success: true, parsed };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    buildStructuredPrompt({ skill, analysis, target = 'gemini-spark' }) {
      const payload = {
        source_platform: (analysis && analysis.gemini && analysis.gemini.sourcePlatform) || 'generic',
        target,
        detected_capabilities: (analysis && analysis.capabilities) || [],
        unsupported_capabilities: (analysis && analysis.unsupported) || [],
        resource_dependencies: (analysis && analysis.resourceGraph && analysis.resourceGraph.references) || [],
        security_findings: (analysis && analysis.security && analysis.security.blockers) || [],
        original_skill_md: skill.instructions || skill.body || '',
        description: skill.description || ''
      };

      return `You are a specialized Agent Skill Translator.
Translate the provided Agent Skill instructions to be functionally equivalent for ${target}.

Deterministic Context Payload:
${JSON.stringify(payload, null, 2)}

Requirements:
1. Return ONLY valid JSON in the following schema:
{
  "translated_skill_md": "Full translated SKILL.md body text",
  "changes": [
    {
      "original": "exact original snippet",
      "replacement": "exact translated replacement",
      "reason": "explanation",
      "confidence": "high|medium|low"
    }
  ],
  "manual_review": [
    {
      "issue": "capability name",
      "reason": "explanation why manual review is required"
    }
  ]
}
2. Preserve progressive disclosure and do not silently invent equivalent capabilities for unsupported tools like browser automation or computer_use.
3. Replace Claude/OpenAI tools with direct file/command Gemini equivalent instructions.`;
    }

    async translate({ skill, analysis, target = 'gemini-spark', model = 'gemma4:12b' }) {
      const prompt = this.buildStructuredPrompt({ skill, analysis, target });
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          format: 'json'
        })
      });

      if (!res.ok) throw new Error(`Ollama API error: HTTP ${res.status}`);
      const data = await res.json();
      const content = data.message?.content || '';

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        throw new Error('Ollama response was not valid JSON: ' + content);
      }

      if (!parsed.translated_skill_md) {
        throw new Error('Ollama JSON response missing "translated_skill_md" field');
      }

      return {
        translatedBody: parsed.translated_skill_md,
        changes: parsed.changes || [],
        manualReview: parsed.manual_review || [],
        rawResponse: parsed
      };
    }
  }

  return OllamaProvider;
}));
