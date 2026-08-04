import { GeminiPrompt } from './geminiPrompt.js';
import MarkdownIt from 'https://esm.run/markdown-it'; // Fixed import syntax

// Initialize markdown-it once globally to avoid recreating the instance on every call
const md = new MarkdownIt();

// Hardcoded configurations
const RESPONSE_OUTPUT_CONTROL_ID = 'responseOutput';
const promptLanguageModel = new GeminiPrompt(markdownOutput);

// move this outside here, we can manage "support" for different integrations elsewhere
const SCRIPT_SUPPORTED_EMBEDDINGS = [
  { 
    name: 'mermaid',
    open: '```mermaid',
    close: '```',
    replace: { open: ' <pre class="mermaid">', close: '</pre>' },
    handler: preprocessMermaid
  }
];
function preprocessMermaidOLD(md) {

  return md.replace(
    /```mermaid\s*([\s\S]*?)```/g,
    (match, mermaidCode) => {

      return `
        <div class="mermaid">
        ${mermaidCode.trim()}
        </div>
      `;
    }
  );

}

function preprocessMermaid(md) {

  return md.replace(
    /```mermaid\s*([\s\S]*?)```/g,
    (match, mermaidCode) => {

      return `
        <mermaid-chart>
        ${mermaidCode.trim()}
        </mermaid-chart>
      `;
    }
  );

}

function preprocessSupportedScriptEmbeddings(chunk) {

   // 1. if match found in SCRIPT_SUPPORTED_EMBEDDINGS (for open property) , create necessary CDN links (detect if already created)
   // 2. swap SCRIPT_SUPPORTED_EMBEDDINGS replace 'open' + 'close' content
   console.log( 'streamFinal', chunk);
   var newChunk = chunk, cdnLink = '';

   SCRIPT_SUPPORTED_EMBEDDINGS.forEach(embedding => {
     if (newChunk.includes(embedding.open) && newChunk.includes(embedding.close)) {
       if ( embedding.name === 'mermaid' ) {
         newChunk = embedding.handler(newChunk);
       }
     }
   });

   return newChunk;
}

// function preprocessSupportedScriptEmbeddings(chunk) { 

//    // 1. if match found in SCRIPT_SUPPORTED_EMBEDDINGS (for open property) , create necessary CDN links (detect if already created)
//       // 2. swap SCRIPT_SUPPORTED_EMBEDDINGS replace 'open' + 'close' content
//       console.log( 'streamFinal', chunk);
//       var newChunk = chunk, cdnLink = '';

//       SCRIPT_SUPPORTED_EMBEDDINGS.forEach(embedding => {
//         if (newChunk.includes(embedding.open) && newChunk.includes(embedding.close)) {
//           const { open, close } = embedding.replace;
//           newChunk = newChunk.replace(embedding.open, open).replace(embedding.close, close);

//     return md.replace(
//         /```mermaid\s*([\s\S]*?)```/g,
//         (match, mermaidCode) => {

//                   return `
//       <div class="mermaid">
//       ${mermaidCode.trim()}
//       </div>
//       `;
//               }
//           );
          
//         }
//       });

//       return newChunk; // + cdnLink;
// }

/**
 * Renders markdown chunk to the output container and handles auto-scrolling
 */
function markdownOutput(chunk) {

  const html = md.render((chunk)); //preprocessSupportedScriptEmbeddings
  const targetEl = document.getElementById(RESPONSE_OUTPUT_CONTROL_ID);

  if (!targetEl) {
    console.error(`Element with ID "${RESPONSE_OUTPUT_CONTROL_ID}" not found.`);
    return;
  }

  targetEl.innerHTML = html;
  targetEl.scrollTop = targetEl.scrollHeight;

  // DHIS2 iframe context smooth scrolling
  const parentDocument = window.parent?.document;
  const parentFrame = parentDocument?.querySelector('.app-shell-app');
  if (parentFrame) {
    parentFrame.scrollTo({ top: parentFrame.scrollHeight, left: 0, behavior: 'smooth' });
  }
}

/**
 * Returns rendered HTML from a markdown string
 */
function markdownReturn(chunk) {
  return md.render(chunk);
}

/**
 * Standard Prompt Execution
 */
async function runPrompt(inpText, callback) {
  try {
    await promptLanguageModel.init();
    await promptLanguageModel.prompt(inpText, (summary) => {
      markdownOutput(summary);
      if (typeof callback === 'function') {
        callback({ id: generateRandomId(15), type: 'P', input: inpText, response: summary });
      }
    });
  } catch (error) {
    console.error('Error running prompt:', error);
  }
}

/**
 * Streamed Prompt Execution
 */
async function runPromptStream(input, callback) {
  try {
    // Fixed: Handled cases where input might be passed as an object containing options
    const text = typeof input === 'object' ? input.prompt : input;
    const options = typeof input === 'object' ? input.options : undefined;

    await promptLanguageModel.init(options);
    await promptLanguageModel.promptStream(text, markdownOutput, (streamFinal) => {
      if (typeof callback === 'function') {
        callback({ id: generateRandomId(15), type: 'Ps', input: text, response: streamFinal });
      }
    });
  } catch (error) {
    console.error('Error running prompt stream:', error);
  }
}

/**
 * Streamed Prompt Execution with JSON Input
 */
async function runPromptStreamJsonInput(inpObj, callback) {
  try {
    if (typeof inpObj === 'object' && inpObj?.defaultPrompt) {
      promptLanguageModel.defaults.systemPrompt = inpObj.defaultPrompt;
    }

    await promptLanguageModel.init(inpObj?.options);
    await promptLanguageModel.promptStream(inpObj.prompt, markdownOutput, (streamFinal) => {
      if (typeof callback === 'function') {
        // Replaced expensive JSON stringify/parse with modern spread operator
        const responseData = {
          ...inpObj,
          id: generateRandomId(15),
          type: 'Ps',
          response: streamFinal
        };
        callback(responseData);
      }
    });
  } catch (error) {
    console.error('Error running JSON prompt stream:', error);
  }
}

/**
 * Generic API Fetch Utility
 */
async function testAPIurl(args, callback) {
  console.log('testAPIurl called with args:', args);
  
  const headers = { 'Content-Type': args?.contentType || 'application/json' };
  const body = args?.body || null;

  if (args?.username && args?.password) {
    headers['Authorization'] = `Basic ${btoa(`${args.username}:${args.password}`)}`;
  } else if (args?.accessToken) {
    // Fixed: Bearer token logic previously used username/password by mistake
    headers['Authorization'] = `Bearer ${args.accessToken}`;
  }

  try {
    const response = await fetch(args?.url, {
      method: args?.method || 'GET',
      headers,
      body
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Fetch successful:', data);
      callback(data);
    } else {
      console.error('Fetch failed:', response.status, response.statusText);
      callback({ error: 'Fetch failed', status: response.status, statusText: response.statusText });
    }
  } catch (error) {
    console.error('Error during fetch:', error);
    callback({ error: error.message });
  }
}





  /*  util functions  */

  function generateRandomId(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  }

  // struggling with STOP/abort functionality: disabling for now
  // async function stopGemini () {
  //   if ( promptLanguageModel.running ) promptLanguageModel.stop();
  //   if ( summarizerInstance.running ) summarizerInstance.stop();
  //   if ( translatorInstance.running ) translatorInstance.stop();  
  //   if ( rewriterInstance.running ) rewriterInstance.stop();
  //   // controller.abort( "User aborted the operation." );
  // }


  // Expose functions to the global scope

  window.runSummarizer = runSummarizer;
  window.runSummarizerStream = runSummarizerStream;   
  window.runTranslator = runTranslator;
  window.runRewriter = runRewriter;
  window.runPrompt = runPrompt;
  window.runPromptStream = runPromptStream;
  window.markdownReturn = markdownReturn;
  window.markdownOutput = markdownOutput;
  // window.controllerForAbort = controller;
  // window.stopGemini = stopGemini;

  // window.about = about;
  // window.submitToAIcompleted = submitToAIcompleted;
  // window.about = about;
  // window.about = about;
  // window.about = about;
  
