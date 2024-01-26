/*
  Warnings:

  - Added the required column `username` to the `ValidTag` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ValidTag" ADD COLUMN "username" TEXT;

UPDATE "ValidTag" SET username = 'defaultUsername' WHERE username IS NULL;

ALTER TABLE "ValidTag" ALTER COLUMN "username" SET NOT NULL;



