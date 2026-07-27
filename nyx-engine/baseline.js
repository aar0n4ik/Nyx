import os from "node:os";
import { getLlama, LlamaChatSession } from "node-llama-cpp";
import { config } from "./config.js";

const mb  = (b) => Math.round(b / 1024 / 1024);
const rss = () => mb(process.memoryUsage().rss);
const free = () => mb(os.freemem());

console.log(`RAM до загрузки: процесс ${rss()}MB | свободно ${free()}MB`);

const llama = await getLlama();
const model = await llama.loadModel({ modelPath: config.models.small, gpuLayers: config.gpuLayers });
const context = await model.createContext({ contextSize: config.contextSize });
const session = new LlamaChatSession({ contextSequence: context.getSequence() });

console.log(`RAM после загрузки модели: процесс ${rss()}MB | свободно ${free()}MB\n`);

const questions = [
  "Explain what a neural network is in 2 sentences.",
  "Write a haiku about the ocean.",
  "What is 17 * 23? Answer with just the number.",
];

for (const q of questions) {
  const start = Date.now();
  const answer = await session.prompt(q, { maxTokens: config.maxTokens });
  const sec = (Date.now() - start) / 1000;
  const tok = model.tokenize(answer).length;
  console.log(`Q: ${q}`);
  console.log(`A: ${answer}`);
  console.log(`⏱ ${sec.toFixed(1)}s | ${tok} токенов | ${(tok / sec).toFixed(1)} tok/s | RAM ${rss()}MB\n`);
}
