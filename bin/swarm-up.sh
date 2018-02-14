#!/bin/bash

SWARM_HOST=http://swarm-gateways.net

tar -c $@ | curl -H "Content-Type: application/x-tar" --data-binary @- ${SWARM_HOST}/bzz:/
echo ""
