# Mediasoup-demo v3 - Docker and Turn Server

This is a fork of the demo application of [mediasoup](https://mediasoup.org) **v3**.

This fork is containerized and pre-configured to work with a turn server like coturn.

The goal is to have a sample that work for the deployment of the Mediasoup demo app on Kubernetes with [stunner](https://github.com/l7mp/stunner) as turn server.


## Pre-requisite

- A Linux server with a public ip address (or an EIP on AWS)
- Docker and Docker Compose
- A turn server running in a container with port 3478 forwarded from the public ip (this is configured in docker)
- A mediasoup server running in a container with port 4443 forwarded from the public ip (this is configured in docker)

## Diagram

![Alt text](docs/image.png)

## Modification

Below are the modification that I've done starting from [mediasoup-demo](https://github.com/versatica/mediasoup-demo/) 

- Add a multistage Dockerfile

  - stage 0: run gulp dist to create the frontend app file (they will be served by nodejs from the backend)
  - stage 1: build the image for the mediasoup-server and copy the mediasoup-client file

- add a start.sh file for the dockerimage, this is a simple script that will gather the ip "inside" of the container and use it for MEDIASOUP_ANNOUNCED_IP
> This is only needed for docker if you don't use net=host or for Kubernetes

- add the following in server.js in the function "async function createExpressApp()" to serve the mediasoup-client file

```
147:	expressApp.use(express.static('public'))
```

- add the following settings in server/app/lib/RoomClient.js to configure a turn server (you have to replace 100.100.100.100 with the ip address or fqdn of your turn server)

```
2130: iceServers: [
2131:    { "urls": "turn:100.100.100.100:3478?transport=udp", "username": "user", "credential": "pass" }
2132: ],
...
2241: iceServers: [
2242:    { "urls": "turn:100.100.100.100:3478?transport=udp", "username": "user", "credential": "pass" }
2243: ],
```

- add a sample docker-compose file that start mediasoup and coturn

```
services:
  mediasoup:
    image: damienh/mediasoup:v1.31-slim
    ports:
      - '4443:4443'
  coturn:
    image: coturn/coturn
    command: -n --log-file=stdout --lt-cred-mech --fingerprint --no-multicast-peers --no-cli --no-tlsv1 --no-tlsv1_1 --realm=my.realm.org --user user:pass -v
    ports:
      - "3478:3478"
      - "3478:3478/udp"
```

> As you can see there only port 4443 is "open" for Mediasoup and port 3478 for Coturn. This mean that all the webrtc media traffic is over udp 3478. This is a pre-requiste to be able to run this on Kubernetes without network=host and with a turn server like stunner.


- Add a cert folder with self signed demo certificate in server/certs 
> you should replace the cert with your own

- config.js file that work with Docker

## How to build


- Clone the repo and change the ip address of the turn server from 100.100.100.100 to your public ip

```
git clone https://github.com/damhau/mediasoup-demo-docker
vi server/app/lib/RoomClient.js

2130: iceServers: [
2131:    { "urls": "turn:100.100.100.100:3478?transport=udp", "username": "user", "credential": "pass" }
2132: ],
...
2241: iceServers: [
2242:    { "urls": "turn:100.100.100.100:3478?transport=udp", "username": "user", "credential": "pass" }
2243: ],
```

- Run docker build in the server folder

```
git clone https://github.com/damhau/mediasoup-demo-docker
cd server
docker build . -t mediasoup-demo-docker
```

> if the start.sh script fail to detect the container ip you can change the Dockerfile and replace CMD ["sh", "/service/start.sh"] with CMD ["node", "/service/server.js"] and set the variable MEDIASOUP_ANNOUNCED_IP manually


## How to run

- Run docker-compose up in the server folder

```
git clone https://github.com/damhau/mediasoup-demo-docker
cd server
docker-compose up
Recreating server_mediasoup_1 ... done
Starting server_coturn_1      ... done
Attaching to server_mediasoup_1, server_coturn_1
coturn_1     | 0: (1): INFO: System cpu num is 32
coturn_1     | 0: (1): INFO: System cpu num is 32
coturn_1     | 0: (1): INFO: System enable num is 12
coturn_1     | 0: (1): WARNING: Cannot find config file: turnserver.conf. Default and command-line settings will be used.
mediasoup_1  | running mediasoup-demo server.js with ip 172.19.0.3
coturn_1     | 0: (1): INFO: Coturn Version Coturn-4.6.2 'Gorst'
coturn_1     | 0: (1): INFO: Max number of open files/sockets allowed for this process: 1048576
coturn_1     | 0: (1): INFO: Due to the open files/sockets limitation, max supported number of TURN Sessions possible is: 524000 (approximately)
coturn_1     | 0: (1): INFO: 
coturn_1     | 
coturn_1     | ==== Show him the instruments, Practical Frost: ====
coturn_1     | 
coturn_1     | 0: (1): INFO: OpenSSL compile-time version: OpenSSL 3.0.9 30 May 2023 (0x30000090)
coturn_1     | 0: (1): INFO: TLS 1.3 supported
coturn_1     | 0: (1): INFO: DTLS 1.2 supported
coturn_1     | 0: (1): INFO: TURN/STUN ALPN supported
coturn_1     | 0: (1): INFO: Third-party authorization (oAuth) supported
coturn_1     | 0: (1): INFO: GCM (AEAD) supported
coturn_1     | 0: (1): INFO: SQLite supported, default database location is /var/lib/coturn/turndb
coturn_1     | 0: (1): INFO: Redis supported
coturn_1     | 0: (1): INFO: PostgreSQL supported
coturn_1     | 0: (1): INFO: MySQL supported
coturn_1     | 0: (1): INFO: MongoDB supported
coturn_1     | 0: (1): INFO: Default Net Engine version: 3 (UDP thread per CPU core)
coturn_1     | 0: (1): INFO: Domain name: 
coturn_1     | 0: (1): INFO: Default realm: my.realm.org
coturn_1     | 0: (1): ERROR: CONFIG: Unknown argument: 
mediasoup_1  | process.env.DEBUG: *INFO* *WARN* *ERROR*
mediasoup_1  | config.js:
mediasoup_1  | {
mediasoup_1  |   "https": {
mediasoup_1  |     "listenIp": "0.0.0.0",
mediasoup_1  |     "listenPort": 4443,
mediasoup_1  |     "tls": {
mediasoup_1  |       "cert": "/service/certs/fullchain.pem",
mediasoup_1  |       "key": "/service/certs/privkey.pem"
mediasoup_1  |     }
mediasoup_1  |   },
mediasoup_1  |   "mediasoup": {
mediasoup_1  |     "numWorkers": 12,
mediasoup_1  |     "workerSettings": {
mediasoup_1  |       "logLevel": "warn",
mediasoup_1  |       "logTags": [
mediasoup_1  |         "info",
mediasoup_1  |         "ice",
mediasoup_1  |         "dtls",
mediasoup_1  |         "rtp",
mediasoup_1  |         "srtp",
mediasoup_1  |         "rtcp",
mediasoup_1  |         "rtx",
mediasoup_1  |         "bwe",
mediasoup_1  |         "score",
mediasoup_1  |         "simulcast",
mediasoup_1  |         "svc",
mediasoup_1  |         "sctp"
mediasoup_1  |       ],
mediasoup_1  |       "rtcMinPort": 40000,
mediasoup_1  |       "rtcMaxPort": 40099
mediasoup_1  |     },
mediasoup_1  |     "routerOptions": {
mediasoup_1  |       "mediaCodecs": [
mediasoup_1  |         {
mediasoup_1  |           "kind": "audio",
mediasoup_1  |           "mimeType": "audio/opus",
mediasoup_1  |           "clockRate": 48000,
mediasoup_1  |           "channels": 2
mediasoup_1  |         },
mediasoup_1  |         {
mediasoup_1  |           "kind": "video",
mediasoup_1  |           "mimeType": "video/VP8",
mediasoup_1  |           "clockRate": 90000,
mediasoup_1  |           "parameters": {
mediasoup_1  |             "x-google-start-bitrate": 1000
mediasoup_1  |           }
mediasoup_1  |         },
mediasoup_1  |         {
mediasoup_1  |           "kind": "video",
mediasoup_1  |           "mimeType": "video/VP9",
mediasoup_1  |           "clockRate": 90000,
mediasoup_1  |           "parameters": {
mediasoup_1  |             "profile-id": 2,
mediasoup_1  |             "x-google-start-bitrate": 1000
mediasoup_1  |           }
mediasoup_1  |         },
mediasoup_1  |         {
mediasoup_1  |           "kind": "video",
mediasoup_1  |           "mimeType": "video/h264",
mediasoup_1  |           "clockRate": 90000,
mediasoup_1  |           "parameters": {
mediasoup_1  |             "packetization-mode": 1,
mediasoup_1  |             "profile-level-id": "4d0032",
mediasoup_1  |             "level-asymmetry-allowed": 1,
mediasoup_1  |             "x-google-start-bitrate": 1000
mediasoup_1  |           }
mediasoup_1  |         },
mediasoup_1  |         {
mediasoup_1  |           "kind": "video",
mediasoup_1  |           "mimeType": "video/h264",
mediasoup_1  |           "clockRate": 90000,
mediasoup_1  |           "parameters": {
mediasoup_1  |             "packetization-mode": 1,
mediasoup_1  |             "profile-level-id": "42e01f",
mediasoup_1  |             "level-asymmetry-allowed": 1,
mediasoup_1  |             "x-google-start-bitrate": 1000
mediasoup_1  |           }
mediasoup_1  |         }
mediasoup_1  |       ]
mediasoup_1  |     },
mediasoup_1  |     "webRtcServerOptions": {
mediasoup_1  |       "listenInfos": [
mediasoup_1  |         {
mediasoup_1  |           "protocol": "udp",
mediasoup_1  |           "ip": "0.0.0.0",
mediasoup_1  |           "announcedIp": "172.19.0.3",
mediasoup_1  |           "port": 44444
mediasoup_1  |         },
mediasoup_1  |         {
mediasoup_1  |           "protocol": "tcp",
mediasoup_1  |           "ip": "0.0.0.0",
mediasoup_1  |           "announcedIp": "172.19.0.3",
mediasoup_1  |           "port": 44444
mediasoup_1  |         }
mediasoup_1  |       ]
mediasoup_1  |     },
mediasoup_1  |     "webRtcTransportOptions": {
mediasoup_1  |       "listenIps": [
mediasoup_1  |         {
mediasoup_1  |           "ip": "0.0.0.0",
mediasoup_1  |           "announcedIp": "172.19.0.3"
mediasoup_1  |         }
mediasoup_1  |       ],
mediasoup_1  |       "initialAvailableOutgoingBitrate": 1000000,
mediasoup_1  |       "minimumAvailableOutgoingBitrate": 600000,
mediasoup_1  |       "maxSctpMessageSize": 262144,
mediasoup_1  |       "maxIncomingBitrate": 1500000
mediasoup_1  |     },
mediasoup_1  |     "plainTransportOptions": {
mediasoup_1  |       "listenIp": {
mediasoup_1  |         "ip": "0.0.0.0",
mediasoup_1  |         "announcedIp": "172.19.0.3"
mediasoup_1  |       },
mediasoup_1  |       "maxSctpMessageSize": 262144
mediasoup_1  |     }
mediasoup_1  |   }
mediasoup_1  | }
```

> Check that announcedIp is the ip "inside" of the mediasoup container, it should not be the public ip as all the traffic will be relayed via the public ip of coturn.
