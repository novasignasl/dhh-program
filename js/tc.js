document.addEventListener("click", function (e) {
  const chip = e.target.closest(".routine-chip");
  if (!chip) return;

  e.preventDefault();

  const iframe = document.querySelector('iframe[name="routineFrame"]');
  const playNote = document.getElementById("playNote");

  if (!iframe) return;

  iframe.src = chip.href;

  localStorage.setItem("lastRoutineChip", chip.href);

  if (playNote) {
    playNote.style.display = "none";
  }

  document.querySelectorAll(".routine-chip").forEach(function (c) {
    c.classList.remove("active");
  });

  chip.classList.add("active");
});

window.addEventListener("load", function () {
  const last = localStorage.getItem("lastRoutineChip");
  if (!last) return;

  const chip = Array.from(document.querySelectorAll(".routine-chip"))
    .find(function (c) {
      return c.href === last;
    });

  if (!chip) return;

  chip.classList.add("active");

  const iframe = document.querySelector('iframe[name="routineFrame"]');

  if (iframe) {
    iframe.src = last;
  }
});
