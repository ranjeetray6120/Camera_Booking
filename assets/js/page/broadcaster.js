let ws = null;
    let peerConnection = null;
    let streamId = null;
    let statsInterval = null;
    let pendingIceCandidates = []; // Store ICE candidates until streamId is available

    function initializeWebSocket() {
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
            ws = new WebSocket('ws://localhost:8080/ws');
            ws.onopen = () => console.log('WebSocket connection opened');
            ws.onmessage = handleWebSocketMessage;
            ws.onerror = () => console.error('WebSocket error occurred');
            ws.onclose = (event) => {
                console.log('WebSocket closed with code:', event.code, 'reason:', event.reason);
                if (peerConnection) {
                    peerConnection.close();
                    peerConnection = null;
                }
                if (statsInterval) {
                    clearInterval(statsInterval);
                    statsInterval = null;
                }
                alert('WebSocket connection lost. Please restart the stream.');
            };
        }
    }

    fetch('http://localhost:8080/bookings/status/APPROVED')
        .then(response => response.json())
        .then(bookings => {
            const select = document.getElementById('bookingSelect');
            bookings.forEach(booking => {
                const option = document.createElement('option');
                option.value = booking.id;
                option.text = `Booking ${booking.id}`;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching bookings:', error));

    document.getElementById('startButton').addEventListener('click', () => {
        const bookingId = document.getElementById('bookingSelect').value;
        if (!bookingId) {
            alert('Please select a booking ID');
            return;
        }

        initializeWebSocket();

        // Configure RTCPeerConnection with STUN servers
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        peerConnection = new RTCPeerConnection(configuration);

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                console.log('Media stream obtained:', stream);
                console.log('Tracks in stream:', stream.getTracks());
                document.getElementById('video').srcObject = stream;
                stream.getTracks().forEach(track => {
                    console.log('Adding track to peerConnection:', track);
                    peerConnection.addTrack(track, stream);
                });

                peerConnection.onicecandidate = event => {
                    if (event.candidate) {
                        if (streamId && ws.readyState === WebSocket.OPEN) {
                            console.log('Sending ICE candidate from broadcaster:', event.candidate);
                            ws.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate, streamId }));
                        } else {
                            console.log('Buffering ICE candidate until streamId is available:', event.candidate);
                            pendingIceCandidates.push(event.candidate);
                        }
                    } else {
                        console.log('ICE candidate gathering complete from broadcaster');
                    }
                };

                peerConnection.oniceconnectionstatechange = () => {
                    console.log('ICE connection state:', peerConnection.iceConnectionState);
                    if (peerConnection.iceConnectionState === 'failed') {
                        console.error('ICE connection failed. Restarting ICE...');
                        peerConnection.restartIce();
                    }
                };

                peerConnection.onconnectionstatechange = () => {
                    console.log('Connection state:', peerConnection.connectionState);
                    if (peerConnection.connectionState === 'connected' && !statsInterval) {
                        statsInterval = setInterval(async () => {
                            const stats = await peerConnection.getStats();
                            let statsLogged = false;
                            stats.forEach(report => {
                                if (report.type === 'outbound-rtp') {
                                    console.log('Outbound RTP stats:', {
                                        kind: report.kind,
                                        bytesSent: report.bytesSent,
                                        packetsSent: report.packetsSent,
                                        timestamp: new Date(report.timestamp).toISOString()
                                    });
                                    statsLogged = true;
                                }
                            });
                            if (!statsLogged) {
                                console.log('No outbound RTP stats available yet.');
                            }
                        }, 2000);
                    } else if (peerConnection.connectionState === 'failed') {
                        console.error('Peer connection failed.');
                        alert('Peer connection failed. Please restart the stream.');
                    }
                };

                peerConnection.createOffer({
                    offerToReceiveAudio: false,
                    offerToReceiveVideo: false,
                    voiceActivityDetection: false
                })
                .then(offer => {
                    console.log('Created SDP offer (full):', offer.sdp);
                    return peerConnection.setLocalDescription(offer);
                })
                .then(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        const sdpOffer = peerConnection.localDescription.sdp;
                        console.log('Sending startStream with SDP:', sdpOffer);
                        ws.send(JSON.stringify({ type: 'startStream', bookingId, sdp: sdpOffer }));
                    } else {
                        alert('WebSocket connection is not open. Please try again.');
                    }
                });
            })
            .catch(error => {
                console.error('Error accessing media devices:', error);
                alert('Failed to access camera or microphone. Please check permissions and try again.');
            });
    });

    function handleWebSocketMessage(event) {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        if (message.type === 'streamStarted') {
            streamId = message.streamId;
            document.getElementById('viewerUrl').textContent = `Viewer URL: http://localhost:8080/viewer.html?streamId=${streamId}`;
            document.getElementById('streamIdText').textContent = streamId;
            document.getElementById('copyButton').style.display = 'inline';
            document.getElementById('startButton').disabled = true;
            document.getElementById('endButton').disabled = false;

            // Send any buffered ICE candidates
            if (pendingIceCandidates.length > 0 && ws.readyState === WebSocket.OPEN) {
                pendingIceCandidates.forEach(candidate => {
                    console.log('Sending buffered ICE candidate from broadcaster:', candidate);
                    ws.send(JSON.stringify({ type: 'iceCandidate', candidate, streamId }));
                });
                pendingIceCandidates = [];
            }

            peerConnection.setRemoteDescription({ type: 'answer', sdp: message.sdp })
                .then(() => console.log('Remote SDP set successfully'))
                .catch(err => console.error('Error setting remote SDP:', err));
        } else if (message.type === 'sdpAnswer') {
            peerConnection.setRemoteDescription({ type: 'answer', sdp: message.sdp })
                .then(() => console.log('SDP answer set successfully'))
                .catch(err => console.error('Error setting SDP answer:', err));
        } else if (message.type === 'iceCandidate') {
            console.log('Received ICE candidate from server:', message.candidate);
            peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate))
                .catch(err => console.error('Error adding ICE candidate:', err));
        } else if (message.type === 'error') {
            alert(`Error: ${message.message}`);
        }
    }

    document.getElementById('endButton').addEventListener('click', () => {
        if (peerConnection) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'stopStream', streamId }));
            }
            peerConnection.close();
            peerConnection = null;
            if (statsInterval) {
                clearInterval(statsInterval);
                statsInterval = null;
            }
            document.getElementById('video').srcObject.getTracks().forEach(track => track.stop());
            document.getElementById('video').srcObject = null;
            document.getElementById('startButton').disabled = false;
            document.getElementById('endButton').disabled = true;
            document.getElementById('viewerUrl').textContent = '';
            document.getElementById('streamIdText').textContent = '';
            document.getElementById('copyButton').style.display = 'none';
            streamId = null;
            pendingIceCandidates = [];
        }
    });

    document.getElementById('copyButton').addEventListener('click', () => {
        const streamIdText = document.getElementById('streamIdText').textContent;
        navigator.clipboard.writeText(streamIdText)
            .then(() => alert('Stream ID copied to clipboard!'))
            .catch(err => {
                console.error('Failed to copy stream ID:', err);
                alert('Failed to copy Stream ID.');
            });
    });