#!/bin/bash

APP=swarm-proxy
APPPATH=/var/apps/$APP

if [ ! -d "$APPPATH" ]
then
    mkdir $APPPATH
fi

[ ! -d "$DIR" ] && mkdir $DIR
[ ! -d "$DIR/tmp" ] && mkdir $DIR/tmp
[ ! -d "$DIR/log" ] && mkdir $DIR/log
