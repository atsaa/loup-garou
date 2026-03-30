const messagerie = document.getElementById('messagerie');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
var Nombre_de_joeur;
//const socket = new WebSocket('ws://localhost:8080');
//const socket = new WebSocket('ws:192.168.197.132:8080');
const isIp = "192.168.201.132";
const ip = "ws:192.168.201.132:8080";
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
let precMessage = undefined;
let notificationsNumber = 0;
let TypeMessage = {
    CONNEXION:'connexion',
    SIMPLE:'simple',
    LOUP:'loup',
    SPECIAL:'special',
    VOTE:'vote',
};




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
                logMessageSwitch(TypeMessage.CONNEXION,'Connecté au serveur.', localStorage.getItem('NameLoupGarou'));
            else
                logMessageSwitch(TypeMessage.CONNEXION,'Connecté au serveur.', 'none');
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
                if (localStorage.getItem("roomId"))
                    Reconnexion_salle(messageData.roomId);
                else
                {
                    changeSalleHote(messageData.roomId);
                    Rejoindre_salle(messageData.roomId);
                }
            }
            else if(messageData.type === "INVALIDE_CODE"){
                console.log("code incorrecte");
                codeIncorrect();
            }
            else if (messageData.type === 'CLIENT_COUNT') {
                console.log(messageData);
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
                if (phaseActuelle === 'VOTE_LOUP') {
                    logMessageSwitch(TypeMessage.LOUP, messageData.message, messageData.name, messageData);
                }
                else
                    logMessageSwitch(TypeMessage.SIMPLE, messageData.message, messageData.name, messageData);
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
                logMessageSwitch(TypeMessage.VOTE, undefined, undefined, messageData);
                console.log(messageData);
                numberOfVotes(messageData.votes);
            }
            else if(messageData.type === 'MY_VOTE_MAIRE'){
                receive_vote(messageData);
                logMessageSwitch(TypeMessage.VOTE, undefined, undefined, messageData);
            }
            else if (messageData.type === 'SEEYOURCARD' && estEnPartie){
                phaseActuelle = "SEEYOURCARD";
            }
            else if (messageData.type === 'CANDIDATE_MAIRE'){
                hide_vote_chef();
                show_vote_chef(messageData);
                receive_vote(messageData);
            }
            else if (messageData.type === "ELU_MAIRE") {
                maire = messageData.value;
                logMessageSwitch(TypeMessage.CONNEXION, messageData.message,messageData.name);
            }
            else if (messageData.type === "TRANSITION" && estEnPartie) {
                if (messageData.phase !== phaseActuelle)
                    gererAffichagePhase(messageData.phase, messageData);
            }
            else if (messageData.type === "VOYANTE_OBSERVE") {
                hide_eliminate_by_maire();
                voyanteLookCard(messageData);
            }
            else if (messageData.type === "MORT_BY_CHASSEUR") {
                hide_eliminate_by_maire();
                console.log(data);
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
        if (event.code <= 3000) {
            alert("une erreur est survenue");
            window.location.replace("index.html");
            return;
        }
        if (event.code === 4001) {
        //    alert("La partie est en cours, vous ne pouvez pas avoir deux onglets !");
            window.location.replace("index.html"); 
            return;
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
    else if (messageData.phase === 'SORCIERE_KILLER')
        launch_vote(messageData.timer, "SORCIERE_KILLER");
    else if (messageData.phase === 'TIMER_PHASE') {
        launch_timer(messageData);
    }
    else if (messageData.phase === 'VOYANTE') {
        launch_choix(messageData.timer);
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
    else if (messageData.phase === "MAIRE_ELIMINE") {
        launch_choix(messageData.timer);
    }
    else if (messageData.phase === "CHASSEUR") {
        launch_choix(messageData.timer);
    }
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
    window.visualViewport.addEventListener('resize', () => {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
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
    const iconPerso = JSON.parse(localStorage.getItem('myIconPerso'));
    if (iconPerso)
    {
        currentItem = iconPerso.index;
        myIconPerso = iconPerso.icon;
    }
    data = {
        type:'REJOINDRE_SALLE',
        gameId:gameId,
        name:localStorage.getItem("NameLoupGarou"),
        iconPerso:currentItem,
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
    audioLancement();
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

function launch_choix(duree){
    const time = document.querySelector(".timerMaire");
    if (time) {
        time.textContent = duree;   
    }
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
    //console.log(data);
    const msg = document.querySelector("#message-timer"); 
    msg.innerHTML = ` ${data.attribut}   <strong>${data.timer}</strong>`; 
}

function logMessageSwitch(type, text, name, data, mortMsg){
    if (type === TypeMessage.CONNEXION) {
        logMessageConnexion(text, name);
    }
    else{
        if (type === TypeMessage.VOTE && !data.votes[data.nameVotant])
            ;
        else
            notifications();
        switch (type) {
            case TypeMessage.SIMPLE:
                logMessage(text, name, data.iconPerso);
                break;
            case TypeMessage.LOUP:
                logMessageLoup(text, name, data.iconPerso);
                break;
            case TypeMessage.SPECIAL:
                specialMessage(text, mortMsg);
                break;
            case TypeMessage.VOTE:
                MessageVote(data);
        }
    }
}


function logMessageConnexion(text, name){
    const p1= document.createElement('p');
    const p = document.createElement('p');
    p1.classList.add('serverTalk');
    p1.textContent = name;
    p.classList.add('server');
    p.textContent = text;
    messagesDiv.appendChild(p1);
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll auto
}

function logMessage(text, name, iconPerso) {
    console.log(iconPerso);
    const contain = document.createElement('div');
    const montext = document.createElement('div');
    const perso = document.createElement('div');
    perso.classList.add('icon-perso');
    perso.style.position = 'absolute';
    perso.style.backgroundImage = `url(${persosIcon[iconPerso]})`;
    contain.classList.add('messagediv');
    const p1= document.createElement('p');
    const p = document.createElement('p');
    p1.classList.add('usertalk');
    p1.textContent = name;
    p.classList.add('received');
    p.textContent = text;
    if (name !== precMessage) {
        contain.classList.add('marginText');
        contain.appendChild(perso);
        montext.appendChild(p1);
    }
    montext.appendChild(p)
    contain.appendChild(montext);
    messagesDiv.appendChild(contain);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll auto
    precMessage = name;
    notifMessage(name,text)
}

messagerie.addEventListener('keydown', (event) =>{
    if (event.key === 'Enter') {
            sendMessage();
        }
    }
);

function MessageVote(data){
    if (!data.votes[data.nameVotant])
        return ;
    const clone = document.getElementById('template-voteFor').content.cloneNode(true);
    const div = clone.firstElementChild;
    const animations = document.querySelector('.animate-vote');
    div.querySelector('#span1Vote').textContent = data.nameVotant;
    div.querySelector('#span2Vote').textContent = data.myVote;
    newanim = div.querySelector('.animate-vote');
    newanim.offsetWidth;
    if (phaseActuelle === "VOTE_MAIRE") {
        const voteDraw = div.querySelector('.voteBy');
        voteDraw.style.setProperty('--color-vote', 'rgb(10, 89, 236)');
        voteDraw.querySelector('span').textContent = '⭐';
    }
    messagesDiv.appendChild(clone);
    if(animations){
        animations.addEventListener("animationiteration",(event)=>{
            if (event.animationName === "move") {
                const ancienTime = animations.getAnimations()[0];
                const newTime = newanim.getAnimations()[0]; 
               // newTime.currentTime = ancienTime.currentTime;
                newTime.startTime = ancienTime.startTime;
                newanim.style.animationPlayState ='running';
            }
        },{once:true})
    }
    else
        newanim.style.animationPlayState ='running';
    precMessage = undefined // precmessage important pour coller les messages de la mm qui a ecrit
}

function logMessageLoup(text, name, iconPerso){
    const p1= document.createElement('p');
    const p = document.createElement('p');
    p1.classList.add('usertalk');
    p1.textContent = name;
    p.classList.add('received');
    p.textContent = text;
    const div = document.createElement('div');
    div.appendChild(p1);
    div.appendChild(p);
    div.classList.add("messageLoup");
    messagesDiv.appendChild(div);
}

function ConnectedMessage(name, istrue){
    const div = document.createElement('div');
    div.classList.add('connected-message');
    if (istrue) {
          div.innerHTML = `<span class="connected-icon">»</span><span><strong>${name}</strong> a rejoint la partie</span>`;  
    }
    else{
        div.innerHTML = `<span class="connected-icon">«</span><span><strong>${name}</strong>
        a quitté la partie<span>`;
    }
    messagesDiv.appendChild(div);
    precMessage = undefined // precmessage important pour coller les messages de la mm qui a ecrit
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
    precMessage = undefined // precmessage important pour coller les messages de la mm qui a ecrit
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
    const value = document.querySelector(".timer").textContent;
    if (parseInt(value, 10) === 0) {
        return;
    }
    const data = {
        type:'MY_VOTE_MAIRE',
        myVote:my_vote,
        nameVotant:name,
    }
    socket.send(JSON.stringify(data));
}

function send_choice(name){
    if (phaseActuelle === 'VOYANTE')
        voyanteSend(name)
    else if (phaseActuelle === 'CHASSEUR')
        chasseurSend(name);
    else
        send_eliminate_by_maire();
}

function neRienFaire(){
    const message = {
        type:"DO_NOTHING",
    }
    socket.send(JSON.stringify(message));   
}

function chasseurSend(name){
    const message = {
        type:'CHASSEUR_TIR',
        name:name
    }
    socket.send(JSON.stringify(message));
}

function voyanteSend(name){
    const message ={
        type:'VOYANTE_OBSERVE',
        name:name
    }
    socket.send(JSON.stringify(message));
}

function send_eliminate_by_maire(choice){
    const message ={
        type:"MAIRE_ELIMINE",
        choice:choice,
    }
    socket.send(JSON.stringify(message));
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


function notifMessage(name, message){
    if (messagerie.style.display !== 'none') {
        return;
    }
    const div=document.createElement('div');
    const span = document.createElement('span');
    const gras = document.createElement('strong');
    gras.textContent = name;
    span.append(gras,`: ${message}`);
    div.classList.add('notif-message');
    div.appendChild(span);
    document.body.appendChild(div);
    setTimeout(() => {
        div.classList.add('hidden-anime');
        setTimeout(() => {
            div.remove();
        }, 1000);
    }, 3000);
}

function notifications(){
    const notif = document.getElementById('notification');
    notificationsNumber+=1;
    console.log("la notif vaut: ",notificationsNumber);
    if (messagerie.style.display === 'none' && notificationsNumber > 0) {
        notif.style.display = 'block';
        notif.querySelector('span').textContent = notificationsNumber;
    }
    else
    {
        notif.style.display = 'none';
        notificationsNumber = 0;
    }
}
function voyanteLookCard(data){
    const donnee = {
        name:data.role,
        attribut:data.name
    };
    const carte = document.getElementById('my-carte');
    console.log(carte);
    carte.style.setProperty('pointer-events', 'none', 'important');
    const message = `Vous avez observe le joueur <strong>${data.name}</strong> qui est
                    <strong><u>${data.role}</u></strong>`;
    showCarte(donnee);
    setTimeout(() => {
        carte.style.pointerEvents = 'auto';
        hideCarte();
    }, 5000);
    logMessageSwitch(TypeMessage.SPECIAL, message, undefined, undefined, false);
}