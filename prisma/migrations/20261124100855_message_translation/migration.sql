-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "translation" TEXT,
ADD COLUMN     "translationLanguage" TEXT;

-- CreateTable
CREATE TABLE "TranslationCache" (
    "language" TEXT NOT NULL,
    "labels" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationCache_pkey" PRIMARY KEY ("language")
);
