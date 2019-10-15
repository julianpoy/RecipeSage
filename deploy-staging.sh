#!/bin/bash

cd Frontend

npm run dist

if [ $? -eq 0 ]; then
    echo OK

    tar -czf deploy-staging.tgz ./www/*

    ssh julian@staging.recipesage.com 'rm /tmp/deploy-staging.tgz; cd ~/Projects/chefbook-staging; git checkout Backend/package-lock.json; git pull; cd Backend; npm install; cd ../SharedUtils; npm install; pm2 reload RecipeSageStagingAPI'

    scp deploy-staging.tgz julian@staging.recipesage.com:/tmp

    rm deploy-staging.tgz

    ssh julian@staging.recipesage.com 'cd /var/www/staging.recipesage.com; rm -rf ./*; tar -zxvf /tmp/deploy-staging.tgz; mv www/* .'
else
    echo FAIL
fi
