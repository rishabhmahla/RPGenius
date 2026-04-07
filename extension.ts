/**
 * extension.ts
 * Main entry point for the RPGLE AI Assistant VS Code extension.
 *
 * Registers all commands and handles extension lifecycle (activate/deactivate).
 */

import * as vscode from 'vscode';
import {
  explainCodeCommand,
  generateDocsCommand,
  analyzeFullFileCommand
} from './commands';

/**
 * Called by VS Code when the extension is first activated.
 * Registers all commands defined in package.json contributes.commands.
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('RPGLE AI Assistant is now active.');

  // ── Register: Explain RPG Code ────────────────────────────────────────────
  const explainCmd = vscode.commands.registerCommand(
    'rpgle.explainCode',
    explainCodeCommand
  );

  // ── Register: Generate RPG Documentation ─────────────────────────────────
  const generateDocsCmd = vscode.commands.registerCommand(
    'rpgle.generateDocs',
    generateDocsCommand
  );

  // ── Register: Analyze Full RPG File ──────────────────────────────────────
  const analyzeCmd = vscode.commands.registerCommand(
    'rpgle.analyzeFullFile',
    analyzeFullFileCommand
  );

  // Push all disposables to context so they're cleaned up on deactivate
  context.subscriptions.push(explainCmd, generateDocsCmd, analyzeCmd);

  // ── First-run check: warn if API key is not set ───────────────────────────
  checkApiKeyOnActivation();
}

/**
 * Called by VS Code when the extension is deactivated (e.g., VS Code closes).
 * No cleanup needed here since subscriptions handle disposal automatically.
 */
export function deactivate(): void {
  console.log('RPGLE AI Assistant deactivated.');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Checks if the OpenAI API key is configured on first activation.
 * Shows a one-time notification if it's missing.
 */
function checkApiKeyOnActivation(): void {
  const config = vscode.workspace.getConfiguration('rpgleAI');
  const apiKey = config.get<string>('apiKey', '');

  if (!apiKey || apiKey.trim() === '') {
    vscode.window
      .showWarningMessage(
        '🔑 RPGLE AI Assistant: No API key configured. Add your OpenAI API key to get started.',
        'Open Settings',
        'Dismiss'
      )
      .then((choice) => {
        if (choice === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'rpgleAI.apiKey');
        }
      });
  }
}
