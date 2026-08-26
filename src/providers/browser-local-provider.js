(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['../platforms/gemini-spark'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../platforms/gemini-spark'));
  } else {
    root.BrowserLocalProvider = factory(root.GeminiSparkMappings);
  }
}(typeof self !== 'undefined' ? self : this, function (GeminiSparkMappings) {
  'use strict';

  function getSparkMappings() {
    if (GeminiSparkMappings) return GeminiSparkMappings;
    if (typeof self !== 'undefined' && self.GeminiSparkMappings) return self.GeminiSparkMappings;
    if (typeof globalThis !== 'undefined' && globalThis.GeminiSparkMappings) return globalThis.GeminiSparkMappings;
    return null;
  }

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

  async function fetchModelWithProgress(url, progressCallback, modelName, signal) {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      return url;
    }
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`Failed to download model file: HTTP ${res.status}`);
    }
    if (!res.body || typeof res.body.getReader !== 'function') {
      if (typeof res.blob === 'function') {
        return await res.blob();
      }
      return url;
    }
    const total = Number(res.headers.get('Content-Length')) || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (progressCallback) {
        const progress = total ? Math.round((loaded / total) * 100) : 0;
        const text = total
          ? `Downloading ${modelName || 'model'}: ${progress}% (${(loaded / (1024 * 1024)).toFixed(1)} / ${(total / (1024 * 1024)).toFixed(1)} MB)`
          : `Downloading ${modelName || 'model'}: ${(loaded / (1024 * 1024)).toFixed(1)} MB downloaded`;
        progressCallback({ status: 'downloading', progress, loaded, total, text });
      }
    }
    return new Blob(chunks);
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
        cpuFallbackAvailable: false,
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
          reason: 'Gemma 4 requires WebGPU — these models are GPU-compiled and cannot run on CPU. Enable WebGPU or use the deterministic (non-AI) translation path instead.'
        };
      }

      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          return {
            supported: false,
            status: 'UNSUPPORTED',
            reason: 'WebGPU adapter could not be initialized. Gemma 4 requires WebGPU — these models are GPU-compiled and cannot run on CPU. Enable WebGPU or use the deterministic (non-AI) translation path instead.'
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
          supported: false,
          status: 'UNSUPPORTED',
          reason: `WebGPU initialization failed: ${err.message}. Gemma 4 requires WebGPU — these models are GPU-compiled and cannot run on CPU. Enable WebGPU or use the deterministic (non-AI) translation path instead.`
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

    isLowConfidenceOrManualReview(instructions, analysis) {
      if (!instructions) return false;
      const spark = getSparkMappings();
      const blockers = (spark && spark.MANUAL_REVIEW_BLOCKERS) || [];
      if (blockers.some(b => b.pattern.test(instructions))) {
        return true;
      }
      if (analysis) {
        if (analysis.security && analysis.security.blockers && analysis.security.blockers.length > 0) return true;
        if (analysis.unsupported && analysis.unsupported.length > 0) return true;
        if (analysis.gemini && analysis.gemini.status === 'NEEDS TRANSLATION' && analysis.gemini.manualReviewRequired) return true;
      }
      return false;
    }

    findCandidateSpans(instructions) {
      if (!instructions) return [];
      const spans = [];
      const lines = instructions.split('\n');
      const spark = getSparkMappings();
      const mappings = (spark && spark.MAPPINGS) || [];

      mappings.forEach(m => {
        if (m.manualReviewRequired) return;
        const regex = new RegExp(m.pattern.source, m.pattern.flags);
        lines.forEach((line, idx) => {
          if (regex.test(line)) {
            const startLine = Math.max(0, idx - 1);
            const endLine = Math.min(lines.length - 1, idx + 1);
            const context = lines.slice(startLine, endLine + 1).join('\n');
            const originalSnippet = line.trim();
            if (originalSnippet && !spans.some(s => s.original === originalSnippet)) {
              spans.push({
                original: originalSnippet,
                lineIndex: idx,
                context,
                mapping: m
              });
            }
          }
        });
      });

      return spans;
    }

    buildTargetedPrompt({ skill, spans, target = 'gemini-spark' }) {
      const formattedSpans = spans.map((s, i) => {
        return `Snippet ${i + 1}:
Original text: "${s.original}"
Surrounding Context:
${s.context}`;
      }).join('\n\n');

      return `You are a Gemma 4 Agent Skill Translator running locally in the browser via LiteRT-LM / WebGPU.
Translate only the specific platform-dependent snippets below into functionally equivalent instructions for ${target}.

Target Platform: ${target}

Snippets to Translate:
${formattedSpans}

Requirements:
Return ONLY valid JSON with the following exact schema:
{
  "changes": [
    {
      "original": "exact original snippet string from input",
      "replacement": "exact translated replacement snippet",
      "reason": "explanation of translation",
      "confidence": "high|medium|low"
    }
  ],
  "manual_review": []
}`;
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
            let modelInput = modelMeta.webUrl;
            try {
              modelInput = await fetchModelWithProgress(modelMeta.webUrl, progressCallback, modelMeta.name, signal);
            } catch (fetchErr) {
              console.warn('Manual fetch with progress failed or unneeded, attempting direct Engine.create:', fetchErr);
            }
            if (progressCallback) {
              progressCallback({ status: 'initializing', text: `Initializing ${modelMeta.name} engine...` });
            }
            const engine = await litert.Engine.create({ model: modelInput });
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
      const originalBody = skill.instructions || skill.body || '';

      const globalObj = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : root);
      const litert = await loadLiteRtRuntime(globalObj);

      if (litert && !this.loadedEngine) {
        await this.loadModel(model, progressCallback);
      }

      const timeoutMs = this.generateTimeoutMs || 120 * 1000;
      const timeoutSec = Math.round(timeoutMs / 1000);

      const gen = async (currentPrompt) => {
        return await withTimeout(async (signal) => {
          if (this.loadedEngine) {
            const startTime = Date.now();
            let phase = 'initializing';
            let hasReceivedRealText = false;
            let textResponse = '';

            const emitProgress = () => {
              if (!progressCallback) return;
              const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
              let text = '';
              if (phase === 'initializing') {
                text = `Initializing model session… (${elapsedSec}s / up to ${timeoutSec}s)`;
              } else if (phase === 'warming') {
                text = `Warming up (this can take up to a minute)… (${elapsedSec}s / up to ${timeoutSec}s)`;
              } else {
                text = `Generating… (${textResponse.length} characters so far, ${elapsedSec}s / up to ${timeoutSec}s)`;
              }
              progressCallback({
                status: 'generating',
                phase,
                charsGenerated: textResponse.length,
                elapsedSec,
                timeoutSec,
                text
              });
            };

            emitProgress();
            const ticker = setInterval(emitProgress, 1000);

            let chat = null;
            const abortHandler = () => {
              if (chat && typeof chat.delete === 'function') {
                try { chat.delete().catch(() => {}); } catch (_) {}
              }
            };
            if (signal) {
              signal.addEventListener('abort', abortHandler);
            }
            try {
              chat = await this.loadedEngine.createConversation();
              phase = 'warming';
              emitProgress();

              if (typeof chat.sendMessageStreaming === 'function') {
                const stream = chat.sendMessageStreaming(currentPrompt);
                for await (const chunk of stream) {
                  if (signal && signal.aborted) {
                    break;
                  }
                  let piece = '';
                  if (typeof chunk === 'string') {
                    piece = chunk;
                  } else if (chunk) {
                    if (typeof chunk.content === 'string') {
                      piece = chunk.content;
                    } else if (Array.isArray(chunk.content)) {
                      piece = chunk.content.map(p => (typeof p === 'string' ? p : p.text || '')).join('');
                    } else if (typeof chunk.text === 'string') {
                      piece = chunk.text;
                    }
                  }

                  if (piece && piece.trim().length > 0) {
                    if (!hasReceivedRealText) {
                      hasReceivedRealText = true;
                      phase = 'generating';
                    }
                    textResponse += piece;
                    emitProgress();
                  }
                }
              } else if (typeof chat.sendMessage === 'function') {
                const msg = await chat.sendMessage(currentPrompt);
                if (signal && signal.aborted) {
                  throw new Error('Generation aborted');
                }
                let piece = '';
                if (typeof msg === 'string') {
                  piece = msg;
                } else if (msg && typeof msg.content === 'string') {
                  piece = msg.content;
                } else if (msg && Array.isArray(msg.content)) {
                  piece = msg.content.map(part => (typeof part === 'string' ? part : part.text || '')).join('');
                }
                if (piece && piece.trim().length > 0) {
                  if (!hasReceivedRealText) {
                    hasReceivedRealText = true;
                    phase = 'generating';
                  }
                  textResponse += piece;
                  emitProgress();
                }
              }
              if (signal && signal.aborted) {
                throw new Error('Generation timed out');
              }
              return textResponse;
            } finally {
              clearInterval(ticker);
              if (signal) {
                signal.removeEventListener('abort', abortHandler);
              }
              if (chat && typeof chat.delete === 'function') {
                try { await chat.delete(); } catch (_) {}
              }
            }
          } else {
            throw new Error('LiteRT-LM core runtime unavailable in environment');
          }
        }, timeoutMs, 'Generation');
      };

      const isLowConfidence = this.isLowConfidenceOrManualReview(originalBody, analysis);
      const spans = !isLowConfidence ? this.findCandidateSpans(originalBody) : [];

      if (!isLowConfidence && spans.length > 0) {
        try {
          const targetedPrompt = this.buildTargetedPrompt({ skill, spans, target });
          const parsedTargeted = await generateAndParse(gen, targetedPrompt, 1);
          if (parsedTargeted && Array.isArray(parsedTargeted.changes) && parsedTargeted.changes.length > 0) {
            let translatedBody = originalBody;
            const appliedChanges = [];

            for (const c of parsedTargeted.changes) {
              if (c.original && c.replacement) {
                if (translatedBody.includes(c.original)) {
                  translatedBody = translatedBody.replace(c.original, c.replacement);
                }
                appliedChanges.push({
                  original: c.original,
                  replacement: c.replacement,
                  reason: c.reason || 'Targeted Gemma 4 translation',
                  confidence: c.confidence || 'high'
                });
              }
            }

            if (appliedChanges.length > 0) {
              return {
                translatedBody,
                changes: appliedChanges,
                manualReview: parsedTargeted.manual_review || [],
                rawResponse: parsedTargeted,
                targeted: true
              };
            }
          }
        } catch (targetedErr) {
          console.warn('Targeted span translation failed or invalid, falling back to full-document prompt:', targetedErr);
        }
      }

      const prompt = this.buildStructuredPrompt({ skill, analysis, target });
      const parsed = await generateAndParse(gen, prompt, 1);

      if (!parsed.translated_skill_md) {
        throw new Error('Gemma 4 browser LLM JSON output missing "translated_skill_md" field');
      }

      return {
        translatedBody: parsed.translated_skill_md,
        changes: parsed.changes || [],
        manualReview: parsed.manual_review || [],
        rawResponse: parsed,
        targeted: false
      };
    }
  }

  BrowserLocalProvider.MODELS = MODELS;
  BrowserLocalProvider.generateAndParse = generateAndParse;
  return BrowserLocalProvider;
}));
