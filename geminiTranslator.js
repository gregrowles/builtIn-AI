export class GeminiTranslator {
  constructor() {
    this.translator = null;
  }

  // Initializes the translator (must be called once)
  async init( sourceLang = 'en', targetLang = 'fr' ) {
    if (this.translator) return;

    this.translator = await Translator.create({
        sourceLanguage: sourceLang || 'en',
        targetLanguage: targetLang || 'fr',
        monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
            console.log(`Translator Downloaded ${e.loaded * 100}%`);
            });
        },
    });

    console.log("Translator initialized.");
  }

  // Translate text
  async translate(text) {
    if (!this.translator) {
      throw new Error("Translator not initialized. Call init() first.");
    }

    try {
      const result = await this.translator.translate(text);
      return result.summary || result;
    } catch (error) {
      console.error("Summarization failed:", error);
      throw error;
    }
  }
}
