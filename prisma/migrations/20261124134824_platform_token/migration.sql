-- AlterTable
ALTER TABLE "WhatsAppAccount" ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "usesPlatformToken" BOOLEAN NOT NULL DEFAULT false;
