const names = document.getElementById("nameInput")
var p = document.querySelector("#nameInput")
var numsPlayersConnected=document.getElementById("numsPlayersConnected");
const ecranAccueil = document.getElementById('Accueil');
var ecranJeu = document.getElementById('salle-game');
let game_active=document.querySelector('#salle-de-jeu-active');
let salle_attente = document.querySelector('#salle-attente-game');
const perso = document.getElementById("persoAcceuil");
const ASSETPERSO = 'images/characters/';
const persosIcon = [ASSETPERSO+'default.png',ASSETPERSO+'fille.png',ASSETPERSO+'fille2.png',
    ASSETPERSO+'garcon.png',ASSETPERSO+'fille3.png',ASSETPERSO+'garcon2.png',
    ASSETPERSO+'garcon3.png',
];
let myIconPerso;
let currentItem = 0;
const DUREE_PHASE = 1200; // 2 minutes en millisecondes
let showRoleCarte = null;
let showVoteDuVillage = null
let joueurs_en_vie = [];
let donnee_carte;

document.addEventListener('DOMContentLoaded', () => {
    connecter();
});

function validerCode(){
    if (!localStorage.getItem("NameLoupGarou")) {
        if (names.value.trim() === '') {
            alert("Enregistrer un nom a sauvegarder");
            return;
        } 
        localStorage.setItem("NameLoupGarou", names.value);
    }
    ecranAccueil.querySelector("#TheGame").classList.add("hidden-overlay");
    ecranAccueil.querySelector("#EnterGame").classList.remove("hidden-overlay");
}

function EntrerCode(event){
    let code = ecranAccueil.querySelector("#codeSalle").value;
    if (code.trim() == '') return;

    event.preventDefault();
    data = {
        gameId:`${code}`,
        name:localStorage.getItem("NameLoupGarou"),
        type:'VALIDER_CODE'
    }
    ecranAccueil.querySelector("#codeSalle").value = '';
    socket.send(JSON.stringify(data));
}

function codeIncorrect(){
    const codeGame = ecranAccueil.querySelector("#EnterGame");
    codeGame.querySelector("span").innerHTML="code incorrecte ou \ncette salle deja en cours";
    codeGame.querySelector("span").style.color ='yellow';
}

function parametresJeu(){
    const parametreRole = document.getElementById("parametre-role");
    if (parametreRole.classList.contains("hidden-simple"))
    {    
        parametreRole.classList.remove("hidden-simple");
    }
    else{
        parametreRole.classList.add("hidden-simple");
    }
}

liste_role = []
function sectionRole(){
    const compo = document.getElementById("composition-role");
    for (let index = 0; index < datas.length - 2; index++) {     
        const clone = document.getElementById("template-role").content.cloneNode(true);
        const div = clone.firstElementChild;
        const role = div.querySelector('.icon-perso');
        liste_role[index] = div;
        role.style.backgroundImage = `url(${datas[index].url})`;

        const infoRole = div.querySelector('#info-role');
        infoRole.querySelector("h3").textContent = datas[index].name
        infoRole.querySelector("span").innerHTML = `<strong>Role</strong>: ${datas[index].description}`
        compo.appendChild(div);
    }
}

function changeSalle(){
    ecranAccueil.style.display = 'none';
    ecranJeu.style.display = 'block';
    sectionRole();
}

function prechargeVoisins(indexActuel, tableau) {
    const suivant = (indexActuel + 1) % tableau.length;
    const precedent = (indexActuel - 1 + tableau.length) % tableau.length;

    // On ne télécharge que ces deux-là en "fantôme"
    new Image().src = tableau[suivant];
    new Image().src = tableau[precedent];
    console.log("est",tableau[suivant]);
}
function precPerso(){
    currentItem = (currentItem - 1 + persosIcon.length) %persosIcon.length;
    myIconPerso = persosIcon[currentItem];
    perso.style.backgroundImage = `url(${myIconPerso})`;
    localStorage.setItem("myIconPerso",JSON.stringify({icon:myIconPerso, index:currentItem}));
    prechargeVoisins(currentItem, persosIcon);
}
function nextPerso(){

    currentItem = (currentItem +1) %persosIcon.length;
    myIconPerso = persosIcon[currentItem];
    perso.style.backgroundImage = `url(${myIconPerso})`;
    localStorage.setItem("myIconPerso",JSON.stringify({icon:myIconPerso, index:currentItem}));
    prechargeVoisins(currentItem, persosIcon);
}

function IconPersoAcceuil(){
    prechargeVoisins(currentItem, persosIcon);
    const iconPerso = JSON.parse(localStorage.getItem('myIconPerso'));
    if (iconPerso)
    {
        currentItem = iconPerso.index;
        myIconPerso = iconPerso.icon;
    }
    else
    {
        localStorage.setItem("myIconPerso",JSON.stringify({icon:persosIcon[0], index:0}))
        myIconPerso = persosIcon[0];
    }
    perso.style.backgroundImage = `url(${myIconPerso})`;
}

// Cette fonction décide quelle div afficher
function gererRouteURL() {
    const hash = window.location.hash;
    if (!localStorage.getItem('NameLoupGarou')) {
        ecranAccueil.style.display = 'block';
        ecranJeu.style.display = 'none';
        IconPersoAcceuil();
    }
    else
    {
        if (hash.startsWith('#join:')) {
            const lienDePartage = window.location;
            const gameId = hash.substring(hash.indexOf(':') + 1);
            document.getElementById('lien-a-copier').value = lienDePartage;
            console.log(`URL détectée : Rejoindre la partie ${gameId}`);
            
            if (localStorage.getItem("roomId")) {
                Reconnexion_salle(gameId);
            }
            else{
                console.log("dans rejoindre"); 
                Rejoindre_salle(gameId);
            }
        }
        else {
            ecranAccueil.style.display = 'block';
            ecranJeu.style.display = 'none';
            IconPersoAcceuil();
        }
   }
}


function messagerie_visible(){
    if (messagerie.style.display != 'none')
        messagerie.style.display = 'none';
    else if (messagerie.style.display === 'none')
    {
        messagerie.style.display = 'flex';
        notifications();
    }
}

function creerNouvellePartie() {
    if (!localStorage.getItem("NameLoupGarou")) {
        if (names.value.trim() === '') return;
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
    const lienDePartage = window.location.origin + '/#join:' + gameId;
    document.getElementById('lien-a-copier').value = lienDePartage;
    //changeSalle();
    console.log('en haut de ');
    window.location.assign(lienDePartage);
    console.log('en bas de bas')
    return ;
}

function launch_game(){
    launch();
}

function showCarte(data){
    const donnee = data
    const clone = document.getElementById('template-carte').content.cloneNode(true);
    const flip_carte = clone.querySelector(".flip-card-front");
    showRoleCarte = clone.firstElementChild;
    donnee_carte = donnee;
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
    else if (donnee.name === 'voyante') {
        flip_carte.classList.add('role-voyante');
    }
    clone.querySelector(".card-name").textContent = donnee.name;
    clone.querySelector(".card-description").textContent = donnee.attribut;
    document.body.appendChild(clone);
}

function hideCarte(){
    /*rajouter une transition pour retirer la carte
    */
    if(showRoleCarte)
        showRoleCarte.remove();
    showRoleCarte = null;
}

liste_joueurs = []; 
function show_vote_chef(data){
    const name = localStorage.getItem('NameLoupGarou');
    const candidateForMayor = data.list ? data.list:[];
    const wrapper_vote_village = document.querySelector(".wrapper-vote-village");
    
    if (!candidateForMayor.includes(name)) {
        wrapper_vote_village.querySelector('#candidateMaire').classList.remove('hidden-overlay');
    }
    
    wrapper_vote_village.querySelector(".voter-elimination").textContent='Votez Pour elir le maire'
    document.querySelector(".div-vote").classList.add("div-vote-chef");
    wrapper_vote_village.style.display = 'flex';
    
    const liste = document.querySelector('.liste-vote-du-village');
    
    for (let index = 0; index < candidateForMayor.length; index++) {
        const clone = document.getElementById('template-vote-du-village').content.cloneNode(true);   
        const li = clone.firstElementChild;
        li.classList.add("li-chef");
        li.dataset.id = candidateForMayor[index];
        liste_joueurs[index] = li;        
        liste_joueurs[index].querySelector(".name").textContent = candidateForMayor[index];
        liste_joueurs[index].querySelector(".votes").textContent = "0";
        li.onclick = (event)=>{
            document.querySelector('.liste-vote-du-village').classList.add('waiting');
            setTimeout(() => {
                document.querySelector('.liste-vote-du-village').classList.remove('waiting');
            }, 400);
            sendYourMaireVote(li.dataset.id, localStorage.getItem('NameLoupGarou'));
        };
        liste.appendChild(li);
    }
}

liste_choix = [];
let choixDuMaireDiv;
function    show_choice_player(data){
    const clone = document.getElementById('template-eliminate-candidate').content.cloneNode(true);   
    const div = clone.firstElementChild;
    const titre = div.querySelector('#titreChoixDuMaire');
    console.log(maire, localStorage.getItem('NameLoupGarou'));
    if (maire !== localStorage.getItem('NameLoupGarou')) {
        titre.textContent = "Le maire va eliminer un joueur"
    }
    choixDuMaireDiv = div;
    const list = div.querySelector(".list-perso");
    const candidateForEliminate = data.liste;
    const tab = candidateForEliminate;
    for (let index = 0; index < candidateForEliminate.length; index++) {
        const candidate = document.createElement('div');
        candidate.classList.add("candidate");

        const iconPerso = document.createElement('div');
        iconPerso.classList.add("icon-perso");
        iconPerso.style.backgroundImage = `url(${persosIcon[tab[index].icone]})`;
        candidate.appendChild(iconPerso);
        
        const span = document.createElement('span');
        span.textContent = candidateForEliminate[index].name;
        candidate.appendChild(span);

        candidate.dataset.id = candidateForEliminate[index].name;

        list.appendChild(candidate);
       // liste_choix[index] = candidate;
        candidate.onclick = (event)=>{
            send_choice(candidate.dataset.id);
        };
    }
    ecranJeu.appendChild(div);
}

function hide_eliminate_by_maire(){
    choixDuMaireDiv.remove();
}

function receive_vote(data){
    const nouveau = document.querySelector(`li[data-id="${data.myVote}"]`);
    
    ancien = document.querySelector(".selected");
    if (data.nameVotant === localStorage.getItem('NameLoupGarou'))
    {
        if(ancien)
            ancien.classList.remove("selected");
        if (nouveau)
            nouveau.classList.add('selected');
    }
    else if(data.votants){
        Object.entries(data.votants).forEach(([key, value]) =>{
            if(key === localStorage.getItem('NameLoupGarou'))
            {
                const select = document.querySelector(`li[data-id="${value}"]`);
                if (ancien)
                    ancien.classList.remove("selected");
                if (select)
                    select.classList.add('selected');
            } 
        });
    }
    else if(data.nameVotant === null){
        const items = document.querySelectorAll('li.selected');
        items.forEach(li => li.classList.remove('selected'));
    }

    console.log(data.countVotes);
    if (!(data.countVotes)) return ;
    Object.entries(data.countVotes).forEach(([cle, valeur]) => {
        const li = document.querySelector(`li[data-id="${cle}"]`);
        if (li) {
            li.querySelector(".votes").textContent = valeur; 
        }
    });
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
    document.querySelector('#candidateMaire').classList.add('hidden-overlay');
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

function whoVote(value){
    const message = 'Votez Pour éliminer un joueur';
    const message2 = 'choisir qui vous allez tuer';
    if (value === "SORCIERE") {
        return message2;
    }
    return message;
}

function show_vote(value){
    const wrapper_vote_village = document.querySelector(".wrapper-vote-village");
    const liste = document.querySelector('.liste-vote-du-village');

    wrapper_vote_village.style.display = 'flex';
    wrapper_vote_village.querySelector(".voter-elimination").textContent = whoVote(value);
    document.querySelector(".liste-vote-du-village").classList.add("ul-vote-village");
    document.querySelector(".div-vote").classList.add("div-vote-village"); 

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
        li.onclick = (event) => {
            document.querySelector('.liste-vote-du-village').classList.add('waiting');
            setTimeout(() => {
                document.querySelector('.liste-vote-du-village').classList.remove('waiting');
            }, 400);
            sendYourVote(li.dataset.id, localStorage.getItem('NameLoupGarou'));
       };
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
    document.querySelector(".div-vote").classList.remove("div-vote-village");  
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
    if (showRoleCarte)
        hideCarte();
    else
        showCarte(donnee_carte);
}

function gererAffichagePhase(newPhase, data) {
    console.log(newPhase, phaseActuelle);
    if (phaseActuelle === "VOTE"){
        hide_vote();
    }
    else if(phaseActuelle === "VOTE_MAIRE"){
        hide_vote_chef();
    }
    else if (phaseActuelle === "MAIRE_ELIMINE") {
        hide_eliminate_by_maire();
    }
    else if (phaseActuelle === "SEEYOURCARD") {
        document.querySelector("#barre-menu").style.display = 'flex';
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
    else if (phaseActuelle === 'VOYANTE') {
        hide_eliminate_by_maire();
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
            logMessageSwitch(TypeMessage.SPECIAL, "vote", undefined, undefined, false);
            show_vote("VILLAGE");
            break;
        case "VOTE_MAIRE":
            logMessageSwitch(TypeMessage.SPECIAL, "vote du Maire", undefined, undefined, false);
            show_vote_chef(data);
            break;
        case "MAIRE_ELIMINE":
            logMessageSwitch(TypeMessage.SPECIAL, "le maire va eliminer un joueur", undefined, undefined, false);
            show_choice_player(data);
            break;
        case "VOTE_LOUP":
            show_vote("LOUP");
            break;
        case "TRANSITION":
            show_transition(data);
            break;
        case "VOYANTE":
            show_choice_player(data);
            break;
        case "SORCIERE":
            show_sorciere(data);
            break;
        case "SORCIERE_KILLER":
            show_vote("SORCIERE");
            break;
        case "TIMER_PHASE":
            console.log("nous somme das timetime",data);
            if (data.attribut === ATTRIBUT.SORCIERE)            
                logMessageSwitch(TypeMessage.SPECIAL, "La sorciere va soigner ou empoisonner un joueur", undefined, undefined, false);
            else if(data.attribut === ATTRIBUT.LOUP)
                logMessageSwitch(TypeMessage.SPECIAL, "Les loups vont devorer un joueur", undefined, undefined, false);
            show_timer(data);
            break;
        case "MORT_VOTE":
            show_dead(data);
            break;
        case "MORT_NUIT":
            show_dead(data);
            break;
        case "GAME_OVER":
            gameOver(data);
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
        msg.textContent = `personne n'est mort durant la nuit. veux-tu empoisonner un joueur?`;     
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
    const popup = document.getElementById('popup-timer');
    popup.classList.remove('hidden-overlay'); 
}

function show_dead(data){
    console.log(data);
    joueurs_en_vie = data.joueurs_en_vie;
    const popup = document.getElementById('popup-mort');
    const msg = document.getElementById('message-mort');
    // On personnalise le message
    if (data.phase === "MORT_NUIT") {
        if (data.joueurs_mort.length){
            let message = `<strong>${data.joueurs_mort[0]}</strong>
            qui etait ${data.roles[0]}`;
            for (let index = 1; index < data.joueurs_mort.length; index++) {
                message = message +` et <strong>${data.joueurs_mort[index]}</strong>
            qui etait ${data.roles[index]}`;
            }
            if (data.joueurs_mort.length > 1)
                message = message + ` sont morts durant la nuit`;
            else
                message = message + ` est mort durant la nuit`;
            msg.innerHTML = message;
            logMessageSwitch(TypeMessage.SPECIAL, message, undefined, undefined, true);
        }
        else{
            const message = "Personne n'est mort durant la nuit";
            msg.innerHTML = message;
            logMessageSwitch(TypeMessage.SPECIAL, message, undefined, undefined, true);
        }
    }
    else if (data.phase === "MORT_VOTE") {
        if (data.joueurs_mort.length){
            const message = `<strong>${data.joueurs_mort}</strong> 
            qui etait <strong>${data.roles}</strong> a été éliminé par le village.`;
            msg.innerHTML = message;
            logMessageSwitch(TypeMessage.SPECIAL, message, undefined, undefined, true);
        }
        else{
            const message = "Le village n'a sacrifie personne aujourdhui";
            msg.innerHTML = message;
            logMessageSwitch(TypeMessage.SPECIAL, message, undefined, undefined, true);
        }
    }
    popup.classList.remove('hidden-overlay');
}

function clickPotionSauver(){
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

function candidateMaire(){
    console.log('jai appuye sur candidate maire')
    data = {
        type:'CANDIDATE_MAIRE',
        name:localStorage.getItem['NameLoupGarou'],
    }
    socket.send(JSON.stringify(data));
}

function AffichegameOver(data){
    localStorage.removeItem("roomId");
    const over = document.getElementById("game-over");
    over.classList.remove("hidden-overlay");
    const message = over.querySelector(".over");
    message.innerHTML = `<strong>La partie a été remporté par les ${data.winner}</strong>`;
}

list_players=[];
function affichePlayer(data){
    const span_nums = document.getElementById('usersalle-nums');
    const list = document.getElementById('perso-grid');
    const persos = data.list_players;
    numsPlayersConnected.innerHTML = persos.length;
    span_nums.textContent = `${persos.length} / ${numsPlayers}`;
    for (let index = 0; index < persos.length; index++) {
        const clone = document.getElementById('template-icon-perso').content.cloneNode(true);   
        const div = clone.firstElementChild;
        const perso = div.querySelector('.icon-perso');
        const span = div.querySelector('span');
        console.log('erreur:', persosIcon[persos[index].icone]);
        perso.style.backgroundImage = `url(${persosIcon[persos[index].icone]})`
        span.textContent = persos[index].name;
        list_players[index] = div;
        list.appendChild(div);
    }
}

function hideAffichePlayer(){
    /*rajouter une transition pour retirer la carte*/
   if (list_players.length != 0) {
        list_players.forEach(element => {
            element.remove();
        });
        list_players.length = 0;
   }
}

/*function hideChargement(){
    document.getElementById("loading-screen").classList.add("hidden-overlay");
}*/

function prec(){
    if (numsPlayers >= 4) {
        numsPlayers--;
    }
    const message = {
        type:"NUMBER_PLAYER_FOR_GAME",
        numsPlayersForGame:numsPlayers,
    }
    socket.send(JSON.stringify(message));
}

function next(){
    if (numsPlayers <= 10) {
        numsPlayers++;
    }
    const message = {
        type:"NUMBER_PLAYER_FOR_GAME",
        numsPlayersForGame:numsPlayers,
    }
    socket.send(JSON.stringify(message));
}

function AfficheNumsPlayers(){
    document.getElementById("precNumber").textContent = `${numsPlayers - 1}`
    
    document.getElementById("nowNumber").textContent = `${numsPlayers}`
    
    document.getElementById("nextNumber").textContent = `${numsPlayers + 1}`
}

async function copierLien(){
    
    const hash = window.location.hash;
    const gameId = hash.substring(hash.indexOf(':') + 1);
    const shareData = {
        title: "Partie en cours",
        text: `code du jeu: ${gameId}\n`,
        url:hash
    }
    navigator.clipboard.writeText(shareData)
    .then(() => {
        console.log("Texte copié !", shareData);
    })
    .catch(err => {
        console.error("Erreur : ", err);
    });
    try {
        await navigator.share(shareData); // Ouvre le menu natif
        console.log("Partagé avec succès !");
    } catch (err) {
        console.log("Erreur ou annulation : " + err);
    }
}

function numberOfVotes(list){
    const votes = document.getElementById('theVotes');
    const span = votes.querySelector('#listvote');
    console.log(list);
    span.textContent = Object.entries(list).length +' / ' +joueurs_en_vie.length;
    updateTheVote(list);
}

function updateTheVote(list){
    const div1 = document.querySelector('.pop-up-vote');
    const div = div1.querySelector('div');
    const fragment = document.createDocumentFragment();
    if (list) {
        Object.entries(list).forEach(([key, value])=>{
            const span = document.createElement('li');
            span.append(spanColor(key,'#ffffff',600));
            span.append(spanColor(' a voté ', '#99aab5'));
            span.append(spanColor(value,'#7289da',700));
            fragment.appendChild(span);
        });
        div.replaceChildren(fragment);
    }
}

function afficheTheVote(){
    console.log('ok jai appuyer');
    const div = document.querySelector('.pop-up-vote');
    if (div.classList.contains('hidden-simple')){
        div.classList.add('hidden-anime');
        div.classList.remove('hidden-simple');
        //setTimeout(() => {
            div.classList.remove('hidden-anime');
      //  }, 1000);
    }
    else{
        div.classList.add('hidden-anime');
        setTimeout(()=>{
            div.classList.add('hidden-simple');
        },500)
    }
}

function spanColor(message, color, fontWeight){
    const span = document.createElement('span');
    span.textContent = message;
    span.style.color = color;
    if (fontWeight) 
        span.style.fontWeight = fontWeight;
    return span;
}