// Grab the form and fields
const loginForm = document.getElementById("loginForm");
const emailField = document.getElementById("log-email");
const passField  = document.getElementById("log-pass");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email    = emailField.value.trim();
  const password = passField.value;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",   // Keep your session cookie
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok && data.sessionId) {
      // store session
      localStorage.setItem("sessionId", data.sessionId);

      // store the appropriate user‐type ID
      switch (data.user?.role) {
        case "consumer":
          localStorage.setItem("consumer_id", data.user.id);
          break;
        case "stakeholder":
          localStorage.setItem("stakeholder_id", data.user.id);
          break;
        case "rider":
          localStorage.setItem("rider_id", data.user.id);
          break;
      }

      // redirect
      window.location.href = data.redirect || "/";
    } else {
      alert(data.message || "Login failed.");
    }

  } catch (err) {
    console.error("Login error:", err);
    alert("Something went wrong.");
  }
});



