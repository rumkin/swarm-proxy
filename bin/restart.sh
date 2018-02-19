#!/bin/bash

cp -r * $APPPATH

cd $DIR

node ${APPPATH}/bin/cli.js reload
