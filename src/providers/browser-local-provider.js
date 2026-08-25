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
      hfRepo: 'onnx-community/gemma-4-E2B-it-ONNX',
      name: 'Gemma 4 E2B IT (Edge / Fast)',
      runtime: 'Transformers.js / ONNX WebGPU',
      size: '1.1 GB',
      sizeBytes: 1.1 * 1024 * 1024 * 1024,
      context: '128K',
      recommended: true,
      tier: 'fast',
      requirements: { webgpu: true, minVramMB: 1536 }
    },
    {
      id: 'gemma-4-e4b-it-webgpu',
      hfRepo: 'onnx-community/gemma-4-E4B-it-ONNX',
      name: 'Gemma 4 E4B IT (Edge / Higher Quality)',
      runtime: 'Transformers.js / ONNX WebGPU',
      size: '2.2 GB',
      sizeBytes: 2.2 * 1024 * 1024 * 1024,
      context: '128K',
      recommended: false,
      tier: 'balanced',
      requirements: { webgpu: true, minVramMB: 3072 }
    }
  ];

  async function withTimeout(promiseFn, ms, label, onTimeoutCleanup) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      return await promiseFn(ctrl.signal);
    } catch (e) {
      if (ctrl.signal.aborted) {
        if (typeof onTimeoutCleanup === 'function') {
          try { await onTimeoutCleanup(); } catch (_) {}
        }
        throw new Error(`${label} timed out after ${ms}ms`);
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

  async function loadTransformersRuntime(globalObj) {
    if (globalObj.transformers || globalObj.Transformers) return globalObj.transformers || globalObj.Transformers;
    if (globalObj.__transformersModule) return globalObj.__transformersModule;
    if (typeof window === 'undefined') {
      try {
        const mod = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0');
        globalObj.__transformersModule = mod;
        return mod;
      } catch (e) {
        return null;
      }
    }
    const mod = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0');
    globalObj.__transformersModule = mod;
    return mod;
  }

  class BrowserLocalProvider {
    constructor() {
      this.id = 'browser-local';
      this.name = 'Browser Local Model (Gemma 4 WebGPU)';
      this.loadedEngine = null;
      this.loadedPipeline = null;
      this.loadedProcessor = null;
      this.loadedModel = null;
      this.currentModelId = null;
      this.isModelLoading = false;
    }

    static getModels() {
      return MODELS;
    }

    getStatus() {
      return {
        loaded: !!(this.loadedEngine || this.loadedPipeline || this.loadedModel),
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
        const devMem = (typeof navigator !== 'undefined' && navigator.deviceMemory) ? navigator.deviceMemory : null;
        const lowMemory = devMem && devMem < 4;

        // Inspect WebGPU adapter buffer limits as a real hardware signal for available GPU memory
        const limits = adapter.limits || {};
        const maxBuffer = limits.maxBufferSize || 0;
        const maxStorageBinding = limits.maxStorageBufferBindingSize || 0;
        // High-capacity discrete GPUs with ample VRAM typically expose maxBufferSize >= 1GB (1073741824 bytes)
        // and maxStorageBufferBindingSize >= 1GB.
        const hasAmpleVramLimits = maxBuffer >= 1073741824 && maxStorageBinding >= 1073741824;
        const hasAmpleRam = devMem ? devMem >= 8 : true;

        let recommendedModel = 'gemma-4-e2b-it-webgpu'; // Conservative default
        if (hasAmpleVramLimits && hasAmpleRam && !isLowPower && !isMobile && !lowMemory) {
          recommendedModel = 'gemma-4-e4b-it-webgpu';
        }

        const status = isLowPower || lowMemory ? 'MARGINAL' : 'SUPPORTED';
        const reason = isLowPower
          ? 'WebGPU running on software/fallback adapter. Gemma 4 E2B recommended.'
          : isMobile
            ? 'Mobile device detected. Gemma 4 E2B recommended for battery & VRAM efficiency.'
            : lowMemory
              ? 'Low system RAM detected. Gemma 4 E2B recommended.'
              : recommendedModel === 'gemma-4-e4b-it-webgpu'
                ? 'High-performance WebGPU hardware with ample VRAM buffer limits detected. Gemma 4 E4B recommended.'
                : 'WebGPU hardware acceleration available. Gemma 4 E2B recommended for stability (conservative default).';

        return {
          supported: true,
          status,
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
        const modelMeta = MODELS.find(m => m.id === modelId);
        const searchTerms = [modelId, 'transformers-cache', 'onnx-community'];
        if (modelMeta && modelMeta.hfRepo) {
          searchTerms.push(modelMeta.hfRepo.replace('/', '_'));
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
          ? [modelId, ...(modelMeta ? [modelMeta.hfRepo.replace('/', '_')] : [])]
          : ['transformers-cache', 'onnx-community', 'gemma-4'];

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
      const items = [this.loadedEngine, this.loadedPipeline, this.loadedModel];
      for (const item of items) {
        if (item && typeof item.dispose === 'function') {
          try {
            await item.dispose();
          } catch (e) {
            console.warn('Error disposing model resource:', e);
          }
        }
      }
      this.loadedEngine = null;
      this.loadedPipeline = null;
      this.loadedProcessor = null;
      this.loadedModel = null;
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

      return `You are a Gemma 4 Agent Skill Translator running locally in the browser via Transformers.js / WebGPU.
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

      if (this.currentModelId === targetModelId && (this.loadedModel || this.loadedPipeline)) {
        return this.loadedPipeline || this.loadedModel;
      }

      if (this.loadedModel || this.loadedPipeline || this.loadedEngine) {
        await this.unloadModel();
      }

      this.isModelLoading = true;
      try {
        const globalObj = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : root);
        const transformers = await loadTransformersRuntime(globalObj);

        if (transformers) {
          const onProgress = (report) => {
            if (progressCallback) {
              const statusText = report.status ? `${report.status}: ${report.file || ''} (${report.progress ? Math.round(report.progress) + '%' : ''})` : JSON.stringify(report);
              progressCallback({ ...report, text: statusText });
            }
          };

          const AutoProcessor = transformers.AutoProcessor;
          const Gemma4Model = transformers.Gemma4ForConditionalGeneration || transformers.AutoModelForCausalLM;

          await withTimeout(async (signal) => {
            if (AutoProcessor && Gemma4Model && typeof AutoProcessor.from_pretrained === 'function' && typeof Gemma4Model.from_pretrained === 'function') {
              const processor = await AutoProcessor.from_pretrained(modelMeta.hfRepo, { progress_callback: onProgress, abort_signal: signal });
              const modelInstance = await Gemma4Model.from_pretrained(modelMeta.hfRepo, {
                dtype: 'q4f16',
                device: 'webgpu',
                progress_callback: onProgress,
                abort_signal: signal
              });
              this.loadedProcessor = processor;
              this.loadedModel = modelInstance;
            } else if (typeof transformers.pipeline === 'function') {
              const pipe = await transformers.pipeline('text-generation', modelMeta.hfRepo, {
                dtype: 'q4f16',
                device: 'webgpu',
                progress_callback: onProgress,
                abort_signal: signal
              });
              this.loadedPipeline = pipe;
            }
          }, this.loadTimeoutMs || 5 * 60 * 1000, 'Model download', async () => {
            await this.unloadModel();
          });

          this.currentModelId = targetModelId;
          return this.loadedPipeline || this.loadedModel;
        }

        // Fallback for mock/test environments where transformers global is not present
        this.currentModelId = targetModelId;
        return null;
      } catch (e) {
        await this.unloadModel().catch(() => {});
        throw e;
      } finally {
        this.isModelLoading = false;
      }
    }

    async translate({ skill, analysis, target = 'gemini-spark', model = 'gemma-4-e4b-it-webgpu', progressCallback }) {
      const prompt = this.buildStructuredPrompt({ skill, analysis, target });

      const globalObj = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : root);
      const transformers = await loadTransformersRuntime(globalObj);

      if (transformers && !this.loadedPipeline && !this.loadedModel) {
        await this.loadModel(model, progressCallback);
      }

      const gen = async (currentPrompt) => {
        return await withTimeout(async (signal) => {
          if (this.loadedProcessor && this.loadedModel) {
            const messages = [
              { role: 'system', content: 'You are a Gemma 4 agent skill translator outputting strictly valid JSON.' },
              { role: 'user', content: currentPrompt }
            ];

            const textPrompt = (typeof this.loadedProcessor.apply_chat_template === 'function')
              ? this.loadedProcessor.apply_chat_template(messages, { tokenize: false, add_generation_prompt: true })
              : currentPrompt;

            const inputs = await this.loadedProcessor(textPrompt);
            const outputs = await this.loadedModel.generate({
              ...inputs,
              max_new_tokens: 1024,
              temperature: 0.1,
              abort_signal: signal
            });

            const inputLength = inputs && inputs.input_ids && inputs.input_ids.dims
              ? inputs.input_ids.dims.at(-1)
              : (inputs && inputs.input_ids && inputs.input_ids[0] ? inputs.input_ids[0].length : 0);

            let generatedTokens = outputs[0];
            if (inputLength > 0 && typeof outputs.slice === 'function' && inputs.input_ids && inputs.input_ids.dims) {
              const sliced = outputs.slice(null, [inputLength, null]);
              generatedTokens = sliced[0] || sliced;
            } else if (inputLength > 0 && generatedTokens && typeof generatedTokens.slice === 'function') {
              generatedTokens = generatedTokens.slice(inputLength);
            }

            return await this.loadedProcessor.decode(generatedTokens, { skip_special_tokens: true });
          } else if (this.loadedPipeline) {
            const messages = [
              { role: 'system', content: 'You are a Gemma 4 agent skill translator outputting strictly valid JSON.' },
              { role: 'user', content: currentPrompt }
            ];

            const output = await this.loadedPipeline(messages, {
              max_new_tokens: 1024,
              temperature: 0.1,
              return_full_text: false,
              abort_signal: signal
            });

            return Array.isArray(output) ? (output[0]?.generated_text || output[0]?.text || '') : (output?.generated_text || output?.text || '');
          } else {
            throw new Error('Transformers.js runtime unavailable in environment');
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
