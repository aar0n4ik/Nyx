import { pipeline } from "@xenova/transformers";

export class SemanticCache {
  constructor(threshold = 0.85) {
    this.threshold = threshold;
    this.embedder = null;
    this.entries = [];
  }
  async ready() {
    if (!this.embedder)
      this.embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  async embed(text) {
    await this.ready();
    const out = await this.embedder(text, { pooling: "mean", normalize: true });
    return Array.from(out.data);
  }
  cosine(a, b) { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] * b[i]; return d; }
  async find(prompt) {
    if (!this.entries.length) return null;
    const v = await this.embed(prompt);
    let best = null, score = -1;
    for (const e of this.entries) { const s = this.cosine(v, e.vector); if (s > score) { score = s; best = e; } }
    return score >= this.threshold ? best.answer : null;
  }
  async add(prompt, answer) { this.entries.push({ vector: await this.embed(prompt), prompt, answer }); }
}
