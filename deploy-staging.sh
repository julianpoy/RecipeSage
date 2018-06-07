#!/bin/bash

cd Frontend

npm run dist

if [ $? -eq 0 ]; then
    echo OK
    
    ssh julian@kondeo.com 'cd /var/www/staging.recipesage.com; rm -rf ./*; cd ~/Projects/chefbook-staging; git checkout Backend/package-lock.json; git pull; cd Backend; npm install; forever restart chefbook-staging'

    scp -r ./www/* julian@kondeo.com:/var/www/staging.recipesage.com
else
    echo FAIL
fi
