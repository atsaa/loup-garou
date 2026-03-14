
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
var Nombre_de_joeur;
//const socket = new WebSocket('ws://localhost:8080');
//const socket = new WebSocket('ws:192.168.197.132:8080');
const isIp = "192.168.95.132";
const ip = "ws:192.168.95.132:8080";
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
|| window.location.hostname === isIp;

// On choisit l'URL WebSocket en conséquence
const socketUrl = isLocal 
    ? ip
    : window.location.origin.replace(/^http/, 'ws');
console.log(isLocal, socketUrl);
let phasePeriod;
let phaseActuelle = "SEEYOURCARD";
let estEnPartie = false;
let maire = undefined;
let numsPlayers = 4;
let reconnectInterval = undefined;
let refresh = true;
let salleCree=false;
let socket;

function connecter() {
    if (typeof socket != undefined && socket && socket.readyState === 0) {
        console.log("Il y a déjà une tentative en cours, j'attends celle-là.");
        return; 
    }
    socket = new WebSocket(socketUrl);
    socket.addEventListener('open', function (event) {
        //ici aussi on supprimera
        document.body.style.backgroundImage = 'none';
        console.log("Connecté !");
        socket.send(JSON.stringify({type:'DEBUT', value:localStorage.getItem('NameLoupGarou')}));
        gererRouteURL();
        if (refresh) {
            console.log(event.data);
            /* A supprimer  */
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
            if (messageData.type === "ROOMID_DOESNT_EXIST") {
                localStorage.removeItem("roomId");
            }
            else if(messageData.type === "CODE_CORRECT"){
                Rejoindre_salle(messageData.roomId);
            }
            else if(messageData.type === "INVALIDE_CODE"){
                console.log("code incorrecte");
                codeIncorrect();
            }
            else if (messageData.type === 'CLIENT_COUNT') {
                console.log(messageData);
                numsPlayersConnected.innerHTML=messageData.count;
                if (!salleCree){
                    changeSalle();
                    numsPlayers = messageData.numsPlayersForGame;
                    AfficheNumsPlayers();
                    salleCree = true;
                }
                hideAffichePlayer();
                affichePlayer(messageData);
                ConnectedMessage(messageData.name, true);
            }
            else if(messageData.type === "NUMBERS_PLAYERS_UPDATE"){
                numsPlayers = messageData.numsPlayersForGame;
                AfficheNumsPlayers();
                const span_nums = document.getElementById('usersalle-nums');
                pos = span_nums.textContent.indexOf('/')
                text = span_nums.textContent.slice(0, pos)+`/ ${numsPlayers}`;
                span_nums.textContent = text;
            }
            else if (messageData.type === "CONNECTE_ALREADY") {
                console.log('tu es deja connecte dans cette salle sur un autre onglet');
            }
            else if(messageData.type === 'SALLE_CREEE'){
                changeSalleHote(messageData.gameId);
            }
            else if(messageData.type === 'GAME_LAUNCH'){
                recept_launch_game(messageData);
                localStorage.setItem("roomId", messageData.roomId);
                estEnPartie = true;
            }
            else if(messageData.type === 'MESSAGE'){
                console.log('oksd de', phaseActuelle);
                if (phaseActuelle === 'VOTE_LOUP') {
                    logMessageLoup(messageData.message, 'received', messageData.name);
                }
                else
                    logMessage(messageData.message, 'received', messageData.name);
            }
            else if (messageData.type === 'PLAYER_DECONNECTE'){
                ConnectedMessage(messageData.name, false);
                joueurs_en_vie = messageData.joueurs_en_vie;
                if (!estEnPartie) {
                    hideAffichePlayer();
                    affichePlayer(messageData);
                }
            }
            else if (messageData.type === 'ERREUR') {
                console.log(messageData.message);
                window.location.replace("index.html"); 
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
            else if (messageData.type === 'CANDIDATE_MAIRE'){
                console.log('ehehe');
                hide_vote_chef();
                show_vote_chef(messageData);
                receive_vote(messageData);
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
    socket.onclose = (event) => {
        console.log(event.code);
        if (event.code === 4001) {
            alert("La partie est en cours, vous ne pouvez pas avoir deux onglets !");
            window.location.replace("index.html"); 
            return; // Stoppe la boucle de reconnexion
        }
        else if (event.code === 4002) {
            alert("La partie est deja encours");
            window.location.replace("index.html");
            return;
        }
        console.warn("Connexion perdue. Tentative de reconnexion..."); 
        reconnectInterval = setTimeout(() => {
                console.log("Tentative de reconnexion en cours...");
                connecter(); // On relance la fonction de base
            }, 3000); 
    };
    // 4. Événement d'erreur
    socket.addEventListener('error', function (event) {

        localStorage.removeItem("roomId");
        console.log('Erreur de connexion WebSocket.', event);
        /*A supprimer apres*/
        document.body.style.backgroundImage = "url('images/error.jpg')";
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
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
    sons.wolf.play();
    sons.wolf.volume = 0.5;
    hideParameter();
    showCarte(data.carte);
    joueurs_en_vie = data.list_players;
    console.log(data);
    console.log(joueurs_en_vie);
}

function recept_reprise_game(data){
    changeSalle();
    hideParameter();
    salle_attente.style.display = 'none';
    joueurs_en_vie = data.joueurs_en_vie;
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
    if (duree > 59) {
        min = Math.floor(duree/60);
        second = duree%60;
        document.querySelector(".timer").textContent = `${min.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
    }
    else
        document.querySelector(".timer").textContent = `00:${duree.toString().padStart(2, '0')}`;
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

function logMessageLoup(text, type, name){
    const p1= document.createElement('p');
    const p = document.createElement('p');
    p1.classList.add('usertalk');
    p1.textContent = name;
    p.classList.add(type);
    p.textContent = text;
    const div = document.createElement('div');
    div.appendChild(p1);
    div.appendChild(p);
    div.classList.add("messageLoup");
    messagesDiv.appendChild(div);
}

function ConnectedMessage(name, istrue){
    const div = document.createElement('div');
    div.style.width ='100%';
    div.style.fontSize = '12px';
    div.style.display = 'flex';
    div.style.justifyContent = 'center';
    div.style.opacity = 0.7;
    if (istrue) {
          div.innerHTML = `<p><strong>${name} </strong> a rejoint la partie</p>`;  
    }
    else{
        div.innerHTML = `<p>le joueur <strong>${name}</strong>
        a ete deconnecte de la partie<p>`;
    }
    messagesDiv.appendChild(div);
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

function gameOver(data){
    AffichegameOver(data);
    console.log("JEU Termine", data);
    setTimeout(() => {
        window.location.replace("index.html"); 
    }, 5000);return;
}

function hideParameter(){
    const para = document.getElementById("parameter");
    const paraRole = document.getElementById("parametre-role");
    para.classList.add("hidden-overlay");
    paraRole.classList.add("hidden-simple");
}