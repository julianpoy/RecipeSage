-- CreateIndex
CREATE INDEX CONCURRENTLY "messages_to_user_id_created_at" ON "Messages"("toUserId", "createdAt");
