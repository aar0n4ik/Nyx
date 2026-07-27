import { getLlama, LlamaChatSession } from "node-llama-cpp";
import { config } from "./config.js";

const MAXTOK = 16;

// большой "извлечённый контекст" (имитация RAG + истории чата)
const lines = [];
for (let i = 0; i < 60; i++)
  lines.push(`Note ${i + 1}: routine status update, systems nominal, all metrics within expected range for cycle ${i + 1}, no action required.`);
lines.splice(25, 0, "Note 26: The production database runs on port 5433.");
const contextDoc = lines.join("\n");
const question = "Which port does the production database run on? Answer with just the number.";

// крошечный компрессор контекста по релевантности (чистый JS, без модели)
function compress(text, q, keepRatio = 0.35) {
  const qw = new Set(q.toLowerCase().match(/[a-z0-9]+/g) || []);
  const ls = text.split("\n").map(s => s.trim()).filter(Boolean);
  const scored = ls.map((l, i) => {
    const w = l.toLowerCase().match(/[a-z0-9]+/g) || [];
    let s = 0; for (const x of w) if (qw.has(x)) s++;
    return { l, i, s };
  });
  const keep = Math.max(1, Math.round(ls.length * keepRatio));
  const top = [...scored].sort((a, b) => b.s - a.s || a.i - b.i).slice(0, keep);
  top.sort((a, b) => a.i - b.i);
  return top.map(x => x.l).join("\n");
}

const llama = await getLlama();
const model = await llama.loadModel({ modelPath: config.models.small, gpuLayers: config.gpuLayers });

async function run(label, sysPrompt, flashAttention) {
  const ctx = await model.createContext({ contextSize: config.contextSize, flashAttention });
  const session = new LlamaChatSession({ contextSequence: ctx.getSequence(), systemPrompt: sysPrompt });
  const inTok = model.tokenize(sysPrompt).length;
  const t0 = Date.now();
  const ans = await session.prompt(question, { maxTokens: MAXTOK });
  const sec = (Date.now() - t0) / 1000;
  await ctx.dispose();
  console.log(`[${label}] вход ${inTok} ток | ${sec.toFixed(1)}s | ответ: ${ans.trim().slice(0, 40)}`);
  return { inTok, sec, ans: ans.trim() };
}

console.log("Turbo: ускорение НОВОГО ответа за счёт сжатия входного контекста (та же модель)\n");
const base  = await run("BASELINE (полный контекст)", "You are a helpful assistant. Use these notes:\n" + contextDoc, false);
const turbo = await run("NYX TURBO (сжатый + flash attn)", "You are a helpful assistant. Use these notes:\n" + compress(contextDoc, question), true);

const pct = (a, b) => a <= 0 ? 0 : Math.round((1 - b / a) * 100);
console.log("\n=== РЕЗУЛЬТАТ ===");
console.log(`Входных токенов: ${base.inTok} -> ${turbo.inTok} (-${pct(base.inTok, turbo.inTok)}%)`);
console.log(`Время ответа:    ${base.sec.toFixed(1)}s -> ${turbo.sec.toFixed(1)}s (-${pct(base.sec, turbo.sec)}%)`);
console.log(`Качество:        ${base.ans.includes("5433") && turbo.ans.includes("5433") ? "оба ответа ВЕРНЫЕ (5433) — качество не потеряно" : "проверь: " + base.ans + " / " + turbo.ans}`);

await model.dispose();
