const updatedElement = document.getElementById("last-updated");

if (updatedElement) {
  const now = new Date();
  updatedElement.textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(now);
}
