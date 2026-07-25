/* Nyx model catalog — single source of truth for the marketing site.
   MUST mirror the backend installer (src/setup/installer.js). Download and
   model management happen ONLY inside the app; the site just shows the truth. */
(function () {
  var root = typeof window !== "undefined" ? window : this;
  root.NYX_MODELS = {
    version: "2026.07",
    engine: "QVAC Fabric LLM (@qvac/sdk, TurboQuant, GGUF)",
    note: "Models are downloaded and managed inside the app.",
    boost: { name: "Nyx Boost", kind: "P2P", note: "Optional peer acceleration for weaker PCs." },
    storage: { app: "~120 MB", perModel: "0.9–2.6 GB per model" },
    models: [
      {
        key: "llama32-1b", tier: "Lite", label: "Llama 3.2 1B Instruct",
        params: "1B", size: "~0.9 GB", ram: "3 GB+ RAM", runs: "CPU only",
        feel: "Instant, snappy", best: "Quick tasks, files, everyday commands",
        forWho: "Older laptops & office PCs with no graphics card.",
        recommended: false
      },
      {
        key: "llama32-3b", tier: "Standard", label: "Llama 3.2 3B Instruct",
        params: "3B", size: "~2.0 GB", ram: "6 GB+ RAM", runs: "CPU",
        feel: "Fast & light", best: "Everyday chat, writing, simple tasks",
        forWho: "Most laptops without a dedicated GPU.",
        recommended: false
      },
      {
        key: "qwen3-4b", tier: "Balanced", label: "Qwen3 4B Instruct",
        params: "4B", size: "~2.6 GB", ram: "8 GB+ RAM", runs: "CPU or entry GPU",
        feel: "Noticeably smarter · strong Russian", best: "Daily driving, writing, light coding",
        forWho: "The sweet spot for most modern PCs.",
        recommended: true, badge: "Most people pick this"
      }
    ]
  };
})();
