export class GeminiSummarizer {
  constructor( onResponse ) {
    this.summarizer = null;
    this.onResponse = onResponse || null;
  }

  // Initializes the summarizer (must be called once)
  async init() {
    if (this.summarizer) return;

    const options_healthJournal_keypoints_markdown_short = {
      sharedContext: 'This is a health journal article',
      type: 'key-points', //"tldr", "teaser", "key-points" (default), "headline"
      format: 'markdown', // "markdown" (default), "plain-text"
      length: 'short', // varies for "type" above
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
            const percent = Math.round(e.loaded * 100);
            console.log(`summarizer download progress: ${percent}%`);
            if( this.onResponse ) this.onResponse(  `[x] summarizer download progress: ${percent}%` );
        });
      }
    };

    this.summarizer = await Summarizer.create( options_healthJournal_keypoints_markdown_short );

    console.log("Summarizer initialized.");
    if( this.onResponse ) this.onResponse(  `Summarizer initialized` )
  }

  // Summarize text
  async summarize(text) {
    if (!this.summarizer) {
      if( this.onResponse ) this.onResponse(  `Summarizer not initialized. Call init() first.` )
      throw new Error("Summarizer not initialized. Call init() first.");
    }

    try {
      const result = await this.summarizer.summarize(text);
      return result.summary || result;
    } catch (error) {
      console.error("Summarization failed:", error);
      if( this.onResponse ) this.onResponse(  `summarizer.summarize failed. ${error.message}` )
      throw error;
    }
  }

  // Summarize streaming
  async summarizeStream(text, context, onChunk) {
    if (!this.summarizer) {
      if( this.onResponse ) this.onResponse(  `summarizer.summarize failed. ${error.message}` )
      throw new Error("Summarizer not initialized. Call init() first.");
    }

    try {
      const stream = await this.summarizer.summarizeStreaming(text, {
        context: context || 'This article is intended for health professionals',
      });
      let allChunks = '';
      for await (const chunk of stream) {
        if (typeof onChunk === 'function') {
          allChunks += chunk;
          onChunk(allChunks);
        }
      }
    } catch (error) {
      console.error("summarizeStream failed:", error);
      if( this.onResponse ) this.onResponse(  `summarizer.summarizeStreaming failed. ${error.message}` )
      throw error;
    }
  }

}
