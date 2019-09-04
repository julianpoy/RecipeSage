#!/bin/bash

# Currently frontend deployment only! Beta operates as a switchroot based on the enablebeta cookie in clients browser
# Only for frontend testing! Frontend must be compatible with current prod API

cd Frontend

npm run dist

if [ $? -eq 0 ]; then
    echo OK

    tar -czf deploy-beta.tgz ./www/*

    ssh julian@beta.recipesage.com 'rm /tmp/deploy-beta.tgz;'

    scp deploy-beta.tgz julian@beta.recipesage.com:/tmp

    rm deploy-beta.tgz

    ssh julian@beta.recipesage.com 'cd /var/www/beta.recipesage.com; rm -rf ./*; tar -zxvf /tmp/deploy-beta.tgz; mv www/* .'
else
    echo FAIL
fi
