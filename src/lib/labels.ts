import type { Role, TaskPriority, TaskStatus, TaskUpdateEventType } from "@prisma/client";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  baru: "Baru",
  dikerjakan: "Dikerjakan",
  review: "Review",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
  mendesak: "Mendesak",
};

export const EVENT_LABELS: Record<TaskUpdateEventType, string> = {
  progress: "Progres",
  status_change: "Perubahan status",
  submitted_review: "Diajukan review",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  operator_kecamatan: "Operator Kecamatan",
  operator_desa: "Operator Desa",
  camat: "Camat",
};

export function statusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case "baru":
      // cool teal-green (palette-friendly “new”)
      return "bg-primary/12 text-primary dark:bg-primary/20 dark:text-primary";
    case "dikerjakan":
      // logo gold
      return "bg-accent/15 text-amber-800 dark:bg-accent/20 dark:text-accent";
    case "review":
      // seal blue detail #00008b → softer indigo-green hybrid
      return "bg-[#00008b]/10 text-[#00008b] dark:bg-blue-400/15 dark:text-blue-300";
    case "selesai":
      return "bg-success/15 text-success";
    case "dibatalkan":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function priorityBadgeClass(priority: TaskPriority): string {
  switch (priority) {
    case "rendah":
      return "bg-muted text-muted-foreground";
    case "sedang":
      return "bg-primary/12 text-primary";
    case "tinggi":
      // seal brown #8b4513
      return "bg-[#8b4513]/12 text-[#8b4513] dark:bg-orange-400/15 dark:text-orange-300";
    case "mendesak":
      return "bg-danger/15 text-danger";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function eventBadgeClass(event: TaskUpdateEventType): string {
  switch (event) {
    case "progress":
      return "bg-primary/12 text-primary";
    case "status_change":
      return "bg-muted text-muted-foreground";
    case "submitted_review":
      return "bg-[#00008b]/10 text-[#00008b] dark:bg-blue-400/15 dark:text-blue-300";
    case "approved":
      return "bg-success/15 text-success";
    case "rejected":
      return "bg-danger/15 text-danger";
    case "cancelled":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}
