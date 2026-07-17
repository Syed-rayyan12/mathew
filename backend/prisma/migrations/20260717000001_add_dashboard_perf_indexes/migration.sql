-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_entity_entityId_createdAt_idx" ON "notifications"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_entity_entityId_isRead_idx" ON "notifications"("entity", "entityId", "isRead");

-- CreateIndex
CREATE INDEX "articles_category_isPublished_publishedAt_idx" ON "articles"("category", "isPublished", "publishedAt");

-- CreateIndex
CREATE INDEX "articles_isPublished_publishedAt_idx" ON "articles"("isPublished", "publishedAt");

-- CreateIndex
CREATE INDEX "nurseries_ownerId_idx" ON "nurseries"("ownerId");
