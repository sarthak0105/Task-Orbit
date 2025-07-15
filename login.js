document.addEventListener("DOMContentLoaded", function () {
  // Function to toggle password visibility
  const passwordInput = document.getElementById("password");  // The input field for password
  const toggleIcon = document.getElementById("toggle-icon");  // The image icon element for toggling visibility

  // Ensure toggleIcon exists to avoid errors
  if (toggleIcon && passwordInput) {
    toggleIcon.addEventListener("click", function () {
      // Toggle password visibility by changing the input type
      const passwordType = passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", passwordType);

      // Change the icon depending on the visibility
      if (passwordType === "password") {
        toggleIcon.src = "./public/PngItem_4950508.png";  // Closed eye icon (password hidden)
      } else {
        toggleIcon.src = "./public/PngItem_3409718.png";  // Open eye icon (password visible)
      }
    });
  }

  // Handle the form submission for login
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault(); // Prevent the default form submission behavior

      // Get values from input fields
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = passwordInput.value;

      // Basic validation: Ensure all fields are filled
      if (!name || !email || !password) {
        alert("Please fill in all fields");
        return;
      }

      // Submit the form normally once validation passes
      this.submit();  
    });
  }
});
