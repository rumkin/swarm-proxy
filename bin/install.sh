#!/bin/bash

DIR=/var/www/swarm-proxy

[ ! -d "$DIR" ] && mkdir $DIR
[ ! -d "$DIR/tmp" ] && mkdir $DIR/tmp
