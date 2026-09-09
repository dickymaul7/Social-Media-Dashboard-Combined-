# Team Development Sandbox

Branch sandbox utama: `sandbox/team-development`

## Tujuan
Branch ini adalah salinan kode dari `main` untuk onboarding dan eksperimen tim. Jangan gunakan branch ini sebagai production branch.

## Aturan kerja
1. Jangan develop langsung di `main`.
2. Mulai pekerjaan dari `sandbox/team-development` lalu buat branch fitur baru, misalnya `feature/nama-fitur`.
3. Jangan menambahkan secret, API key, service-role key, atau credential ke source code maupun commit.
4. Jangan mengubah konfigurasi production, domain production, atau environment variable production tanpa persetujuan owner.
5. Perubahan schema/database harus diperlakukan sebagai migration terpisah dan direview sebelum dijalankan.
6. Sebelum PR, jalankan build dan pastikan tidak ada error.

## Workflow yang disarankan

```bash
git checkout sandbox/team-development
git pull origin sandbox/team-development
git checkout -b feature/nama-fitur
```

Setelah perubahan selesai:

```bash
npm install
npm run build
git add .
git commit -m "feat: nama fitur"
git push origin feature/nama-fitur
```

Gunakan Vercel Preview untuk pengecekan visual dan fungsional sebelum perubahan dipromosikan ke production.

## Untuk ChatGPT
Saat meminta ChatGPT menambah fitur, gunakan instruksi seperti:

> Kerjakan perubahan pada repository Social-Media-Dashboard-Combined-. Gunakan branch baru yang dibuat dari sandbox/team-development. Jangan push langsung ke main. Pertahankan arsitektur, routing, data flow, permissions, dan design system yang sudah ada. Jangan menaruh secret di source code. Jalankan build sebelum membuat Pull Request.

## Production
Production tetap menggunakan branch `main`. Perubahan dari sandbox hanya boleh dipindahkan ke production setelah lolos review dan build/check yang diwajibkan.
