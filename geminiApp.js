  import { GeminiSummarizer } from './geminiSummarizer.js';
  import { GeminiTranslator } from './geminiTranslator.js';
  import { GeminiRewriter } from './geminiRewriter.js';
  import { GeminiPrompt } from './geminiPrompt.js';

  import * as markdownIt from 'https://esm.run/markdown-it';

  // hardCoded: fix
  const responseOutputControlID = 'responseOutput';

  const summarizerInstance = new GeminiSummarizer( markdownOutput );
  const translatorInstance = new GeminiTranslator( markdownOutput );
  const rewriterInstance = new GeminiRewriter( markdownOutput );
  const promptLanguageModel = new GeminiPrompt( markdownOutput );

  
  // 1. bind "stop" button to controller (also show/hide accordingly)
  // 2. include option: use-as-chat (where responses are appended to the chat history)

  function markdownOutput ( chunk ) {

    const md = markdownit()
    const html = md.render(chunk);
    const targetEl = document.getElementById( responseOutputControlID );

    if (!targetEl) {
        console.error(`Element with ID "${targetElementId}" not found.`);
        return;
    }

    targetEl.innerHTML = html;
    targetEl.scrollTop = targetEl.scrollHeight;
  }

  function markdownReturn ( chunk ) {

    const md = markdownit()

    return md.render(chunk);

  }


  // Function to run the summarizer
  async function runSummarizer ( inpText, callback ) {

    await summarizerInstance.init();

    const summary = await summarizerInstance.summarize( inpText );

    markdownOutput( summary );

    if ( callback && typeof callback === 'function') {

      callback( { id: generateRandomId(15), type: 'S', input: inpText, response: summary } );

    }

  }
  async function runSummarizerStream ( inpText, callback ) {

    await summarizerInstance.init();

    await summarizerInstance.summarizeStream( inpText, 'intended for health managers', markdownOutput, ( streamFinal ) => {

      if ( callback && typeof callback === 'function') {

        callback( { id: generateRandomId(15), type: 'Ss', input: inpText, response: streamFinal } );

      }

    });

  }

  // Function to run the translator
  async function runTranslator ( inpText, callback ) {

    await translatorInstance.init( document.getElementById('languageFrom') ? document.getElementById('languageFrom').value : 'en', document.getElementById('languageTo') ? document.getElementById('languageTo').value : 'fr' );

    const summary = await translatorInstance.translate( inpText );

    markdownOutput( summary );

      if ( callback && typeof callback === 'function') {

        callback( { id: generateRandomId(15), type: 'T', input: inpText, response: summary } );

      }

  }

  // Function to run the rewriter
  async function runRewriter ( inpText, callback ) {

    await rewriterInstance.init();

    const summary = await rewriterInstance.rewrite( inpText );

    markdownOutput( summary );

    if ( callback && typeof callback === 'function') {

      callback( { id: generateRandomId(15), type: 'R', input: inpText, response: summary } );

    }

  }

  // Function to run the prompt
  async function runPrompt ( inpText, callback ) {

    await promptLanguageModel.init();

    await promptLanguageModel.prompt( inpText , ( summary ) => {

      markdownOutput( summary );

      if ( callback && typeof callback === 'function') {

        callback( { id: generateRandomId(15), type: 'P', input: inpText, response: summary } );

      }

    });

  }
  async function runPromptStream ( inpText, callback ) {

    await promptLanguageModel.init();

    await promptLanguageModel.promptStream( inpText, markdownOutput, ( streamFinal ) => {

      if ( callback && typeof callback === 'function') {

        callback( { id: generateRandomId(15), type: 'Ps', input: inpText, response: streamFinal } );

      }

    });

  }
  async function runPromptStreamJsonInput ( inpObj, callback ) {

    if ( typeof inpObj === 'object' && inpObj?.defaultPrompt ) promptLanguageModel.defaults.systemPrompt = inpObj.defaultPrompt;

    await promptLanguageModel.init();

    await promptLanguageModel.promptStream( inpObj.prompt, markdownOutput, ( streamFinal ) => {

      if ( callback && typeof callback === 'function') {

        callback( { id: generateRandomId(15), type: 'Ps', input: inpObj.prompt, response: streamFinal } );

      }

    });

  }

  async function destroyLanguageModel() {
    promptLanguageModel.destroy();
  }

  function generateRandomId(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  }

  // Expose functions to the global scope
  window.promptCharacters = promptLanguageModel.characters;
  window.runSummarizer = runSummarizer;
  window.runSummarizerStream = runSummarizerStream;   
  window.runTranslator = runTranslator;
  window.runRewriter = runRewriter;
  window.runPrompt = runPrompt;
  window.runPromptStream = runPromptStream;
  window.runPromptStreamJsonInput = runPromptStreamJsonInput;
  window.destroyLanguageModel = destroyLanguageModel;
  window.markdownReturn = markdownReturn;
  window.markdownOutput = markdownOutput;
