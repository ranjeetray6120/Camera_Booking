// 🌟 Global Variables
let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
let bookings = [];
let viewbookings = [];

// 🚀 Fetch all bookings and separate by status
async function fetchBookings() {
    try {
        const response = await fetch('http://localhost:8080/bookings'); // Fetch all bookings
        if (!response.ok) throw new Error('Failed to fetch bookings.');
        const allBookings = await response.json();

        // Separate bookings by status
        bookings = allBookings.filter(booking => booking.status === 'PENDING');
        viewbookings = allBookings.filter(booking => booking.status === 'APPROVED');

        // Store bookings in localStorage
        localStorage.setItem('bookings', JSON.stringify(bookings));
        localStorage.setItem('viewbookings', JSON.stringify(viewbookings));

        // Populate tables
        populateManageTable(bookings);
        populateViewTable(viewbookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        alert('Failed to load bookings. Check the console for details.');
    }
}

// 🟢 Manage Bookings: Approve/Reject Actions
function populateManageTable(bookings) {
    const tbody = document.querySelector('#manage-booking-table tbody');
    if (!tbody) {
        console.error('Table body #manage-booking-table not found.');
        return;
    }
    tbody.innerHTML = '';

    const today = new Date();
    bookings.forEach(booking => {
        const bookingDate = new Date(booking.bookingDate);

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
function populateViewTable(bookings) {
    const tbody = document.querySelector('#view-booking-table tbody');
    if (!tbody) {
        console.error('Table body #view-booking-table not found.');
        return;
    }
    tbody.innerHTML = '';

    const today = new Date();
    bookings.forEach(booking => {
        const bookingDate = new Date(booking.bookingDate);

        // Show only upcoming bookings
        if (bookingDate >= today) {
            const statusClass = getStatusClass(booking.status);

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
        removeBookingFromStorage(bookingId, status);
        button.closest('tr').remove();
        alert(`Booking ${status.toLowerCase()}d successfully.`);
        fetchBookings(); // Refresh the bookings list
    } catch (error) {
        console.error(`Error updating booking status:`, error);
        alert(`Failed to ${status.toLowerCase()} booking. Check the console for details.`);
    }
}

// ❌ Remove booking from localStorage and arrays after action
function removeBookingFromStorage(bookingId, status) {
    const id = parseInt(bookingId);
    if (status === 'APPROVED' || status === 'REJECTED') {
        bookings = bookings.filter(booking => booking.id !== id);
        localStorage.setItem('bookings', JSON.stringify(bookings));
    }
    // Note: viewbookings is updated via fetchBookings after approval
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
    populateViewTable(viewbookings);
}

// ⚙️ Show Manage Bookings
function showManageBookings() {
    document.getElementById("section-title").textContent = "Manage Bookings";
    toggleSection("manage-booking-section");
    populateManageTable(bookings);
}

// 📚 Toggle sections
function toggleSection(sectionId) {
    const sections = document.querySelectorAll(".content > div");
    sections.forEach(div => div.style.display = "none");
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = "block";
    } else {
        console.error(`Section ${sectionId} not found.`);
    }
}

// 👥 Fetch users and display in the user section
function fetchUsers() {
    fetch("http://localhost:8080/api/users/all")
        .then(response => response.json())
        .then(users => {
            const usersTable = document.getElementById("users-table");
            if (usersTable) {
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
            } else {
                console.error("Users table not found.");
            }
        })
        .catch(error => console.error("Error fetching users:", error));
}

// 🚀 Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchBookings().catch(error => console.error('Failed to load bookings on page load:', error));
});