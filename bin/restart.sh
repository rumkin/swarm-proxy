#!/bin/bash

APPPATH=$PWD

cd /var/www/swarm-proxy

node ${APPPATH}/bin/cli.js reload
