/**
 * Product branding — single source of truth for display names & metadata.
 * Technical identifiers (package name, localStorage keys) may differ.
 */
export const BRAND = {
  /** Short product name shown in UI */
  name: "SIKILAT",
  /** Full product line for titles / OG */
  fullName: "SIKILAT — Kabupaten Subang",
  /** One-line description */
  description:
    "Sistem informasi kerja dan laporan tugas antara kecamatan dan desa di Kabupaten Subang.",
  /** Scope / location line under the logo */
  region: "Kab. Subang",
  regionLong: "Kabupaten Subang",
  /** Login / marketing subtitle */
  tagline: "Kelola tugas kecamatan dan desa",
  keywords: [
    "SIKILAT",
    "kecamatan",
    "desa",
    "Subang",
    "tugas",
    "kanban",
    "pemerintahan",
  ] as string[],
} as const;
