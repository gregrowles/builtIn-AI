export class GeminiTranslator {
  constructor( onResponse ) {
    this.translator = null;
    this.onResponse = onResponse || null;
    this.running = false;
  }

  // Initializes the translator (must be called once)
  async init( sourceLang = 'en', targetLang = 'fr' ) {
    if (this.translator) return;
    if( this.onResponse ) this.onResponse(  `creating *translator*` );
    this.translator = await Translator.create({
        sourceLanguage: sourceLang || 'en',
        targetLanguage: targetLang || 'fr',
        monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
                const percent = Math.round(e.loaded * 100);
                console.log(`translator download progress: ${percent}%`);
              // if( this.onResponse ) this.onResponse(  `[x] translator download progress: ${percent}%` );
            });
        },
    });

    console.log("Translator initialized.");
    if( this.onResponse ) this.onResponse(  `Translator initialized` );
  }

  // Translate text
  async translate(text) {
    if (!this.translator) {
      if( this.onResponse ) this.onResponse(  `Translator not initialized. Call init() first` );
      throw new Error("Translator not initialized. Call init() first.");
    }

    try {
      const result = await this.translator.translate(text);
      return result.summary || result;
    } catch (error) {
      console.error("Translator failed:", error);
      if( this.onResponse ) this.onResponse(  `Translator failed. ${error.message}` );
      throw error;
    }
  }
}
