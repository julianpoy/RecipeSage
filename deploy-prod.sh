#!/bin/bash

cd Frontend

ionic build --prod

if [ $? -eq 0 ]; then
    echo OK
    
    ssh julian@kondeo.com 'cd /var/www/recipesage.com; rm -rf ./*; cd ~/Projects/chefbook; git checkout Backend/package-lock.json; git pull; cd Backend; npm install; forever restart chefbook'

    cp ./src/assets/transparent-square.png ./platforms/browser/www/screen

    scp -r ./platforms/browser/www/* julian@kondeo.com:/var/www/recipesage.com
else
    echo FAIL
fi
