document.addEventListener("DOMContentLoaded", () => {
    let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (loggedInUser) {
        redirectToDashboard(loggedInUser.role);
    }
});

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = '';

    if (!email || !password) {
        errorMessage.textContent = "Email and Password are required!";
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/users/login', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Store user data in localStorage
        const user = {
            userId: data.userId,
            email: data.email,
            name: data.name,
            role: data.role
        };
        localStorage.setItem('loggedInUser', JSON.stringify(user));

        alert(`Login Successful! Welcome, ${user.name}`);
        redirectToDashboard(user.role);
    } catch (error) {
        errorMessage.textContent = `Login failed: ${error.message}`;
    }
}

function redirectToDashboard(role) {
    if (role === "ADMIN") {
        const choice = confirm("You are an admin. Do you want to go to the Admin Dashboard?");
        if (choice) {
            window.location.href = "admin.html";  // Redirect to admin dashboard
        } else {
            window.location.href = "dashboard.html";  // Redirect to user dashboard
        }
    } else {
        window.location.href = "dashboard.html";  // Default user dashboard
    }
}
