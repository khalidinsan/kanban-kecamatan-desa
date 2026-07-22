import type { Role, TaskPriority, TaskStatus } from "@prisma/client";

export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  lastRejectionReason: string | null;
  desaCode: string | null;
  desaName: string | null;
  progressCount: number;
  attachmentCount: number;
};

export type BoardDesaOption = {
  code: string;
  name: string;
};

export type BoardUser = {
  role: Role;
  canDrag: boolean;
  canReview: boolean;
  showDesaFilter: boolean;
};

export type ReviewModalState =
  | { type: "approve"; taskId: string; title: string }
  | { type: "reject"; taskId: string; title: string }
  | null;
