-- CreateIndex
CREATE INDEX "labelgroups_user_id" ON "LabelGroups"("userId");

-- CreateIndex
CREATE INDEX "labels_user_id" ON "Labels"("userId");

-- CreateIndex
CREATE INDEX "labels_label_group_id" ON "Labels"("labelGroupId");
