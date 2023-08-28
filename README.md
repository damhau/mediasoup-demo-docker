# Mediasoup-demo v3 - Docker, Kubernetes and Turn Server
This is a fork of the demo application of [mediasoup](https://mediasoup.org) **v3**.

This fork is containerized and pre-configured to work with a turn server like coturn.

You can run the demo in Docker with [coturn](https://github.com/coturn/coturn) or in Kubernetes with [stunner](https://github.com/l7mp/stunner) as turn server.

## Table of Content 

  * [Table of Content](#table-of-content)
  * [Pre-requisite](#pre-requisite)
  * [Diagram](#diagram)
  * [Modification](#modification)
  * [How to change the tcp port (Web app and WSS).](#how-to-change-the-tcp-port--web-app-and-wss-)
  * [Docker - How to build](#docker---how-to-build)
  * [Docker - How to run](#docker---how-to-run)
  * [Kubernetes - How to run](#kubernetes---how-to-run)
  * [How to test](#how-to-test)

## Important notes

- Currently the mediasoup deployement in Kubernetes support only a single replica, it **CANNOT** be scaled. This is due to the fact that the fowarding of media flow between mutliple instance of mediasoup is not implemented in the demo


## Pre-requisite

- A Linux server with a public ip address (or an EIP on AWS)
- Docker and Docker Compose
- A turn server running in a container with port 3478 forwarded from the public ip (this is configured in docker)
- A mediasoup server running in a container with port 4443 forwarded from the public ip (this is configured in docker)

## Diagram

![Alt text](docs/image.png)

## Modification

Below are the modification that I've done starting from [mediasoup-demo](https://github.com/versatica/mediasoup-demo/) 

- Added a multistage Dockerfile

  - stage 0: run gulp dist to create the frontend app file (they will be served by nodejs from the backend)
  - stage 1: build the image for the mediasoup-server and copy the mediasoup-client file

- added a start.sh file for the dockerimage, this is a simple script that will gather the ip "inside" of the container and use it for MEDIASOUP_ANNOUNCED_IP then start node /service/server.js
> This is only needed for docker if you don't use net=host or for Kubernetes

- added the following in server.js in the function "async function createExpressApp()" to serve the mediasoup-client file

```
147:	expressApp.use(express.static('public'))
```

- added a simple if/else in server/app/lib/RoomClient.js to configure a turn server. The turn server will be used by the mediasoup client when when the following varaibles are configured in the Dockerfile stage 0.
  
```
ENV MEDIASOUP_CLIENT_PROTOOPORT=4443
ENV MEDIASOUP_CLIENT_ENABLE_ICESERVER=yes
ENV MEDIASOUP_CLIENT_ICESERVER_URL=turn:100.100.100.100:3478?transport=udp
ENV MEDIASOUP_CLIENT_ICESERVER_USER=user
ENV MEDIASOUP_CLIENT_ICESERVER_PASS=pass
```

> the variable are replaced in the .js when the command gulp dist is executed, the config of gulp is in server/app/gulpfile.js line 97 to 103. After the variable are replaced in the .js file they are bundled and stored in the folder /service/public in the stage 1 docker build.

- added a sample docker-compose file that start mediasoup and coturn

```
services:
  mediasoup:
    image: mediasoup-demo-docker
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


- Added a cert folder with self signed demo certificate in server/certs 
> you should replace the cert with your own

- config.js file that work with Docker


## How to change the tcp port (Web app and WSS).

This need to be changed in the frontend mediasoup-client and in the backend at the same time.

For the server, the port configured in server/config.js with the environement variable PROTOO_LISTEN_PORT.

In the client code (server/app/lib/urlFactory.js) there is a variable called protooPort that can only be changed before building the mediasoup-client files.

- Change the port for the mediasoup-client (used for the WSS requests), replace 4443 with the port you want to use (for a "real" deplyonent it should be 443)
```
git clone https://github.com/damhau/mediasoup-demo-docker
vi server/Dockerfile
ENV MEDIASOUP_CLIENT_PROTOOPORT=4443
```

:exclamation: if you change this you have to rebuild the docker image


- Change the port for the mediasoup-server, replace 4443 with the port you want to use (for a "real" deplyonent it should be 443)
```
git clone https://github.com/damhau/mediasoup-demo-docker
vi docker-compose.yml
services:
  mediasoup:
    image: mediasoup-demo-docker
    environment:
      PROTOO_LISTEN_PORT: 4443
    ports:
      - '4443:4443'
```

## Docker - How to build


- Clone the repo and change the ip address of the turn server from 100.100.100.100 to your public ip

```
git clone https://github.com/damhau/mediasoup-demo-docker
vi server/Dockerfile

ENV MEDIASOUP_CLIENT_ENABLE_ICESERVER=yes
ENV MEDIASOUP_CLIENT_ICESERVER_URL=turn:100.100.100.100:3478?transport=udp
ENV MEDIASOUP_CLIENT_ICESERVER_USER=user
ENV MEDIASOUP_CLIENT_ICESERVER_PASS=pass
```

> if you don't want to enable turn juste remove the 4 line

- Run docker build in the server folder

```
git clone https://github.com/damhau/mediasoup-demo-docker
cd server
docker build . -t mediasoup-demo-docker
```

> if the start.sh script fail to detect the container ip you can change the Dockerfile and replace CMD ["sh", "/service/start.sh"] with CMD ["node", "/service/server.js"] and set the variable MEDIASOUP_ANNOUNCED_IP manually


## Docker - How to run

- Edit server/docker-compose.yml and udpate the docker image for mediasoup with your own (otherwise it will use my turn server and it will not work)

```
git clone https://github.com/damhau/mediasoup-demo-docker
cd server
vi docker-compose.yml
replace image: mediasoup-demo-docker with your image
```

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

## Docker - How to test

> Check that announcedIp is the ip "inside" of the mediasoup container, it should not be the public ip as all the media traffic will be relayed via the public ip of coturn.

- Open a brower to https://you_public_ip:4443, you should get the mediasoup client demo app

![image](https://github.com/damhau/mediasoup-demo-docker/assets/14148364/41d8b667-7382-4ecf-b1d8-2179d8328b0c)


- Open chrome://webrtc-internals/ in chrome the two webrtc stream should be like this

```
- ICE connection state: new => completed
Connection state: new => connected
Signaling state: new => stable
ICE Candidate pair: 172.19.0.2:55286 <=> 172.19.0.3:44444
```
> The ip address should be the private ip address of the mediasoup and coturn container

- The Ice candidate grid should look like this
  
![image](https://github.com/damhau/mediasoup-demo-docker/assets/14148364/f0e9e518-4dc0-4d50-92d2-048c3cf6698b)

- In the Mediasoup client demo app click on the link **Invitation Link** and open this link from another computer or you mobile phone

- Both device should be in the Room


## Kubernetes - How to run

### Prerequiste

- A Kubernetes Cluster with loadbalancer support (AKS, GKE or On premise with MetaLB). I will use Azure AKS in the example but it should work with other.
- Kubectl
- Helm
- Nginx Ingress
- Cert manager
- Stunner

### Ingress

Install an ingress controller into your cluster. We used the official [nginx ingress](https://github.com/kubernetes/ingress-nginx), but this is not required.

```console
NAMESPACE=ingress-nginx

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --create-namespace \
  --namespace $NAMESPACE \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
```
:exclamation: The example above is for ngix ingress on AKS if you deploy it on another K8S please remove/change the --set controller.service.annotations

Wait until Kubernetes assigns an external IP to the Ingress.

```console
until [ -n "$(kubectl -n ingress-nginx get service ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')" ]; do sleep 1; done
```

### Cert manager

We use the official [cert-manager](https://cert-manager.io) to automate TLS certificate management.

First, install cert-manager's CRDs.

```console
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.0/cert-manager.crds.yaml
```

Then add the Helm repository, which contains the cert-manager Helm chart, and install the charts:

```console
helm repo add cert-manager https://charts.jetstack.io
helm repo update
helm install my-cert-manager cert-manager/cert-manager \
    --create-namespace \
    --namespace cert-manager \
    --version v1.8.0
```

### STUNner

Install the STUNner gateway operator and STUNner via [Helm](https://github.com/l7mp/stunner-helm):

```console
helm repo add stunner https://l7mp.io/stunner
helm repo update
helm install stunner-gateway-operator stunner/stunner-gateway-operator --create-namespace --namespace=stunner-system
helm install stunner stunner/stunner --create-namespace --namespace=stunner
```

Configure STUNner to act as a STUN/TURN server to clients, and route all received media to the Mediaserver server pods.
Deploy the following resrouce with kubectl apply

```yaml
echo 'apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GatewayClass
metadata:
  name: stunner-gatewayclass
spec:
  controllerName: "stunner.l7mp.io/gateway-operator"
  parametersRef:
    group: "stunner.l7mp.io"
    kind: GatewayConfig
    name: stunner-gatewayconfig
    namespace: stunner
  description: "STUNner is a WebRTC ingress gateway for Kubernetes"' | kubectl apply -f -
```

```yaml
echo 'apiVersion: stunner.l7mp.io/v1alpha1
kind: GatewayConfig
metadata:
  name: stunner-gatewayconfig
  namespace: stunner
spec:
  realm: stunner.l7mp.io
  authType: plaintext
  userName: "user-1"
  password: "pass-1"' | kubectl apply -f -
```

```yaml
echo "apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: udp-gateway
  namespace: stunner
spec:
  gatewayClassName: stunner-gatewayclass
  listeners:
    - name: udp-listener
      port: 3478
      protocol: UDP" | kubectl apply -n stunner -f -
```
```yaml
echo "apiVersion: gateway.networking.k8s.io/v1alpha2
kind: UDPRoute
metadata:
  name: livekit-media-plane
  namespace: stunner
spec:
  parentRefs:
    - name: udp-gateway
  rules:
    - backendRefs:
      - group: ""
        kind: Service
        name: mediasoup-server
        namespace: mediasoup" | kubectl apply -n stunner -f -
```

Once the Gateway resource is installed into Kubernetes, STUNner will create a Kubernetes LoadBalancer for the Gateway to expose the TURN server on UDP:3478 to clients. It can take up to a minute for Kubernetes to allocate a public external IP for the service.

Wait until Kubernetes assigns an external IP and store the external IP assigned by Kubernetes to
STUNner in an environment variable for later use.

```console
until [ -n "$(kubectl get svc udp-gateway -n stunner -o jsonpath='{.status.loadBalancer.ingress[0].ip}')" ]; do sleep 1; done
export STUNNERIP=$(kubectl get service udp-gateway -n stunner -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
```

### Mediasoup

- build the container image as documented above and
  - replace the **ip for MEDIASOUP_CLIENT_ICESERVER_URL in server/Dockerfile with $STUNNERIP and change MEDIASOUP_CLIENT_PROTOOPORT=443**
  - repalce ENV MEDIASOUP_CLIENT_ICESERVER_USER=user-1 and ENV MEDIASOUP_CLIENT_ICESERVER_PASS=pass-1 with the user/pass you have configured for Stunner

- create the mediasoup namespace

```console
kubectl create namespace mediasoup
```
 
- deploy mediasoup on Kubernetes

```yaml
echo "kind: Deployment
metadata:
  labels:
    app.kubernetes.io/name: mediasoup-server
  name: mediasoup-server
  namespace: mediasoup
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app.kubernetes.io/name: mediasoup-server
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      labels:
        app.kubernetes.io/name: mediasoup-server
    spec:
      containers:
      - env:
        - name: PROTOO_LISTEN_PORT
          value: "443"
        image: mediasoup-demo-docker
        imagePullPolicy: IfNotPresent
        name: mediasoup-server
        ports:
        - containerPort: 80
          name: http
          protocol: TCP
        - containerPort: 443
          name: https
          protocol: TCP
        resources: {}
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30" | kubectl apply -n mediasoup -f -
```
- create mediasoup service on Kubernetes

```yaml
echo "apiVersion: v1
kind: Service
metadata:
  name: mediasoup-server
  namespace: mediasoup
spec:
  ports:
  - name: https-443
    port: 443
    protocol: TCP
    targetPort: 443
  selector:
    app.kubernetes.io/name: mediasoup-server
  type: ClusterIP" | kubectl apply -n mediasoup -f -
```

- Create a dns entry for mediasoup that point to the public ip address of nginx ingress
  
```
kubectl -n ingress-nginx get svc 
NAME                                 TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)                      AGE
ingress-nginx-controller-admission   ClusterIP      10.0.23.140    <none>        443/TCP                      6d21h
ingress-nginx-controller             LoadBalancer   10.0.23.194   100.100.100.101   80:30947/TCP,443:31839/TCP   6d21h
```

> use the external ip to create you dns entry, eg: mediasoup.yourdomain.com -> A record to 100.100.100.101

- Create a clusterissuer to automate the certificate for you ingress

```yaml
echo "apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  generation: 1
  name: letsencrypt-prod
spec:
  acme:
    email: info@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-secret-prod
    server: https://acme-v02.api.letsencrypt.org/directory
    solvers:
    - http01:
        ingress:
          class: nginx" | kubectl apply -f -
```

- Create an ingress for mediasoup

```yaml
echo "apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/backend-protocol: HTTPS
  name: mediasoup-server
  namespace: mediasoup
spec:
  rules:
  - host: mediasoup.yourdomain.com
    http:
      paths:
      - backend:
          service:
            name: mediasoup-server
            port:
              number: 443
        path: /
        pathType: Prefix
  tls:
  - hosts:
    - mediasoup.yourdomain.com
    secretName: mediasoup-demo-tls" | kubectl apply -n mediasoup -f -
```

## Kubernetes - How to test

- Check that your mediaserver pod is started

```console
kubectl -n mediasoup get pod -o wide
NAME                               READY   STATUS    RESTARTS   AGE   IP            NODE           NOMINATED NODE   READINESS GATES
mediasoup-server-7bbcd6879-kgsv6   1/1     Running   0          80m   10.80.63.71   aks-nodepool   <none>           <none>
```
> Status should be **running**

- Review the log of the mediasoup server

```console
kubectl -n mediasoup logs -l app.kubernetes.io/name --tail=10000
running mediasoup-demo server.js with ip 10.80.63.71
process.env.DEBUG: *INFO* *WARN* *ERROR*
config.js:
{
  "https": {
    "listenIp": "0.0.0.0",
    "listenPort": "443",
    "tls": {
      "cert": "/service/certs/fullchain.pem",
      "key": "/service/certs/privkey.pem"
    }
  },
```
> the ip after "running mediasoup-demo server.js with ip" **should be the ip of the mediaserver pod**

- check you mediasoup service

```console
kubectl -n mediasoup get service mediasoup-server 
NAME               TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)   AGE
mediasoup-server   ClusterIP   10.0.47.100   <none>        443/TCP   5d16h
```

-  check your mediasoup ingress

```console
kubectl -n mediasoup get ingress mediasoup-server 
NAME               CLASS    HOSTS                            ADDRESS       PORTS     AGE
mediasoup-server   <none>   mediasoup.youdomain.com          100.100.100.101   80, 443   5d16h
```

-  check if certmanager generated a Letencrypt cert for your mediasoup ingress

```console
kubectl -n mediasoup get certificate
NAME                 READY   SECRET               AGE
mediasoup-demo-tls   True    mediasoup-demo-tls   77m
```
- Open a brower to https://mediasoup.youdomain.com, you should get the mediasoup client demo app

![image](https://github.com/damhau/mediasoup-demo-docker/assets/14148364/41d8b667-7382-4ecf-b1d8-2179d8328b0c)


- Open chrome://webrtc-internals/ in chrome the two webrtc stream should be like this

```
- ICE connection state: new => completed
Connection state: new => connected
Signaling state: new => stable
ICE Candidate pair: 10.19.0.2:55286 <=> 10.19.0.3:44444
```
> The ip address should be the private ip address of the mediasoup pod and coturn pod

- The Ice candidate grid should look like this
  
![image](https://github.com/damhau/mediasoup-demo-docker/assets/14148364/f0e9e518-4dc0-4d50-92d2-048c3cf6698b)

- In the Mediasoup client demo app click on the link **Invitation Link** and open this link from another computer or you mobile phone

- Both device should be in the Room



