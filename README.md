# SkillMorpher

**SkillMorpher** is a client-side web application designed to audit, convert, and translate Agent Skills (`SKILL.md` bundles) into custom, compliant skill packages optimized for Gemini Spark and Gemini CLI targets.

## Features

- **Browser-Local AI Translation (Gemma 4 WebGPU)**:
  - Runs local AI skill translation directly in your browser using Gemma 4 models via **Transformers.js** (`@huggingface/transformers`) and **ONNX / WebGPU**.
  - Model ladder locked to **Gemma 4 E2B** (`onnx-community/gemma-4-e2b-it-ONNX`) and **Gemma 4 E4B** (`onnx-community/gemma-4-e4b-it-ONNX`).
  - **Data Privacy & Local Execution**:
    - Initial model download → network required.
    - Model cached in browser → local execution.
    - Inference → 100% browser-local WebGPU.
    - Skill contents → remain entirely in browser (never uploaded).
  - Full local model caching (`CacheStorage`), model-specific cache identity, status detection, and manual cache deletion.
  - Explicit user download confirmation.
  - Graceful fallback to deterministic rule engine when WebGPU or local models are unavailable.
- **GitHub Repository Library Search**: Browse and fetch skill libraries directly from public GitHub repositories (e.g., `anthropics/skills`, `google-gemini/gemini-skills`, `obra/superpowers`).
- **Direct Skill Parsing**: Paste raw `SKILL.md` contents or upload `.md` / `.zip` skill bundles.
- **Structured Quality Score Assessment**:
  - Calculates and displays SkillMorpher's quality score evaluating Semantic Preservation %, Gemini Compatibility %, Manual Review count, and Potential Issues.
- **Post-Translation Re-Validation**:
  - Runs the full validation engine again on translated output (frontmatter, name regex, package size, secret scanning, script network calls, resource references).
- **Translation Diff & Manual Review**:
  - Displays line-by-line diff comparing original vs translated SKILL.md.
  - Flags unsupported or ambiguous capabilities requiring manual review.
- **Zip Export Verification**:
  - Generates and downloads a cleared, ready-to-use `.zip` skill package with updated `SKILL.md` and valid resource files.

## Browser & Device Compatibility Matrix

| Browser / Device | WebGPU Acceleration | Local Gemma 4 AI Support | Fallback Mode |
| ---------------- | ------------------- | ------------------------ | ------------- |
| **Chrome Desktop (Windows/Mac/Linux)** | Supported | Full (E2B / E4B) | Automatic Deterministic |
| **Edge Desktop (Windows/Mac)** | Supported | Full (E2B / E4B) | Automatic Deterministic |
| **Chrome Android** | Supported (Device Dependent) | Fast (E2B Recommended) | Automatic Deterministic |
| **Safari / iOS** | Experimental / Disabled | Limited | Automatic Deterministic |
| **Firefox Desktop** | Nightly / Flag Dependent | Limited | Automatic Deterministic |
| **WebGPU Unavailable / Low Memory** | N/A | Deterministic Engine | Rule-Based Conversion |

## Project Structure

- `index.html`: Complete single-file web application UI markup and application logic.
- `src/`: Modular UMD JavaScript pipeline scripts:
  - `src/platform-detector.js`: Identifies platform-specific terminology and tool usages.
  - `src/capabilities.js`: Capability graph and mapping analyzer.
  - `src/targets.js`: Target profile specifications (Gemini Spark & Gemini CLI).
  - `src/resource-graph.js`: Analyzes local resource file references and dependencies.
  - `src/script-analyzer.js`: Audits Python/JS scripts for external network socket calls.
  - `src/description-validator.js`: Validates trigger descriptions and provides recommendations.
  - `src/validator.js`: Main skill package validator and pipeline auditor.
  - `src/providers/browser-local-provider.js`: Gemma 4 WebGPU model manager and translation provider.
  - `src/translator.js`: Translation engine, prompt builder, diff generator, and quality score estimator.
  - `src/benchmark-corpus.js`: 30-skill benchmark corpus and test runner suite.
- External Dependencies (via CDN):
  - [JSZip (v3.10.1)](https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js): Zip archive reading and creation.
  - [js-yaml (v4.1.0)](https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js): YAML frontmatter parsing and dumping.
  - [Transformers.js (v3.3.3)](https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3/dist/transformers.min.js): Transformers.js ONNX WebGPU runtime for browser AI inference.

## Getting Started / Local Development

Since SkillMorpher is a client-side web application, you can run it directly in any modern browser without needing a build step or backend server.

### Option 1: Open Directly in Browser
Open `index.html` in your web browser.

### Option 2: Run a Local Static Server
Using Node.js:
```bash
npx http-server -p 8080 .
```
Or using Python:
```bash
python3 -m http.server 8080
```
Then navigate to `http://localhost:8080`.

## Testing

Automated integration tests and 30-skill benchmark suite can be run using Node.js:
```bash
npm test
```
