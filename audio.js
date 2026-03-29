let audioInitialise = false;

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
    sons.wolf.volume = 0.5;
}
function audioMorning(){
    sons.morning.play();
    sons.morning.volume = 0.2;
}
document.addEventListener('click', debloquerAudio, { once: true });
