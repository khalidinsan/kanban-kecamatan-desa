# SIKILAT

**SIKILAT** (*Sistem Kecepatan Tindaklanjut Aduan Masyarakat*) — sistem kerja dan laporan tugas antara **pemerintah kecamatan** dan **pemerintah desa**. Deployment saat ini dikonfigurasi untuk **Kabupaten Subang (`32.13`)**, dengan referensi 30 kecamatan dan 253 desa/kelurahan.

Operator kecamatan membuat tugas untuk desa. Operator desa mengerjakan tugas, mengirim beberapa laporan progress beserta lampiran, lalu mengajukannya untuk review. Operator kecamatan memverifikasi atau menolak pekerjaan, sedangkan camat memantau melalui executive dashboard.

## Fitur utama

- Board kanban drag-and-drop: **Baru → Dikerjakan → Review → Selesai**.
- Review gate: tugas tidak dapat langsung diselesaikan tanpa verifikasi kecamatan.
- Banyak laporan progress per tugas, masing-masing mendukung lampiran.
- Penghapusan progress dengan permission dan workflow guard.
- Upload file melalui drag-and-drop.
- Executive dashboard untuk camat: KPI, distribusi status, penyelesaian per desa, dan daftar tugas yang perlu perhatian.
- CRUD pengguna berbasis role dan scope wilayah.
- Credentials authentication dan server-side authorization.
- Master wilayah Kemendagri-aligned melalui snapshot `wilayah.id`.
- Dark mode, responsive layout, collapsible sidebar, searchable select, date picker, modal, skeleton loading, dan motion yang menghormati `prefers-reduced-motion`.
- Branding **SIKILAT** dengan palet warna Lambang Kabupaten Subang.

## Teknologi

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- Auth.js / NextAuth v5 credentials + JWT session
- Prisma 6 + SQLite
- Zod, bcryptjs
- dnd-kit, Recharts, date-fns, Lucide

## Persyaratan

- Node.js 20+
- npm 10+ direkomendasikan
- OpenSSL (opsional, untuk membuat `AUTH_SECRET`)

## Menjalankan secara lokal

```bash
# 1. Instal dependency sesuai lockfile
npm ci

# 2. Buat konfigurasi lokal
cp .env.example .env

# 3. Ganti AUTH_SECRET di .env
openssl rand -base64 32

# 4. Generate Prisma Client dan buat schema SQLite
npm run db:generate
npm run db:push

# 5. Isi master wilayah, akun demo, dan contoh tugas
npm run db:seed

# 6. Jalankan development server
npm run dev
```

Buka <http://localhost:3000>.

> `prisma/dev.db`, `.env`, `uploads/`, `.next/`, dan `node_modules/` merupakan data/artefak lokal dan tidak boleh di-commit.

## Environment variables

Salin `.env.example` menjadi `.env`.

| Variable | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya | URL Prisma. Default SQLite: `file:./dev.db`, relatif terhadap folder `prisma/`. |
| `AUTH_SECRET` | Ya | Secret acak untuk signing session/JWT. Jangan gunakan nilai contoh di production. |
| `AUTH_URL` | Ya | URL canonical aplikasi, misalnya `http://localhost:3000`. |

Contoh development:

```dotenv
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-random-secret"
AUTH_URL="http://localhost:3000"
```

## Akun demo

Perintah `npm run db:seed` membuat akun berikut. Semua password demo adalah **`password123`**.

| Username | Role | Scope |
| --- | --- | --- |
| `admin` | Administrator | Kabupaten aktif |
| `camat.subang` | Camat | Kecamatan Subang (`32.13.03`) |
| `op.kec.subang` | Operator Kecamatan | Kecamatan Subang |
| `op.desa.parung` | Operator Desa | Desa Parung (`32.13.03.1001`) |

**Jangan gunakan password demo di production.** Ubah/hapus akun seed sebelum aplikasi dipakai secara nyata.

## Role dan kewenangan

| Role | Scope data | Kewenangan utama |
| --- | --- | --- |
| `admin` | Kabupaten aktif | Kelola pengguna, lihat seluruh tugas, review, dan executive dashboard. |
| `operator_kecamatan` | Satu kecamatan | Membuat tugas untuk desa, melihat board kecamatan, memverifikasi/menolak review. |
| `operator_desa` | Satu desa | Memulai tugas, menambah/menghapus progress milik sendiri, dan mengajukan review. |
| `camat` | Satu kecamatan | Board dan executive dashboard read-only. |

Authorization selalu dicek kembali di server action/route handler; menyembunyikan tombol di UI bukan satu-satunya perlindungan.

## Alur tugas

```text
BARU
  └─ Mulai dikerjakan
       └─ DIKERJAKAN
            ├─ Tambah progress (0..N)
            ├─ Hapus progress yang diizinkan
            └─ Ajukan untuk review (minimal 1 progress)
                 └─ REVIEW
                      ├─ Verifikasi → SELESAI
                      └─ Tolak + alasan wajib → DIKERJAKAN
```

Aturan penting:

- Progress hanya dapat ditambahkan/dihapus ketika tugas berstatus `dikerjakan`.
- Operator desa hanya dapat menghapus progress yang dibuatnya sendiri.
- Admin dapat menghapus progress; event sistem/status tidak dapat dihapus.
- Operator desa tidak dapat mengubah status langsung menjadi `selesai`.
- Penolakan review wajib menyertakan alasan.
- Pembatalan hanya tersedia untuk operator kecamatan/admin.

## Upload file

- Format: gambar, PDF, dokumen Office, dan teks sesuai whitelist server.
- Batas ukuran: 10 MB per file.
- Maksimal 10 lampiran untuk satu laporan progress.
- File disimpan ke `uploads/YYYY/MM/` dengan nama acak.
- Metadata file disimpan di SQLite.
- Download selalu melewati route yang memeriksa session dan akses task.

Folder `uploads/` di-ignore oleh Git. Untuk production, mount folder tersebut ke **persistent volume** dan backup bersama database. Filesystem ephemeral (misalnya sebagian deployment serverless) tidak cocok tanpa mengganti storage ke object storage.

## Data wilayah dan pindah kabupaten

Konfigurasi deployment berada di:

```ts
// src/config/wilayah.ts
export const ACTIVE_KABUPATEN = {
  code: "32.13",
  name: "Subang",
  provinceCode: "32",
  provinceName: "Jawa Barat",
} as const;
```

Snapshot Subang tersimpan di `data/wilayah-32.13.json`. Untuk mengganti kabupaten:

1. Ubah `ACTIVE_KABUPATEN`.
2. Jalankan `npm run wilayah:fetch` untuk mengambil kecamatan dan desa dari `wilayah.id`.
3. Gunakan database baru atau susun migrasi data sebelum menjalankan seed.
4. Jalankan `npm run db:push` dan `npm run db:seed`.
5. Sesuaikan logo/branding jika deployment bukan Kabupaten Subang.

`wilayah:fetch` memerlukan koneksi internet. Snapshot JSON di-commit agar setup normal tidak bergantung pada API eksternal.

## Script npm

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan development server. |
| `npm run build` | Build production sekaligus type-check Next.js. |
| `npm start` | Menjalankan hasil build production. |
| `npm run lint` | Menjalankan ESLint. |
| `npm run db:generate` | Generate Prisma Client. |
| `npm run db:push` | Sinkronkan schema ke database tanpa migration file. |
| `npm run db:migrate` | Membuat/menjalankan migration development Prisma. |
| `npm run db:seed` | Seed master wilayah, akun demo, dan contoh tugas. |
| `npm run wilayah:fetch` | Refresh snapshot wilayah untuk kabupaten aktif. |

Project saat ini belum menyertakan folder `prisma/migrations`; setup baru memakai `db:push`. Sebelum production yang dikelola tim, pertimbangkan membuat migration baseline dan gunakan `prisma migrate deploy`.

## Build production

```bash
npm ci
cp .env.example .env
# isi secret dan URL production
npm run db:generate
npm run db:push
npm run db:seed # opsional; hindari demo seed pada production nyata
npm run build
npm start
```

SQLite cocok untuk deployment single-instance dengan trafik tulis rendah. Jangan menjalankan beberapa instance yang menulis file SQLite terpisah. Backup minimal mencakup:

- file database SQLite yang dirujuk `DATABASE_URL`;
- folder `uploads/`;
- konfigurasi environment/secret melalui secret manager (bukan Git).

## Backup & restore

Skrip di `scripts/` menyalin database SQLite (path dari `DATABASE_URL`, default `prisma/dev.db`) dan folder `uploads/` ke `backups/backup-YYYYMMDD-HHMMSS/` beserta `manifest.json` (timestamp dan ukuran). Folder `backups/` di-ignore oleh Git. Seed data di `data/` **tidak** disentuh.

```bash
# Buat backup
npm run backup

# Restore (wajib konfirmasi — menimpa DB + uploads hidup)
CONFIRM=1 npm run restore -- backups/backup-YYYYMMDD-HHMMSS
# atau
npx tsx scripts/restore.ts backups/backup-YYYYMMDD-HHMMSS --force
```

Restart aplikasi setelah restore agar file database dibuka ulang.

## Struktur project

```text
src/
  actions/             # Server actions untuk task, review, progress, user
  app/                 # App Router pages dan route handlers
  components/          # UI, board, form, executive, admin, layout
  config/wilayah.ts    # Kabupaten aktif
  hooks/               # Client hooks (presence, dsb.)
  lib/                 # Authz, Prisma, transitions, upload, query helpers
prisma/
  schema.prisma
  seed.ts
data/
  wilayah-32.13.json
scripts/
  fetch-wilayah.ts
  backup.ts
  restore.ts
public/brand/
  seal-subang.svg
```

## Checklist sebelum commit

```bash
npm ci
npm run lint
npm run build
git status --short
```

Pastikan output tidak memuat `.env`, database (`*.db`), `uploads/`, `.next/`, atau `node_modules/`.

## Catatan repository

Folder project ini dapat dijadikan repository mandiri dengan menjalankan `git init` **di folder project**, tetapi jangan lakukan itu jika folder ini memang sengaja dikelola sebagai bagian dari monorepo/repository induk. Periksa terlebih dahulu:

```bash
git rev-parse --show-toplevel
```

## Attribution

Lambang Kabupaten Subang di `public/brand/seal-subang.svg` bersumber dari Wikimedia Commons: <https://commons.wikimedia.org/wiki/File:Seal_of_Subang_Regency.svg>.

## License

Belum ada file lisensi. Secara default, hak cipta tetap pada pemilik project dan penggunaan dianggap internal/private sampai lisensi ditambahkan.
