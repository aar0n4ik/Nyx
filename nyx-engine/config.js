export const config = {
  models: {
    small: "./models/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    big:   "./models/Llama-3.2-3B-Instruct-Q4_K_M.gguf",
  },
  gpuLayers: 0,
  contextSize: 4096,
  maxTokens: 300,
  idleUnloadMs: 60000,
  minFreeMemMB: 700,
  recentTurns: 6,
  cacheThreshold: 0.85
};
