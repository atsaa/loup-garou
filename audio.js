let audioInitialise = false;

const sons = {
            wolf: new Audio("music/wolf.mp3"),
            };


function debloquerAudio() {
    if (audioInitialise) return;

    Object.values(sons).forEach(s => {
        s.play().then(() => {
            s.pause();
            s.currentTime = 0;
        }).catch(() => { /* Le navigateur bloque encore */ });
    });

    audioInitialise = true;
    console.log("Audio débloqué pour tous les sons !");
}

function audioLancement(){
    sons.wolf.play();
    sons.wolf.volume = 0.5;
}

document.addEventListener('click', debloquerAudio, { once: true });
