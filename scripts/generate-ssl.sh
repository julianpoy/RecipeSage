#!/bin/bash

PWD=$(dirname "$0")
cd $PWD
cd ../nginx

rm -rf ssl.crt
rm -rf ssl.key
rm rootCA.*
rm ssl.*

openssl genrsa -des3 -out rootCA.key 2048

openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 1024 -out rootCA.pem -subj "/C=US/CN=Example-Root-CA"

echo "[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn

[dn]
C=US
ST=RandomState
L=RandomCity
O=RandomOrganization
OU=RandomOrganizationUnit
emailAddress=hello@example.com
CN = localhost" > ssl.csr.cnf

echo "authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = rsdev.localhost" > ssl.ext

openssl req -new -sha256 -nodes -out ssl.csr -newkey rsa:2048 -keyout ssl.key -config <( cat ssl.csr.cnf )

openssl x509 -req -in ssl.csr -CA rootCA.pem -CAkey rootCA.key -CAcreateserial -out ssl.crt -days 1000 -sha256 -extfile ssl.ext


sudo cp rootCA.pem /usr/local/share/ca-certificates/recipesage-ssl.crt

sudo update-ca-certificates

echo "Done! Now add rootCA.pem as a trusted certificate source in any relevant browsers."

