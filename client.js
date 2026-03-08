
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
var Nombre_de_joeur;
//const socket = new WebSocket('ws://localhost:8080');
//const socket = new WebSocket('ws:192.168.197.132:8080');
const isIp = "192.168.204.132";
const ip = "ws:192.168.204.132:8080";
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
|| window.location.hostname === isIp;

// On choisit l'URL WebSocket en conséquence
const socketUrl = isLocal 
    ? ip
    : window.location.origin.replace(/^http/, 'ws');
console.log(isLocal, socketUrl);
let socket = new WebSocket(socketUrl);
let phasePeriod;
let phaseActuelle = "SEEYOURCARD";
let estEnPartie = false;
let maire = undefined;
let reconnectInterval = undefined;
let refresh = true;

function connecter() {
    socket = new WebSocket(socketUrl);
    socket.addEventListener('open', function (event) {
        console.log("Connecté !");
        if (reconnectInterval)
            clearInterval(reconnectInterval); // On arrête de tenter la reconnexion
        reconnectInterval = undefined;
        gererRouteURL();
        if (refresh) {
            console.log(event.data);
            if (localStorage.getItem('NameLoupGarou'))
                logMessage('Connecté au serveur.', 'received', localStorage.getItem('NameLoupGarou'));
            else
                logMessage('Connecté au serveur', 'received', 'none');
            refresh = false;
        }
    });

    socket.addEventListener('message', function (event) {
        try {
            const messageData = JSON.parse(event.data);
            console.log(messageData);
            if (messageData.type === "ROOMID_DOESNT_EXIST") {
                localStorage.removeItem("roomId");
            }
            else if (messageData.type === 'CLIENT_COUNT') {
                console.log(messageData);
                numsplayers.innerHTML=messageData.count;
                changeSalle();
            }
            else if(messageData.type === 'SALLE_CREEE'){
                changeSalleHote(messageData.gameId);
            }
            else if(messageData.type === 'GAME_LAUNCH'){
                recept_launch_game(messageData);
                localStorage.setItem("roomId", messageData.roomId);
                estEnPartie = true;
            }
            else if(messageData.type === 'GAME_OVER')
            {
                gameOver(messageData);
                console.log("JEU Termine", messageData);
            }
            else if(messageData.type === 'MESSAGE'){
                logMessage(messageData.message, 'received', messageData.name);
            }
            else if (messageData.type === 'ERREUR') {
                console.log(messageData.message);
            }
            else if(messageData.type === 'MY_VOTE_ELIMINATION'){
                receive_vote(messageData);
            }
            else if(messageData.type === 'MY_VOTE_MAIRE'){
                receive_vote(messageData);
            }
            else if (messageData.type === 'SEEYOURCARD' && estEnPartie){
                phaseActuelle = "SEEYOURCARD";
                console.log(messageData.type, messageData.phase, phaseActuelle);
            }
            else if (messageData.type === "CHOIX_MAIRE") {
                maire = messageData.value;
            }
            else if (messageData.type === "TRANSITION" && estEnPartie) {
                if (messageData.phase !== phaseActuelle)
                    gererAffichagePhase(messageData.phase, messageData);
            }
            else if (messageData.type === 'JOUR' && estEnPartie){
            PeriodeJour(messageData);
            }
            else if (messageData.type === 'NUIT' && estEnPartie){
                PeriodeNuit(messageData);
            }
            else if (messageData.type === 'REPRISE') {
                console.log("reprise", messageData.phase, phaseActuelle);
                estEnPartie = true;
                recept_reprise_game(messageData);
            }
            else{ 
            }
        } catch (error) {
            console.log(error);
            console.log("jsuis dans le catch ", event.data);
        }
    });
    socket.onclose = () => {
        console.warn("Connexion perdue. Tentative de reconnexion...");  
        // On évite de lancer plusieurs intervalles en même temps
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                console.log("Tentative de reconnexion en cours...");
                connecter(); // On relance la fonction de base
            }, 3000); 
        }
    };
    // 4. Événement d'erreur
    socket.addEventListener('error', function (event) {
        localStorage.removeItem("roomId");
        console.log('Erreur de connexion WebSocket.');
    });
}

function salle_enter(str){

    data = JSON.parse(str);
    lancer = document.getElementById("start");
    if  (data.hote != 1)
        lancer.style.display = 'none';
    else
        lancer.style.display = 'block';
}

function iniatilisation()
{
    phasePeriod = undefined;
    phaseActuelle ="SEEYOURCARD";
    Nombre_de_joeur = 0;
}

function PeriodeNuit(data){
    const messageData = data
    console.log("nuit", messageData.phase, phaseActuelle);
    if (phasePeriod !== "NUIT")
        nightGame();
    if (messageData.phase !== phaseActuelle)
        gererAffichagePhase(messageData.phase, messageData);
    if (messageData.phase === 'VOTE_LOUP')
        launch_vote(messageData.timer, "VOTE_LOUP");
    else if (messageData.phase === 'TIMER_PHASE') {
        launch_timer(messageData);
    }
    phasePeriod = "NUIT";
}

function PeriodeJour(data){
    const messageData = data;
    console.log("jour");
    if (phasePeriod !== 'JOUR')
        dayGame();
    if (messageData.phase !== phaseActuelle)
        gererAffichagePhase(messageData.phase, messageData);
    if (messageData.phase === 'VOTE_MAIRE')
        launch_vote_maire(messageData.timer);
    else if (messageData.phase === 'VOTE')
        launch_vote(messageData.timer, "VOTE");
    else if (messageData.phase === 'TIMER_PHASE') {
        console.log("timer_phase jour");
        launch_timer(messageData);
    }
    phasePeriod = 'JOUR';
}

// 5. Fonction pour envoyer un message
function sendMessage() {  
    message = {
        type:'MESSAGE',
        message:messageInput.value,
        name:localStorage.getItem("NameLoupGarou"),
        }
    if (message.message.trim() !== '') {
        socket.send(JSON.stringify(message)); // Envoie le message au serveur
        messageInput.value = '';
        messageInput.focus();
    }
}
function Reconnexion_salle(){
    pseudo = localStorage.getItem('NameLoupGarou');
    gameId = localStorage.getItem("roomId");
    console.log("Tentative de RECONNEXION...");
    socket.send(JSON.stringify({
        type: "RECONNEXION",
        name: pseudo,
        gameId: gameId,
    }));
}

function Rejoindre_salle(gameId){
    data = {
        type:'REJOINDRE_SALLE',
        gameId:gameId,
        name:localStorage.getItem("NameLoupGarou"),
    }
    socket.send(JSON.stringify(data)); 
}

function launch(){
    data = {
        type:'LAUNCH_GAME'
    }
    socket.send(JSON.stringify(data));
}

function recept_launch_game(data){
    salle_attente.style.display = 'none';
    showCarte(data.carte);
    joueurs_en_vie = data.list_players;
    console.log(data);
    console.log(joueurs_en_vie);
}

function recept_reprise_game(data){
    changeSalle();
    salle_attente.style.display = 'none';
    joueurs_en_vie = data.list_players;
    donnee_carte = data.carte;
    console.log(data);
    console.log(joueurs_en_vie);
    maire = data.maire;
    if (data.typeNow === 'LAUNCH_GAME'){
        showCarte(data.carte);
    }
    else if (data.typeNow === 'JOUR') {
        PeriodeJour(data);
        if (data.phase === 'VOTE_MAIRE') {
            receive_vote(data);
        }
        else if (data.phase === 'VOTE') {
            receive_vote(data);
        }
    }
    else if(data.typeNow === 'NUIT'){
        PeriodeNuit(data);
        if (data.phase === 'VOTE_LOUP') {
            receive_vote(data);
        }
        else if (data.phase === 'SORCIERE_KILLER'){
            receive_vote(data);
        }
        else{
            console.log('nahhh');
        }
    }
}

function launch_vote_maire(duree){
    //timerTransitionClient(timer);//temps pour la transition
    document.querySelector(".timer").textContent = duree;
    phaseActuelle = "VOTE_MAIRE";
}

function launch_vote(duree, phase){
    //timerTransitionClient(timer);//temps pour la transition
    document.querySelector(".timer").textContent = duree; 
    phaseActuelle = phase;
}

function launch_timer(data){
    //timerTransitionClient(timer);//temps pour la transition
    console.log(data);
    const msg = document.querySelector("#message-timer"); 
    msg.innerHTML = ` ${data.attribut}   <strong>${data.timer}</strong>`; 
}

function logMessage(text, type, name) {
    const p1= document.createElement('p');
    const p = document.createElement('p');
    p1.classList.add('usertalk');
    p1.textContent = name;
    p.classList.add(type);
    p.textContent = text;
    messagesDiv.appendChild(p1);
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll auto
}

function specialMessage(message, messageDeMort){
    const clone = document.getElementById('template-special-message').content.cloneNode(true);
    myDiv=clone.firstElementChild;
    const p = myDiv.querySelector("#special-message");
    if (messageDeMort) {
        myDiv.querySelector(".circle").classList.add('rouge');
        myDiv.querySelector(".pop-up-message").classList.add('rouge');
    }
    else{ 
        myDiv.querySelector(".circle").classList.add('bleu');
        myDiv.querySelector(".pop-up-message").classList.add('bleu');
    }
    if (message) {
        p.innerHTML = message;    
    }
    else
        p.textContent = "blabalbaslbaslb";
    messagesDiv.appendChild(myDiv);
}

function sendYourVote(my_vote, name){
    const data = {
        type:'MY_VOTE_ELIMINATION',
        myVote:my_vote,
        nameVotant:name,
    }
    socket.send(JSON.stringify(data));
}
function sendYourMaireVote(my_vote, name){
    const data = {
        type:'MY_VOTE_MAIRE',
        myVote:my_vote,
        nameVotant:name,
    }
    socket.send(JSON.stringify(data));
}