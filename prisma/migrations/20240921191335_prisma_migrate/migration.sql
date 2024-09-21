/*
  Warnings:

  - You are about to drop the column `countryId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `UserCity` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_countryId_fkey";

-- DropForeignKey
ALTER TABLE "UserCity" DROP CONSTRAINT "UserCity_cityId_fkey";

-- DropForeignKey
ALTER TABLE "UserCity" DROP CONSTRAINT "UserCity_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "countryId";

-- DropTable
DROP TABLE "UserCity";
