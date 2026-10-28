# Health Quest AI Partner

Website HTML/CSS/JS dengan backend Vercel Functions untuk chat Gemini dan generator program 30 hari.

**Mulai cepat:** baca [`PANDUAN_DEPLOY_VERCEL_ID.md`](./PANDUAN_DEPLOY_VERCEL_ID.md) untuk preview lokal, upload GitHub, deployment Vercel, environment variables, dan troubleshooting.

## File utama
- `index.html`: frontend; sudah dioptimalkan agar lebih ringan.
- `api/chat.js`: endpoint `POST /api/chat`.
- `api/plan.js`: endpoint `POST /api/plan` untuk program 30 hari.
- `api/food-scan.js`: endpoint `POST /api/food-scan` untuk analisis foto makanan dengan Gemini Flash. Foto dikompres di browser dan tidak disimpan oleh aplikasi.
- `api/auth.js`: login dan pembuatan akun berbasis username; secret Supabase hanya dibaca di backend Vercel.
- `api/config.js`: memberikan URL dan public key Supabase ke frontend; tidak pernah mengirim secret key.
- `vercel.json`: konfigurasi Vercel Functions.
- `supabase-schema.sql`: tabel sinkronisasi per akun, RLS, dan batas pendaftaran maksimum tiga akun.
- `.env.example`: contoh variabel tanpa secret.

Jangan pernah menaruh `GEMINI_API_KEY` di HTML atau repository. Masukkan melalui **Vercel → Settings → Environment Variables**, lalu redeploy.

Login username/password dan sinkronisasi akun memerlukan URL, public/publishable key, dan secret key di Vercel serta skema SQL yang sudah dijalankan. Akun tidak menggunakan email untuk login; pengguna tanpa email tidak memiliki pemulihan password otomatis. Login hanya bekerja melalui Vercel atau `vercel dev`, bukan saat membuka HTML dengan `file://`.
