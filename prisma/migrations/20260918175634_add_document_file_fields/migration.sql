-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileMimeType" TEXT;
