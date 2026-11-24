-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "businessType" TEXT NOT NULL DEFAULT 'restaurant';

-- AlterTable
ALTER TABLE "WhatsAppAccount" ADD COLUMN     "connectionMethod" TEXT NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE "StoredFile" (
    "key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "StoredFile_bucket_idx" ON "StoredFile"("bucket");
