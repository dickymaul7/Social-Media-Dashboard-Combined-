# Contributing to Social Media Dashboard Combined

## Main branch policy

`main` adalah production branch.

**Dilarang melakukan development atau direct push ke `main`.**

Semua fitur, bugfix, refactor, eksperimen, dan perubahan konfigurasi wajib dikerjakan melalui branch terpisah dan Pull Request.

## Required workflow

1. Sinkronkan branch lokal dari `main` terbaru.
2. Buat branch baru dari `main`.
3. Gunakan pola nama branch yang jelas:
   - `feature/nama-fitur`
   - `fix/nama-bug`
   - `chore/nama-pekerjaan`
4. Kerjakan perubahan hanya di branch tersebut.
5. Jalankan build/check yang relevan sebelum membuka PR.
6. Buka Pull Request ke `main`.
7. Pastikan CI/build lulus.
8. Minta minimal 1 review/approval sebelum merge.
9. Merge hanya setelah review dan status check dinyatakan aman.

## Rules for existing production features

Jangan merusak atau mengganti workflow yang sudah aktif tanpa kebutuhan yang jelas. Area yang harus diperlakukan sebagai production-critical meliputi:

- Authentication dan Users & Access
- Supabase shared data dan RBAC
- Content Generator dan AI research flow
- Copywriting skill / knowledge modules
- Content Calendar
- Task Assignment dan My Tasks
- Shared brief hydration lintas akun/device
- Buffer publishing/scheduling
- Brand Intelligence
- Production Overview

Perubahan pada area di atas harus diuji end-to-end pada branch/preview sebelum merge.

## Secrets and environment variables

- Jangan commit API key, token, password, service role key, atau secret lain ke repository.
- Jangan memindahkan secret server-side ke variable `NEXT_PUBLIC_*`.
- Environment production tetap dikelola melalui Vercel/Supabase sesuai kebutuhan.

## Database changes

Jika fitur membutuhkan perubahan schema Supabase:

- sertakan migration SQL yang idempotent bila memungkinkan;
- jangan menghapus tabel/kolom production tanpa migration plan;
- dokumentasikan langkah manual jika migration tidak otomatis dijalankan oleh deployment.

## UI consistency

Pertahankan Proxsis Digital Design System yang sudah digunakan dashboard:

- clean white/off-white surfaces;
- Proxsis red secara selektif;
- charcoal/gray text;
- radius dan shadow yang restrained;
- layout operational dashboard yang tidak terlalu penuh;
- Lucide icons bila membutuhkan icon baru.

## Pull Request expectation

PR harus menjelaskan:

- masalah atau kebutuhan;
- perubahan yang dibuat;
- area yang terdampak;
- cara testing;
- apakah ada migration/env baru;
- screenshot bila perubahan bersifat UI.
