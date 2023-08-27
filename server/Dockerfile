# Stage 0, "build-stage", based on Node.js, to build and compile the frontend
FROM node:18 as build-stage

# This env var is used by gulp dist, it is configured in server/app/gulpfile.js. gulp dist will replace the value in the .js file before bundling and browsifering.
# If you want to change the port of mediasoup-server you have also to change this var as it is used in mediasoup-client in urlFactory.js for the wss connection to the server
ENV MEDIASOUP_CLIENT_PROTOOPORT=4443
ENV MEDIASOUP_CLIENT_ENABLE_ICESERVER=yes
ENV MEDIASOUP_CLIENT_ICESERVER_URL=turn:65.108.192.13:3478?transport=udp
ENV MEDIASOUP_CLIENT_ICESERVER_USER=user
ENV MEDIASOUP_CLIENT_ICESERVER_PASS=pass

WORKDIR /app
COPY ./app/package*.json /app/
RUN npm install -g gulp-cli
# Needed to run with node:18
RUN npm install --legacy-peer-deps
COPY ./app/ /app/

RUN gulp dist

# Stage 1, build the Server and copy frontend file
FROM node:18-slim

# Install DEB dependencies and others.
RUN \
	set -x \
	&& apt-get update \
	&& apt-get install -y git net-tools build-essential python3 python3-pip && rm -rf /var/lib/apt/lists/*

WORKDIR /service

COPY package.json .
RUN  npm install
COPY server.js .
COPY config.js .
COPY lib lib
COPY certs certs
ADD start.sh .
COPY --from=build-stage /app/../server/public /service/public

CMD ["sh", "/service/start.sh"]

