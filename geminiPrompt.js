export class GeminiPrompt {

  constructor( onResponse ) {

    this.promptLanguageModel = null;
    // this.stopButtonID = stopButtonID;
    // this.controller = new AbortController();
    this.onResponse = onResponse || null;
    this.defaults = { systemPrompt: 'You are a friendly, helpful assistant specialized in strategic planning in public health. You are able to connect dots and formulate ideas that humans are unable to' };
    this.running = false;
  }

  // Initializes the summarizer (must be called once)
  async init() {

    if (this.promptLanguageModel) return;
    if( this.onResponse ) this.onResponse(  `creating promptLanguageModel*\n\ndefault context prompt: _${this.defaults.systemPrompt}_` );

    const controller = new AbortController();
    // this.controller = controller;

    // console.log( 'stopButtonID', this.stopButtonID );
    // document.getElementById( this.stopButtonID ).addEventListener("click", (e) => { 
    //   console.log("Stopping prompt stream...",controller); 
    //   controller.abort(); 
    // });

    const options = {
      signal: controller.signal,
      // model: 'gemini-1.5-flash',
      initialPrompts: [ { role: 'system', content: this.defaults } ],   
    };

    this.promptLanguageModel = await LanguageModel.create( options );

    if( this.onResponse ) this.onResponse(  "LanguageModel initialized.\nThinking..." );
    console.log("LanguageModel initialized.");
  }

  // responde to prompt
  // promptObj: { role: 'user', content: 'this is the prompt text that must be responded to' }

  async prompt( promptInput, callback ) {

    if (!this.promptLanguageModel) {
    if( this.onResponse ) this.onResponse(  "[ ] promptLanguageModel not initialized. Call init() first." )
      throw new Error("promptLanguageModel not initialized. Call init() first.");
    }

    try {
      this.running = true;
      const result = await this.promptLanguageModel.prompt( promptInput );
      if (callback && typeof callback === 'function') callback( ( result.summary || result ) );
      else return  ( result.summary || result );
    } catch (error) {
      console.error("LanguageModel (prompt) failed:", error);
      if (this.onResponse) {
        this.onResponse("promptLanguageModel (prompt) failed: " + error.message);
      }
      throw error;
    }
    this.running = false;
  }

  async promptStream( promptInput, onChunk, callback ) {

    if (!this.promptLanguageModel) {
    if( this.onResponse ) this.onResponse(  "promptLanguageModel not initialized. Call init() first." )
      throw new Error("promptLanguageModel not initialized. Call init() first.");
    }

    let allChunks = '';

    try {
      this.running = true;
      const stream = await this.promptLanguageModel.promptStreaming( promptInput );

      for await (const chunk of stream) {
        if (typeof onChunk === 'function') {
          allChunks += chunk;
          onChunk(allChunks);
        }
      }
    } catch (error) {
      console.error("promptStream failed:", error);
      if (this.onResponse) {
        this.onResponse("promptLanguageModel (promptStream) failed: " + error.message);
      }
      throw error;
    }
    if (callback && typeof callback === 'function') callback( allChunks );
    this.running = false;
  }

  async stop() {
    // if (this.controller) {
    //   console.log("Stopping prompt stream...");
    //   this.controller.abort();
    //   this.running = false;
    //   if (this.onResponse) {
    //     this.onResponse("Prompt stream stopped.");
    //   }
    // } else {
    //   console.warn("No controller available to stop the prompt stream.");
    // }
  }

}
