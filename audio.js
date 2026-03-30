let audioInitialise = false;
let defaultSons = JSON.parse(localStorage.getItem("volume"));

const sons = {
            wolf: new Audio("music/wolf.mp3"),
            morning: new Audio("music/rooster.mp3"),
            };
const silencePassePartout = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");

function debloquerAudio() {
    if (audioInitialise) return;
    silencePassePartout.play();
    silencePassePartout.pause();
    audioInitialise = true;
    console.log("Audio débloqué pour tous les sons !");
}

function audioLancement(){
    sons.wolf.play();
    if (defaultVolume) {
        sons.wolf.volume = defaultVolume;   
    }
    else
        sons.wolf.volume = 0.5
}

function audioMorning(){
    sons.morning.play();
    if (defaultVolume) {
        sons.morning.volume = defaultVolume;
    }
    else
        sons.morning.volume = defaultSons;
}

document.addEventListener('click', debloquerAudio, { once: true });

const volumeBar = document.querySelector('.volume-bar');

volumeBar.addEventListener('input', (e) => {
  const valeur = e.target.value;
  console.log("Volume actuel :", valeur);
  localStorage.setItem("volume",JSON.stringify(valeur));
});