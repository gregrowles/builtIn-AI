export class GeminiRewriter {
  constructor( onResponse ) {
    this.rewriter = null;
    this.onResponse = onResponse || null;
  }

  // Initializes the rewriter (must be called once)
  async init() {
    if (this.rewriter) return;

    const options = {
        sharedContext: 'This is an professional summary for colleagues and managers about a health crisis.',
        tone: 'more-formal', // "more-formal", "as-is" (default), "more-casual"
        format: 'markdown', // "markdown" (default), "plain-text"
        length: 'shorter', // "shorter", "as-is" (default), "longer"
        monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
                const percent = Math.round(e.loaded * 100);
                console.log(`rewriter download progress: ${percent}%`);
                if( this.onResponse ) this.onResponse(  `[x] rewriter download progress: ${percent}%` );
            });
        }
    };

    this.rewriter = await Rewriter.create(options);

    console.log("Rewriter initialized.");
  }

  // Summarize text
  async rewrite(text) {
    if (!this.rewriter) {
      throw new Error("Rewriter not initialized. Call init() first.");
    }

    try {
      const result = await this.rewriter.rewrite(text);
      return result.summary || result;
    } catch (error) {
      console.error("Summarization failed:", error);
      throw error;
    }
  }
}
