const names = document.getElementById("nameInput")
var p = document.querySelector("#nameInput")
var numsplayers=document.getElementById("numsPlayers");
const ecranAccueil = document.getElementById('Accueil');
var ecranJeu = document.getElementById('salle-game');
let game_active=document.querySelector('#salle-de-jeu-active');
let salle_attente = document.querySelector('#salle-attente-game');

let periodActuelle = "NUIT"; // Le jeu commence souvent la nuit
const DUREE_PHASE = 1200; // 2 minutes en millisecondes
let day = true;
let showRoleCarte = null;
let showVoteDuVillage = null
let have_chief=false;
let joueurs_en_vie = [];
let donnee_carte;

document.addEventListener('DOMContentLoaded', () => {
    gererRouteURL();
});
function changeSalle(){
    ecranAccueil.style.display = 'none';
    ecranJeu.style.display = 'block';
}

// Cette fonction décide quelle div afficher
function gererRouteURL() {
    const hash = window.location.hash;
    console.log(localStorage.getItem('NameLoupGarou'));
    if (!localStorage.getItem('NameLoupGarou')) {
        console.log('dsd');
    }
    else
    {
        if (hash.startsWith('#join:')) {
            const gameId = hash.substring(hash.indexOf(':') + 1);
            console.log(`URL détectée : Rejoindre la partie ${gameId}`);
            Rejoindre_salle(gameId);
        } else {
            ecranAccueil.style.display = 'block';
            ecranJeu.style.display = 'none';
            console.log(hash);
        }
   }
}

var messagerie= document.querySelector("#messagerie");

function messagerie_visible(){
    if (messagerie.style.display != 'none')
        messagerie.style.display = 'none';
    else if (messagerie.style.display == 'none')
        messagerie.style.display = 'block';
}

function creerNouvellePartie() {
    if (names.value.trim() == '')
    {
        return;
    }
    data={
        name:`${names.value}`,
        hote:1,
        type:'CREER_SALLE'
    }
    localStorage.setItem("NameLoupGarou", names.value);
    socket.send(JSON.stringify(data));
}

function changeSalleHote(gameId){
    ecranAccueil.style.display = 'none';
    ecranJeu.style.display = 'block';
    const lienDePartage = window.location.origin + '/#join:' + gameId;
    document.getElementById('lien-a-copier').value = lienDePartage;
    console.log(lienDePartage);
    window.location.href = lienDePartage;
    return ;
}

function launch_game(){
    launch();
}

async function gererCycleJeu() {
    day = !day;
    document.querySelector("#menu-carte").style.display = 'flex';
    if (day) {
        periodActuelle = 'JOUR';
    }
    else
        periodActuelle = 'NUIT';

    if (periodActuelle === "NUIT") {
        nightGame();
    } else {
        await dayGame();
    }
    // On relance le chrono pour la phase suivante
    setTimeout(gererCycleJeu, DUREE_PHASE);
}


function showCarte(data){
    const donnee = data;
    donnee_carte = donnee;
    console.log(data);
    const clone = document.getElementById('template-carte').content.cloneNode(true);
    showRoleCarte = clone.firstElementChild;
    const flip_carte = clone.querySelector(".flip-card-front");
    console.log(donnee.name);
    if (donnee.name == 'loup') {
        flip_carte.classList.add('role-loup')
    }
    else if(donnee.name == 'villageois'){
        flip_carte.classList.add('role-villageois')
    }
    else if(donnee.name == 'cupidon') {
        flip_carte.classList.add('role-cupidon')
    }
    else if(donnee.name == 'sorciere') {
        flip_carte.classList.add('role-sorciere')
    }
    clone.querySelector(".card-name").textContent = donnee.name;
    clone.querySelector(".card-description").textContent = donnee.attribut;
    ecranJeu.appendChild(clone);
}

function hideCarte(){
    /*rajouter une transition pour retirer la carte
    */
    if(showRoleCarte)
        showRoleCarte.remove();
    showRoleCarte = null;
}

liste_joueurs = []; 
function show_vote_chef(){
    const wrapper_vote_village = document.querySelector(".wrapper-vote-village");
    document.querySelector(".div-vote").classList.add("div-vote-chef");
    wrapper_vote_village.style.display = 'flex';
    const liste = document.querySelector('.liste-vote-du-village');
    for (let index = 0; index < joueurs_en_vie.length; index++) {
        const clone = document.getElementById('template-vote-du-village').content.cloneNode(true);   
        const li = clone.firstElementChild;
        li.classList.add("li-chef");
        li.dataset.id = joueurs_en_vie[index];
        liste_joueurs[index] = li;        
        liste_joueurs[index].querySelector(".name").textContent = joueurs_en_vie[index];
        liste_joueurs[index].querySelector(".votes").textContent = "0";
        li.addEventListener("click",()=>{
            document.querySelector('.liste-vote-du-village').classList.add('waiting');
            setTimeout(() => {
                document.querySelector('.liste-vote-du-village').classList.remove('waiting');
            }, 400);
            sendYourMaireVote(li.dataset.id, localStorage.getItem('NameLoupGarou'));
        });
        liste.appendChild(li);
    }
}
function receive_vote(data){
    console.log(data);
    ancien = document.querySelector(".selected");
    const nouveau = document.querySelector(`li[data-id="${data.myVote}"]`);
    if (data.nameVotant === localStorage.getItem('NameLoupGarou'))
    {
        if(ancien)
            ancien.classList.remove("selected");
        if (nouveau)
            nouveau.classList.add('selected');
    }
    else if(data.nameVotant === null){
        const items = document.querySelectorAll('li.selected');
        items.forEach(li => li.classList.remove('selected'));
    }
    Object.entries(data.votes).forEach(([cle, valeur]) => {
    console.log(cle, valeur);
        const li = document.querySelector(`li[data-id="${cle}"]`);
        if (li) {
            li.querySelector(".votes").textContent = valeur;
        }
    });
   // document.querySelector('.liste-vote-du-village').remove('waiting');
}

function hide_vote_chef(){
/*rajouter une transition pour retirer la carte
    */
   if (liste_joueurs.length != 0) {
        liste_joueurs.forEach(element => {
            element.remove();
        });
        liste_joueurs.length = 0;
   }
    document.querySelector(".div-vote").classList.remove("div-vote-chef");  
    document.querySelector(".wrapper-vote-village").style.display = 'none';
}

function vote_elimante_villageois(selectedPlayerId, li){
    if (selectedPlayerId === li) {
        li.classList.remove("selected");
        li.querySelector(".votes").textContent = "0";
        selectedPlayerId = null;
        return selectedPlayerId;
    }
    if (selectedPlayerId) {
        selectedPlayerId.classList.remove("selected");
        selectedPlayerId.querySelector(".votes").textContent = "0";
    }
    li.classList.add("selected");
    li.querySelector(".votes").textContent = "1";
    selectedPlayerId = li;
    return selectedPlayerId;
}

function show_vote(){
    const wrapper_vote_village = document.querySelector(".wrapper-vote-village");
    wrapper_vote_village.style.display = 'flex';
    document.querySelector(".liste-vote-du-village").classList.add("ul-vote-village");
    const liste = document.querySelector('.liste-vote-du-village');
    for (let index = 0; index < joueurs_en_vie.length; index++) {
        const clone = document.getElementById('template-vote-du-village').content.cloneNode(true);   
        const li = clone.firstElementChild;
        div = li.querySelector("div");
        if (maire == joueurs_en_vie[index]) {
            div.classList.add("maire");
        }
        li.classList.add("li-vote-village");
        li.dataset.id = joueurs_en_vie[index];
        liste_joueurs[index] = li;
        liste_joueurs[index].querySelector(".name").textContent = joueurs_en_vie[index];
        li.addEventListener("click",()=>{
            document.querySelector('.liste-vote-du-village').classList.add('waiting');
            setTimeout(() => {
                document.querySelector('.liste-vote-du-village').classList.remove('waiting');
            }, 400);
            sendYourVote(li.dataset.id, localStorage.getItem('NameLoupGarou'));
       });
        liste.appendChild(li);
    }
}
function hide_vote(){
/*rajouter une transition pour retirer la carte
    */
    if (liste_joueurs.length != 0) {
        liste_joueurs.forEach(element => {
            element.remove();
        });
        liste_joueurs.length = 0;
    }
    document.querySelector(".liste-vote-du-village").classList.remove("ul-vote-village");
    document.querySelector(".wrapper-vote-village").style.display = 'none';
}
function show_transition(data)
{
    const overlay = document.getElementById('transition-overlay');
    const msg = document.getElementById('transition-message');
    msg.textContent = data.message;
    overlay.classList.remove('hidden-overlay');
}

function dayGame(){
    ecranJeu.classList.remove('night');
    ecranJeu.classList.add('day');
}

function nightGame(){
    ecranJeu.classList.remove('day');
    ecranJeu.classList.add('night');
}


function afficheCarteMenu(){
    console.log(donnee_carte);
    if (showRoleCarte) {
        hideCarte();
    }
    else
    showCarte(donnee_carte);
}

function gererAffichagePhase(newPhase, data) {
    //console.log(newPhase, phaseActuelle);
    if (phaseActuelle === "VOTE"){
        hide_vote();
    }
    else if(phaseActuelle === "VOTE_MAIRE"){
        hide_vote_chef();
    }
    else if (phaseActuelle === "SEEYOURCARD") {
        document.querySelector("#menu-carte").style.display = 'flex';
        hideCarte();
    }
    else if (phaseActuelle === "VOTE_LOUP") {
        hide_vote();
    }
    else if (phaseActuelle === "SORCIERE_KILLER") {
        hide_vote();
    }
    else if (phaseActuelle === "TRANSITION"){
        document.getElementById('transition-overlay').classList.add('hidden-overlay');
    }
    else if (phaseActuelle === "SORCIERE"){
        document.getElementById('popup-sorciere').classList.add('hidden-overlay');
    }
    else if (phaseActuelle === "TIMER_PHASE"){
        document.getElementById('popup-timer').classList.add('hidden-overlay');
    }
    else if (phaseActuelle === 'MORT_VOTE') {
        document.getElementById('popup-mort').classList.add('hidden-overlay');
    }
    else if (phaseActuelle === 'MORT_NUIT') {
        document.getElementById('popup-mort').classList.add('hidden-overlay');
    }
    phaseActuelle = newPhase;
    switch (phaseActuelle) {
        case "VOTE":
            specialMessage("vote",false);
            show_vote();
            break;
        case "VOTE_MAIRE":
            specialMessage("vote du maire",false);
            show_vote_chef();
            break;
        case "VOTE_LOUP":
            show_vote();
            break;
        case "TRANSITION":
            show_transition(data);
            break;
        case "SORCIERE":
            show_sorciere(data);
            break;
        case "SORCIERE_KILLER":
            show_vote();
            break;
        case "TIMER_PHASE":
            show_timer(data);
            break;
        case "MORT_VOTE":
            show_dead(data);
            break;
        case "MORT_NUIT":
            show_dead(data);
            break;
    }
}
function show_sorciere(data){
    console.log(data);
    const popup = document.getElementById('popup-sorciere');
    const msg = document.getElementById('message-victime');
    // On personnalise le message
    if (!data.victime) {
        document.getElementById('btn-sauver').disabled;
        msg.innerHTML = `personne n'est mort durant la nuit. veux-tu empoisonner un joueur?`;     
    }
    else{
        msg.innerHTML = `<strong>${data.victime}</strong>. 
        est mort durant la nuit. Souhaites-tu le sauver ou bien empoisonner un joueur?`;     
    }
    // On grise les boutons si les potions sont à 0 sur le serveur
    document.getElementById('btn-sauver').disabled = !data.potionVie;
    document.getElementById('btn-tuer').disabled = !data.potionMort;

    popup.classList.remove('hidden-overlay');
}

function show_timer(){
    console.log('jsuis dans show_timer'); 
    const popup = document.getElementById('popup-timer');
    popup.classList.remove('hidden-overlay'); 
}
function show_dead(data){
    console.log(data);
    joueurs_en_vie = data.joueurs_en_vie;
    const popup = document.getElementById('popup-mort');
    const msg = document.getElementById('message-mort');
    // On personnalise le message
    if (data.joueurs_mort.length){
        const message = `<strong>${data.joueurs_mort}</strong> 
        est mort `;
        msg.innerHTML = message;
        specialMessage(message, true);
    }
    else{
        const message = "Personne n'est mort durant la nuit";
        msg.innerHTML = message;
        specialMessage(message, false);
    }
    popup.classList.remove('hidden-overlay');
}

function clickPotionSauver(){
    console.log("j'ai clique");
    data = {
        type:'SORCIERE_REPONSE',
        choice:'SAUVER'
    }
    socket.send(JSON.stringify(data));
}

function clickPotionTuer(){
    data = {
        type:'SORCIERE_REPONSE',
        choice:'TUER'
    }
    socket.send(JSON.stringify(data));
}
function gameOver(data){
    const over = document.getElementById("game-over");
    over.classList.remove("hidden-overlay");
    const message = over.querySelector(".over");
    message.innerHTML = `<strong>La partie a été remporté par les ${data.winner}</strong>`;
}