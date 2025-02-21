const startStreamBtn = document.getElementById("startStream");
const stopStreamBtn = document.getElementById("stopStream");
const videoElement = document.getElementById("liveVideo");
const shareLinkInput = document.getElementById("shareLink");
const shareLinkContainer = document.getElementById("shareLinkContainer");

let stream;
let streamId = null;

// Get logged-in user data
const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
const bookingId = 7;

if (!bookingId) {
    alert("❌ No booking ID found for the logged-in user.");
}

// 🟢 Start Streaming
startStreamBtn.addEventListener("click", async () => {
    if (!bookingId) {
        alert("⚠️ Cannot start stream without a valid booking ID.");
        return;
    }

    try {
        // 1. Access camera and microphone
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoElement.srcObject = stream;
        console.log("✅ Media stream started");

        // 2. Create live stream in the backend
        const response = await fetch("http://localhost:8080/live-streams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                bookingId: bookingId,
                streamUrl: `https://media-server.com/live/booking-${bookingId}.m3u8`,
                status: "ACTIVE"
            })
        });

        if (response.ok) {
            const data = await response.json();
            streamId = data.id;

            // 3. Display the shareable link
            shareLinkInput.value = data.streamUrl;
            shareLinkContainer.style.display = "block";

            console.log("📡 Stream started with ID:", streamId);
        } else {
            const errorData = await response.json();
            alert(`❌ Failed to start stream: ${errorData.message}`);
        }

        startStreamBtn.disabled = true;
        stopStreamBtn.disabled = false;
    } catch (error) {
        console.error("⚠️ Error accessing media devices:", error);
        alert("Failed to access camera or microphone.");
    }
});

// 🔴 Stop Streaming
stopStreamBtn.addEventListener("click", async () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
        console.log("⏹️ Media stream stopped.");
    }

    if (streamId) {
        await fetch(`http://localhost:8080/live-streams/${streamId}/status?status=STOPPED`, {
            method: "PATCH"
        });

        console.log("🛑 Stream stopped with ID:", streamId);
        streamId = null;
    }

    startStreamBtn.disabled = false;
    stopStreamBtn.disabled = true;
});

// 📋 Copy Link to Clipboard
document.getElementById("copyLink").addEventListener("click", () => {
    shareLinkInput.select();
    document.execCommand("copy");
    alert("📎 Live stream link copied to clipboard!");
});
