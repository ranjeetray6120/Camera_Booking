document.addEventListener("DOMContentLoaded", async function () {
    const createAdminForm = document.getElementById("createAdminForm");
    const sidebar = document.querySelector(".sidebar");
    const toggleButton = document.getElementById("sidebarToggle");

    // Sidebar Toggle
    toggleButton.addEventListener("click", function () {
        sidebar.classList.toggle("active");
    });

    // Sidebar Navigation
    document.querySelectorAll(".sidebar a").forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            document.querySelectorAll(".content section").forEach(section => {
                section.style.display = "none";
            });
            document.getElementById(this.getAttribute("href").substring(1)).style.display = "block";
        });
    });

    // Check if Admin Exists
    async function checkAdminExists() {
        try {
            const response = await fetch("http://localhost:8080/api/users/admins");
            if (!response.ok) throw new Error("Failed to fetch admin list");

            const admins = await response.json();
            if (admins.length > 0) {
                document.getElementById("create-admin").style.display = "none";
            }
        } catch (error) {
            console.error("Error:", error.message);
        }
    }
// Create Admin Form
createAdminForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const mobileNumber = document.getElementById("mobile").value.trim(); // Fixed this
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirm-password").value.trim();

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const response = await fetch("http://localhost:8080/api/users/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, mobileNumber, password, role: "ADMIN" }) // Fixed `mobileNumber`
        });

        const responseData = await response.json();
        console.log(responseData); // Debugging

        if (!response.ok) throw new Error(responseData.message || "Failed to create admin");

        alert("Admin created successfully!");
        location.reload();
    } catch (error) {
        alert("Error: " + error.message);
    }
});

    // Display Users
    async function displayUsers() {
        try {
            const response = await fetch("http://localhost:8080/api/users/customers");
            if (!response.ok) throw new Error("Failed to fetch users");

            const users = await response.json();
            const userTableBody = document.querySelector("#userTable tbody");
            userTableBody.innerHTML = "";

            users.forEach(user => {
                userTableBody.innerHTML += `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>${user.mobileNumber}</td>
                        <td><button onclick="deleteUser(${user.id})">Delete</button></td>
                    </tr>`;
            });
        } catch (error) {
            console.error("Error fetching users:", error.message);
        }
    }

    window.deleteUser = async function (userId) {
        if (!confirm("Delete this user?")) return;
        await fetch(`http://localhost:8080/api/users/delete/${userId}`, { method: "DELETE" });
        displayUsers();
    };

    await checkAdminExists();
    await displayUsers();
});


// Function to fetch and display all admins with delete option
async function displayAdmins() {
    try {
        const response = await fetch("http://localhost:8080/api/users/admins");

        if (!response.ok) {
            throw new Error("Failed to fetch admin data");
        }

        const admins = await response.json();
        const adminTableBody = document.querySelector("#adminTable tbody");
        adminTableBody.innerHTML = ""; // Clear existing rows

        if (admins.length === 0) {
            adminTableBody.innerHTML = "<tr><td colspan='5'>No admins found</td></tr>";
            return;
        }

        admins.forEach(admin => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${admin.id}</td>
                <td>${admin.name}</td>
                <td>${admin.email}</td>
                <td>${admin.mobileNumber}</td>
                <td><button class="delete-btn" data-id="${admin.id}">Delete</button></td>
            `;
            adminTableBody.appendChild(row);
        });

        // Attach delete event listeners to all delete buttons
        document.querySelectorAll(".delete-btn").forEach(button => {
            button.addEventListener("click", function () {
                const adminId = this.getAttribute("data-id");
                deleteAdmin(adminId);
            });
        });

    } catch (error) {
        console.error("Error loading admins:", error);
        alert("Failed to load admin list. Please try again.");
    }
}

// Function to delete an admin
async function deleteAdmin(adminId) {
    if (confirm("Are you sure you want to delete this admin?")) {
        try {
            const response = await fetch(`http://localhost:8080/api/users/delete/${adminId}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Failed to delete admin");
            }

            alert("Admin deleted successfully!");
            displayAdmins(); // Refresh the list

        } catch (error) {
            console.error("Error deleting admin:", error);
            alert("Failed to delete admin. Please try again.");
        }
    }
}

// Call the function when the page loads
document.addEventListener("DOMContentLoaded", displayAdmins);
