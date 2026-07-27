import { Nyx, rssMB, freeMemMB } from "./nyx.js";

const nyx = new Nyx();
console.log(`Старт | RAM ${rssMB()}MB | свободно ${freeMemMB()}MB\n`);

const script = [
  "Explain what a neural network is in 2 sentences.",
  "Write a haiku about the ocean.",
  "Explain what a neural network is in two sentences.",
  "What is 17 * 23? Answer with just the number.",
];

for (const q of script) {
  const r = await nyx.ask(q);
  const tps = r.tokens && r.seconds ? (r.tokens / r.seconds).toFixed(1) : "0";
  console.log(`Q: ${q}`);
  console.log(`A: ${r.text}`);
  console.log(`[${r.from}] ${r.seconds.toFixed(1)}s | ${r.tokens} tok | ${tps} tok/s | RAM ${rssMB()}MB\n`);
}
console.log(`Итог: сгенерировано ${nyx.stats.generated}, из кэша ${nyx.stats.cacheHits}`);
await nyx.unload();
