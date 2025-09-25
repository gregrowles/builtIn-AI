import { GeminiSummarizer } from './geminiSummarizer.js';
import { GeminiTranslator } from './geminiTranslator.js';
import { GeminiRewriter } from './geminiRewriter.js';
import { GeminiPrompt } from './geminiPrompt.js';

import MarkdownIt from 'https://esm.run/markdown-it';

// DOM element IDs
const RESPONSE_OUTPUT_ID = 'responseOutput';

// Single MarkdownIt instance to avoid re-creating per call
const md = new MarkdownIt({ linkify: true, breaks: true });

// Instances
const summarizerInstance = new GeminiSummarizer(markdownOutput);
const translatorInstance = new GeminiTranslator(markdownOutput);
const rewriterInstance = new GeminiRewriter(markdownOutput);
const promptLanguageModel = new GeminiPrompt(markdownOutput);

// Utilities
const getElById = (id) => document.getElementById(id);

/**
 * Render markdown chunk into the response output element.
 * Overwrites the element's content and scrolls to bottom.
 */
function markdownOutput(chunk) {
  const targetEl = getElById(RESPONSE_OUTPUT_ID);
  if (!targetEl) {
    console.error(`Element with ID "${RESPONSE_OUTPUT_ID}" not found.`);
    return;
  }
  const html = md.render(String(chunk ?? ''));
  targetEl.innerHTML = html;
  targetEl.scrollTop = targetEl.scrollHeight;
}

/**
 * Convert markdown to HTML and return it.
 */
function markdownReturn(chunk) {
  return md.render(String(chunk ?? ''));
}

/**
 * Secure random ID generator; falls back to Math.random if crypto is unavailable.
 */
function generateRandomId(length = 10) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes =
    (globalThis.crypto && globalThis.crypto.getRandomValues)
      ? crypto.getRandomValues(new Uint8Array(length))
      : Array.from({ length }, () => Math.floor(Math.random() * 256));
  let id = '';
  for (let i = 0; i < length; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

// Summarizer
async function runSummarizer(inpText, callback) {
  await summarizerInstance.init();
  const summary = await summarizerInstance.summarize(inpText);
  markdownOutput(summary);
  if (typeof callback === 'function') {
    callback({ id: generateRandomId(15), type: 'S', input: inpText, response: summary });
  }
}

async function runSummarizerStream(inpText, callback, options = {}) {
  await summarizerInstance.init();
  const { context = 'intended for health managers' } = options;
  await summarizerInstance.summarizeStream(
    inpText,
    context,
    markdownOutput,
    (streamFinal) => {
      if (typeof callback === 'function') {
        callback({ id: generateRandomId(15), type: 'Ss', input: inpText, response: streamFinal });
      }
    }
  );
}

// Translator
async function runTranslator(inpText, callback) {
  const fromEl = getElById('languageFrom');
  const toEl = getElById('languageTo');
  const from = fromEl?.value || 'en';
  const to = toEl?.value || 'fr';

  await translatorInstance.init(from, to);
  const translation = await translatorInstance.translate(inpText);
  markdownOutput(translation);
  if (typeof callback === 'function') {
    callback({ id: generateRandomId(15), type: 'T', input: inpText, response: translation });
  }
}

// Rewriter
async function runRewriter(inpText, callback) {
  await rewriterInstance.init();
  const rewritten = await rewriterInstance.rewrite(inpText);
  markdownOutput(rewritten);
  if (typeof callback === 'function') {
    callback({ id: generateRandomId(15), type: 'R', input: inpText, response: rewritten });
  }
}

// Prompt
async function runPrompt(inpText, callback) {
  await promptLanguageModel.init();
  await promptLanguageModel.prompt(inpText, (summary) => {
    markdownOutput(summary);
    if (typeof callback === 'function') {
      callback({ id: generateRandomId(15), type: 'P', input: inpText, response: summary });
    }
  });
}

async function runPrompt_withGet(inpText, callback) {
  await promptLanguageModel.init();
  await promptLanguageModel.prompt(inpText, (summary) => {
    if (typeof callback === 'function') {
      callback( summary );
    }
  });
}

async function runPromptStream(inpText, callback) {
  await promptLanguageModel.init();
  await promptLanguageModel.promptStream(inpText, markdownOutput, (streamFinal) => {
    if (typeof callback === 'function') {
      callback({ id: generateRandomId(15), type: 'Ps', input: inpText, response: streamFinal });
    }
  });
}

async function runPromptStreamJsonInput(inpObj, callback) {
  if (typeof inpObj === 'object' && inpObj?.defaultPrompt) {
    promptLanguageModel._systemPrompt = inpObj.defaultPrompt;
  }

  await promptLanguageModel.init();
  await promptLanguageModel.promptStream(inpObj.prompt, markdownOutput, (streamFinal) => {
    if (typeof callback === 'function') {
      const cloneData = { ...inpObj, id: generateRandomId(15), type: 'Ps', response: streamFinal };
      callback(cloneData);
    }
  });
}

// Generic API fetch tester
async function testAPIurl(args, callback) {
  try {
    if (!args?.url) throw new Error('URL is required');

    const headers = new Headers(args?.headers || {});
    const method = (args?.method || 'GET').toUpperCase();
    const hasBody = Boolean(args?.body);

    // Content-Type: only set if caller didn't and body isn't FormData
    if (
      hasBody &&
      !(args?.body instanceof FormData) &&
      !headers.has('Content-Type')
    ) {
      headers.set('Content-Type', args?.contentType || 'application/json');
    }

    // Basic auth
    if (args?.username && args?.password) {
      const encoded = btoa(`${args.username}:${args.password}`);
      headers.set('Authorization', `Basic ${encoded}`);
    }

    // Token auth
    if (args?.accessToken) {
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `ApiToken ${args.accessToken}`);
      }
    }

    const response = await fetch(args.url, {
      method,
      headers,
      body: hasBody ? args.body : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json().catch(() => ({})) : await response.text();

    if (response.ok) {
      console.log('Request succeeded:', payload);
      if (typeof callback === 'function') callback(payload);
      return;
    }

    const errorInfo = {
      error: 'Fetch failed',
      status: response.status,
      statusText: response.statusText,
      payload,
    };
    console.error('Request failed:', errorInfo);
    if (typeof callback === 'function') callback(errorInfo);
  } catch (e) {
    console.error('Error during fetch:', e);
    if (typeof callback === 'function') callback({ error: e.message });
  }
}

async function destroyLanguageModel() {
  try {
    promptLanguageModel.destroy();
  } catch (e) {
    console.warn('destroyLanguageModel: already destroyed or not initialized.', e);
  }
}

async function aboutGemini() {
  // Small delay to mimic async update and keep UX consistent
  setTimeout(() => {
    const result =
      '__Gemini Nano__ is an experimental feature that must be enabled manually. It runs locally within your Chrome browser, unlike other Gemini models that are only available via cloud APIs. The "built-in" part signifies on-device processing with reduced latency and enhanced privacy.\n\n' +
      'Key differences include where the model runs (on your device vs. in the cloud), which affects performance, data privacy, and the types of tasks that can be performed.\n\n' +
      '_Gemini Nano Built-In (Chrome)_\n' +
      '+ __Local Processing__:\n' +
      '- The model runs entirely on your device using WebAssembly/WebGPU, without sending data to the cloud.\n\n' +
      '+ __Performance__:\n' +
      '- Optimized for smaller, common tasks like summarization and classification, leveraging on-device hardware acceleration.\n\n' +
      '**Gemini Nano**\n\n' +
      'The following features are available/enabled on your machine:\n' +
      '| Feature | Supported | Purpose |\n' +
      '| --- | --- | --- |\n' +
      '| Summarize | ' + ('Summarizer' in self ? '&#10003;' : ' ') + ' | Summarizing narratives, articles or messages |\n' +
      '| Translate (en - fr) | ' + ('Translator' in self ? '&#10003;' : ' ') + ' | Translation of texts into other languages (en-fr default) |\n' +
      '| Rewrite | ' + ('Rewriter' in self ? '&#10003;' : ' ') + ' | Rewrite texts to sound more polite or formal |\n' +
      '| Prompt | ' + ('prompt' in self ? '&#10003;' : ' ') + ' | Answer questions based on provided texts or general Q&A |\n\n' +
      '**Getting Started**\n\n' +
      'Gemini (Nano) is an experimental AI feature in Chrome.\n' +
      'How to Enable Foundational Model (e.g., v2Nano)\n' +
      '1. Open chrome://flags/#prompt-api-for-gemini-nano in a new tab.\n' +
      '2. Enable the feature and restart Chrome.\n\n' +
      'Note: Individual features may require separate flags (e.g., chrome://flags/#rewriter-api-for-gemini-nano). Learn more: https://developer.chrome.com/docs/ai/get-started\n\n' +
      '**Operating system**\n\nWindows 10 or 11; macOS 13+ (Ventura and onwards); or Linux. Chrome for Android, iOS, and ChromeOS are not yet supported by the APIs that use Gemini Nano.\n' +
      '**Storage**\n\nAt least 22 GB of free space on the volume that contains your Chrome profile.\n';

    markdownOutput(result);
  }, 100);
}

// Expose functions to the global scope
window.promptCharacters = promptLanguageModel.characters;
window.languageModelParameters = promptLanguageModel.modelParameters;
window.runSummarizer = runSummarizer;
window.runSummarizerStream = runSummarizerStream;
window.runTranslator = runTranslator;
window.runRewriter = runRewriter;
window.runPrompt = runPrompt;
window.runPromptGet = runPrompt_withGet;
window.runPromptStream = runPromptStream;
window.runPromptStreamJsonInput = runPromptStreamJsonInput;
window.destroyLanguageModel = destroyLanguageModel;
window.testAPIurl = testAPIurl;
window.markdownReturn = markdownReturn;
window.markdownOutput = markdownOutput;
window.aboutGemini = aboutGemini;