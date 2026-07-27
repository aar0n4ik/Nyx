import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Nyx, rssMB } from "./nyx.js";

const nyx = new Nyx();
const rl = readline.createInterface({ input, output });
console.log("Nyx готов. Пиши вопрос (или 'exit').");
while (true) {
  const q = await rl.question("\nТы: ");
  if (q.trim().toLowerCase() === "exit") break;
  const r = await nyx.ask(q);
  console.log(`Nyx (${r.from}): ${r.text}`);
  console.log(`[${r.seconds.toFixed(1)}s | ${r.tokens} tok | RAM ${rssMB()}MB]`);
}
await nyx.unload(); rl.close();
