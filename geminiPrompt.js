export class GeminiPrompt {
  constructor( controller, onResponse ) {
    this.promptLanguageModel = null;
    this.controller = controller || null;
    this.onResponse = onResponse || null;
  }

  // Initializes the summarizer (must be called once)
  async init() {
    if (this.promptLanguageModel) return;

    const options = {
        initialPrompts: [
            {
            role: 'system',
            content:
                'You are a friendly, helpful assistant specialized in strategic planning in public health. You are able to connect dots and formulate ideas that humans are unable to',
            },
        ],   
    };

    if ( this.controller ) options[ 'signal' ] = this.controller.signal;

    // Initializing a new session must either specify both `topK` and `temperature` or neither of them.
    // const slightlyHighTemperatureSession = await LanguageModel.create({
    //     temperature: Math.max(params.defaultTemperature * 1.2, 2.0),
    //     topK: params.defaultTopK,
    // });

    this.promptLanguageModel = await LanguageModel.create( options );

    if( this.onResponse ) this.onResponse(  "[x] promptLanguageModel initialized." );
    console.log("promptLanguageModel initialized.");
  }

  // responde to prompt
  // promptObj: { role: 'user', content: 'this is the prompt text that must be responded to' }

  async prompt( promptObj ) {
    if (!this.promptLanguageModel) {
    if( this.onResponse ) this.onResponse(  "[ ] promptLanguageModel not initialized. Call init() first." )
      throw new Error("promptLanguageModel not initialized. Call init() first.");
    }

    try {
      const result = await this.promptLanguageModel.prompt( promptObj );
      return result.summary || result;
    } catch (error) {
      console.error("LanguageModel (prompt) failed:", error);
      if (this.onResponse) {
        this.onResponse("promptLanguageModel (prompt) failed: " + error.message);
      }
      throw error;
    }
  }

  async promptStream(promptObj, onChunk) {
    if (!this.promptLanguageModel) {
    if( this.onResponse ) this.onResponse(  "promptLanguageModel not initialized. Call init() first." )
      throw new Error("promptLanguageModel not initialized. Call init() first.");
    }

    try {
      const stream = await this.promptLanguageModel.promptStreaming( promptObj );
      let allChunks = '';
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
  }

}
