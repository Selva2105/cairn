-- AlterTable
ALTER TABLE "event_log" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "event_log_householdId_needsReview_idx" ON "event_log"("householdId", "needsReview");
