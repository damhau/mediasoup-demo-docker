#!/bin/bash

export MEDIASOUP_ANNOUNCED_IP=$(hostname -i)

echo "running mediasoup-demo server.js with ip $MEDIASOUP_ANNOUNCED_IP"

node /service/server.js