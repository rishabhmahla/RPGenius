# 🔧 RPGLE AI Assistant

A VS Code extension that helps IBM i developers understand, explain, and document RPGLE code using AI (OpenAI GPT-4o).

---

## ✨ Features

| Command | Description |
|---|---|
| **Explain RPG Code** | Select RPGLE code → get a plain-English explanation with business logic, file usage, and improvement suggestions |
| **Generate RPG Documentation** | Generates full Markdown documentation: program overview, files, business rules, step-by-step logic |
| **Analyze Full RPG File** | Deep analysis of an entire RPGLE file — code quality, performance, security, and modernization tips |

All results open in a **new Markdown tab** alongside your code.

---

## 📦 Project Structure

```
rpgle-ai-assistant/
├── src/
│   ├── extension.ts      ← Extension entry point (activate/deactivate)
│   ├── commands.ts       ← VS Code command handlers
│   └── aiService.ts      ← OpenAI API integration
├── samples/
│   └── ORDPROC.rpgle     ← Sample RPGLE file for testing
├── .vscode/
│   ├── launch.json       ← F5 debug configuration
│   ├── tasks.json        ← TypeScript watch build task
│   └── settings.json     ← Workspace settings
├── package.json          ← Extension manifest
├── tsconfig.json         ← TypeScript config
└── README.md
```

---

## 🚀 Setup & Running

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- [VS Code](https://code.visualstudio.com/) v1.85 or later
- An [OpenAI API key](https://platform.openai.com/api-keys)

---

### Step 1 — Install Dependencies

Open a terminal in the project root and run:

```bash
npm install
```

---

### Step 2 — Add Your OpenAI API Key

You have two options:

**Option A: VS Code Settings UI (recommended)**
1. Open VS Code Settings: `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
2. Search for **"RPGLE AI"**
3. Paste your OpenAI API key into **`rpgleAI.apiKey`**

**Option B: settings.json directly**

Add to your VS Code `settings.json`:
```json
{
  "rpgleAI.apiKey": "sk-your-openai-key-here",
  "rpgleAI.baseUrl": "https://api.openai.com/v1",
  "rpgleAI.model": "gpt-4o",
  "rpgleAI.maxTokens": 2048
}
```

> ⚠️ **Never commit your API key to source control.** The `apiKey` setting is stored in VS Code's user settings, not in the project folder.

---

### Step 3 — Compile the TypeScript

```bash
npm run compile
```

Or use the watch mode (auto-recompiles on save):

```bash
npm run watch
```

---

### Step 4 — Run the Extension (F5)

1. Open the project folder in VS Code
2. Press **F5** (or go to **Run → Start Debugging**)
3. A new **Extension Development Host** VS Code window opens
4. Open any `.rpgle` file in that window (try `samples/ORDPROC.rpgle`)

---

## 🖱️ Using the Extension

### Right-click menu
1. Open an RPGLE file
2. Select some code (or don't — it'll use the full file)
3. Right-click → choose from the **RPGLE AI** commands

### Command Palette
Press `Ctrl+Shift+P` (or `Cmd+Shift+P`) and type:
- `RPGLE AI: Explain RPG Code`
- `RPGLE AI: Generate RPG Documentation`
- `RPGLE AI: Analyze Full RPG File`

---

## ⚙️ Configuration Options

| Setting | Default | Description |
|---|---|---|
| `rpgleAI.apiKey` | `""` | Your OpenAI API key |
| `rpgleAI.baseUrl` | `"https://api.openai.com/v1"` | Base URL for an OpenAI-compatible Chat Completions API |
| `rpgleAI.model` | `"gpt-4o"` | Model ID to use for your selected provider |
| `rpgleAI.maxTokens` | `2048` | Max tokens in AI response (256–8192) |

---

## 📋 Output Example

Running **Generate RPG Documentation** on `ORDPROC.rpgle` produces output like:

```markdown
# RPGLE Program Documentation — ORDPROC

## Program Overview
ORDPROC is an order processing program that reads pending customer orders...

## Input Files
- **ORDHDR** — Order Header file (Input/Update)
- **CUSTMST** — Customer Master file (Input)
...

## Business Rules
1. Only orders with STATUS = 'P' (Pending) are processed
2. Customer must exist and be active (STATUS = 'A')
...
```

---

## 🧪 Testing with the Sample File

A working RPGLE sample is included at `samples/ORDPROC.rpgle`. It's a realistic order-processing program with:
- File declarations (ORDHDR, ORDDET, CUSTMST, ITMMST, INVHDR, ERRLOG)
- Data structures and constants
- External program call prototype (`SNDEMAIL`)
- Multiple subprocedures
- Error handling and logging

Use it to test all three commands.

---

## 🛠️ Building for Distribution

To package the extension as a `.vsix` file:

```bash
npm install -g @vscode/vsce
vsce package
```

This generates `rpgle-ai-assistant-1.0.0.vsix`, which can be installed via:
```
Extensions panel → ... → Install from VSIX
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| "No API key configured" | Add your key in Settings → `rpgleAI.apiKey` |
| "Invalid API key" | Double-check the key at [platform.openai.com](https://platform.openai.com) |
| "Rate limit exceeded" | Wait a minute, or upgrade your OpenAI plan |
| Request timeout | Select a smaller code block, or increase `rpgleAI.maxTokens` |
| Extension not loading | Run `npm run compile` then press F5 again |

---

## 📄 License

MIT — Free to use and modify for your IBM i development projects.
