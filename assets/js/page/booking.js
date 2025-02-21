document.getElementById("booking-form").addEventListener("submit", async function(event) {
    event.preventDefault();

    let eventType = document.getElementById("eventType").value;
    let bookingDate = document.getElementById("bookingDate").value;
    let address = document.getElementById("address").value;

    if (!eventType || !bookingDate || !address.trim()) {
        document.getElementById("error-message").style.display = "block";
        return;
    }

    let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};

    if (!loggedInUser?.userId) {
        alert("User not logged in. Please log in first.");
        return;
    }
    
    let bookingData = {
        user: { id: loggedInUser.userId },
        eventType,
        bookingDate,
        address,
        status: "PENDING"
    };

    console.log("Booking Payload:", JSON.stringify(bookingData, null, 2));

    try {
        let response = await fetch("http://localhost:8080/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bookingData)
        });
    
        let responseData = await response.json();
        console.log("Server Response:", responseData);
    
        if (response.ok) {
            document.getElementById("success-message").style.display = "block";

            // Get userRole from localStorage or the server response
            let userRole = loggedInUser.role || responseData.user?.role;

            setTimeout(() => {
                if (userRole?.toUpperCase() === "ADMIN") {
                    window.location.href = "admin.html";
                } else if (userRole?.toUpperCase() === "CUSTOMER") {
                    window.location.href = "dashboard.html";
                } else {
                    alert("Role not recognized. Redirecting to dashboard.");
                    window.location.href = "dashboard.html";
                }
            }, 2000);
            
        } else {
            alert(`Booking failed: ${responseData.message ?? "Unknown error"}`);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to connect to the server. Try again later.");
    }
});
