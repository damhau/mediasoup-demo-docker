// let protooPort = 4443;
let protooPort = process.env.MEDIASOUP_CLIENT_PROTOOPORT

if (window.location.hostname === 'test.mediasoup.org')
	protooPort = 4444;

export function getProtooUrl({ roomId, peerId, consumerReplicas }) {
	const hostname = window.location.hostname;

	return `wss://${hostname}:${protooPort}/?roomId=${roomId}&peerId=${peerId}&consumerReplicas=${consumerReplicas}`;
}
