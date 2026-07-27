import os from "node:os";
import fs from "node:fs";
import { getLlama, LlamaChatSession } from "node-llama-cpp";
import { config } from "./config.js";
import { SemanticCache } from "./engine/cache.js";

const mb = (b) => Math.round(b / 1024 / 1024);
export const rssMB = () => mb(process.memoryUsage().rss);
export const freeMemMB = () => mb(os.freemem());

export class Nyx {
  constructor() {
    this.llama = null; this.model = null; this.context = null; this.session = null;
    this.currentKind = null; this.history = [];
    this.cache = new SemanticCache(config.cacheThreshold);
    this.idleTimer = null; this.busy = false;
    this.stats = { cacheHits: 0, generated: 0 };
  }

  pickModel(prompt) {
    const hasBig = fs.existsSync(config.models.big);
    const words = prompt.trim().split(/\s+/).length;
    const hard = /(explain|why|design|architect|prove|analyze|code|debug|algorithm)/i.test(prompt);
    if (hasBig && (words > 40 || hard) && freeMemMB() > config.minFreeMemMB + 1800) return "big";
    return "small";
  }

  async ensureModel(kind) {
    if (this.currentKind === kind && this.session) return;
    await this._dispose();
    if (!this.llama) this.llama = await getLlama();
    this.model = await this.llama.loadModel({ modelPath: config.models[kind], gpuLayers: config.gpuLayers });
    this.currentKind = kind;
    await this.newSession();
    console.log(`[nyx] загрузил модель: ${kind} | RAM ${rssMB()}MB`);
  }

  async newSession(seedSummary) {
    if (this.context) await this.context.dispose();
    this.context = await this.model.createContext({ contextSize: config.contextSize });
    const systemPrompt = seedSummary
      ? `You are Nyx, a local assistant. Remember these facts from earlier:\n${seedSummary}`
      : "You are Nyx, a helpful local assistant.";
    this.session = new LlamaChatSession({ contextSequence: this.context.getSequence(), systemPrompt });
  }

  async ask(prompt) {
    this.busy = true;
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    try {
      const cached = await this.cache.find(prompt);
      if (cached) { this.stats.cacheHits++; return { text: cached, from: "cache", tokens: 0, seconds: 0 }; }
      const kind = this.pickModel(prompt);
      await this.ensureModel(kind);
      const start = Date.now();
      const text = await this.session.prompt(prompt, { maxTokens: config.maxTokens });
      const seconds = (Date.now() - start) / 1000;
      const tokens = this.model.tokenize(text).length;
      this.stats.generated++;
      await this.cache.add(prompt, text);
      this.history.push({ q: prompt, a: text });
      await this.manageMemory();
      return { text, from: kind, tokens, seconds };
    } finally {
      this.busy = false;
      this.touchIdle();
    }
  }

  async manageMemory() {
    if (this.history.length <= config.recentTurns) return;
    const old = this.history.slice(0, this.history.length - config.recentTurns);
    const recent = this.history.slice(-config.recentTurns);
    const summaryPrompt = "Summarize the key facts from this conversation in 3 short bullets:\n" +
      old.map(t => `Q: ${t.q}\nA: ${t.a}`).join("\n");
    await this.ensureModel("small");
    const summary = await this.session.prompt(summaryPrompt, { maxTokens: 150 });
    this.history = [{ q: "[summary]", a: summary }, ...recent];
    await this.newSession(summary);
    console.log(`[nyx] свернул ${old.length} старых реплик в саммари | RAM ${rssMB()}MB`);
  }

  touchIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => { if (!this.busy) this._dispose(); }, config.idleUnloadMs);
    if (this.idleTimer.unref) this.idleTimer.unref();
  }

  async unload() { if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; } await this._dispose(); }

  async _dispose() {
    if (this.busy) return;
    if (this.context) { await this.context.dispose(); this.context = null; }
    if (this.model)   { await this.model.dispose();   this.model = null; }
    this.session = null;
    const was = this.currentKind; this.currentKind = null;
    if (was) console.log(`[nyx] выгрузил ${was} из RAM | RAM ${rssMB()}MB`);
  }
}
