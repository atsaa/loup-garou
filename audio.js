let audioInitialise = false;
let defaultSons = document.querySelector('.volume-bar');
let defaultVolume = JSON.parse(localStorage.getItem("volume"))/100;
const sons = {
            wolf: new Audio("music/wolf.mp3"),
            morning: new Audio("music/rooster.mp3"),
            chasseur: new Audio("music/chasseurTir.mp3"),
            room: new Audio("music/Homeroom.mp3"),
            jour: new Audio("music/sonGame.mp3"),
            nuit: new Audio("music/osynthw-midnight.mp3"),
            };
const silencePassePartout = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");

function debloquerAudio() {
    if (audioInitialise) return;
    silencePassePartout.play();
    silencePassePartout.pause();
    audioInitialise = true;
    console.log("Audio débloqué pour tous les sons !");
    Object.values(sons).forEach(item=>{item.volume = defaultVolume;});
    sons.jour.loop = true;
}

function audioLancement(){
    Object.values(sons).forEach(item=>{item.pause(); item.currentTime = 0;})
    sons.wolf.play();
    sons.wolf.volume = defaultVolume;
}

function audioMorning(){
    sons.morning.play();
    sons.morning.volume = defaultVolume;
}

function audioChasseur(){
    sons.chasseur.play();
    sons.chasseur.volume = defaultVolume;
}

function audioRoom(){
    Object.values(sons).forEach(item=>{item.pause(); item.currentTime = 0;})
    sons.room.play();
}

function audioNight(){
    Object.values(sons).forEach(item=>{item.pause(); item.currentTime = 0;})
    sons.nuit.play();
}

function audioJour(){
    Object.values(sons).forEach(item=>{item.pause(); item.currentTime = 0;})
    audioMorning();
    sons.morning.addEventListener('ended', ()=>{
        sons.jour.play();
    })
}

function modifierAudioVolume(value){
    console.log(value);
    sons.morning.volume = value;
    sons.wolf.volume = value;
}

document.addEventListener('click', debloquerAudio, { once: true });

const volumeBar = document.querySelector('.volume-bar');

volumeBar.addEventListener('input', (e) => {
  const valeur = e.target.value;
  modifierAudioVolume(valeur / 100);
  localStorage.setItem("volume", JSON.stringify(valeur));
});

function defaultVolumeFunc(){
 console.log(defaultVolume);
    if (defaultVolume)
        defaultSons.value = defaultVolume*100;
    else
        defaultVolume = 0.5;
}