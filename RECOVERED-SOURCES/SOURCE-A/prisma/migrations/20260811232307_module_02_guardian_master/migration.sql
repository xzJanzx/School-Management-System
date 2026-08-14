/*
  Warnings:

  - Added the required column `guardianId` to the `Guardian` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `Guardian` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guardian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guardianId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationalId" TEXT,
    "phone" TEXT NOT NULL,
    "additionalPhone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "canContact" BOOLEAN NOT NULL DEFAULT true,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'PHONE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "relationship" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Guardian" ("createdAt", "email", "firstName", "id", "lastName", "nationalId", "phone", "relationship", "updatedAt") SELECT "createdAt", "email", "firstName", "id", "lastName", "nationalId", "phone", "relationship", "updatedAt" FROM "Guardian";
DROP TABLE "Guardian";
ALTER TABLE "new_Guardian" RENAME TO "Guardian";
CREATE UNIQUE INDEX "Guardian_guardianId_key" ON "Guardian"("guardianId");
CREATE UNIQUE INDEX "Guardian_nationalId_key" ON "Guardian"("nationalId");
CREATE INDEX "Guardian_firstName_lastName_idx" ON "Guardian"("firstName", "lastName");
CREATE INDEX "Guardian_phone_idx" ON "Guardian"("phone");
CREATE INDEX "Guardian_status_idx" ON "Guardian"("status");
CREATE TABLE "new_StudentGuardian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "relationship" TEXT,
    "relationshipDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentGuardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentGuardian_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudentGuardian" ("createdAt", "guardianId", "id", "isPrimary", "relationship", "studentId") SELECT "createdAt", "guardianId", "id", "isPrimary", "relationship", "studentId" FROM "StudentGuardian";
DROP TABLE "StudentGuardian";
ALTER TABLE "new_StudentGuardian" RENAME TO "StudentGuardian";
CREATE INDEX "StudentGuardian_studentId_idx" ON "StudentGuardian"("studentId");
CREATE INDEX "StudentGuardian_guardianId_idx" ON "StudentGuardian"("guardianId");
CREATE UNIQUE INDEX "StudentGuardian_studentId_guardianId_key" ON "StudentGuardian"("studentId", "guardianId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
