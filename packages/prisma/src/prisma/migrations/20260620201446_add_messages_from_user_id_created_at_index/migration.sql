-- CreateIndex
CREATE INDEX CONCURRENTLY "messages_from_user_id_created_at" ON "Messages"("fromUserId", "createdAt");
