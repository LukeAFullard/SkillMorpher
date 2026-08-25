(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BenchmarkCorpus = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Benchmark corpus loaded from real skills vendored snapshot (anthropics/skills, openai/skills, obra/superpowers)
  const BENCHMARK_SKILLS = [
  {
    "id": 1,
    "repo": "anthropics/skills",
    "path": "skills/academy-guide/SKILL.md",
    "category": "Claude",
    "name": "academy-guide",
    "description": ">",
    "fixturePath": "test/fixtures/real-skills/anthropics/academy-guide.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 2,
    "repo": "anthropics/skills",
    "path": "skills/algorithmic-art/SKILL.md",
    "category": "Claude",
    "name": "algorithmic-art",
    "description": "Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request creating art using code, generative art, algorithmic art, flow fields, or particle systems. Create original algorithmic art rather than copying existing artists",
    "fixturePath": "test/fixtures/real-skills/anthropics/algorithmic-art.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 3,
    "repo": "anthropics/skills",
    "path": "skills/brand-guidelines/SKILL.md",
    "category": "Claude",
    "name": "brand-guidelines",
    "description": "Applies Anthropic",
    "fixturePath": "test/fixtures/real-skills/anthropics/brand-guidelines.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 4,
    "repo": "anthropics/skills",
    "path": "skills/canvas-design/SKILL.md",
    "category": "Claude",
    "name": "canvas-design",
    "description": "Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to create a poster, piece of art, design, or other static piece. Create original visual designs, never copying existing artists",
    "fixturePath": "test/fixtures/real-skills/anthropics/canvas-design.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 5,
    "repo": "anthropics/skills",
    "path": "skills/claude-api/SKILL.md",
    "category": "Claude",
    "name": "claude-api",
    "description": "|-",
    "fixturePath": "test/fixtures/real-skills/anthropics/claude-api.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 6,
    "repo": "anthropics/skills",
    "path": "skills/discernment-nudge/SKILL.md",
    "category": "Claude",
    "name": "discernment-nudge",
    "description": ">",
    "fixturePath": "test/fixtures/real-skills/anthropics/discernment-nudge.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 7,
    "repo": "anthropics/skills",
    "path": "skills/doc-coauthoring/SKILL.md",
    "category": "Claude",
    "name": "doc-coauthoring",
    "description": "Guide users through a structured workflow for co-authoring documentation. Use when user wants to write documentation, proposals, technical specs, decision docs, or similar structured content. This workflow helps users efficiently transfer context, refine content through iteration, and verify the doc works for readers. Trigger when user mentions writing docs, creating proposals, drafting specs, or similar documentation tasks.",
    "fixturePath": "test/fixtures/real-skills/anthropics/doc-coauthoring.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 8,
    "repo": "anthropics/skills",
    "path": "skills/docx/SKILL.md",
    "category": "Claude",
    "name": "docx",
    "description": "Use this skill whenever the user wants to create, read, edit, or manipulate Word documents (.docx files) or Word templates (.dotx files). Triggers include: any mention of",
    "fixturePath": "test/fixtures/real-skills/anthropics/docx.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 9,
    "repo": "anthropics/skills",
    "path": "skills/frontend-design/SKILL.md",
    "category": "Claude",
    "name": "frontend-design",
    "description": "Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don",
    "fixturePath": "test/fixtures/real-skills/anthropics/frontend-design.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 10,
    "repo": "anthropics/skills",
    "path": "skills/internal-comms/SKILL.md",
    "category": "Claude",
    "name": "internal-comms",
    "description": "A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude should use this skill whenever asked to write some sort of internal communications (status reports, leadership updates, 3P updates, company newsletters, FAQs, incident reports, project updates, etc.).",
    "fixturePath": "test/fixtures/real-skills/anthropics/internal-comms.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 11,
    "repo": "anthropics/skills",
    "path": "skills/mcp-builder/SKILL.md",
    "category": "Claude",
    "name": "mcp-builder",
    "description": "Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).",
    "fixturePath": "test/fixtures/real-skills/anthropics/mcp-builder.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 12,
    "repo": "anthropics/skills",
    "path": "skills/pdf/SKILL.md",
    "category": "Claude",
    "name": "pdf (skills/pdf)",
    "description": "Use this skill whenever the user wants to do anything with PDF files. This includes reading or extracting text/tables from PDFs, combining or merging multiple PDFs into one, splitting PDFs apart, rotating pages, adding watermarks, creating new PDFs, filling PDF forms, encrypting/decrypting PDFs, extracting images, and OCR on scanned PDFs to make them searchable. If the user mentions a .pdf file or asks to produce one, use this skill.",
    "fixturePath": "test/fixtures/real-skills/anthropics/pdf.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 13,
    "repo": "anthropics/skills",
    "path": "skills/pptx/SKILL.md",
    "category": "Claude",
    "name": "pptx",
    "description": "Use this skill any time a .pptx or .potx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presentations; reading, parsing, or extracting text from any .pptx or .potx file (even if the extracted content will be used elsewhere, like in an email or summary); editing, modifying, or updating existing presentations; combining or splitting slide files; working with templates (.potx), layouts, speaker notes, or comments. Trigger whenever the user mentions \\",
    "fixturePath": "test/fixtures/real-skills/anthropics/pptx.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 14,
    "repo": "anthropics/skills",
    "path": "skills/skill-creator/SKILL.md",
    "category": "Claude",
    "name": "skill-creator (skills/skill-creator)",
    "description": "Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill",
    "fixturePath": "test/fixtures/real-skills/anthropics/skill-creator.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 15,
    "repo": "anthropics/skills",
    "path": "skills/slack-gif-creator/SKILL.md",
    "category": "Claude",
    "name": "slack-gif-creator",
    "description": "Knowledge and utilities for creating animated GIFs optimized for Slack. Provides constraints, validation tools, and animation concepts. Use when users request animated GIFs for Slack like",
    "fixturePath": "test/fixtures/real-skills/anthropics/slack-gif-creator.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 16,
    "repo": "anthropics/skills",
    "path": "skills/theme-factory/SKILL.md",
    "category": "Claude",
    "name": "theme-factory",
    "description": "Toolkit for styling artifacts with a theme. These artifacts can be slides, docs, reportings, HTML landing pages, etc. There are 10 pre-set themes with colors/fonts that you can apply to any artifact that has been creating, or can generate a new theme on-the-fly.",
    "fixturePath": "test/fixtures/real-skills/anthropics/theme-factory.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 17,
    "repo": "anthropics/skills",
    "path": "skills/web-artifacts-builder/SKILL.md",
    "category": "Claude",
    "name": "web-artifacts-builder",
    "description": "Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui). Use for complex artifacts requiring state management, routing, or shadcn/ui components - not for simple single-file HTML/JSX artifacts.",
    "fixturePath": "test/fixtures/real-skills/anthropics/web-artifacts-builder.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 18,
    "repo": "anthropics/skills",
    "path": "skills/webapp-testing/SKILL.md",
    "category": "Claude",
    "name": "webapp-testing",
    "description": "Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.",
    "fixturePath": "test/fixtures/real-skills/anthropics/webapp-testing.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 19,
    "repo": "anthropics/skills",
    "path": "skills/xlsx/SKILL.md",
    "category": "Claude",
    "name": "xlsx",
    "description": "Use this skill any time a spreadsheet file is the primary input or output. This means any task where the user wants to: open, read, edit, or fix an existing .xlsx, .xlsm, .xltx, .csv, or .tsv file (e.g., adding columns, computing formulas, formatting, charting, cleaning messy data); create a new spreadsheet from scratch or from other data sources; or convert between tabular file formats. Trigger especially when the user references a spreadsheet file by name or path — even casually (like \\",
    "fixturePath": "test/fixtures/real-skills/anthropics/xlsx.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 20,
    "repo": "anthropics/skills",
    "path": "template/SKILL.md",
    "category": "Claude",
    "name": "template-skill",
    "description": "Replace with description of the skill and when Claude should use it.",
    "fixturePath": "test/fixtures/real-skills/anthropics/template.md",
    "files": [],
    "expectedPlatform": "Anthropic",
    "expectedNeedsTranslation": true
  },
  {
    "id": 21,
    "repo": "openai/skills",
    "path": "skills/.curated/aspnet-core/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "aspnet-core",
    "description": "Build, review, refactor, or architect ASP.NET Core web applications using current official guidance for .NET web development. Use when working on Blazor Web Apps, Razor Pages, MVC, Minimal APIs, controller-based Web APIs, SignalR, gRPC, middleware, dependency injection, configuration, authentication, authorization, testing, performance, deployment, or ASP.NET Core upgrades.",
    "fixturePath": "test/fixtures/real-skills/openai/aspnet-core.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 22,
    "repo": "openai/skills",
    "path": "skills/.curated/chatgpt-apps/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "chatgpt-apps",
    "description": "Build, scaffold, refactor, and troubleshoot ChatGPT Apps SDK applications that combine an MCP server and widget UI. Use when Codex needs to design tools, register UI resources, wire the MCP Apps bridge or ChatGPT compatibility APIs, apply Apps SDK metadata or CSP or domain settings, or produce a docs-aligned project scaffold. Prefer a docs-first workflow by invoking the openai-docs skill or OpenAI developer docs MCP tools before generating code.",
    "fixturePath": "test/fixtures/real-skills/openai/chatgpt-apps.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 23,
    "repo": "openai/skills",
    "path": "skills/.curated/cli-creator/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "cli-creator",
    "description": "Build a composable CLI for Codex from API docs, an OpenAPI spec, existing curl examples, an SDK, a web app, an admin tool, or a local script. Use when the user wants Codex to create a command-line tool that can run from any repo, expose composable read/write commands, return stable JSON, manage auth, and pair with a companion skill.",
    "fixturePath": "test/fixtures/real-skills/openai/cli-creator.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 24,
    "repo": "openai/skills",
    "path": "skills/.curated/cloudflare-deploy/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "cloudflare-deploy",
    "description": "Deploy applications and infrastructure to Cloudflare using Workers, Pages, and related platform services. Use when the user asks to deploy, host, publish, or set up a project on Cloudflare.",
    "fixturePath": "test/fixtures/real-skills/openai/cloudflare-deploy.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 25,
    "repo": "openai/skills",
    "path": "skills/.curated/define-goal/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "define-goal",
    "description": "Help the user define a concrete, measurable goal before starting work, especially when they ask to use the goal tool, create a goal, set an objective, clarify success criteria, or turn a fuzzy intention into a quantitative outcome. Use this skill for goal creation and goal refinement only; it does not manage durable snapshots, decision logs, or long-running execution artifacts.",
    "fixturePath": "test/fixtures/real-skills/openai/define-goal.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 26,
    "repo": "openai/skills",
    "path": "skills/.curated/figma-code-connect-components/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "figma-code-connect-components",
    "description": "Connects Figma design components to code components using Code Connect mapping tools. Use when user says",
    "fixturePath": "test/fixtures/real-skills/openai/figma-code-connect-components.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 27,
    "repo": "openai/skills",
    "path": "skills/.curated/figma-create-design-system-rules/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "figma-create-design-system-rules",
    "description": "Generates custom design system rules for the user",
    "fixturePath": "test/fixtures/real-skills/openai/figma-create-design-system-rules.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 28,
    "repo": "openai/skills",
    "path": "skills/.curated/figma-create-new-file/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "figma-create-new-file",
    "description": "Create a new blank Figma file. Use when the user wants to create a new Figma design or FigJam file, or when you need a new file before calling use_figma. Handles plan resolution via whoami if needed. Usage — /figma-create-new-file [editorType] [fileName] (e.g. /figma-create-new-file figjam My Whiteboard)",
    "fixturePath": "test/fixtures/real-skills/openai/figma-create-new-file.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 29,
    "repo": "openai/skills",
    "path": "skills/.curated/figma-generate-design/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "figma-generate-design",
    "description": "Use this skill alongside figma-use when the task involves translating an application page, view, or multi-section layout into Figma. Triggers:",
    "fixturePath": "test/fixtures/real-skills/openai/figma-generate-design.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 30,
    "repo": "openai/skills",
    "path": "skills/.curated/figma-generate-library/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "figma-generate-library",
    "description": "Build or update a professional-grade design system in Figma from a codebase. Use when the user wants to create variables/tokens, build component libraries, set up theming (light/dark modes), document foundations, or reconcile gaps between code and Figma. This skill teaches WHAT to build and in WHAT ORDER — it complements the `figma-use` skill which teaches HOW to call the Plugin API. Both skills should be loaded together.",
    "fixturePath": "test/fixtures/real-skills/openai/figma-generate-library.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 31,
    "repo": "openai/skills",
    "path": "skills/.curated/figma-implement-design/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "figma-implement-design",
    "description": "Translates Figma designs into production-ready application code with 1:1 visual fidelity. Use when implementing UI code from Figma files, when user mentions",
    "fixturePath": "test/fixtures/real-skills/openai/figma-implement-design.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 32,
    "repo": "openai/skills",
    "path": "skills/.curated/figma-use/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "figma-use",
    "description": "**MANDATORY prerequisite** — you MUST invoke this skill BEFORE every `use_figma` tool call. NEVER call `use_figma` directly without loading this skill first. Skipping it causes common, hard-to-debug failures. Trigger whenever the user wants to perform a write action or a unique read action that requires JavaScript execution in the Figma file context — e.g. create/edit/delete nodes, set up variables or tokens, build components and variants, modify auto-layout or fills, bind variables to properties, or inspect file structure programmatically.",
    "fixturePath": "test/fixtures/real-skills/openai/figma-use.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 33,
    "repo": "openai/skills",
    "path": "skills/.curated/figma/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "figma",
    "description": "Use the Figma MCP server to fetch design context, screenshots, variables, and assets from Figma, and to translate Figma nodes into production code. Trigger when a task involves Figma URLs, node IDs, design-to-code implementation, or Figma MCP setup and troubleshooting.",
    "fixturePath": "test/fixtures/real-skills/openai/figma.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 34,
    "repo": "openai/skills",
    "path": "skills/.curated/gh-address-comments/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "gh-address-comments",
    "description": "Help address review/issue comments on the open GitHub PR for the current branch using gh CLI; verify gh auth first and prompt the user to authenticate if not logged in.",
    "fixturePath": "test/fixtures/real-skills/openai/gh-address-comments.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 35,
    "repo": "openai/skills",
    "path": "skills/.curated/gh-fix-ci/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "gh-fix-ci",
    "description": "Use when a user asks to debug or fix failing GitHub PR checks that run in GitHub Actions; use `gh` to inspect checks and logs, summarize failure context, draft a fix plan, and implement only after explicit approval. Treat external providers (for example Buildkite) as out of scope and report only the details URL.",
    "fixturePath": "test/fixtures/real-skills/openai/gh-fix-ci.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 36,
    "repo": "openai/skills",
    "path": "skills/.curated/hatch-pet/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "hatch-pet",
    "description": "Create, repair, validate, visually QA, and package Codex-compatible animated pets and pet spritesheets from character art, generated images, company or prospect brand cues, or visual references. Use when a user wants a lightweight-worker Codex pet workflow, a non-pixel custom pet style, a prospect or company mascot pet, or a full 8x9 animated pet atlas with transparent unused cells, QA contact sheets, and pet.json packaging. This skill composes the installed $imagegen system skill for visual generation and uses bundled scripts for deterministic spritesheet assembly.",
    "fixturePath": "test/fixtures/real-skills/openai/hatch-pet.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 37,
    "repo": "openai/skills",
    "path": "skills/.curated/jupyter-notebook/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "jupyter-notebook",
    "description": "Use when the user asks to create, scaffold, or edit Jupyter notebooks (`.ipynb`) for experiments, explorations, or tutorials; prefer the bundled templates and run the helper script `new_notebook.py` to generate a clean starting notebook.",
    "fixturePath": "test/fixtures/real-skills/openai/jupyter-notebook.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 38,
    "repo": "openai/skills",
    "path": "skills/.curated/linear/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "linear",
    "description": "Manage issues, projects & team workflows in Linear. Use when the user wants to read, create or updates tickets in Linear.",
    "fixturePath": "test/fixtures/real-skills/openai/linear.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 39,
    "repo": "openai/skills",
    "path": "skills/.curated/migrate-to-codex/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "migrate-to-codex",
    "description": "Migrate supported instruction files, skills, agents, and MCP config into Codex project and global files.",
    "fixturePath": "test/fixtures/real-skills/openai/migrate-to-codex.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 40,
    "repo": "openai/skills",
    "path": "skills/.curated/netlify-deploy/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "netlify-deploy",
    "description": "Deploy web projects to Netlify using the Netlify CLI (`npx netlify`). Use when the user asks to deploy, host, publish, or link a site/repo on Netlify, including preview and production deploys.",
    "fixturePath": "test/fixtures/real-skills/openai/netlify-deploy.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 41,
    "repo": "openai/skills",
    "path": "skills/.curated/notion-knowledge-capture/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "notion-knowledge-capture",
    "description": "Capture conversations and decisions into structured Notion pages; use when turning chats/notes into wiki entries, how-tos, decisions, or FAQs with proper linking.",
    "fixturePath": "test/fixtures/real-skills/openai/notion-knowledge-capture.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 42,
    "repo": "openai/skills",
    "path": "skills/.curated/notion-meeting-intelligence/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "notion-meeting-intelligence",
    "description": "Prepare meeting materials with Notion context and Codex research; use when gathering context, drafting agendas/pre-reads, and tailoring materials to attendees.",
    "fixturePath": "test/fixtures/real-skills/openai/notion-meeting-intelligence.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 43,
    "repo": "openai/skills",
    "path": "skills/.curated/notion-research-documentation/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "notion-research-documentation",
    "description": "Research across Notion and synthesize into structured documentation; use when gathering info from multiple Notion sources to produce briefs, comparisons, or reports with citations.",
    "fixturePath": "test/fixtures/real-skills/openai/notion-research-documentation.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 44,
    "repo": "openai/skills",
    "path": "skills/.curated/notion-spec-to-implementation/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "notion-spec-to-implementation",
    "description": "Turn Notion specs into implementation plans, tasks, and progress tracking; use when implementing PRDs/feature specs and creating Notion plans + tasks from them.",
    "fixturePath": "test/fixtures/real-skills/openai/notion-spec-to-implementation.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 45,
    "repo": "openai/skills",
    "path": "skills/.curated/openai-docs/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "openai-docs (skills/.curated/openai-docs)",
    "description": "Use when the user asks how to build with OpenAI products or APIs, asks about Codex itself or choosing Codex surfaces, needs up-to-date official documentation with citations, help choosing the latest model for a use case, or model upgrade and prompt-upgrade guidance; use OpenAI docs MCP tools for non-Codex docs questions, use the Codex manual helper first for broad Codex self-knowledge, and restrict fallback browsing to official OpenAI domains.",
    "fixturePath": "test/fixtures/real-skills/openai/openai-docs.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 46,
    "repo": "openai/skills",
    "path": "skills/.curated/pdf/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "pdf (skills/.curated/pdf)",
    "description": "Use when tasks involve reading, creating, or reviewing PDF files where rendering and layout matter; prefer visual checks by rendering pages (Poppler) and use Python tools such as `reportlab`, `pdfplumber`, and `pypdf` for generation and extraction.",
    "fixturePath": "test/fixtures/real-skills/openai/pdf.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 47,
    "repo": "openai/skills",
    "path": "skills/.curated/playwright-interactive/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "playwright-interactive",
    "description": "Persistent browser and Electron interaction through `js_repl` for fast iterative UI debugging.",
    "fixturePath": "test/fixtures/real-skills/openai/playwright-interactive.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 48,
    "repo": "openai/skills",
    "path": "skills/.curated/playwright/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "playwright",
    "description": "Use when the task requires automating a real browser from the terminal (navigation, form filling, snapshots, screenshots, data extraction, UI-flow debugging) via `playwright-cli` or the bundled wrapper script.",
    "fixturePath": "test/fixtures/real-skills/openai/playwright.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 49,
    "repo": "openai/skills",
    "path": "skills/.curated/render-deploy/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "render-deploy",
    "description": "Deploy applications to Render by analyzing codebases, generating render.yaml Blueprints, and providing Dashboard deeplinks. Use when the user wants to deploy, host, publish, or set up their application on Render",
    "fixturePath": "test/fixtures/real-skills/openai/render-deploy.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 50,
    "repo": "openai/skills",
    "path": "skills/.curated/screenshot/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "screenshot",
    "description": "Use when the user explicitly asks for a desktop or system screenshot (full screen, specific app or window, or a pixel region), or when tool-specific capture capabilities are unavailable and an OS-level capture is needed.",
    "fixturePath": "test/fixtures/real-skills/openai/screenshot.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 51,
    "repo": "openai/skills",
    "path": "skills/.curated/security-best-practices/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "security-best-practices",
    "description": "Perform language and framework specific security best-practice reviews and suggest improvements. Trigger only when the user explicitly requests security best practices guidance, a security review/report, or secure-by-default coding help. Trigger only for supported languages (python, javascript/typescript, go). Do not trigger for general code review, debugging, or non-security tasks.",
    "fixturePath": "test/fixtures/real-skills/openai/security-best-practices.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 52,
    "repo": "openai/skills",
    "path": "skills/.curated/security-ownership-map/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "security-ownership-map",
    "description": "Analyze git repositories to build a security ownership topology (people-to-file), compute bus factor and sensitive-code ownership, and export CSV/JSON for graph databases and visualization. Trigger only when the user explicitly wants a security-oriented ownership or bus-factor analysis grounded in git history (for example: orphaned sensitive code, security maintainers, CODEOWNERS reality checks for risk, sensitive hotspots, or ownership clusters). Do not trigger for general maintainer lists or non-security ownership questions.",
    "fixturePath": "test/fixtures/real-skills/openai/security-ownership-map.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 53,
    "repo": "openai/skills",
    "path": "skills/.curated/security-threat-model/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "security-threat-model",
    "description": "Repository-grounded threat modeling that enumerates trust boundaries, assets, attacker capabilities, abuse paths, and mitigations, and writes a concise Markdown threat model. Trigger only when the user explicitly asks to threat model a codebase or path, enumerate threats/abuse paths, or perform AppSec threat modeling. Do not trigger for general architecture summaries, code review, or non-security design work.",
    "fixturePath": "test/fixtures/real-skills/openai/security-threat-model.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 54,
    "repo": "openai/skills",
    "path": "skills/.curated/sentry/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "sentry",
    "description": "Use when the user asks to inspect Sentry issues or events, summarize recent production errors, or pull basic Sentry health data via the Sentry CLI; perform read-only queries using the `sentry` command.",
    "fixturePath": "test/fixtures/real-skills/openai/sentry.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 55,
    "repo": "openai/skills",
    "path": "skills/.curated/speech/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "speech",
    "description": "Use when the user asks for text-to-speech narration or voiceover, accessibility reads, audio prompts, or batch speech generation via the OpenAI Audio API; run the bundled CLI (`scripts/text_to_speech.py`) with built-in voices and require `OPENAI_API_KEY` for live calls. Custom voice creation is out of scope.",
    "fixturePath": "test/fixtures/real-skills/openai/speech.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 56,
    "repo": "openai/skills",
    "path": "skills/.curated/transcribe/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "transcribe",
    "description": "Transcribe audio files to text with optional diarization and known-speaker hints. Use when a user asks to transcribe speech from audio/video, extract text from recordings, or label speakers in interviews or meetings.",
    "fixturePath": "test/fixtures/real-skills/openai/transcribe.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 57,
    "repo": "openai/skills",
    "path": "skills/.curated/vercel-deploy/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "vercel-deploy",
    "description": "Deploy applications and websites to Vercel. Use when the user requests deployment actions like",
    "fixturePath": "test/fixtures/real-skills/openai/vercel-deploy.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 58,
    "repo": "openai/skills",
    "path": "skills/.curated/winui-app/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "winui-app",
    "description": "Bootstrap, develop, and design modern WinUI 3 desktop applications with C# and the Windows App SDK using official Microsoft guidance, WinUI Gallery patterns, Windows App SDK samples, and CommunityToolkit components. Use when creating a brand new app, preparing a machine for WinUI, reviewing, refactoring, planning, troubleshooting, environment-checking, or setting up WinUI 3 XAML, controls, navigation, windowing, theming, accessibility, responsiveness, performance, deployment, or related Windows app design and development work.",
    "fixturePath": "test/fixtures/real-skills/openai/winui-app.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 59,
    "repo": "openai/skills",
    "path": "skills/.curated/yeet/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "yeet",
    "description": "Use only when the user explicitly asks to stage, commit, push, and open a GitHub pull request in one flow using the GitHub CLI (`gh`).",
    "fixturePath": "test/fixtures/real-skills/openai/yeet.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 60,
    "repo": "openai/skills",
    "path": "skills/.system/imagegen/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "imagegen",
    "description": "Generate or edit raster images when the task benefits from AI-created bitmap visuals such as photos, illustrations, textures, sprites, mockups, or transparent-background cutouts. Use when Codex should create a brand-new image, transform an existing image, or derive visual variants from references, and the output should be a bitmap asset rather than repo-native code or vector. Do not use when the task is better handled by editing existing SVG/vector/code-native assets, extending an established icon or logo system, or building the visual directly in HTML/CSS/canvas.",
    "fixturePath": "test/fixtures/real-skills/openai/imagegen.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 61,
    "repo": "openai/skills",
    "path": "skills/.system/openai-docs/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "openai-docs (skills/.system/openai-docs)",
    "description": "Use when the user asks how to build with OpenAI products or APIs, asks about Codex itself or choosing Codex surfaces, needs up-to-date official documentation with citations, help choosing the latest model for a use case, or model upgrade and prompt-upgrade guidance; use OpenAI docs MCP tools for non-Codex docs questions, use the Codex manual helper first for broad Codex self-knowledge, and restrict fallback browsing to official OpenAI domains.",
    "fixturePath": "test/fixtures/real-skills/openai/openai-docs.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 62,
    "repo": "openai/skills",
    "path": "skills/.system/plugin-creator/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "plugin-creator",
    "description": "Create and scaffold plugin directories for Codex with a required `.codex-plugin/plugin.json`, optional plugin folders/files, and baseline placeholders you can edit before publishing or testing. Use when Codex needs to create a new local plugin, add optional plugin structure, or generate or update repo-root `.agents/plugins/marketplace.json` entries for plugin ordering and availability metadata.",
    "fixturePath": "test/fixtures/real-skills/openai/plugin-creator.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 63,
    "repo": "openai/skills",
    "path": "skills/.system/skill-creator/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "skill-creator (skills/.system/skill-creator)",
    "description": "Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex",
    "fixturePath": "test/fixtures/real-skills/openai/skill-creator.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 64,
    "repo": "openai/skills",
    "path": "skills/.system/skill-installer/SKILL.md",
    "category": "OpenAI/Codex",
    "name": "skill-installer",
    "description": "Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos).",
    "fixturePath": "test/fixtures/real-skills/openai/skill-installer.md",
    "files": [],
    "expectedPlatform": "OpenAI",
    "expectedNeedsTranslation": true
  },
  {
    "id": 65,
    "repo": "obra/superpowers",
    "path": "skills/brainstorming/SKILL.md",
    "category": "Superpowers",
    "name": "brainstorming",
    "description": "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.",
    "fixturePath": "test/fixtures/real-skills/obra/brainstorming.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 66,
    "repo": "obra/superpowers",
    "path": "skills/dispatching-parallel-agents/SKILL.md",
    "category": "Superpowers",
    "name": "dispatching-parallel-agents",
    "description": "Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies",
    "fixturePath": "test/fixtures/real-skills/obra/dispatching-parallel-agents.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 67,
    "repo": "obra/superpowers",
    "path": "skills/executing-plans/SKILL.md",
    "category": "Superpowers",
    "name": "executing-plans",
    "description": "Use when you have a written implementation plan to execute in a separate session with review checkpoints",
    "fixturePath": "test/fixtures/real-skills/obra/executing-plans.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 68,
    "repo": "obra/superpowers",
    "path": "skills/finishing-a-development-branch/SKILL.md",
    "category": "Superpowers",
    "name": "finishing-a-development-branch",
    "description": "Use when implementation is complete, all tests pass, and you need to decide how to integrate the work",
    "fixturePath": "test/fixtures/real-skills/obra/finishing-a-development-branch.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 69,
    "repo": "obra/superpowers",
    "path": "skills/receiving-code-review/SKILL.md",
    "category": "Superpowers",
    "name": "receiving-code-review",
    "description": "Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation",
    "fixturePath": "test/fixtures/real-skills/obra/receiving-code-review.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 70,
    "repo": "obra/superpowers",
    "path": "skills/requesting-code-review/SKILL.md",
    "category": "Superpowers",
    "name": "requesting-code-review",
    "description": "Use when completing tasks, implementing major features, or before merging to verify work meets requirements",
    "fixturePath": "test/fixtures/real-skills/obra/requesting-code-review.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 71,
    "repo": "obra/superpowers",
    "path": "skills/subagent-driven-development/SKILL.md",
    "category": "Superpowers",
    "name": "subagent-driven-development",
    "description": "Use when executing implementation plans with independent tasks in the current session",
    "fixturePath": "test/fixtures/real-skills/obra/subagent-driven-development.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 72,
    "repo": "obra/superpowers",
    "path": "skills/systematic-debugging/SKILL.md",
    "category": "Superpowers",
    "name": "systematic-debugging",
    "description": "Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes",
    "fixturePath": "test/fixtures/real-skills/obra/systematic-debugging.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 73,
    "repo": "obra/superpowers",
    "path": "skills/test-driven-development/SKILL.md",
    "category": "Superpowers",
    "name": "test-driven-development",
    "description": "Use when implementing any feature or bugfix, before writing implementation code",
    "fixturePath": "test/fixtures/real-skills/obra/test-driven-development.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 74,
    "repo": "obra/superpowers",
    "path": "skills/using-git-worktrees/SKILL.md",
    "category": "Superpowers",
    "name": "using-git-worktrees",
    "description": "Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback",
    "fixturePath": "test/fixtures/real-skills/obra/using-git-worktrees.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 75,
    "repo": "obra/superpowers",
    "path": "skills/using-superpowers/SKILL.md",
    "category": "Superpowers",
    "name": "using-superpowers",
    "description": "Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions",
    "fixturePath": "test/fixtures/real-skills/obra/using-superpowers.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 76,
    "repo": "obra/superpowers",
    "path": "skills/verification-before-completion/SKILL.md",
    "category": "Superpowers",
    "name": "verification-before-completion",
    "description": "Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always",
    "fixturePath": "test/fixtures/real-skills/obra/verification-before-completion.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 77,
    "repo": "obra/superpowers",
    "path": "skills/writing-plans/SKILL.md",
    "category": "Superpowers",
    "name": "writing-plans",
    "description": "Use when you have a spec or requirements for a multi-step task, before touching code",
    "fixturePath": "test/fixtures/real-skills/obra/writing-plans.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  },
  {
    "id": 78,
    "repo": "obra/superpowers",
    "path": "skills/writing-skills/SKILL.md",
    "category": "Superpowers",
    "name": "writing-skills",
    "description": "Use when creating new skills, editing existing skills, or verifying skills work before deployment",
    "fixturePath": "test/fixtures/real-skills/obra/writing-skills.md",
    "files": [],
    "expectedPlatform": "Generic",
    "expectedNeedsTranslation": false
  }
];

  function getSkillInstructions(item) {
    if (item._instructions) return item._instructions;
    if (typeof process !== 'undefined' && process.versions && process.versions.node && item.fixturePath) {
      try {
        const fs = require('node:fs');
        const path = require('node:path');
        const fullPath = path.join(__dirname, '..', item.fixturePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        item._instructions = fmMatch ? fmMatch[2].trim() : content.trim();
        return item._instructions;
      } catch (e) {
        // Fallback to empty string if file read fails
      }
    }
    return item._instructions || '';
  }

  async function ensureCorpusLoaded() {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      BENCHMARK_SKILLS.forEach(item => getSkillInstructions(item));
      return BENCHMARK_SKILLS;
    }
    const promises = BENCHMARK_SKILLS.map(async item => {
      if (item._instructions) return item._instructions;
      let content = null;
      if (item.fixturePath) {
        try {
          const res = await fetch(item.fixturePath);
          if (res.ok) content = await res.text();
        } catch (e) { /* ignore and try fallback */ }
      }
      if (!content && item.repo && item.path) {
        try {
          const rawUrl = 'https://raw.githubusercontent.com/' + item.repo + '/main/' + item.path;
          const res = await fetch(rawUrl);
          if (res.ok) content = await res.text();
        } catch (e) { /* ignore */ }
      }
      if (content) {
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        item._instructions = fmMatch ? fmMatch[2].trim() : content.trim();
      } else {
        item._instructions = item._instructions || '';
      }
      return item._instructions;
    });
    await Promise.all(promises);
    return BENCHMARK_SKILLS;
  }

  BENCHMARK_SKILLS.forEach(item => {
    Object.defineProperty(item, 'instructions', {
      get() {
        return getSkillInstructions(item);
      },
      set(val) {
        item._instructions = val;
      },
      configurable: true,
      enumerable: true
    });
  });

  async function runBenchmarkSuite(validator, translator, provider) {
    await ensureCorpusLoaded();
    const results = {
      totalSkills: BENCHMARK_SKILLS.length,
      passedInitialValidation: 0,
      passedPostValidation: 0,
      translationsCount: 0,
      manualReviewsTriggered: 0,
      scores: [],
      averageQualityScore: 0,
      summaryByCategory: {}
    };

    let totalScoreSum = 0;

    BENCHMARK_SKILLS.forEach(item => {
      const skill = {
        fixedName: item.name,
        name: item.name,
        description: item.description,
        instructions: item.instructions,
        files: item.files || []
      };

      const valInitial = validator ? validator.validateSkill(skill, 'geminiSpark') : null;
      if (valInitial && valInitial.structure.status !== 'BLOCK') {
        results.passedInitialValidation++;
      }

      let translatedRes = null;
      if (translator) {
        translatedRes = translator.translateSkill(skill, 'geminiSpark');
        results.translationsCount++;
        if (translatedRes.manualReviewCount > 0) {
          results.manualReviewsTriggered++;
        }
      }

      const postSkill = {
        ...skill,
        instructions: translatedRes ? translatedRes.translatedBody : skill.instructions
      };

      const valPost = validator ? validator.validateSkill(postSkill, 'geminiSpark') : null;
      if (valPost && valPost.structure.status !== 'BLOCK') {
        results.passedPostValidation++;
      }

      const quality = translator && translator.calculateQualityScore
        ? translator.calculateQualityScore(skill, translatedRes, valPost)
        : { overall: 80 };

      totalScoreSum += quality ? quality.overall : 80;

      const cat = item.category || 'Generic';
      if (!results.summaryByCategory[cat]) {
        results.summaryByCategory[cat] = { count: 0, totalScore: 0 };
      }
      results.summaryByCategory[cat].count++;
      results.summaryByCategory[cat].totalScore += (quality ? quality.overall : 80);

      results.scores.push({
        id: item.id,
        name: item.name,
        category: item.category,
        qualityScore: quality ? quality.overall : 80,
        manualReviewCount: translatedRes ? translatedRes.manualReviewCount : 0
      });
    });

    results.averageQualityScore = Math.round(totalScoreSum / BENCHMARK_SKILLS.length);
    return results;
  }

  return {
    BENCHMARK_SKILLS,
    runBenchmarkSuite,
    ensureCorpusLoaded
  };
}));
