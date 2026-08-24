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
      runtime: 'WebLLM / ONNX WebGPU',
      size: '1.1 GB',
      sizeBytes: 1.1 * 1024 * 1024 * 1024,
      context: '128K',
      recommended: false,
      tier: 'fast',
      requirements: { webgpu: true, minVramMB: 1536 }
    },
    {
      id: 'gemma-4-e4b-it-webgpu',
      name: 'Gemma 4 E4B IT (Edge / Higher Quality)',
      runtime: 'WebLLM / ONNX WebGPU',
      size: '2.2 GB',
      sizeBytes: 2.2 * 1024 * 1024 * 1024,
      context: '128K',
      recommended: true,
      tier: 'balanced',
      requirements: { webgpu: true, minVramMB: 3072 }
    }
  ];

  class BrowserLocalProvider {
    constructor() {
      this.id = 'browser-local';
      this.name = 'Browser Local Model (Gemma 4 WebGPU)';
      this.loadedEngine = null;
      this.currentModelId = null;
      this.isModelLoading = false;
    }

    static getModels() {
      return MODELS;
    }

    getStatus() {
      return {
        loaded: !!this.loadedEngine,
        currentModelId: this.currentModelId || null,
        provider: this.id
      };
    }

    getCapabilities() {
      return {
        localInference: true,
        offlineCapable: true,
        webgpuRequired: true,
        supportedTargets: ['geminiSpark', 'geminiCli'],
        outputFormat: 'json_object'
      };
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
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
        const recommendedModel = (isLowPower || isMobile) ? 'gemma-4-e2b-it-webgpu' : 'gemma-4-e4b-it-webgpu';

        return {
          supported: true,
          status: isLowPower ? 'MARGINAL' : 'SUPPORTED',
          adapterInfo: adapter.info || null,
          recommendedModel,
          reason: isLowPower ? 'WebGPU running on software/fallback adapter. Gemma 4 E2B recommended.' : (isMobile ? 'Mobile device detected. Gemma 4 E2B recommended for battery & VRAM efficiency.' : 'WebGPU hardware acceleration available. Gemma 4 E4B recommended.')
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

    async unloadModel() {
      if (this.loadedEngine) {
        if (typeof this.loadedEngine.unload === 'function') {
          await this.loadedEngine.unload();
        }
        this.loadedEngine = null;
      }
      this.currentModelId = null;
      return true;
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

Explicit Conservative Translation Rules:
1. Equivalent capability -> Translate to direct Gemini equivalent instruction.
2. Unsupported capability (e.g. browser automation, computer_use, interactive UI) -> Flag in manual_review array and add a clear "## Manual review required" block. Do not invent fake capabilities.
3. Ambiguous capability -> Flag for review.
4. Platform-specific wording -> Rewrite into clean platform-agnostic Gemini instructions.
5. Missing dependency -> Flag in manual_review.
6. Never silently remove functionality without flagging it.

Requirements:
Return ONLY valid JSON with the following exact schema:
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
      "issue": "capability or dependency name",
      "reason": "explanation why manual review is required"
    }
  ]
}`;
    }

    async loadModel(modelId, progressCallback) {
      if (this.isModelLoading) {
        throw new Error('Another model is currently downloading or initializing. Please wait.');
      }

      const hw = await this.checkHardwareSupport();
      if (!hw.supported) {
        throw new Error(hw.reason);
      }

      this.isModelLoading = true;
      try {
        const globalObj = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : root);
        if (globalObj && globalObj.webllm) {
          const engine = await globalObj.webllm.CreateMLCEngine(modelId, {
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
      } finally {
        this.isModelLoading = false;
      }
    }

    async translate({ skill, analysis, target = 'gemini-spark', model = 'gemma-4-e4b-it-webgpu', progressCallback }) {
      const prompt = this.buildStructuredPrompt({ skill, analysis, target });

      const globalObj = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : root);
      if (globalObj && globalObj.webllm && !this.loadedEngine) {
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

        const rawContent = response.choices[0]?.message?.content || '';
        // Sanitize markdown fences or extra whitespace around JSON output
        let cleanContent = rawContent.trim();
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }

        let parsed;
        try {
          parsed = JSON.parse(cleanContent);
        } catch (e) {
          throw new Error('Gemma 4 browser LLM output was not valid JSON: ' + rawContent);
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

      throw new Error('WebLLM runtime unavailable in environment');
    }
  }

  BrowserLocalProvider.MODELS = MODELS;
  return BrowserLocalProvider;
}));
