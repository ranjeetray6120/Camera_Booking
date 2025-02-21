document.addEventListener("DOMContentLoaded", function () {
    let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    if (loggedInUser) {
        document.getElementById("user-name").innerText = `${loggedInUser.name} (${loggedInUser.role})`;
        document.getElementById("user-email").innerText = `Email: ${loggedInUser.email}`;
        document.getElementById("user-email").style.display = "block";

        document.getElementById("logout-btn").style.display = "block";
        document.getElementById("login-link").style.display = "none";
        document.getElementById("register-link").style.display = "none";
    } else {
        document.getElementById("user-name").innerText = "Guest";
        document.getElementById("logout-btn").style.display = "none";
        document.getElementById("login-link").style.display = "block";
        document.getElementById("register-link").style.display = "block";
    }

    // Logout function
    document.getElementById("logout-btn").addEventListener("click", function () {
        localStorage.removeItem("loggedInUser");
        window.location.href = "login.html";
    });
});

function redirectToBooking() {
    let user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!user) {
        alert("Please log in before booking.");
        window.location.href = "login.html";
        return;
    }
    window.location.href = "booking.html";
}

function redirectToLiveStream() {
    window.location.href = "live-stream.html";
}