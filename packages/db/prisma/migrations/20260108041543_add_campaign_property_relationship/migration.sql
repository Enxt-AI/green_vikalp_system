-- CreateTable
CREATE TABLE "CampaignProperty" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignProperty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignProperty_campaignId_order_idx" ON "CampaignProperty"("campaignId", "order");

-- CreateIndex
CREATE INDEX "CampaignProperty_propertyId_idx" ON "CampaignProperty"("propertyId");

-- CreateIndex
CREATE INDEX "CampaignProperty_isFeatured_idx" ON "CampaignProperty"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignProperty_campaignId_propertyId_key" ON "CampaignProperty"("campaignId", "propertyId");

-- AddForeignKey
ALTER TABLE "CampaignProperty" ADD CONSTRAINT "CampaignProperty_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignProperty" ADD CONSTRAINT "CampaignProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
