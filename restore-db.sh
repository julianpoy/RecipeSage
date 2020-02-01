#!/bin/bash

server=root@db1.recipesage.com
scp -r $server:/pg-backup/$(ssh $server 'ls -t /pg-backup | head -1') tmp.sql

docker-compose exec postgres dropdb -U $POSTGRES_USER $POSTGRES_DB
docker-compose exec postgres createdb -U $POSTGRES_USER $POSTGRES_DB

cat tmp.sql | docker exec -i "$(docker-compose ps -q postgres)" pg_restore -U $POSTGRES_USER -d $POSTGRES_DB

rm tmp.sql
