-- CreateTable
CREATE TABLE "Kabupaten" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Kecamatan" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kabupatenCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Kecamatan_kabupatenCode_fkey" FOREIGN KEY ("kabupatenCode") REFERENCES "Kabupaten" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Desa" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kecamatanCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Desa_kecamatanCode_fkey" FOREIGN KEY ("kecamatanCode") REFERENCES "Kecamatan" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "kabupatenCode" TEXT,
    "kecamatanCode" TEXT,
    "desaCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_kabupatenCode_fkey" FOREIGN KEY ("kabupatenCode") REFERENCES "Kabupaten" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_kecamatanCode_fkey" FOREIGN KEY ("kecamatanCode") REFERENCES "Kecamatan" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_desaCode_fkey" FOREIGN KEY ("desaCode") REFERENCES "Desa" ("code") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'baru',
    "priority" TEXT NOT NULL DEFAULT 'sedang',
    "lastRejectionReason" TEXT,
    "submittedAt" DATETIME,
    "completedAt" DATETIME,
    "dueDate" DATETIME,
    "taskGroupId" TEXT,
    "kabupatenCode" TEXT NOT NULL,
    "kecamatanCode" TEXT NOT NULL,
    "desaCode" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_kabupatenCode_fkey" FOREIGN KEY ("kabupatenCode") REFERENCES "Kabupaten" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_kecamatanCode_fkey" FOREIGN KEY ("kecamatanCode") REFERENCES "Kecamatan" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_desaCode_fkey" FOREIGN KEY ("desaCode") REFERENCES "Desa" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "message" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskUpdate_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskUpdateAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "updateId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskUpdateAttachment_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "TaskUpdate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Kecamatan_kabupatenCode_idx" ON "Kecamatan"("kabupatenCode");

-- CreateIndex
CREATE INDEX "Desa_kecamatanCode_idx" ON "Desa"("kecamatanCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_kecamatanCode_idx" ON "User"("kecamatanCode");

-- CreateIndex
CREATE INDEX "User_desaCode_idx" ON "User"("desaCode");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");

-- CreateIndex
CREATE INDEX "Task_kabupatenCode_idx" ON "Task"("kabupatenCode");

-- CreateIndex
CREATE INDEX "Task_kecamatanCode_idx" ON "Task"("kecamatanCode");

-- CreateIndex
CREATE INDEX "Task_desaCode_idx" ON "Task"("desaCode");

-- CreateIndex
CREATE INDEX "Task_taskGroupId_idx" ON "Task"("taskGroupId");

-- CreateIndex
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "TaskAttachment_taskId_idx" ON "TaskAttachment"("taskId");

-- CreateIndex
CREATE INDEX "TaskUpdate_taskId_idx" ON "TaskUpdate"("taskId");

-- CreateIndex
CREATE INDEX "TaskUpdate_authorId_idx" ON "TaskUpdate"("authorId");

-- CreateIndex
CREATE INDEX "TaskUpdate_eventType_idx" ON "TaskUpdate"("eventType");

-- CreateIndex
CREATE INDEX "TaskUpdateAttachment_updateId_idx" ON "TaskUpdateAttachment"("updateId");

