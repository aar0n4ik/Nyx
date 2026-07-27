# Nyx Engine

The core that lets Nyx run capable AI models on ordinary hardware without freezing the machine.

## The problem
Running a local LLM on a weak laptop has two killers: it hogs RAM and freezes the system, and long chats grow the context until memory blows up.

## What the engine does
- **Semantic cache** — repeated or reworded questions return instantly (zero compute), matched by meaning, not exact text.
- **Model routing** — light questions go to a 1B model, hard ones to a 3B (only if RAM allows).
- **Tiered chat memory** — old turns are summarized so RAM stays flat on long chats.
- **RAM auto-unload** — the model is evicted from memory after idle, so it never hogs the machine.

## Benchmark (Llama 3.2 1B Q4, CPU-only, 2-core cloud VM)
| Case | Time / RAM | Note |
|------|-----------|------|
| Fresh answer | 79.9s | 1.0 tok/s on a throttled 2-core CPU |
| Same question, reworded | **0.0s** | served from semantic cache, zero compute |
| RAM with model loaded | 1946 MB | |
| RAM after idle auto-unload | **603 MB** | model evicted automatically |

## Run it
\`\`\`
npm install
npx --no node-llama-cpp pull --dir ./models "<gguf-url>"
npm run baseline   # raw model
npm run bench      # the engine
npm run chat       # talk to it
\`\`\`
