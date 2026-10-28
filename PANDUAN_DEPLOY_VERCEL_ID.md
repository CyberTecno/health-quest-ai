# Panduan Deploy Health Quest AI ke Vercel

## Isi paket
- `index.html`: website utama. Ukuran sudah dioptimalkan agar lebih ringan dan bisa dibuka langsung untuk preview.
- `api/chat.js`: endpoint chat Partner AI.
- `api/plan.js`: endpoint untuk membuat program makanan dan olahraga 30 hari.
- `api/food-scan.js`: endpoint analisis foto makanan. Foto dikompres ringan di browser sebelum dikirim ke Gemini Flash; aplikasi tidak menyimpan gambar.
- Login username/password dan sinkronisasi program/progres menggunakan Supabase Auth dan tabel `hq_user_data`.
- `vercel.json`: konfigurasi durasi fungsi API.
- `supabase-schema.sql`: skema awal database; belum dihubungkan ke aplikasi.
- `.env.example`: contoh nama environment variable. Tidak berisi API key asli.

## A. Preview HTML tanpa backend
1. Ekstrak ZIP.
2. Buka folder `health-quest-vercel`.
3. Klik dua kali `index.html`.
4. Tampilan, menu, checklist, dan penyimpanan browser dapat dipreview. Chat AI dan generator program membutuhkan endpoint API sehingga tidak aktif ketika dibuka lewat `file://`.

## B. Siapkan API key Gemini
1. Buka Google AI Studio: https://aistudio.google.com/
2. Masuk dan buat API key.
3. Jangan tempelkan key ke `index.html`, GitHub, atau chat publik. Simpan hanya di Environment Variables Vercel.
4. Ketersediaan model dan kuota mengikuti akun Google AI Studio; penggunaan API dapat memiliki batas atau biaya sesuai ketentuan akun.

## C. Upload ke GitHub (cara lewat browser)
1. Login atau buat akun di https://github.com/.
2. Buat repository baru, misalnya `health-quest-ai`. Pilih Private jika ingin source tidak publik.
3. Ekstrak ZIP di komputer.
4. Buka repository tersebut, pilih **Add file → Upload files**.
5. Unggah ISI folder `health-quest-vercel`, bukan file ZIP-nya dan bukan folder bersarang. Pastikan `index.html`, `package.json`, `vercel.json`, folder `api`, dan file lain tampak di root repository.
6. Klik **Commit changes**.

## D. Deploy di Vercel
1. Buka https://vercel.com/ lalu login.
2. Pilih **Add New → Project**.
3. Import repository `health-quest-ai` dari GitHub. Berikan izin GitHub jika diminta.
4. Pada konfigurasi proyek, biarkan Root Directory sebagai `./` jika `index.html`, `api/`, dan `vercel.json` ada di root repository.
5. Framework Preset: pilih **Other** jika Vercel meminta pilihan. Build command dan output directory tidak diperlukan untuk HTML statis dan fungsi API ini.
6. Klik **Deploy** dan tunggu hingga deployment selesai.

## E. Pasang environment variables
Di proyek Vercel, buka **Settings → Environment Variables**, lalu tambahkan:

- `GEMINI_API_KEY` = API key yang dibuat di Google AI Studio.
- `GEMINI_MODEL` = `gemini-2.5-flash` (jika model ini tidak tersedia untuk akun, gunakan nama model yang tersedia di AI Studio dan kompatibel dengan API).

Opsional:
- `ALLOWED_ORIGIN` = URL produksi situs, misalnya `https://nama-proyek.vercel.app`. Masukkan URL origin saja, tanpa path atau garis miring di akhir. Biarkan kosong jika tidak diperlukan.

Pilih environment **Production** dan, bila perlu, **Preview**. Setelah menyimpan variables, buka **Deployments** dan lakukan **Redeploy** agar konfigurasi baru dipakai.

## F. Hubungkan Supabase dan batasi akun uji coba
1. Di Supabase, buka **SQL Editor**, lalu jalankan seluruh isi `supabase-schema.sql`. Skema ini membuat profil username, penyimpanan per akun dengan RLS, dan trigger yang menolak pendaftaran akun keempat.
2. Buka **Project Settings → API** dan salin **Project URL**, **publishable key** (atau legacy anon key), dan **secret key** (atau legacy service_role key).
3. Di Vercel → **Settings → Environment Variables**, isi `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, dan `SUPABASE_SECRET_KEY`. Untuk key lama, gunakan `SUPABASE_ANON_KEY` dan `SUPABASE_SERVICE_ROLE_KEY`. Secret/service_role key hanya untuk backend.
4. Setelah menambahkan variabel, redeploy. Endpoint `/api/config` mengirim hanya Project URL dan public key ke browser; secret key tetap di server.
5. Di **Authentication → Providers**, aktifkan Email karena Supabase Auth memakai email internal buatan untuk mengelola akun username. Pengguna tetap masuk dengan username dan password; email internal tidak dipakai untuk komunikasi.
6. Buat akun hingga maksimal tiga pengguna. Batas tersebut dihitung untuk semua akun dalam project Supabase dan ditegakkan di database, bukan hanya di tampilan.
7. Akun username tidak memiliki pemulihan password otomatis lewat email; simpan password dengan aman.

## G. Tes setelah deploy
1. Buka URL produksi yang diberikan Vercel.
2. Pastikan halaman utama muncul.
3. Buka panel Partner AI dan kirim pesan singkat, misalnya: `Bantu saya membuat target sehat hari ini.`
4. Buka fitur penyesuaian program, isi data contoh yang wajar, lalu klik **Generate & Ganti Program**.
5. Pastikan program 30 hari tampil dan kalender menu/latihan berubah.
6. Di tab **Menu 30 Hari**, ambil atau pilih foto makanan lalu tekan **Analisis foto**. Periksa hasil perkiraan; foto yang tidak jelas seharusnya meminta foto ulang.
7. Jika gagal, buka Vercel → Project → **Functions/Logs**. Periksa apakah error menyebut API key belum dipasang, kuota habis, atau model tidak tersedia.

## Troubleshooting
- **Halaman putih atau tidak tampil:** pastikan `index.html` berada di root repository, bukan di folder tambahan. Lakukan hard refresh (Ctrl+F5).
- **Chat atau generator tidak merespons:** pastikan URL situs berasal dari Vercel, bukan `file://`; periksa environment variables dan lakukan redeploy.
- **Tombol login tidak aktif:** buka URL deployment Vercel, bukan file `index.html` langsung. Pastikan `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, dan `SUPABASE_SECRET_KEY` tersedia di Vercel lalu redeploy.
- **GEMINI_API_KEY belum dipasang:** tambahkan variable dengan ejaan yang persis sama.
- **Model tidak valid / 404:** ubah `GEMINI_MODEL` ke model yang tersedia pada akun dan dukungan API, lalu redeploy.
- **Kuota habis / 429:** cek kuota dan batas penggunaan pada akun AI Studio.
- **Error saat upload:** pastikan isi folder proyek diunggah ke root repository dan tidak ada file `.env.local` atau secret.

## Batasan saat ini
- Chat dan generator memanggil Gemini melalui backend Vercel.
- AI Food Scanner memakai model Gemini yang sama (default `gemini-2.5-flash`). Foto dikompres di browser, dibatasi maksimal 20 MB sebelum kompresi dan 1,8 MB sesudah kompresi, lalu diproses sementara oleh endpoint; aplikasi tidak menyimpan foto maupun riwayat hasil scan.
- Login, progres, chat, dan program personal tersinkron melalui Supabase setelah URL/key diisi dan SQL dijalankan. Browser tetap menyimpan salinan lokal per akun.
- Login username memakai alamat internal `.invalid`; tidak ada email yang diminta. Password yang terlupa harus diatur ulang oleh pengelola melalui Supabase.
- Level naik berdasarkan hari aktif dan quest yang diklaim; beberapa badge tersembunyi diberikan saat syarat tertentu tercapai.
- Program AI adalah panduan umum, bukan diagnosis atau resep medis. Pengguna harus menyesuaikan menu dan latihan dengan kebutuhan serta kondisi masing-masing.
