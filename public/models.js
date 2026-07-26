(function () {
  var root = (typeof window !== "undefined") ? window : this;
  root.NYX_MODELS = {
    version: "2026.07",
    engine: "QVAC on-device",
    note: "Everything runs locally. Models download inside the app.",
    boost: "TurboQuant",
    storage: "Stored on your PC. You pick the folder when you download.",
    models: [
      { tier: "Lite", label: "Llama 3.2 1B", params: "1B", size: "0.81 GB", ram: "3 GB+ RAM", runs: "Runs on almost anything", feel: "Fast and light, basic reasoning", best: "Quick answers on low-end PCs", forWho: "Old or light laptops", recommended: false, badge: "" },
      { tier: "Standard", label: "Llama 3.2 3B", params: "3B", size: "2.02 GB", ram: "6 GB+ RAM", runs: "Runs on most laptops", feel: "Balanced speed and quality", best: "Everyday assistant", forWho: "Typical laptops", recommended: false, badge: "" },
      { tier: "Balanced", label: "Qwen3 4B", params: "4B", size: "2.50 GB", ram: "8 GB+ RAM", runs: "Runs great on modern PCs", feel: "Strong reasoning, strong Russian", best: "Best all-round pick", forWho: "Most people", recommended: true, badge: "Most people pick this" },
      { tier: "Pro", label: "Qwen3 8B", params: "8B", size: "5.03 GB", ram: "16 GB+ RAM", runs: "Needs a powerful PC", feel: "Deepest reasoning, best quality", best: "Complex tasks and power users", forWho: "Strong desktops with lots of RAM", recommended: false, badge: "For power PCs" }
    ]
  };
})();
