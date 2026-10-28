const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "";
const MAX_IMAGE_BYTES = 1800 * 1024;

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Gunakan metode POST." });
  }
  if (ALLOWED_ORIGIN && req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) {
    return res.status(403).json({ error: "Origin tidak diizinkan." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "GEMINI_API_KEY belum dipasang di Environment Variables Vercel." });

  try {
    const image = typeof req.body?.image === "string" ? req.body.image : "";
    const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) return res.status(400).json({ error: "Foto harus berupa JPEG, PNG, atau WebP yang valid." });
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: "Foto hasil kompresi harus berukuran maksimal 1,8 MB." });
    }

    const systemInstruction = `
Kamu adalah pemeriksa foto makanan untuk aplikasi kebiasaan sehat. Analisis hanya hal yang tampak jelas pada gambar.
Jika foto buram, terlalu gelap, terlalu jauh, tertutup, bukan makanan, atau detailnya tidak cukup untuk mengenali makanan, jangan menebak. Kembalikan needsRetake=true dengan instruksi foto ulang yang singkat dan ramah.
Jika gambar cukup jelas, identifikasi makanan yang terlihat dan berikan ukuran porsi visual secara kasar (misalnya 1 potong sedang atau sekitar 1 mangkuk kecil). Jangan mengarang bahan tersembunyi, gram presisi, kalori, atau nilai nutrisi. Jika porsi/bahan tidak pasti, katakan demikian pada notes.
Balas HANYA JSON valid: {"needsRetake":false,"message":"string singkat","items":[{"name":"nama makanan","portion":"perkiraan visual","notes":"ketidakpastian atau kosong"}]}. Maksimal 8 item. Untuk foto yang perlu diulang, items harus array kosong.
`.trim();
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [
          { text: "Periksa apakah foto cukup jelas untuk mengenali makanan. Jika tidak, minta pengguna mengambil ulang. Jangan membuat klaim nutrisi." },
          { inlineData: { mimeType: match[1], data: match[2] } }
        ] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 700, responseMimeType: "application/json" }
      }),
      signal: AbortSignal.timeout(25000)
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Gemini food scan error", upstream.status, result.error?.status || "");
      if (upstream.status === 429) return res.status(429).json({ error: "Kuota AI sedang habis. Tunggu sebentar lalu coba lagi." });
      if (upstream.status === 400 || upstream.status === 404) return res.status(502).json({ error: "Model Gemini tidak tersedia atau belum mendukung foto. Periksa GEMINI_MODEL." });
      return res.status(502).json({ error: "Layanan analisis foto sedang bermasalah. Coba lagi nanti." });
    }

    const text = (result.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
    let parsed;
    try { parsed = JSON.parse(text); } catch (_) {
      return res.status(502).json({ error: "Respons AI tidak dapat dibaca. Coba analisis foto lagi." });
    }
    const needsRetake = Boolean(parsed.needsRetake);
    const items = needsRetake || !Array.isArray(parsed.items) ? [] : parsed.items.slice(0, 8).map(item => ({
      name: String(item?.name || "Makanan").slice(0, 100),
      portion: String(item?.portion || "Tidak dapat dipastikan dari foto").slice(0, 120),
      notes: String(item?.notes || "").slice(0, 180)
    }));
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      needsRetake: needsRetake || items.length === 0,
      message: String(parsed.message || "").slice(0, 240),
      items
    });
  } catch (error) {
    console.error("Food scan handler error", error.name || "Error");
    return res.status(504).json({ error: "Analisis foto terlalu lama. Coba lagi dengan foto yang lebih kecil." });
  }
};
