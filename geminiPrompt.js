export class GeminiPrompt {
  constructor() {
    this.promptLanguageModel = null;
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

    // Initializing a new session must either specify both `topK` and `temperature` or neither of them.
    // const slightlyHighTemperatureSession = await LanguageModel.create({
    //     temperature: Math.max(params.defaultTemperature * 1.2, 2.0),
    //     topK: params.defaultTopK,
    // });

    this.promptLanguageModel = await LanguageModel.create( options );

    console.log("Prompt initialized.");
  }

  // responde to prompt
  // promptObj: { role: 'user', content: 'this is the prompt text that must be responded to' }

  async prompt( promptObj ) {
    if (!this.promptLanguageModel) {
      throw new Error("Prompt not initialized. Call init() first.");
    }

    try {
      const result = await this.promptLanguageModel.prompt( promptObj );
      return result.summary || result;
    } catch (error) {
      console.error("LanguageModel (prompt) failed:", error);
      throw error;
    }
  }
}
