#!/bin/bash

set -e

cp -r * "$APPPATH"

cd $DIR

node ${APPPATH}/cli.js reload
