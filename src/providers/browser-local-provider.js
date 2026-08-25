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
      id: 'gemma-4-e2b-it-litert',
      repo: 'litert-community/gemma-4-E2B-it-litert-lm',
      filename: 'gemma-4-E2B-it-web.litertlm',
      webUrl: 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm',
      name: 'Gemma 4 E2B IT (LiteRT-LM / Edge)',
      runtime: 'LiteRT-LM WebGPU / WASM',
      size: '1.9 GB',
      sizeBytes: 2008432640,
      context: '128K',
      recommended: true,
      tier: 'fast',
      requirements: { webgpu: true, minVramMB: 1536 }
    },
    {
      id: 'gemma-4-e4b-it-litert',
      repo: 'litert-community/gemma-4-E4B-it-litert-lm',
      filename: 'gemma-4-E4B-it-web.litertlm',
      webUrl: 'https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it-web.litertlm',
      name: 'Gemma 4 E4B IT (LiteRT-LM / Higher Quality)',
      runtime: 'LiteRT-LM WebGPU / WASM',
      size: '2.8 GB',
      sizeBytes: 2969059328,
      context: '128K',
      recommended: false,
      tier: 'balanced',
      requirements: { webgpu: true, minVramMB: 3072 }
    }
  ];

  async function withTimeout(promiseFn, ms, label, onTimeoutCleanup) {
    const ctrl = new AbortController();
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        ctrl.abort();
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
    });
    try {
      return await Promise.race([promiseFn(ctrl.signal), timeoutPromise]);
    } catch (e) {
      if (ctrl.signal.aborted || (e && e.message && e.message.includes('timed out'))) {
        if (typeof onTimeoutCleanup === 'function') {
          try { await onTimeoutCleanup(); } catch (_) {}
        }
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  async function generateAndParse(gen, prompt, retriesLeft = 1) {
    const raw = await gen(prompt);
    const clean = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      return JSON.parse(clean);
    } catch (e) {
      if (retriesLeft <= 0) throw new Error('Gemma output was not valid JSON: ' + raw);
      return generateAndParse(gen, prompt + '\n\nYour previous output was not valid JSON. Return ONLY the JSON object, nothing else.', retriesLeft - 1);
    }
  }

  async function loadLiteRtRuntime(globalObj) {
    if (globalObj.litertCore || globalObj.LiteRtCore) return globalObj.litertCore || globalObj.LiteRtCore;
    if (globalObj.__litertModule) return globalObj.__litertModule;

    if (typeof window === 'undefined') {
      try {
        const mod = await import('@litert-lm/core');
        globalObj.__litertModule = mod;
        return mod;
      } catch (e) {
        return null;
      }
    }
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/@litert-lm/core@0.15.0/+esm');
      globalObj.__litertModule = mod;
      return mod;
    } catch (e) {
      return null;
    }
  }

  class BrowserLocalProvider {
    constructor() {
      this.id = 'browser-local';
      this.name = 'Browser Local Model (Gemma 4 LiteRT-LM)';
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
        webgpuPreferred: true,
        cpuFallbackAvailable: true,
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
          supported: true,
          status: 'CPU_FALLBACK',
          cpuFallback: true,
          recommendedModel: 'gemma-4-e2b-it-litert',
          reason: 'WebGPU is not supported or enabled in this browser. LiteRT-LM will run on CPU (XNNPACK/WASM), which will be slow.'
        };
      }

      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          return {
            supported: true,
            status: 'CPU_FALLBACK',
            cpuFallback: true,
            recommendedModel: 'gemma-4-e2b-it-litert',
            reason: 'WebGPU adapter could not be initialized. LiteRT-LM will run on CPU (XNNPACK/WASM), which will be slow.'
          };
        }

        const isLowPower = adapter.isFallbackAdapter || false;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
        const devMem = (typeof navigator !== 'undefined' && navigator.deviceMemory) ? navigator.deviceMemory : null;
        const lowMemory = devMem && devMem < 4;

        const limits = adapter.limits || {};
        const maxBuffer = limits.maxBufferSize || 0;
        const maxStorageBinding = limits.maxStorageBufferBindingSize || 0;
        const hasAmpleVramLimits = maxBuffer >= 1073741824 && maxStorageBinding >= 1073741824;
        const hasAmpleRam = devMem ? devMem >= 8 : true;

        let recommendedModel = 'gemma-4-e2b-it-litert';
        if (hasAmpleVramLimits && hasAmpleRam && !isLowPower && !isMobile && !lowMemory) {
          recommendedModel = 'gemma-4-e4b-it-litert';
        }

        const status = isLowPower || lowMemory ? 'MARGINAL' : 'SUPPORTED';
        const reason = isLowPower
          ? 'WebGPU running on software/fallback adapter. Gemma 4 E2B recommended.'
          : isMobile
            ? 'Mobile device detected. Gemma 4 E2B recommended for battery & VRAM efficiency.'
            : lowMemory
              ? 'Low system RAM detected. Gemma 4 E2B recommended.'
              : recommendedModel === 'gemma-4-e4b-it-litert'
                ? 'High-performance WebGPU hardware with ample VRAM buffer limits detected. Gemma 4 E4B recommended.'
                : 'WebGPU hardware acceleration available. Gemma 4 E2B recommended for stability (conservative default).';

        return {
          supported: true,
          status,
          cpuFallback: false,
          adapterInfo: adapter.info || null,
          adapterLimits: {
            maxBufferSize: maxBuffer,
            maxStorageBufferBindingSize: maxStorageBinding
          },
          recommendedModel,
          deviceMemoryGB: devMem,
          memoryWarning: lowMemory ? 'System memory is low (< 4 GB). E2B recommended to prevent OOM errors.' : null,
          reason
        };
      } catch (err) {
        return {
          supported: true,
          status: 'CPU_FALLBACK',
          cpuFallback: true,
          recommendedModel: 'gemma-4-e2b-it-litert',
          reason: `WebGPU initialization failed: ${err.message}. LiteRT-LM will run on CPU (XNNPACK/WASM), which will be slow.`
        };
      }
    }

    async checkCache(modelId) {
      if (typeof caches === 'undefined') {
        return false;
      }
      try {
        const modelMeta = MODELS.find(m => m.id === modelId);
        const searchTerms = [modelId, 'litert', 'litertlm', '.litertlm'];
        if (modelMeta) {
          searchTerms.push(modelMeta.filename);
        }

        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          if (requests.length === 0) continue;

          for (const req of requests) {
            if (searchTerms.some(term => req.url.includes(term))) {
              return true;
            }
          }
        }
        return false;
      } catch (e) {
        return false;
      }
    }

    async clearCache(modelId) {
      if (typeof caches === 'undefined') return false;
      try {
        const modelMeta = MODELS.find(m => m.id === modelId);
        const searchTerms = modelId
          ? [modelId, ...(modelMeta ? [modelMeta.filename] : [])]
          : ['litert', 'litertlm', 'gemma-4'];

        const cacheNames = await caches.keys();
        let cleared = false;
        for (const name of cacheNames) {
          if (searchTerms.some(term => name.includes(term))) {
            await caches.delete(name);
            cleared = true;
          } else {
            const cache = await caches.open(name);
            const requests = await cache.keys();
            for (const req of requests) {
              if (searchTerms.some(term => req.url.includes(term))) {
                await cache.delete(req);
                cleared = true;
              }
            }
          }
        }
        return cleared;
      } catch (e) {
        return false;
      }
    }

    async unloadModel() {
      if (this.loadedEngine) {
        if (typeof this.loadedEngine.delete === 'function') {
          try {
            await this.loadedEngine.delete();
          } catch (e) {
            console.warn('Error disposing LiteRT-LM Engine resource:', e);
          }
        }
      }
      this.loadedEngine = null;
      this.currentModelId = null;
      return true;
    }

    buildStructuredPrompt({ skill, analysis, target = 'gemini-spark' }) {
      const MAX_BODY_CHARS = 8000;
      let rawInstructions = skill.instructions || skill.body || '';
      if (rawInstructions.length > MAX_BODY_CHARS) {
        rawInstructions = rawInstructions.slice(0, MAX_BODY_CHARS) + '\n\n[... truncated for local browser inference ...]';
      }

      const payload = {
        source_platform: (analysis && analysis.gemini && analysis.gemini.sourcePlatform) || 'generic',
        target,
        detected_capabilities: ((analysis && analysis.capabilities) || []).slice(0, 20),
        unsupported_capabilities: ((analysis && analysis.unsupported) || []).slice(0, 20),
        resource_dependencies: ((analysis && analysis.resourceGraph && analysis.resourceGraph.references) || []).slice(0, 20),
        security_findings: ((analysis && analysis.security && analysis.security.blockers) || []).slice(0, 20),
        original_skill_md: rawInstructions,
        description: skill.description || ''
      };

      return `You are a Gemma 4 Agent Skill Translator running locally in the browser via LiteRT-LM / WebGPU.
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

      let targetModelId = modelId;
      let modelMeta = MODELS.find(m => m.id === targetModelId) || MODELS[0];

      if (hw.status === 'MARGINAL' && hw.recommendedModel && hw.recommendedModel !== targetModelId) {
        if (modelMeta.requirements && modelMeta.requirements.minVramMB > 2000) {
          console.warn(`Hardware is marginal or low VRAM/memory. Substituting recommended model ${hw.recommendedModel}.`);
          targetModelId = hw.recommendedModel;
          modelMeta = MODELS.find(m => m.id === targetModelId) || MODELS[0];
        }
      }

      if (this.currentModelId === targetModelId && this.loadedEngine) {
        return this.loadedEngine;
      }

      if (this.loadedEngine) {
        await this.unloadModel();
      }

      this.isModelLoading = true;
      try {
        const globalObj = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : root);
        const litert = await loadLiteRtRuntime(globalObj);

        if (progressCallback) {
          progressCallback({ status: 'loading', text: `Loading model ${modelMeta.name} via LiteRT-LM...` });
        }

        if (litert && litert.Engine && typeof litert.Engine.create === 'function') {
          await withTimeout(async (signal) => {
            const engine = await litert.Engine.create({ model: modelMeta.webUrl });
            this.loadedEngine = engine;
          }, this.loadTimeoutMs || 5 * 60 * 1000, 'Model download & initialization', async () => {
            await this.unloadModel();
          });

          this.currentModelId = targetModelId;
          return this.loadedEngine;
        }

        // Fallback for mock/test environments where LiteRT core is not loaded
        this.currentModelId = targetModelId;
        return null;
      } catch (e) {
        await this.unloadModel().catch(() => {});
        throw e;
      } finally {
        this.isModelLoading = false;
      }
    }

    async translate({ skill, analysis, target = 'gemini-spark', model = 'gemma-4-e4b-it-litert', progressCallback }) {
      const prompt = this.buildStructuredPrompt({ skill, analysis, target });

      const globalObj = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : root);
      const litert = await loadLiteRtRuntime(globalObj);

      if (litert && !this.loadedEngine) {
        await this.loadModel(model, progressCallback);
      }

      const gen = async (currentPrompt) => {
        return await withTimeout(async (signal) => {
          if (this.loadedEngine) {
            const chat = await this.loadedEngine.createConversation();
            try {
              let textResponse = '';
              if (typeof chat.sendMessage === 'function') {
                const msg = await chat.sendMessage(currentPrompt);
                if (typeof msg === 'string') {
                  textResponse = msg;
                } else if (msg && typeof msg.content === 'string') {
                  textResponse = msg.content;
                } else if (msg && Array.isArray(msg.content)) {
                  textResponse = msg.content.map(part => (typeof part === 'string' ? part : part.text || '')).join('');
                }
              } else if (typeof chat.sendMessageStreaming === 'function') {
                const stream = chat.sendMessageStreaming(currentPrompt);
                for await (const chunk of stream) {
                  if (typeof chunk === 'string') {
                    textResponse += chunk;
                  } else if (chunk && typeof chunk.content === 'string') {
                    textResponse += chunk.content;
                  } else if (chunk && Array.isArray(chunk.content)) {
                    textResponse += chunk.content.map(part => (typeof part === 'string' ? part : part.text || '')).join('');
                  }
                }
              }
              return textResponse;
            } finally {
              if (chat && typeof chat.delete === 'function') {
                try { await chat.delete(); } catch (_) {}
              }
            }
          } else {
            throw new Error('LiteRT-LM core runtime unavailable in environment');
          }
        }, this.generateTimeoutMs || 60 * 1000, 'Generation', async () => {
          await this.unloadModel();
        });
      };

      const parsed = await generateAndParse(gen, prompt, 1);

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
  }

  BrowserLocalProvider.MODELS = MODELS;
  BrowserLocalProvider.generateAndParse = generateAndParse;
  return BrowserLocalProvider;
}));
