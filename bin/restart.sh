#!/bin/bash

TMP=/tmp/swarm-proxy

if [ ! -e "$TMP" ]
then
    mkdir $TMP
elif [ ! -d "$TMP" ]
then
    rm -rf $TMP
    mkdir $TMP
fi

chgrp swarm-proxy $TMP

systemctl --user restart swarm-proxy.service
