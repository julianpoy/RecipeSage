#!/bin/bash

kubectl apply -f https://www.digitalocean.com/docs/kubernetes/resources/doks-metrics-server.yaml

kubectl create configmap firebase-credentials --from-file=./.credentials/firebase.json

kubectl create configmap pgsync-schema --from-file=./pgsync.schema.json

kubectl create namespace cert-manager

kubectl create secret generic digitalocean-key --from-literal=access-token='REPLACEME' -n cert-manager

kubectl create secret docker-registry myregistrykey --docker-server=$DOCKER_REGISTRY_SERVER --docker-username=$DOCKER_USER --docker-password=$DOCKER_PASSWORD --docker-email=$DOCKER_EMAIL

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/nginx-0.27.1/deploy/static/mandatory.yaml

kubectl apply -f kube/ingress-lb.yml # https://raw.githubusercontent.com/kubernetes/ingress-nginx/nginx-0.27.1/deploy/static/provider/cloud-generic.yaml

kubectl apply --validate=false -f https://github.com/jetstack/cert-manager/releases/download/v0.13.0/cert-manager.yaml
