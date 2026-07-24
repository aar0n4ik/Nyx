// Чистая serverless-функция: тикеры с Bitfinex. Без файловой системы, без нативных модулей.
export default async function handler(req, res) {
  try {
    const r = await fetch(
      "https://api-pub.bitfinex.com/v2/tickers?symbols=tBTCUSD,tETHUSD,tSOLUSD",
      { headers: { accept: "application/json" } }
    );
    if (!r.ok) throw new Error("upstream " + r.status);
    const raw = await r.json();
    const out = raw.map((t) => ({
      symbol: String(t[0]).replace(/^t/, "").replace("USD", "/USD"),
      last: t[7],
      changePct: +(t[6] * 100).toFixed(2),
      high: t[9],
      low: t[10],
    }));
    res.setHeader("cache-control", "s-maxage=15, stale-while-revalidate=30");
    res.status(200).json({ ok: true, ts: Date.now(), tickers: out });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e && e.message || e) });
  }
}
