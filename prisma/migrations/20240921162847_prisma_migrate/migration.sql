/*
  Warnings:

  - You are about to drop the column `hashedPassword` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `_UserCities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_UserCountries` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_UserCities" DROP CONSTRAINT "_UserCities_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserCities" DROP CONSTRAINT "_UserCities_B_fkey";

-- DropForeignKey
ALTER TABLE "_UserCountries" DROP CONSTRAINT "_UserCountries_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserCountries" DROP CONSTRAINT "_UserCountries_B_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "hashedPassword",
ADD COLUMN     "countryId" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "token" TEXT;

-- DropTable
DROP TABLE "_UserCities";

-- DropTable
DROP TABLE "_UserCountries";

-- CreateTable
CREATE TABLE "UserCity" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cityId" INTEGER NOT NULL,

    CONSTRAINT "UserCity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCity_userId_cityId_key" ON "UserCity"("userId", "cityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCity" ADD CONSTRAINT "UserCity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCity" ADD CONSTRAINT "UserCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
