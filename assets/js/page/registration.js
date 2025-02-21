document.getElementById("registrationForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    let name = document.getElementById("name").value;
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;
    let role = document.getElementById("role").value;
    let mobile = document.getElementById("mobile").value;

    try {
        let response = await fetch("http://localhost:8080/api/users/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                role: role,
                mobileNumber: mobile
            })
        });


        if (!response.ok) {
            throw new Error("Registration failed");
        }

        let result = await response.json();
        document.getElementById("message").textContent = result.message;
        document.getElementById("message").style.color = "#4CAF50";

        setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 2000); // 2-second delay to show success message

    } catch (error) {
        document.getElementById("message").textContent = "Error: " + error.message;
        document.getElementById("message").style.color = "red";
    }

   

});