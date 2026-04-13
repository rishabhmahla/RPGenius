/**
 * aiService.ts
 * Handles all communication with the OpenAI API.
 * Provides reusable functions for code explanation and documentation generation.
 */

import axios, { AxiosError } from 'axios';
import * as vscode from 'vscode';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface OpenAIAPIResponse {
  id: string;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const EXPLAIN_SYSTEM_PROMPT = `You are a senior IBM i RPGLE expert with 20+ years of experience on AS/400 and IBM i systems. 
You have deep knowledge of RPGLE, RPG IV, legacy RPG III, CL programs, DB2 for i, and IBM i job/file concepts.
When explaining code, be thorough yet clear — assume the reader may be a developer unfamiliar with IBM i.
Always use Markdown formatting in your responses.`;

const DOCS_SYSTEM_PROMPT = `You are a senior IBM i developer and technical writer. 
You specialize in creating clear, structured documentation for RPGLE and RPG IV programs on IBM i (AS/400).
You understand data structures, file definitions, procedures, prototypes, and business logic patterns in RPGLE.
Always respond with well-structured Markdown documentation.`;

const ANALYZE_SYSTEM_PROMPT = `You are a senior IBM i RPGLE code reviewer and architect.
You perform deep static analysis of RPGLE programs, identifying patterns, potential bugs, performance issues, and modernization opportunities.
You understand both legacy fixed-format RPG and modern free-format RPGLE.
Always respond with well-structured Markdown analysis.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Reads extension configuration from VS Code settings.
 */
function getConfig() {
  const config = vscode.workspace.getConfiguration('rpgleAI');
  const apiKey = config.get<string>('apiKey', '');
  const baseUrl = config.get<string>('baseUrl', 'https://api.openai.com/v1');
  const model = config.get<string>('model', 'gpt-4o');
  const maxTokens = config.get<number>('maxTokens', 2048);
  return { apiKey, baseUrl, model, maxTokens };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

/**
 * Makes a POST request to the OpenAI Chat Completions endpoint.
 */
async function callOpenAI(
  systemPrompt: string,
  userMessage: string
): Promise<AIResponse> {
  const { apiKey, baseUrl, model, maxTokens } = getConfig();
  const endpoint = `${normalizeBaseUrl(baseUrl)}/chat/completions`;

  // Validate API key is set
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'OpenAI API key is not configured.\n\n' +
      'Please add your API key:\n' +
      '1. Open VS Code Settings (Ctrl+,)\n' +
      '2. Search for "RPGLE AI"\n' +
      '3. Enter your API key in "rpgleAI.apiKey"\n' +
      '4. (Optional) Set "rpgleAI.baseUrl" for non-default providers\n\n' +
      'Get a key at: https://platform.openai.com (or your provider portal)'
    );
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await axios.post<OpenAIAPIResponse>(
      endpoint,
      {
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.3 // Lower temperature = more focused, consistent output
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      }
    );

    const data = response.data;

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response received from OpenAI API.');
    }

    const content = data.choices[0].message.content;

    if (!content || content.trim() === '') {
      throw new Error('OpenAI returned an empty response. Please try again.');
    }

    return {
      content: content.trim(),
      model: data.model,
      tokensUsed: data.usage?.total_tokens ?? 0
    };

  } catch (err) {
    const axiosErr = err as AxiosError<{ error?: { message?: string } }>;

    // Handle specific HTTP errors
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const apiMessage = axiosErr.response.data?.error?.message ?? '';

      if (status === 401) {
        throw new Error(
          'Invalid API key. Please check your OpenAI API key in settings (rpgleAI.apiKey).'
        );
      }
      if (status === 429) {
        throw new Error(
          'OpenAI rate limit exceeded. Please wait a moment and try again, or check your usage quota.'
        );
      }
      if (status === 400) {
        throw new Error(
          `OpenAI request error: ${apiMessage || 'Bad request. The code may be too long.'}`
        );
      }
      if (status >= 500) {
        throw new Error(
          'OpenAI service is temporarily unavailable. Please try again in a few moments.'
        );
      }
      throw new Error(`OpenAI API error (${status}): ${apiMessage || 'Unknown error'}`);
    }

    // Network / timeout errors
    if (axiosErr.code === 'ECONNABORTED') {
      throw new Error(
        'Request timed out. The code may be too long or the OpenAI service is slow. Try with a smaller selection.'
      );
    }
    if (axiosErr.code === 'ENOTFOUND' || axiosErr.code === 'ECONNREFUSED') {
      throw new Error(
        'Cannot connect to OpenAI API. Please check your internet connection.'
      );
    }

    // Re-throw if it's already a formatted error (e.g., missing API key)
    throw err;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends RPGLE code to OpenAI and returns a plain-English explanation.
 * @param code - The RPGLE source code to explain
 */
export async function explainCode(code: string): Promise<AIResponse> {
  const userMessage =
    `You are a senior IBM i RPGLE expert. Explain the following RPGLE code in simple terms.\n\n` +
    `Provide:\n` +
    `1. **Summary** — What does this program/routine do at a high level?\n` +
    `2. **Key Business Logic** — What are the core operations and calculations?\n` +
    `3. **File / Database Interactions** — What files or tables does it read/write?\n` +
    `4. **Potential Issues or Improvements** — Any bugs, performance concerns, or modernization suggestions?\n\n` +
    `Format your response in Markdown with clear headings.\n\n` +
    `Code:\n\`\`\`rpgle\n${code}\n\`\`\``;

  return callOpenAI(EXPLAIN_SYSTEM_PROMPT, userMessage);
}

/**
 * Generates detailed Markdown documentation for RPGLE code.
 * @param code - The RPGLE source code to document
 */
export async function generateDocs(code: string): Promise<AIResponse> {
  const userMessage =
    `You are a senior IBM i developer. Generate detailed documentation in Markdown format for the following RPGLE program.\n\n` +
    `Include these sections:\n` +
    `- **Program Overview** — Purpose, author (if determinable), and high-level description\n` +
    `- **Input Files** — All files opened for input/update with their purpose\n` +
    `- **Output Files** — All files opened for output with their purpose\n` +
    `- **Data Structures & Variables** — Key data structures, arrays, and variables\n` +
    `- **Business Rules** — The business logic rules the program enforces\n` +
    `- **Step-by-Step Logic** — A numbered walkthrough of the program flow\n` +
    `- **Error Handling** — How the program handles errors (if any)\n` +
    `- **Dependencies** — External programs, service programs, or APIs called\n\n` +
    `Format as professional technical documentation suitable for a project wiki.\n\n` +
    `Code:\n\`\`\`rpgle\n${code}\n\`\`\``;

  return callOpenAI(DOCS_SYSTEM_PROMPT, userMessage);
}

/**
 * Performs a deep analysis of a full RPGLE file, including code quality review.
 * @param code - The full RPGLE source file content
 */
export async function analyzeFullFile(code: string): Promise<AIResponse> {
  const userMessage =
    `Perform a comprehensive analysis of this RPGLE program.\n\n` +
    `Provide:\n` +
    `- **Program Summary** — What this program does and its role in the system\n` +
    `- **Code Structure** — Program organization, procedures, and flow\n` +
    `- **File & Data Access Patterns** — How data is accessed, joined, and modified\n` +
    `- **Code Quality** — Readability, maintainability, naming conventions\n` +
    `- **Performance Considerations** — Potential bottlenecks or inefficiencies\n` +
    `- **Security Concerns** — Any security risks (SQL injection, authority issues, etc.)\n` +
    `- **Modernization Opportunities** — Legacy patterns that could be updated to modern RPGLE/free-format\n` +
    `- **Recommendations** — Prioritized list of suggested improvements\n\n` +
    `Be specific and reference actual line numbers or variable names when pointing out issues.\n\n` +
    `Code:\n\`\`\`rpgle\n${code}\n\`\`\``;

  return callOpenAI(ANALYZE_SYSTEM_PROMPT, userMessage);
}
