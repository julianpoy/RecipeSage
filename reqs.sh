#!/bin/bash

# Scraper Engine Reqs (puppeteer) - may not be fully up-to-date
sudo apt install libnss3 libasound2 libxss1 -y

# PushPin
sudo apt-get install apt-transport-https \
	  software-properties-common
echo deb https://dl.bintray.com/fanout/debian fanout-$(lsb_release -csu 2> /dev/null || lsb_release -cs) main \
	  | sudo tee /etc/apt/sources.list.d/fanout.list
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 \
	  --recv-keys 379CE192D401AB61
sudo apt-get update

sudo apt-get install pushpin

sudo apt-get install pkg-config qtbase5-dev libzmq3-dev \
	  mongrel2-core zurl

sudo systemctl enable pushpin
