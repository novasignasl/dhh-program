<script>
const player = new Vimeo.Player(document.getElementById('vimeo-player'));

const currentChapter = document.getElementById('currentChapter');
const chips = document.querySelectorAll('.chip');
const speedButtons = document.querySelectorAll('.speed-btn');
const chapterToggle = document.getElementById('chapterToggle');
const chapterChips = document.getElementById('chapterChips');

let selectedSpeed = 1;

const chapters = [
  {time:0, label:'Bathtub is Filling Up'},
  {time:10, label:'Bathroom?'},
  {time:20, label:'Dirty need bath'},
  {time:30, label:'Clothes Off'},
  {time:40, label:'Water OK?'}
];

chapterToggle.addEventListener('click', () => {
  const isCollapsed = chapterChips.classList.toggle('collapsed');

  chapterToggle.setAttribute('aria-expanded', !isCollapsed);

  chapterToggle.textContent = isCollapsed
    ? 'Show Chapters ▼'
    : 'Hide Chapters ▲';
});

function setSpeed(speed){
  selectedSpeed = speed;

  speedButtons.forEach(btn => btn.classList.remove('active'));

  document
    .querySelector(`.speed-btn[data-speed="${speed}"]`)
    .classList.add('active');

  player.setPlaybackRate(speed).catch(() => {});
}

speedButtons.forEach(button => {
  button.addEventListener('click', () => {
    setSpeed(parseFloat(button.dataset.speed));
  });
});

function setActiveChapter(index){
  chips.forEach(chip => chip.classList.remove('active'));

  if(chips[index]){
    chips[index].classList.add('active');
    currentChapter.textContent = chapters[index].label;
  }
}

chips.forEach((chip,index)=>{
  chip.addEventListener('click',()=>{
    player.setPlaybackRate(selectedSpeed).catch(() => {});

    player.setCurrentTime(chapters[index].time)
      .then(()=>player.play());

    setActiveChapter(index);
  });
});

player.on('timeupdate', data => {
  let activeIndex = 0;

  for(let i=0;i<chapters.length;i++){
    if(data.seconds >= chapters[i].time){
      activeIndex = i;
    }
  }

  setActiveChapter(activeIndex);
});
</script>