#!/bin/bash

POSTGRES_USER=recipesage_dev
POSTGRES_DB=recipesage_dev

if ! [ -z "$1" ]
then
    cp $1 restore.sql
else
    server=root@db1.recipesage.com
    scp -r $server:/pg-backup/$(ssh $server 'ls -t /pg-backup | head -1') restore.sql
fi

docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid();'
docker compose exec postgres dropdb -U $POSTGRES_USER $POSTGRES_DB
docker compose exec postgres createdb -U $POSTGRES_USER $POSTGRES_DB

cat restore.sql | docker exec -i "$(docker compose ps -q postgres)" pg_restore -U $POSTGRES_USER -d $POSTGRES_DB
