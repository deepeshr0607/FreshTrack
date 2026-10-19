CREATE TABLE "AccountDeletion" (
    "subjectHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountDeletion_pkey" PRIMARY KEY ("subjectHash")
);
