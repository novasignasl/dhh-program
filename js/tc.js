<script>
document.addEventListener('click', function(e) {
  const chip = e.target.closest('.routine-chip');
  if (!chip) return;

  e.preventDefault();

  const iframe = document.querySelector('iframe[name="routineFrame"]');
  const playNote = document.getElementById('playNote');

  iframe.src = chip.href;

  localStorage.setItem('lastVehiclesChip', chip.href);

  if (playNote) {
    playNote.style.display = "none";
  }

  document.querySelectorAll('.routine-chip').forEach(c => {
    c.classList.remove('active');
  });

  chip.classList.add('active');
});

window.addEventListener('load', function() {
  const last = localStorage.getItem('lastVehiclesChip');
  if (!last) return;

  const chip = [...document.querySelectorAll('.routine-chip')]
    .find(c => c.href === last);

  if (!chip) return;

  chip.classList.add('active');

  const iframe = document.querySelector('iframe[name="routineFrame"]');
  if (iframe) {
    iframe.src = last;
  }
});
</script>
