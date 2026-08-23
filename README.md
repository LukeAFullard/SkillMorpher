# SkillMorpher

**SkillMorpher** is a client-side web tool designed to audit, clean, and convert Agent Skills (`SKILL.md` bundles) into custom, compliant skill packages optimized for Gemini Spark.

## Features

- **GitHub Repository Library Search**: Browse and fetch skill libraries directly from public GitHub repositories (such as `anthropics/courses`, `vercel/ai-sdk`, `google/gemini-api`, etc.) with GitHub API rate limit tracking.
- **Direct Skill Parsing**:
  - Paste raw `SKILL.md` contents directly into the browser.
  - Upload individual `.md` files or `.zip` archives containing skill bundles.
- **Skill Manifest Generation & Inspection**:
  - Validates skill name formatting into kebab-case.
  - Formats skill metadata (frontmatter and body instructions).
  - One-click copy buttons for skill name, description, and instructions.
- **File Filtering & Audit**:
  - Classifies associated files into allowed, dropped, or warning states.
  - Identifies scripts with network calls that Gemini Spark sandbox environments cannot execute.
- **Zip Export**:
  - Generates and downloads a cleared, ready-to-use `.zip` skill package with updated frontmatter (`SKILL.md`) and valid resource files.

## Project Structure

- `index.html`: Complete single-file web application containing UI markup, styling, and client-side JavaScript.
- External Dependencies (via CDN):
  - [JSZip (v3.10.1)](https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js): Zip file reading and creation.
  - [js-yaml (v4.1.0)](https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js): YAML frontmatter parsing and dumping.

## Getting Started / Local Development

Since the app is a standalone HTML file, you can run it directly in any modern browser without needing a build step or backend server.

### Option 1: Open Directly in Browser
Simply open `index.html` in your web browser.

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

Automated tests for syntax validation and DOM component rendering can be run using Node.js:
```bash
npm test
```
