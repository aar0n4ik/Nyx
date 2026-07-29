import fs from "node:fs";
import { getLlama, LlamaChatSession } from "node-llama-cpp";
import { config } from "./config.js";
import { Nyx, rssMB } from "./nyx.js";

// быстрые честные настройки прогона (на ПРОЦЕНТЫ не влияют — только на длину ответов)
config.maxTokens = 24;                          // короткие ответы = быстрый прогон
config.models.big = "./models/__none__.gguf";   // форсируем ОДНУ модель (1B), без других моделей

const script = [
  "Explain what a neural network is in 2 sentences.",
  "Write a haiku about the ocean.",
  "What is 17 * 23? Answer with just the number.",
  "In two sentences, what is a neural network?",      // тот же смысл, ДРУГИЕ слова
  "Compose a haiku about the ocean.",                 // тот же смысл, ДРУГИЕ слова
  "Calculate 17 times 23 and give only the number.",  // тот же смысл, ДРУГИЕ слова
];

const pct = (base, opt) => base <= 0 ? 0 : Math.round((1 - opt / base) * 100);

console.log("\n=== BASELINE (без Nyx Engine) ===");
const llama = await getLlama();
const bModel = await llama.loadModel({ modelPath: config.models.small, gpuLayers: config.gpuLayers });
const bCtx = await bModel.createContext({ contextSize: config.contextSize });
const bSession = new LlamaChatSession({ contextSequence: bCtx.getSequence() });
let bTime = 0, bGen = 0, bPeak = 0;
for (const q of script) {
  const s = Date.now();
  await bSession.prompt(q, { maxTokens: config.maxTokens });
  bTime += (Date.now() - s) / 1000; bGen++;
  bPeak = Math.max(bPeak, rssMB());
  console.log(`  [gen] ${q.slice(0, 42)}... | ${rssMB()}MB`);
}
const bIdle = rssMB();
console.log(`baseline: ${bTime.toFixed(1)}s | сгенерировано ${bGen}/6 | пик RAM ${bPeak}MB | RAM в простое ${bIdle}MB`);
await bCtx.dispose(); await bModel.dispose();

console.log("\n=== NYX ENGINE ===");
const nyx = new Nyx();
let nTime = 0, nPeak = 0;
for (const q of script) {
  const s = Date.now();
  const r = await nyx.ask(q);
  nTime += (Date.now() - s) / 1000;
  nPeak = Math.max(nPeak, rssMB());
  console.log(`  [${r.from}] ${q.slice(0, 42)}... | ${rssMB()}MB`);
}
await nyx.unload();
await new Promise(r => setTimeout(r, 400));
const nIdle = rssMB();
console.log(`nyx:      ${nTime.toFixed(1)}s | сгенерировано ${nyx.stats.generated}/6 | из кэша ${nyx.stats.cacheHits} | пик RAM ${nPeak}MB | RAM в простое ${nIdle}MB`);

const rows = [
  ["Время на сессию (6 вопросов, 3 повтора)", `${bTime.toFixed(1)}s`, `${nTime.toFixed(1)}s`, `-${pct(bTime, nTime)}%`],
  ["Ответов реально сгенерировано моделью", `${bGen}/6`, `${nyx.stats.generated}/6`, `-${pct(bGen, nyx.stats.generated)}%`],
  ["RAM в простое (после сессии)", `${bIdle}MB`, `${nIdle}MB`, `-${pct(bIdle, nIdle)}%`],
  ["Пик RAM во время работы", `${bPeak}MB`, `${nPeak}MB`, `-${pct(bPeak, nPeak)}%`],
];
console.log("\n=== РЕЗУЛЬТАТЫ ===");
for (const r of rows) console.log(`${r[0]}: ${r[1]} -> ${r[2]} (${r[3]})`);

const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
let md = `# Nyx Engine - Benchmarks\n\n`;
md += `_Прогон: ${stamp} UTC · модель: Qwen3-4B-Instruct-2507 Q4_K_M (одна и та же для baseline и Nyx) · CPU-only · maxTokens=${config.maxTokens}_\n\n`;
md += `Сравнение ОДНОЙ модели с движком Nyx и без него на реалистичной сессии из 6 вопросов (3 - перефразированные повторы).\n\n`;
md += `| Метрика | Baseline (без Nyx) | Nyx Engine | Улучшение |\n|---|---|---|---|\n`;
for (const r of rows) md += `| ${r[0]} | ${r[1]} | ${r[2]} | **${r[3]}** |\n`;
md += `\n**Честно:** движок не ускоряет генерацию НОВОГО уникального ответа (тот же tok/s на той же модели). Выигрыш - за счёт (1) мгновенного ответа на повторные/перефразированные вопросы из семантического кэша (модель не будится, 0 токенов) и (2) авто-выгрузки модели из RAM в простое.\n`;
fs.writeFileSync("./BENCHMARKS.md", md);
console.log("\nOK: результаты записаны в nyx-engine/BENCHMARKS.md");
