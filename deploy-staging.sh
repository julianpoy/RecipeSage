#!/bin/bash

cd Frontend

ionic build --prod

if [ $? -eq 0 ]; then
    echo OK
    
    ssh julian@kondeo.com 'cd /var/www/staging.recipesage.com; rm -rf ./*; cd ~/Projects/chefbook-staging; git pull; cd Backend; npm install; forever restart chefbook-staging'

    cp ./src/assets/transparent-square.png ./platforms/browser/www/screen

    scp -r ./platforms/browser/www/* julian@kondeo.com:/var/www/staging.recipesage.com
else
    echo FAIL
fi
