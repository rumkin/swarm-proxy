#!/bin/bash

TMP=/tmp/$APP

if [ ! -e "$TMP" ]
then
    mkdir $TMP
elif [ ! -d "$TMP" ]
then
    rm -rf $TMP
    mkdir $TMP
fi

chgrp $APP $TMP
chmod g+w $TMP
