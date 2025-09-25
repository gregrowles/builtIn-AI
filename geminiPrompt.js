/**
 * GeminiPrompt
 * - Initializes a local LanguageModel once (idempotent)
 * - Supports single-shot prompt() and streaming promptStream()
 * - Emits progress via optional onResponse callback
 * - Provides stop() to cancel active streaming
 */ 
export class GeminiPrompt {
  /**
   * @param {(message: string) => void} [onResponse]
   */
  constructor(onResponse) {
    /** @type {any|null} */
    this.promptLanguageModel = null;

    /** @type {(msg: string) => void | null} */
    this.onResponse = onResponse || null;

    /** @type {boolean} */
    this.running = false;

    /** @type {AbortController | null} */
    this._streamController = null;

    /** @type {Promise<void> | null} */
    this._initPromise = null;

    /** @type {string} */
    this._systemPrompt =
      'You are a Public Health Manager; your style is Pragmatic, action-oriented, focused on implementation; your approach: Highlights resource allocation, workforce capacity, operational challenges, and feasible interventions; your tone: Clear, managerial, with recommendations suitable for health departments.';

    /** @type {Array<object>} */
    this.characters = [
      {
        id: 'public_health_manager',
        name: 'Public Health Manager',
        style: 'Pragmatic, action-oriented, focused on implementation',
        approach:
          'Highlights resource allocation, workforce capacity, operational challenges, and feasible interventions',
        tone: 'Clear, managerial, with recommendations suitable for health departments.',
      },
      {
        id: 'politician',
        name: 'Politician / Policy Maker',
        style: 'Strategic, persuasive, people-focused',
        approach:
          'Frames information for public trust, political feasibility, and stakeholder interests',
        tone: 'Accessible, motivational, sometimes high-level rather than technical.',
      },
      {
        id: 'epidemiologist',
        name: 'Epidemiologist',
        style: 'Analytical, evidence-driven, methodical',
        approach:
          'Focuses on patterns, transmission dynamics, risk factors, and causal inference',
        tone: 'Technical but structured, emphasizing methodology and validity.',
      },
      {
        id: 'statistician',
        name: 'Statistician',
        style: 'Precise, cautious, detail-oriented',
        approach:
          'Explains uncertainty, assumptions, confidence intervals, and robustness of findings',
        tone: 'Neutral, focused on rigor and limitations of data.',
      },
      {
        id: 'research_scientist',
        name: 'Research Scientist',
        style: 'Curious, exploratory, academic',
        approach: 'Connects findings to theories, literature, and future studies',
        tone: 'In-depth, hypothesis-driven, often includes reference-like framing.',
      },
      {
        id: 'news_desk',
        name: 'News Desk Analyst',
        style: 'Fast, digestible, narrative-driven',
        approach: 'Converts data into headlines, stories, and simplified comparisons',
        tone: 'Clear, engaging, avoids jargon, but may sacrifice nuance.',
      },
      {
        id: 'community_advocate',
        name: 'Community Advocate',
        style: 'Empathetic, grassroots-oriented',
        approach: 'Frames data in terms of lived experiences, equity, and local impact',
        tone: 'Inclusive, people-centered, calls for fairness and accessibility.',
      },
      {
        id: 'health_economist',
        name: 'Health Economist',
        style: 'Value-focused, comparative, budget-conscious',
        approach:
          'Links interventions to cost-effectiveness, ROI, and trade-offs',
        tone: 'Rational, structured, with an emphasis on efficiency.',
      },
      {
        id: 'risk_communicator',
        name: 'Risk Communicator',
        style: 'Simplifier, transparent, public-facing',
        approach:
          'Explains uncertainty, risks, and probabilities in ways ordinary people can understand',
        tone: 'Calm, relatable, reassuring but honest.',
      },
      {
        id: 'systems_thinker',
        name: 'Systems Thinker',
        style: 'Holistic, big-picture, interconnected',
        approach:
          'Examines interactions across health, economy, society, and environment',
        tone:
          'Strategic, conceptual, emphasizes complexity and ripple effects.',
      },
    ];

    this.modelParameters = null;
  }

  /** Internal: emit UI updates safely */
  _emit(msg) {
    if (this.onResponse) this.onResponse(String(msg));
  }

  /** Set the system prompt. */
  setSystemPrompt(systemPrompt) {
    if (typeof systemPrompt !== 'string' || !systemPrompt.trim()) return;
    this._systemPrompt = systemPrompt.trim();
  }

  /** Convenience: set system prompt to a predefined character by id. */
  useCharacter(characterId) {
    const c = this.characters.find((ch) => ch.id === characterId);
    if (!c) return false;
    this.setSystemPrompt(
      `You are a ${c.name}; your style is ${c.style}; your approach: ${c.approach}; your tone: ${c.tone}`
    );
    return true;
  }

  /** Initialize the model once (idempotent and concurrency-safe). */
  async init() {
    if (this.promptLanguageModel) return;

    if (!this._initPromise) {
      this._emit(
        `creating promptLanguageModel*\n\ndefault context prompt: _${this._systemPrompt}_`
      );

      this._initPromise = (async () => {
        try {
          // If the API supports AbortSignal for create, wire it here.
          const controller = new AbortController();
          const options = {
            signal: controller.signal,
            // temperature: Math.max(params.defaultTemperature * 1.2, 2.0),
            // topK: params.defaultTopK,
            // model: 'gemini-1.5-flash', // optional: uncomment if explicit model selection is desired
            initialPrompts: [{ role: 'system', content: this._systemPrompt }],
          };

          // LanguageModel is provided by the browser (Chrome built-in AI).
          // eslint-disable-next-line no-undef
          this.promptLanguageModel = await LanguageModel.create(options);
          const params = await LanguageModel.params();
          this.modelParameters = params;
          console.log('params', params);
          this._emit('LanguageModel initialized.\nThinking...');
          // ...existing code...
          // ...existing code...
        } catch (e) {
          console.error('Error loading LanguageModel:', e);
          this._emit('LanguageModel failed: ' + e.message);
          this.promptLanguageModel = null;
          throw e;
        }
      })();
    }

    return this._initPromise;
  }

  /** Destroy and cleanup resources. */
  async destroy() {
    try {
      if (this._streamController) {
        this._streamController.abort();
      }
      if (this.promptLanguageModel?.destroy) {
        await this.promptLanguageModel.destroy();
      }
    } catch (e) {
      console.warn('LanguageModel destroy warning:', e);
    } finally {
      this.promptLanguageModel = null;
      this._initPromise = null;
      this.running = false;
      this._streamController = null;
    }
  }

  /**
   * Single-shot prompt.
   * @param {string} promptInput
   * @param {(summary: string) => void} [callback]
   */
  async prompt(promptInput, callback) {
    if (!this.promptLanguageModel) {
      this._emit('[ ] promptLanguageModel not initialized. Call init() first.');
      throw new Error('promptLanguageModel not initialized. Call init() first.');
    }

    const input = String(promptInput ?? '').trim();
    if (!input) throw new Error('prompt input is empty');

    this.running = true;
    try {
      const result = await this.promptLanguageModel.prompt(input);
      const summary = result?.summary ?? result ?? '';
      if (typeof callback === 'function') callback(summary);
      return summary;
    } catch (error) {
      console.error('LanguageModel (prompt) failed:', error);
      this._emit('promptLanguageModel (prompt) failed: ' + error.message);
      throw error;
    } finally {
      this.running = false;
    }
  }

  /**
   * Streaming prompt.
   * @param {string} promptInput
   * @param {(partial: string) => void} onChunk
   * @param {(finalText: string) => void} [callback]
   */
  async promptStream(promptInput, onChunk, callback) {
    if (!this.promptLanguageModel) {
      this._emit('promptLanguageModel not initialized. Call init() first.');
      throw new Error('promptLanguageModel not initialized. Call init() first.');
    }
    if (typeof onChunk !== 'function') {
      throw new Error('onChunk callback is required for streaming.');
    }

    const input = String(promptInput ?? '').trim();
    if (!input) throw new Error('prompt input is empty');

    this.running = true;
    this._streamController = new AbortController();
    let all = '';

    try {
      // If API supports options with signal for streaming, pass it through. Otherwise, omit.
      const stream = await this.promptLanguageModel.promptStreaming(input /*, { signal: this._streamController.signal }*/);

      for await (const chunk of stream) {
        all += String(chunk ?? '');
        onChunk(all);
        if (this._streamController.signal.aborted) break;
      }

      if (typeof callback === 'function') callback(all);
      return all;
    } catch (error) {
      if (this._streamController?.signal?.aborted) {
        this._emit('Prompt stream aborted.');
        return all;
      }
      console.error('promptStream failed:', error);
      this._emit('promptLanguageModel (promptStream) failed: ' + error.message);
      throw error;
    } finally {
      this.running = false;
      this._streamController = null;
      // Guard: usage counters may not exist depending on API/version
      try {
        const usage = `${this.promptLanguageModel?.inputUsage ?? 0}/${this.promptLanguageModel?.inputQuota ?? 0}`;
        console.log(usage);
      } catch {
        /* no-op */
      }
    }
  }

  /** Stop current streaming (if any). */
  async stop() {
    if (this._streamController && !this._streamController.signal.aborted) {
      this._streamController.abort();
      this.running = false;
      this._emit('Prompt stream stopped.');
    } else {
      console.warn('No active stream to stop.');
    }
  }
}