const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "";

function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return send(res, 405, { error: "Gunakan metode POST." });
  }
  if (ALLOWED_ORIGIN && req.headers.origin && req.headers.origin !== ALLOWED_ORIGIN) {
    return send(res, 403, { error: "Origin tidak diizinkan." });
  }

  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !anonKey || !serviceKey) {
    return send(res, 503, { error: "Layanan akun belum dikonfigurasi." });
  }

  const action = req.body?.action === "signup" ? "signup" : "login";
  const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return send(res, 400, { error: "Username harus 3–24 karakter: huruf, angka, atau garis bawah." });
  }
  if (password.length < 8 || password.length > 128) {
    return send(res, 400, { error: "Password harus 8–128 karakter." });
  }

  const email = `${username}@users.healthquest.invalid`;
  const serviceHeaders = {
    apikey: serviceKey,
    "Content-Type": "application/json"
  };
  if (!serviceKey.startsWith("sb_secret_")) serviceHeaders.Authorization = `Bearer ${serviceKey}`;

  try {
    if (action === "signup") {
      const createdResponse = await fetch(`${url}/auth/v1/admin/users`, {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username } }),
        signal: AbortSignal.timeout(12000)
      });
      const created = await createdResponse.json().catch(() => ({}));
      if (!createdResponse.ok) {
        const detail = String(created.msg || created.message || created.error_description || created.error || "");
        if (/HEALTH_QUEST_USER_LIMIT|user.limit|too many users/i.test(detail)) {
          return send(res, 409, { error: "Batas tiga akun uji coba sudah tercapai." });
        }
        if (/already|duplicate|exists/i.test(detail)) {
          return send(res, 409, { error: "Username sudah digunakan." });
        }
        console.error("Supabase account creation error", createdResponse.status);
        return send(res, 502, { error: "Akun belum dapat dibuat. Periksa konfigurasi Supabase." });
      }
      const user = created.user || created;
      const profileResponse = await fetch(`${url}/rest/v1/hq_profiles`, {
        method: "POST",
        headers: { ...serviceHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ user_id: user.id, username, display_name: username }),
        signal: AbortSignal.timeout(10000)
      });
      if (!profileResponse.ok) {
        await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
          method: "DELETE", headers: serviceHeaders, signal: AbortSignal.timeout(10000)
        }).catch(() => {});
        const profileError = await profileResponse.json().catch(() => ({}));
        if (/duplicate|unique/i.test(String(profileError.message || profileError.details || ""))) {
          return send(res, 409, { error: "Username sudah digunakan." });
        }
        console.error("Supabase username profile error", profileResponse.status);
        return send(res, 502, { error: "Profil akun gagal disiapkan." });
      }
    }

    const tokenResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(12000)
    });
    const session = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) {
      if (action === "signup") console.error("Supabase first sign-in error", tokenResponse.status);
      return send(res, action === "login" ? 401 : 502, {
        error: action === "login" ? "Username atau password belum cocok." : "Akun dibuat, tetapi login gagal. Coba masuk kembali."
      });
    }
    return send(res, 200, {
      session: { access_token: session.access_token, refresh_token: session.refresh_token },
      user: { id: session.user?.id, username }
    });
  } catch (error) {
    console.error("Auth handler error", error.name || "Error");
    return send(res, 504, { error: "Layanan akun terlalu lama merespons. Coba lagi." });
  }
};
