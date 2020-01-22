#!/bin/bash

echo "==== PROD DEPLOYMENT ===="
read -p "Do you want to continue to deploy to prod? [yN] " -n 1 -r
echo
if [[ $REPLY =~ ^[Y]$  ]]
then
    echo "Continuing to deploy"
else
    exit 0
fi

cd Frontend

npm run dist

if [ $? -eq 0 ]; then
    echo OK

    tar -czf deploy-prod.tgz ./www/*

    ssh julian@recipesage.com 'rm /tmp/deploy-prod.tgz'

    scp deploy-prod.tgz julian@recipesage.com:/tmp

    rm deploy-prod.tgz

    ssh julian@recipesage.com 'cd /var/www/recipesage.com; tar -zxvf /tmp/deploy-prod.tgz; rsync -av www/* .; rm -rf www'
else
    echo FAIL
fi
