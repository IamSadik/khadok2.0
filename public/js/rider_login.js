const loginForm = document.getElementById("loginForm");
const emailField = document.getElementById("log-email");
const passField  = document.getElementById("log-pass");

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = emailField.value.trim();
  const password = passField.value;
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.sessionId && data.user.role === "rider") {
      localStorage.setItem("sessionId", data.sessionId);
      localStorage.setItem("rider_id", data.user.id);
      window.location.href = data.redirect || "/rider/dashboard";
    } else {
      alert(data.message || "Login failed.");
    }
  } catch (err) {
    console.error("Rider login error:", err);
    alert("Something went wrong.");
  }
});
