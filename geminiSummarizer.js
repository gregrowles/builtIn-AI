export class GeminiSummarizer {
  constructor() {
    this.summarizer = null;
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
        });
      }
    };

    this.summarizer = await Summarizer.create( options_healthJournal_keypoints_markdown_short );

    console.log("Summarizer initialized.");
  }

  // Summarize text
  async summarize(text) {
    if (!this.summarizer) {
      throw new Error("Summarizer not initialized. Call init() first.");
    }

    try {
      const result = await this.summarizer.summarize(text);
      return result.summary || result;
    } catch (error) {
      console.error("Summarization failed:", error);
      throw error;
    }
  }
}
