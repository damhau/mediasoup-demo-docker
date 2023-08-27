# Stage 0, "build-stage", based on Node.js, to build and compile the frontend
FROM node:18 as build-stage

WORKDIR /app
COPY ./app/package*.json /app/
RUN npm install -g gulp-cli
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

