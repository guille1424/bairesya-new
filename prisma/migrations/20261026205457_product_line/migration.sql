-- CreateEnum
CREATE TYPE "Line" AS ENUM ('DEPORTIVA', 'URBANA', 'FORMAL');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "line" "Line";

-- CreateIndex
CREATE INDEX "Product_line_idx" ON "Product"("line");
