const joinButton = document.getElementById('joinButton');
let isJoined = false;
let peerConnection = null;
let ws = null;
let videoStream = null;
let statsInterval = null;

document.getElementById('streamIdInput').addEventListener('input', function() {
    joinButton.disabled = !this.value.trim();
});

function initializeWebSocket(callback) {
    if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        ws = new WebSocket('ws://localhost:8080/ws');
        ws.onopen = () => {
            console.log('WebSocket connection opened');
            callback();
        };
        ws.onmessage = handleWebSocketMessage;
        ws.onerror = () => {
            console.error('WebSocket error occurred');
            alert('Failed to connect to WebSocket server. Please check the server and try again.');
            leaveStream();
        };
        ws.onclose = () => {
            console.log('WebSocket closed');
            if (isJoined) leaveStream();
        };
    } else if (ws.readyState === WebSocket.OPEN) {
        callback();
    }
}

function joinStream(streamId) {
    if (isJoined || !streamId) {
        if (!streamId) alert('Please enter a valid Stream ID');
        return;
    }

    console.log('Joining stream with ID:', streamId);
    isJoined = true;
    joinButton.textContent = 'Joining...';
    joinButton.disabled = true;

    initializeWebSocket(() => {
        peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        peerConnection.ontrack = event => {
            console.log('Received tracks:', event.streams);
            console.log('Track details:', event.track, 'Enabled:', event.track.enabled, 'Muted:', event.track.muted);
            const video = document.getElementById('video');
            if (!videoStream) {
                videoStream = event.streams[0];
                video.srcObject = videoStream;
                video.style.display = 'block';
                video.muted = false;
                video.play().then(() => console.log('Video started playing'))
                       .catch(err => console.error('Initial play error:', err));
                video.onplay = () => console.log('Video started playing');
                video.onpause = () => console.log('Video paused');
                video.onerror = (e) => console.error('Video error:', e);
            }
            event.track.onunmute = () => {
                console.log('Track unmuted:', event.track);
                if (video.srcObject) {
                    video.play().catch(err => console.error('Error playing video after unmute:', err));
                }
            };
            event.track.onmute = () => console.log('Track muted:', event.track);
        };

        peerConnection.onicecandidate = event => {
            if (event.candidate && ws.readyState === WebSocket.OPEN) {
                console.log('Sending ICE candidate:', event.candidate);
                ws.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate, streamId }));
            } else if (!event.candidate) {
                console.log('ICE candidate gathering complete');
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState === 'failed') {
                console.error('ICE connection failed');
                alert('Failed to establish connection to the stream. Please try again.');
                leaveStream();
            }
        };

        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);
            if (peerConnection.connectionState === 'connected' && !statsInterval) {
                statsInterval = setInterval(async () => {
                    const stats = await peerConnection.getStats();
                    stats.forEach(report => {
                        if (report.type === 'inbound-rtp') {
                            console.log('Inbound RTP stats:', {
                                kind: report.kind,
                                bytesReceived: report.bytesReceived,
                                framesDecoded: report.framesDecoded,
                                packetsReceived: report.packetsReceived,
                                timestamp: report.timestamp
                            });
                        }
                    });
                }, 2000);
            }
        };

        console.log('Sending viewStream message');
        ws.send(JSON.stringify({ type: 'viewStream', streamId }));

        peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
            .then(offer => {
                console.log('Created SDP offer:', offer);
                return peerConnection.setLocalDescription(offer);
            })
            .then(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    const sdpOffer = peerConnection.localDescription.sdp;
                    console.log('SDP offer to send:', sdpOffer);
                    if (!streamId || !sdpOffer) {
                        console.error('Missing streamId or SDP:', { streamId, sdp: sdpOffer });
                        alert('Failed to prepare stream connection. Please try again.');
                        leaveStream();
                        return;
                    }
                    const message = { type: 'sdpOffer', streamId, sdp: sdpOffer };
                    console.log('Sending SDP offer message:', message);
                    ws.send(JSON.stringify(message));
                } else {
                    console.error('WebSocket closed unexpectedly');
                    alert('WebSocket connection lost. Please try again.');
                    leaveStream();
                }
            })
            .catch(err => {
                console.error('Error creating SDP offer:', err);
                alert('Error preparing stream connection. Please try again.');
                leaveStream();
            });
    });
}

function leaveStream() {
    if (!isJoined) return;

    console.log('Leaving stream');
    isJoined = false;
    joinButton.textContent = 'Leaving...';
    joinButton.disabled = true;

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'leaveStream', streamId: document.getElementById('streamIdInput').value }));
        ws.close();
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
    }

    const video = document.getElementById('video');
    video.srcObject = null;
    video.style.display = 'none';
    videoStream = null;

    document.getElementById('placeholder').style.display = 'block';
    document.getElementById('streamIdInput').value = '';
    joinButton.textContent = 'Join Stream';
    joinButton.disabled = true;
}

function handleWebSocketMessage(event) {
    const message = JSON.parse(event.data);
    console.log('Received message:', message);
    if (message.type === 'viewerConnected') {
        console.log('Viewer connected to stream');
    } else if (message.type === 'sdpAnswer') {
        peerConnection.setRemoteDescription({ type: 'answer', sdp: message.sdp })
            .then(() => {
                console.log('SDP answer set successfully');
                joinButton.textContent = 'Leave Stream';
                joinButton.disabled = false;
                document.getElementById('placeholder').style.display = 'none';
            })
            .catch(err => console.error('Error setting SDP answer:', err));
    } else if (message.type === 'iceCandidate') {
        console.log('Received ICE candidate:', message.candidate);
        peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate))
            .catch(err => console.error('Error adding ICE candidate:', err));
    } else if (message.type === 'error') {
        console.error('Server error:', message.message);
        alert(`Error: ${message.message}`);
        leaveStream();
    } else if (message.type === 'viewerDisconnected') {
        console.log('Viewer disconnected from stream');
        leaveStream();
    }
}

joinButton.addEventListener('click', () => {
    if (!isJoined) {
        const streamId = document.getElementById('streamIdInput').value.trim();
        if (!streamId) {
            alert('Please enter a valid Stream ID');
            return;
        }
        joinStream(streamId);
    } else {
        leaveStream();
    }
});

const urlParams = new URLSearchParams(window.location.search);
const initialStreamId = urlParams.get('streamId');
if (initialStreamId) {
    document.getElementById('streamIdInput').value = initialStreamId;
    joinButton.disabled = false;
}