// 🌟 Global Variables
let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
let bookings = [];

// 🚀 Fetch all bookings
async function fetchBookings() {
    try {
        const response = await fetch('http://localhost:8080/bookings');
        if (!response.ok) throw new Error('Failed to fetch bookings.');
        bookings = await response.json();

        // Store bookings in localStorage
        localStorage.setItem('bookings', JSON.stringify(bookings));

        // Populate tables
        populateManageTable(bookings);
        populateViewTable(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }
}

// 🟢 Manage Bookings: Approve/Reject Actions
function populateManageTable(bookings) {
    const tbody = document.querySelector('#manage-booking-table tbody');
    tbody.innerHTML = '';

    bookings.forEach(booking => {
        const bookingDate = new Date(booking.bookingDate);
        const today = new Date();

        // Show only future bookings for management
        if (bookingDate >= today) {
            const row = `
                <tr>
                    <td>${booking.user?.name || 'N/A'}</td>
                    <td>${booking.eventType || 'N/A'}</td>
                    <td>${booking.bookingDate || 'N/A'}</td>
                    <td>${booking.address || 'N/A'}</td>
                    <td><span class="${getStatusClass(booking.status)}">${booking.status}</span></td>
                    <td>
                        <button class="approve" onclick="updateBookingStatus('${booking.id}', 'APPROVED', this)">Approve</button>
                        <button class="reject" onclick="updateBookingStatus('${booking.id}', 'REJECTED', this)">Reject</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        }
    });
}

// 🔵 View Bookings: Only show upcoming bookings (no action buttons)
// 🔵 View Bookings: Only show upcoming bookings (no action buttons)
function populateViewTable(bookings) {
    const tbody = document.querySelector('#view-booking-table tbody');
    tbody.innerHTML = '';

    bookings.forEach(booking => {
        const bookingDate = new Date(booking.bookingDate);
        const today = new Date();

        // Show only upcoming bookings
        if (bookingDate >= today) {
            const statusClass = getStatusClass(booking.status); // Get the color class based on status

            const row = `
                <tr>
                    <td>${booking.user?.name || 'N/A'}</td>
                    <td>${booking.eventType || 'N/A'}</td>
                    <td>${booking.bookingDate || 'N/A'}</td>
                    <td>${booking.address || 'N/A'}</td>
                    <td><span class="${statusClass} font-semibold">${booking.status}</span></td>
                </tr>
            `;
            tbody.innerHTML += row;
        }
    });
}


// 🌟 Update booking status (Approve/Reject)
async function updateBookingStatus(bookingId, status, button) {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this booking?`)) return;

    try {
        const response = await fetch(`http://localhost:8080/bookings/${bookingId}/status?status=${status}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'
        });

        if (!response.ok) throw new Error(`Failed to ${status.toLowerCase()} booking.`);

        // Update UI after status change
        removeBookingFromStorage(bookingId);
        button.closest('tr').remove();
        alert(`Booking ${status.toLowerCase()}d successfully.`);
    } catch (error) {
        console.error(`Error updating booking status:`, error);
    }
}

// ❌ Remove booking from localStorage after action
function removeBookingFromStorage(bookingId) {
    const updatedBookings = bookings.filter(booking => booking.id !== parseInt(bookingId));
    localStorage.setItem('bookings', JSON.stringify(updatedBookings));
}

// 🎨 Add color based on status
function getStatusClass(status) {
    switch (status) {
        case 'APPROVED': return 'text-green-600';
        case 'REJECTED': return 'text-red-600';
        case 'PENDING': return 'text-yellow-600';
        default: return 'text-gray-600';
    }
}

// 🧍‍♀️ Show Users
function showUsers() {
    document.getElementById("section-title").textContent = "Registered Users";
    toggleSection("user-section");
    fetchUsers();
}

// 📄 Show View Bookings
function showViewBookings() {
    document.getElementById("section-title").textContent = "View Bookings (Upcoming)";
    toggleSection("view-bookings-section");
    populateViewTable(bookings);
}

// ⚙️ Show Manage Bookings
function showManageBookings() {
    document.getElementById("section-title").textContent = "Manage Bookings";
    toggleSection("manage-booking-section");
    populateManageTable(bookings);
}

// 📚 Toggle sections
function toggleSection(sectionId) {
    document.querySelectorAll(".content > div").forEach(div => div.style.display = "none");
    document.getElementById(sectionId).style.display = "block";
}

// 👥 Fetch users and display in the user section
function fetchUsers() {
    fetch("http://localhost:8080/api/users/all")
        .then(response => response.json())
        .then(users => {
            const usersTable = document.getElementById("users-table");
            usersTable.innerHTML = "<tr><th>Name</th><th>Email</th><th>Phone Number</th></tr>";

            users.forEach(user => {
                usersTable.innerHTML += `
                    <tr>
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>${user.mobileNumber}</td>
                        
                    </tr>
                `;
            });
        })
        .catch(error => console.error("Error fetching users:", error));
}

// 🚀 Load data on page load
document.addEventListener('DOMContentLoaded', fetchBookings);
