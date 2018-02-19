#!/bin/bash

export APP=swarm-proxy
export DIR=/var/www/$APP
export APPPATH=/var/apps/$APP

for SOURCE in $@
do
    source "$SOURCE"
done
