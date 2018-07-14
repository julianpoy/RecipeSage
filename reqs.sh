#!/bin/bash

# NightmareJS Scraper Engine Reqs
sudo apt install xvfb libasound2 libgconf-2-4 libgtk2.0-0 libxss1 ttf-freefont -y

sudo npm install -g electron --unsafe-perm=true --allow-root

# multer-imager reqs
sudo apt install graphicsmagick -y

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
