#!/bin/bash

set -e

# Create app dir
if [ ! -d "$APPPATH" ]
then
    mkdir "$APPPATH"
    chgrp -R www "$APPPATH"
fi

# Create instance dir
if [ ! -d "$DIR" ]
then
    mkdir "$DIR"
    mkdir "$DIR/tmp"
    mkdir "$DIR/log"
    chown -R swarm-proxy:swarm-proxy $DIR
fi
