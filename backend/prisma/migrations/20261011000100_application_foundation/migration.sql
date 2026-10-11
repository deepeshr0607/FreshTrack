-- Atomic initial application migration; never resets or changes neon_auth.
BEGIN;

-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('MANAGER');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('PRODUCE', 'DAIRY', 'BAKERY', 'SNACKS', 'MEAT', 'FROZEN', 'OTHER');

-- CreateEnum
CREATE TYPE "PantryItemStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'WASTED', 'ASSUMED_CONSUMED');

-- CreateEnum
CREATE TYPE "ExpirySource" AS ENUM ('PACKAGE_DATE', 'PRESET_ESTIMATE', 'USER_ENTERED');

-- CreateEnum
CREATE TYPE "PantryItemSource" AS ENUM ('MANUAL', 'BARCODE', 'RECEIPT');

-- CreateEnum
CREATE TYPE "CostSource" AS ENUM ('PURCHASE', 'ESTIMATE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PantryEventType" AS ENUM ('CREATED', 'EDITED', 'STATUS_CHANGED', 'ARCHIVED', 'RESTORED');

-- CreateEnum
CREATE TYPE "PantryEventSource" AS ENUM ('APP', 'NOTIFICATION', 'RECONCILIATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReceiptScanStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'REVIEW_REQUIRED', 'IMPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "Household" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "authSubject" VARCHAR(255) NOT NULL,
    "role" "HouseholdRole" NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PantryItem" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "normalizedName" VARCHAR(200) NOT NULL,
    "category" "ItemCategory" NOT NULL DEFAULT 'OTHER',
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" VARCHAR(32) NOT NULL,
    "purchaseDate" DATE,
    "expiresOn" DATE NOT NULL,
    "expirySource" "ExpirySource" NOT NULL,
    "freshnessPresetDays" INTEGER,
    "unitCostMinor" INTEGER,
    "totalCostMinor" INTEGER,
    "costSource" "CostSource" NOT NULL DEFAULT 'UNKNOWN',
    "currencyCode" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "PantryItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "PantryItemSource" NOT NULL DEFAULT 'MANUAL',
    "barcode" VARCHAR(64),
    "notes" VARCHAR(1000),
    "receiptScanId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "statusChangedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMPTZ(3),
    "wastedAt" TIMESTAMPTZ(3),
    "assumedConsumedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PantryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PantryItemEvent" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "pantryItemId" UUID NOT NULL,
    "eventType" "PantryEventType" NOT NULL,
    "previousStatus" "PantryItemStatus",
    "newStatus" "PantryItemStatus" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "totalCostMinor" INTEGER,
    "costSource" "CostSource" NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "expiresOn" DATE NOT NULL,
    "timezone" VARCHAR(64) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "PantryEventSource" NOT NULL DEFAULT 'APP',
    "idempotencyKey" VARCHAR(128),
    "metadata" JSONB,

    CONSTRAINT "PantryItemEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptScan" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "createdByAuthSubject" VARCHAR(255) NOT NULL,
    "status" "ReceiptScanStatus" NOT NULL DEFAULT 'UPLOADED',
    "temporaryImageKey" VARCHAR(512),
    "imageDeleteAfter" TIMESTAMPTZ(3),
    "detectedItems" JSONB,
    "errorCode" VARCHAR(64),
    "importedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ReceiptScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" UUID NOT NULL,
    "authSubject" VARCHAR(255) NOT NULL,
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "preferredNotificationTime" VARCHAR(5) NOT NULL DEFAULT '18:30',
    "dateFormat" VARCHAR(16) NOT NULL DEFAULT 'DD/MM/YYYY',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_authSubject_key" ON "HouseholdMember"("authSubject");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_householdId_authSubject_key" ON "HouseholdMember"("householdId", "authSubject");

-- CreateIndex
CREATE INDEX "PantryItem_householdId_status_archivedAt_expiresOn_idx" ON "PantryItem"("householdId", "status", "archivedAt", "expiresOn");

-- CreateIndex
CREATE INDEX "PantryItem_householdId_normalizedName_idx" ON "PantryItem"("householdId", "normalizedName");

-- CreateIndex
CREATE INDEX "PantryItem_householdId_barcode_idx" ON "PantryItem"("householdId", "barcode");

-- CreateIndex
CREATE INDEX "PantryItem_householdId_receiptScanId_idx" ON "PantryItem"("householdId", "receiptScanId");

-- CreateIndex
CREATE UNIQUE INDEX "PantryItem_householdId_id_key" ON "PantryItem"("householdId", "id");

-- CreateIndex
CREATE INDEX "PantryItemEvent_householdId_occurredAt_idx" ON "PantryItemEvent"("householdId", "occurredAt");

-- CreateIndex
CREATE INDEX "PantryItemEvent_householdId_pantryItemId_occurredAt_idx" ON "PantryItemEvent"("householdId", "pantryItemId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PantryItemEvent_householdId_idempotencyKey_key" ON "PantryItemEvent"("householdId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ReceiptScan_householdId_status_createdAt_idx" ON "ReceiptScan"("householdId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ReceiptScan_householdId_createdByAuthSubject_idx" ON "ReceiptScan"("householdId", "createdByAuthSubject");

-- CreateIndex
CREATE INDEX "ReceiptScan_imageDeleteAfter_idx" ON "ReceiptScan"("imageDeleteAfter");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptScan_householdId_id_key" ON "ReceiptScan"("householdId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_authSubject_key" ON "UserPreference"("authSubject");

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_householdId_receiptScanId_fkey" FOREIGN KEY ("householdId", "receiptScanId") REFERENCES "ReceiptScan"("householdId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PantryItemEvent" ADD CONSTRAINT "PantryItemEvent_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItemEvent" ADD CONSTRAINT "PantryItemEvent_householdId_pantryItemId_fkey" FOREIGN KEY ("householdId", "pantryItemId") REFERENCES "PantryItem"("householdId", "id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ReceiptScan" ADD CONSTRAINT "ReceiptScan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptScan" ADD CONSTRAINT "ReceiptScan_householdId_createdByAuthSubject_fkey" FOREIGN KEY ("householdId", "createdByAuthSubject") REFERENCES "HouseholdMember"("householdId", "authSubject") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_authSubject_fkey" FOREIGN KEY ("authSubject") REFERENCES "HouseholdMember"("authSubject") ON DELETE CASCADE ON UPDATE RESTRICT;

-- Domain checks omitted by Prisma PSL. All constraints apply only to FreshTrack tables.
ALTER TABLE "Household" ADD CONSTRAINT "Household_name_nonempty" CHECK (length(btrim("name")) > 0),
  ADD CONSTRAINT "Household_currency_supported" CHECK ("currencyCode" = 'INR'),
  ADD CONSTRAINT "Household_timezone_nonempty" CHECK (length(btrim("timezone")) > 0);
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_subject_nonempty" CHECK (length(btrim("authSubject")) > 0);
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_name_unit_nonempty" CHECK
  (length(btrim("name")) > 0 AND length(btrim("normalizedName")) > 0 AND length(btrim("unit")) > 0),
  ADD CONSTRAINT "PantryItem_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "PantryItem_cost_nonnegative" CHECK
    (("unitCostMinor" IS NULL OR "unitCostMinor" >= 0) AND ("totalCostMinor" IS NULL OR "totalCostMinor" >= 0)),
  ADD CONSTRAINT "PantryItem_cost_provenance" CHECK
    (("costSource" = 'UNKNOWN' AND "unitCostMinor" IS NULL AND "totalCostMinor" IS NULL) OR
     ("costSource" IN ('PURCHASE', 'ESTIMATE') AND "totalCostMinor" IS NOT NULL)),
  ADD CONSTRAINT "PantryItem_currency_supported" CHECK ("currencyCode" = 'INR'),
  ADD CONSTRAINT "PantryItem_preset_valid" CHECK
    (("freshnessPresetDays" IS NULL OR "freshnessPresetDays" > 0) AND
     ("expirySource" <> 'PRESET_ESTIMATE' OR "freshnessPresetDays" IS NOT NULL)),
  ADD CONSTRAINT "PantryItem_status_timestamps" CHECK
    (("status" = 'ACTIVE' AND "consumedAt" IS NULL AND "wastedAt" IS NULL AND "assumedConsumedAt" IS NULL) OR
     ("status" = 'CONSUMED' AND "consumedAt" IS NOT NULL AND "wastedAt" IS NULL AND "assumedConsumedAt" IS NULL) OR
     ("status" = 'WASTED' AND "consumedAt" IS NULL AND "wastedAt" IS NOT NULL AND "assumedConsumedAt" IS NULL) OR
     ("status" = 'ASSUMED_CONSUMED' AND "consumedAt" IS NULL AND "wastedAt" IS NULL AND "assumedConsumedAt" IS NOT NULL));
ALTER TABLE "PantryItemEvent" ADD CONSTRAINT "PantryItemEvent_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "PantryItemEvent_cost_nonnegative" CHECK ("totalCostMinor" IS NULL OR "totalCostMinor" >= 0),
  ADD CONSTRAINT "PantryItemEvent_cost_provenance" CHECK
    (("costSource" = 'UNKNOWN' AND "totalCostMinor" IS NULL) OR
     ("costSource" IN ('PURCHASE', 'ESTIMATE') AND "totalCostMinor" IS NOT NULL)),
  ADD CONSTRAINT "PantryItemEvent_currency_supported" CHECK ("currencyCode" = 'INR'),
  ADD CONSTRAINT "PantryItemEvent_timezone_nonempty" CHECK (length(btrim("timezone")) > 0),
  ADD CONSTRAINT "PantryItemEvent_idempotency_nonempty" CHECK ("idempotencyKey" IS NULL OR length(btrim("idempotencyKey")) > 0),
  ADD CONSTRAINT "PantryItemEvent_transition_shape" CHECK
    (("eventType" = 'CREATED' AND "previousStatus" IS NULL AND "newStatus" = 'ACTIVE') OR
     ("eventType" = 'STATUS_CHANGED' AND "previousStatus" IS NOT NULL AND "previousStatus" <> "newStatus") OR
     ("eventType" IN ('EDITED', 'ARCHIVED', 'RESTORED') AND "previousStatus" IS NOT NULL AND "previousStatus" = "newStatus"));
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_reminder_time" CHECK
  ("preferredNotificationTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD CONSTRAINT "UserPreference_date_format" CHECK ("dateFormat" IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'));
ALTER TABLE "ReceiptScan" ADD CONSTRAINT "ReceiptScan_imported_timestamp" CHECK
  (("status" = 'IMPORTED' AND "importedAt" IS NOT NULL) OR ("status" <> 'IMPORTED' AND "importedAt" IS NULL)),
  ADD CONSTRAINT "ReceiptScan_image_deadline" CHECK
    (("temporaryImageKey" IS NULL AND "imageDeleteAfter" IS NULL) OR
     ("temporaryImageKey" IS NOT NULL AND length(btrim("temporaryImageKey")) > 0 AND "imageDeleteAfter" IS NOT NULL));

COMMIT;
