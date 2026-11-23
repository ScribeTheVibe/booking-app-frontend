document.querySelectorAll("[data-password-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "Slėpti" : "Rodyti";
    button.setAttribute("aria-label", show ? "Slėpti slaptažodį" : "Rodyti slaptažodį");
  });
});

const registerForm = document.getElementById("register-form");
if (registerForm) {
  const password = document.getElementById("register-password");
  const confirm = document.getElementById("register-confirm");
  const error = document.getElementById("password-error");

  registerForm.addEventListener("submit", (event) => {
    if (password.value !== confirm.value) {
      event.preventDefault();
      error.textContent = "Slaptažodžiai nesutampa.";
      confirm.setAttribute("aria-invalid", "true");
      confirm.focus();
      return;
    }
    error.textContent = "";
    confirm.removeAttribute("aria-invalid");
  });
}
