// js/player.js
(function(){

  const lessonDataEl = document.getElementById('lessonData');
  const iframe = document.getElementById('vimeo-player');
  const playerRoot = document.querySelector('.asl-player');

  if(!lessonDataEl || !iframe || !playerRoot || typeof Vimeo === 'undefined'){
    console.log('Player setup missing lesson data, iframe, player root, or Vimeo API.');
    return;
  }

  const lessonData = JSON.parse(lessonDataEl.textContent);
  const signs = lessonData.signs || [];

  const player = new Vimeo.Player(iframe);

  let selectedSpeed = 1;

  playerRoot.innerHTML = `
    <div class="chapter-status" aria-live="polite">
      Now Practicing:
      <strong id="currentSign"></strong>
    </div>

    <div class="speed-row">
      <span class="speed-label">Practice Speed:</span>

      <div class="speed-pills">
        <button type="button" class="speed-btn" data-speed="0.5">Slow</button>
        <button type="button" class="speed-btn" data-speed="0.75">Med</button>
        <button type="button" class="speed-btn active" data-speed="1">Normal</button>
        <button type="button" class="speed-btn" data-speed="1.25">Fast</button>
      </div>
    </div>

    <div class="video-wrapper"></div>

    <div id="signToggleContainer"></div>
    <div class="sign-chips" id="signChips"></div>
  `;

  document.querySelector('.video-wrapper').appendChild(iframe);

  const currentSign = document.getElementById('currentSign');
  const signChips = document.getElementById('signChips');
  const speedButtons = document.querySelectorAll('.speed-btn');
  const signToggleContainer = document.getElementById('signToggleContainer');

  function setInitialSign(){
    if(signs[0]){
      currentSign.textContent = signs[0].label || signs[0].chip;
    }
  }

  function createSignButtons(){
    signChips.innerHTML = '';

    signs.forEach((sign, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sign-chip';
      button.innerHTML = `${sign.icon || ''} ${sign.chip || sign.label}`;

      if(index === 0){
        button.classList.add('active');
      }

      button.addEventListener('click', () => {
        player.setPlaybackRate(selectedSpeed).catch(() => {});

        player.setCurrentTime(sign.time)
          .then(() => player.play());

        setActiveSign(index);
      });

      signChips.appendChild(button);
    });
  }

  function createSignToggle(){
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'signToggle';
    toggle.className = 'sign-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = `Show Signs (${signs.length}) ▼`;

    signChips.classList.add('collapsed');

    toggle.addEventListener('click', () => {
      const isCollapsed = signChips.classList.toggle('collapsed');

      toggle.setAttribute('aria-expanded', !isCollapsed);

      toggle.textContent = isCollapsed
        ? `Show Signs (${signs.length}) ▼`
        : `Hide Signs (${signs.length}) ▲`;
    });

    signToggleContainer.appendChild(toggle);
  }

  function setActiveSign(index){
    const chips = document.querySelectorAll('.sign-chip');

    chips.forEach(chip => chip.classList.remove('active'));

    if(chips[index]){
      chips[index].classList.add('active');
      currentSign.textContent = signs[index].label || signs[index].chip;
    }
  }

  function setSpeed(speed){
    selectedSpeed = speed;

    speedButtons.forEach(btn => btn.classList.remove('active'));

    const activeBtn = document.querySelector(`.speed-btn[data-speed="${speed}"]`);

    if(activeBtn){
      activeBtn.classList.add('active');
    }

    player.setPlaybackRate(speed).catch(() => {});
  }

  speedButtons.forEach(button => {
    button.addEventListener('click', () => {
      setSpeed(parseFloat(button.dataset.speed));
    });
  });

  player.on('timeupdate', data => {
    let activeIndex = 0;

    for(let i = 0; i < signs.length; i++){
      if(data.seconds >= signs[i].time){
        activeIndex = i;
      }
    }

    setActiveSign(activeIndex);
  });

  setInitialSign();
  createSignButtons();
  createSignToggle();

})();