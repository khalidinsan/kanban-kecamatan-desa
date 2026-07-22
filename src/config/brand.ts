/**
 * Product branding — single source of truth for display names & metadata.
 * Technical identifiers (package name, localStorage keys) may differ.
 */
export const BRAND = {
  /** Short product name shown in UI */
  name: "SIKILAT",
  /**
   * Official expansion / subtitle.
   * Shown on login + app footer (not sidebar — too long).
   */
  subtitle: "Sistem Kecepatan Tindaklanjut Aduan Masyarakat",
  /** Full product line for titles / OG */
  fullName: "SIKILAT — Kabupaten Subang",
  /** One-line description (SEO / metadata) */
  description:
    "SIKILAT (Sistem Kecepatan Tindaklanjut Aduan Masyarakat) — Kabupaten Subang.",
  /** Scope / location line under the logo */
  region: "Kab. Subang",
  regionLong: "Kabupaten Subang",
  /** Short login CTA under the expansion */
  tagline: "Masuk untuk mengelola tugas wilayah",
  keywords: [
    "SIKILAT",
    "Sistem Kecepatan Tindaklanjut Aduan Masyarakat",
    "aduan",
    "kecamatan",
    "desa",
    "Subang",
    "tugas",
    "pemerintahan",
  ] as string[],
} as const;
