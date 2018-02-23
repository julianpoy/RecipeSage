#!/bin/bash

cd Frontend

ionic build browser --prod

if [ $? -eq 0 ]; then
    echo OK
    
    ssh root@kondeo.com 'cd /var/www/recipesage.com; rm -rf ./*'

    scp -r ./platforms/browser/www/* root@kondeo.com:/var/www/recipesage.com
else
    echo FAIL
fi
