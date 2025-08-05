
  import { GeminiSummarizer } from './geminiSummarizer.js';
  import { GeminiTranslator } from './geminiTranslator.js';
  import { GeminiRewriter } from './geminiRewriter.js';
  import { GeminiPrompt } from './geminiPrompt.js';

  const controller = new AbortController(); // for aborting gemini tasks (BUGGY: FIX ME)

  const summarizerInstance = new GeminiSummarizer( markdownOutput );
  const translatorInstance = new GeminiTranslator( markdownOutput );
  const rewriterInstance = new GeminiRewriter( markdownOutput );
  const promptLanguageModel = new GeminiPrompt( controller, markdownOutput );

  // write out markdown content (targetElementId is hardcoded to 'responseOutput')
  function markdownOutput( chunk ) {

    if (typeof showdown === 'undefined') {
        console.error('ShowdownJS is not loaded. Please include showdown.min.js.');
        return;
    }

    const converter = new showdown.Converter();
    const html = converter.makeHtml(chunk);
    const targetEl = document.getElementById( 'responseOutput' );

    if (!targetEl) {
        console.error(`Element with ID "${targetElementId}" not found.`);
        return;
    }

    targetEl.innerHTML = html;
  }

  function markdownReturn( chunk ) {

    if (typeof showdown === 'undefined') {
        console.error('ShowdownJS is not loaded. Please include showdown.min.js.');
        return;
    }

    const converter = new showdown.Converter();
    return converter.makeHtml(chunk);
  }


  // Function to run the summarizer
  async function runSummarizer( inpText ) {

    await summarizerInstance.init();

    const summary = await summarizerInstance.summarize( inpText );

    markdownOutput( summary );

  }
  async function runSummarizerStream( inpText ) {

    await summarizerInstance.init();

    await summarizerInstance.summarizeStream( inpText, 'intended for health managers', markdownOutput );

  }


  // Function to run the translator
  async function runTranslator( inpText ) {

    await translatorInstance.init( document.getElementById('languageFrom') ? document.getElementById('languageFrom').value : 'en', document.getElementById('languageTo') ? document.getElementById('languageTo').value : 'fr' );

    const summary = await translatorInstance.translate( inpText );

    markdownOutput( summary );

  }

  // Function to run the rewriter
  async function runRewriter( inpText ) {

    await rewriterInstance.init();

    const summary = await rewriterInstance.rewrite( inpText );

    markdownOutput( summary );

  }

  // Function to run the prompt
  async function runPrompt( inpText ) {

    await promptLanguageModel.init();

    const summary = await promptLanguageModel.prompt( inpText );

    markdownOutput( summary );

  }
  async function runPromptStream( inpText ) {

    await promptLanguageModel.init();

    await promptLanguageModel.promptStream( inpText, markdownOutput );

  }

window.runSummarizer = runSummarizer;
window.runSummarizerStream = runSummarizerStream;   
window.runTranslator = runTranslator;
window.runRewriter = runRewriter;
window.runPrompt = runPrompt;
window.runPromptStream = runPromptStream;
window.markdownReturn = markdownReturn;
