(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BrowserLocalProvider = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MODELS = [
    {
      id: 'gemma-4-e2b-it-webgpu',
      name: 'Gemma 4 E2B IT (Edge / Fast)',
      runtime: 'WebLLM',
      size: '1.1 GB',
      sizeBytes: 1.1 * 1024 * 1024 * 1024,
      context: '128K',
      recommended: false,
      tier: 'light',
      requirements: { webgpu: true, minVramMB: 1536 }
    },
    {
      id: 'gemma-4-e4b-it-webgpu',
      name: 'Gemma 4 E4B IT (Edge / Balanced)',
      runtime: 'WebLLM',
      size: '2.2 GB',
      sizeBytes: 2.2 * 1024 * 1024 * 1024,
      context: '128K',
      recommended: false,
      tier: 'standard-light',
      requirements: { webgpu: true, minVramMB: 3072 }
    },
    {
      id: 'gemma-4-12b-it-webgpu',
      name: 'Gemma 4 12B IT (Default Target)',
      runtime: 'WebLLM',
      size: '6.8 GB',
      sizeBytes: 6.8 * 1024 * 1024 * 1024,
      context: '256K',
      recommended: true,
      tier: 'default',
      requirements: { webgpu: true, minVramMB: 8192 }
    },
    {
      id: 'gemma-4-26b-a4b-it-webgpu',
      name: 'Gemma 4 26B A4B IT (MoE High Quality)',
      runtime: 'WebLLM',
      size: '12.5 GB',
      sizeBytes: 12.5 * 1024 * 1024 * 1024,
      context: '256K',
      recommended: false,
      tier: 'pro',
      requirements: { webgpu: true, minVramMB: 12288 }
    },
    {
      id: 'gemma-4-31b-it-webgpu',
      name: 'Gemma 4 31B IT (Max Quality)',
      runtime: 'WebLLM',
      size: '18.0 GB',
      sizeBytes: 18.0 * 1024 * 1024 * 1024,
      context: '256K',
      recommended: false,
      tier: 'ultra',
      requirements: { webgpu: true, minVramMB: 20480 }
    }
  ];

  class BrowserLocalProvider {
    constructor() {
      this.id = 'browser-local';
      this.name = 'Browser Local Model (Gemma 4 WebGPU)';
      this.loadedEngine = null;
      this.currentModelId = null;
    }

    static getModels() {
      return MODELS;
    }

    async checkHardwareSupport() {
      if (typeof navigator === 'undefined') {
        return { supported: false, status: 'UNSUPPORTED', reason: 'Non-browser environment' };
      }

      if (!navigator.gpu) {
        return {
          supported: false,
          status: 'UNSUPPORTED',
          reason: 'WebGPU is not supported or enabled in this browser.'
        };
      }

      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          return {
            supported: false,
            status: 'UNSUPPORTED',
            reason: 'WebGPU adapter could not be initialized.'
          };
        }

        const isLowPower = adapter.isFallbackAdapter || false;
        return {
          supported: true,
          status: isLowPower ? 'MARGINAL' : 'SUPPORTED',
          adapterInfo: adapter.info || null,
          reason: isLowPower ? 'WebGPU running on software/fallback adapter.' : 'WebGPU hardware acceleration available.'
        };
      } catch (err) {
        return {
          supported: false,
          status: 'UNSUPPORTED',
          reason: `WebGPU initialization failed: ${err.message}`
        };
      }
    }

    async checkCache(modelId) {
      if (typeof caches === 'undefined') {
        return false;
      }
      try {
        const cacheNames = await caches.keys();
        return cacheNames.some(name => name.includes(modelId) || name.includes('webllm'));
      } catch (e) {
        return false;
      }
    }

    async clearCache(modelId) {
      if (typeof caches === 'undefined') return false;
      try {
        const cacheNames = await caches.keys();
        let cleared = false;
        for (const name of cacheNames) {
          if (!modelId || name.includes(modelId) || name.includes('webllm')) {
            await caches.delete(name);
            cleared = true;
          }
        }
        return cleared;
      } catch (e) {
        return false;
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

      return `You are a Gemma 4 Agent Skill Translator running locally in the browser via WebGPU.
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

    async loadModel(modelId, progressCallback) {
      const hw = await this.checkHardwareSupport();
      if (!hw.supported) {
        throw new Error(hw.reason);
      }

      if (typeof root !== 'undefined' && root.webllm) {
        const engine = await root.webllm.CreateMLCEngine(modelId, {
          initProgressCallback: (report) => {
            if (progressCallback) progressCallback(report);
          }
        });
        this.loadedEngine = engine;
        this.currentModelId = modelId;
        return engine;
      }

      // Mock engine fallback when webllm global is not present in test/light mode
      this.currentModelId = modelId;
      return null;
    }

    async translate({ skill, analysis, target = 'gemini-spark', model = 'gemma-4-12b-it-webgpu', progressCallback }) {
      const prompt = this.buildStructuredPrompt({ skill, analysis, target });

      if (typeof window !== 'undefined' && window.webllm && !this.loadedEngine) {
        await this.loadModel(model, progressCallback);
      }

      if (this.loadedEngine) {
        const messages = [
          { role: 'system', content: 'You are a Gemma 4 agent skill translator outputting strictly valid JSON.' },
          { role: 'user', content: prompt }
        ];

        const response = await this.loadedEngine.chat.completions.create({
          messages,
          response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content || '';
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          throw new Error('Gemma 4 browser LLM output was not valid JSON: ' + content);
        }

        if (!parsed.translated_skill_md) {
          throw new Error('Gemma 4 browser LLM JSON output missing "translated_skill_md" field');
        }

        return {
          translatedBody: parsed.translated_skill_md,
          changes: parsed.changes || [],
          manualReview: parsed.manual_review || [],
          rawResponse: parsed
        };
      }

      // Fallback response parsing simulation for unit tests/offline stub
      throw new Error('WebLLM runtime unavailable in environment');
    }
  }

  BrowserLocalProvider.MODELS = MODELS;
  return BrowserLocalProvider;
}));
