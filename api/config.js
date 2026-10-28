module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Gunakan metode GET." });
  }
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !publicKey) return res.status(503).json({ error: "Layanan akun belum tersedia." });
  return res.status(200).json({ url, publicKey });
};
