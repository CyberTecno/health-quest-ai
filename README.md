# Health Quest AI Partner

Website HTML/CSS/JS dengan backend Vercel Functions untuk chat Gemini dan generator program 30 hari.

**Mulai cepat:** baca [`PANDUAN_DEPLOY_VERCEL_ID.md`](./PANDUAN_DEPLOY_VERCEL_ID.md) untuk preview lokal, upload GitHub, deployment Vercel, environment variables, dan troubleshooting.

## File utama
- `index.html`: frontend; sudah dioptimalkan agar lebih ringan.
- `api/chat.js`: endpoint `POST /api/chat`.
- `api/plan.js`: endpoint `POST /api/plan` untuk program 30 hari.
- `vercel.json`: konfigurasi Vercel Functions.
- `supabase-schema.sql`: skema awal Supabase, belum dihubungkan ke frontend.
- `.env.example`: contoh variabel tanpa secret.

Jangan pernah menaruh `GEMINI_API_KEY` di HTML atau repository. Masukkan melalui **Vercel → Settings → Environment Variables**, lalu redeploy.

Membuka `index.html` langsung dapat dipakai untuk preview tampilan, tetapi API AI hanya aktif ketika website dijalankan melalui Vercel atau server lokal yang sesuai. Progres dan riwayat saat ini tersimpan di browser, belum disinkronkan lintas akun.
