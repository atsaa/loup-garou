

/*  connexion et autorisation au serveur render.com */
const http = require('http');
const fs = require('fs');
const path = require('path');

//import { datas } from './data.js';
// server.js (Backend Node.js)
//const { consoleOrigin } = require('firebase-tools/lib/api');
const WebSocket = require('ws');
const datas = require('./data.js');
const { ifError } = require('assert');
const { type } = require('os');
const { json } = require('stream/consumers');
const { cli } = require('firebase-tools');
//const { cli } = require('firebase-tools');
//const client = require('firebase-tools');
// Crée un serveur WebSocket sur le port 8080

//definir le port dynamique de render
const PORT = process.env.port || 8080;

// 1. Créer le serveur qui envoie ton HTML/JS aux joueurs
const server = http.createServer((req, res) => {
    // Si tu as un dossier "public", ajuste le chemin ici
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    
    const extname = path.extname(filePath);
    // Dictionnaire des types MIME
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
    }
    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end("Fichier non trouvé");
        } else {
            // ✅ On utilise la variable contentType ici !
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});
const wss = new WebSocket.Server({ server });

server.listen(PORT, () => {
    console.log(`Le village est en ligne sur le port ${PORT}`);
});

const sallesDeJeu = {};

const ROLE = {
    VILLAGEOIS:'villageois',
    LOUP:'loup'
};

const TRANSITION_DAY = "TRANSITION_DAY";

const ATTRIBUTS = {
    VILLAGEOIS:'villageois',
    LOUP:'loup',
    SORCIERE:'sorciere',
    PETITE_FILLE:'petite fille',
    CUPIDON:'cupdion',
    VOYANTE:'voyante',
}

const PHASE = {
  VOTE:'VOTE',
  VOTE_LOUP:"VOTE_LOUP",
  VOTE_MAIRE:"VOTE_MAIRE",
  SORCIERE:"SORCIERE",
  SORCIERE_KILLER:"SORCIERE_KILLER",
  VOYANTE:'VOYANTE',
  MAIRE_ELIMINE:"MAIRE_ELIMINE",
}


function broadcastClientCount() {
  const countMessage = JSON.stringify({
    type: 'CLIENT_COUNT',
    count: wss.clients.size
  });
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(countMessage); // Envoie le message JSON
    }
  });
}

function aleatoireIndex(array){
  index = Math.floor(Math.random()*array.length);
  return index
}

function algorithmAleatoire(roomId){
  const salle = sallesDeJeu[roomId];
  nums = salle.joueurs.size;
  array = [];
  array.push(datas[2]);
  vivi = 1;
  if (nums >= 6) {
    array.push(datas[3]);
    vivi = 2;
  }
  diff = array.length;
  for (let index = 0; index < nums - diff; index++) {
    if (vivi == 2) {
      array.push(datas[0])
      vivi = -1;
    }
    else
      array.push(datas[1])
    vivi++;
  }
  return array;
}

function algorithFisher(array){
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // On échange les places (Destructuring assignment)
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function reinitialiserVote(roomId)
{
  const counts = countVote(roomId);
    salle.joueurs.forEach(function each(client){
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
          type:"MY_VOTE_ELIMINATION",
          countvotes:counts,
          votes:salle.voteActuel,
          myVote:null,
          nameVotant:null}));
      }
    });
}
function roomEmpty(roomId){
  const salle = sallesDeJeu[roomId];
  if (salle.participants.length == 0) {
    return true;
  }
  return false;
}

function annoncerTransition(roomId, message, duree) {
    // 1. On prévient tout le monde
    diffuser(roomId, { 
        type: "TRANSITION",
        phase:"TRANSITION", 
        message: message,
        seconds: duree / 1000 // On envoie le temps de pause
    });
}

function assignRole(roomId, name, data){
  console.log(sallesDeJeu[roomId].participants)
  Object.assign(sallesDeJeu[roomId].participants[name], {"role":data.role, "attribut":data.name, carte:data});
  if (data.name === ATTRIBUTS.SORCIERE) {
    Object.assign(sallesDeJeu[roomId].participants[name], {"potionVie":1, "potionMort":1,});
  }
  /*else if (data.attribut === ATTRIBUTS.CUPIDON) {
    sallesDeJeu[roomId].participants[name]. = 1;
  }*/
}


function PhaseSuivanteDeNuit(roomId){
  const salle = sallesDeJeu[roomId];
  for (const name of salle.joueurs_en_vie) {
    if (salle.participants[name].attribut === ATTRIBUTS.VOYANTE) {
      salle.phase = PHASE.VOYANTE;
      const tableau = Object.entries(salle.participants).filter(([cle])=>
        salle.joueurs_en_vie.includes(cle)).map(([cle, valeur]) => {
          return { name: cle, icone: valeur.iconPerso};
      });
      const message = {
        type:salle.period,
        phase:salle.phase,
        liste:tableau,
      };
      if (salle.participants[name].ws.readyState === WebSocket.OPEN)
        salle.participants[name].ws.send(JSON.stringify(message));
      return true;
    }
  }
  return false;
}

function voyanteRegarde(ws, roomId, name){
  const salle = sallesDeJeu[roomId];
  //verifier si le nom fait parti des vivants
  if (salle.joueurs_en_vie.includes(name)){
    console.log('dedans');
    console.log(salle.participants[name]);
    const attributPlayer = salle.participants[name].attribut;
    const message = {
      type:"VOYANTE_OBSERVE",
      name:name,
      role:attributPlayer,
    }
    ws.send(JSON.stringify(message));
  }
} 

function diffuserAttribut(roomId, attribut, secondes){
  const salle = sallesDeJeu[roomId];
  
  const message = {
    type: salle.period,
    phase: salle.phase,
    attribut:attribut,
    timer: secondes
  };

  const message2 = {
    type: salle.period,
    phase:"TIMER_PHASE",
    attribut:attribut,
    timer: secondes
  };
  
  salle.joueurs.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (salle.participants[client.name].attribut === attribut) {
        console.log(attribut, 'is ',client.name);
        client.send(JSON.stringify(message));
      }
      else
      {
        console.log('ekie', client.name);
        client.send(JSON.stringify(message2));
      }
    }      
  });
}






function sorciereSauve(roomId, name){
  const salle = sallesDeJeu[roomId];
  if (!salle.participants[name].potionVie) {
    return ;
  }
  salle.joueurs_mort = [];
  salle.wolfVictim = undefined;
  // = salle.joueurs_mort.
  salle.participants[name].potionVie = 0;
  salle.timerSeconds = 1;
}

function sorciereTuer(roomId, name){
  const salle = sallesDeJeu[roomId];
  if (!salle.participants[name].potionMort) {
    return ;
  }
  salle.phase = "SORCIERE_KILLER";
  salle.participants[name].potionMort = 0;
}

function diffuserSorciere(roomId, attribut, secondes){
  const salle = sallesDeJeu[roomId];
  const message = {
    type: salle.period,
    phase:"TIMER_PHASE",
    attribut:attribut,
    timer: secondes
  };
  salle.joueurs.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          if (salle.participants[client.name].attribut === attribut)
          {
            const potion_vie = salle.participants[client.name].potionVie;
            const potion_mort = salle.participants[client.name].potionMort;
            const messageSoso = JSON.stringify({ 
                type: salle.period,
                phase:salle.phase,
                timer: salle.timerSeconds,
                potionVie:potion_vie,
                potionMort:potion_mort,
                victime:salle.wolfVictim,
              });
              client.send(messageSoso);
          }
          else
          {
            client.send(JSON.stringify(message));
          }
        }
  });
}

function diffuserMorts(roomId, data){
  const salle = sallesDeJeu[roomId];
  const message = data;
  salle.joueurs.forEach(function each(client){
  if (client.readyState === WebSocket.OPEN) {
    if (salle.participants[client.name].estMort) { 
      client.send(JSON.stringify(message));
      }
    }
  });
}

function diffuserLoups(roomId, data){
  const salle = sallesDeJeu[roomId];
  const message = data;
  salle.joueurs.forEach(function each(client){
  if (client.readyState === WebSocket.OPEN) {
    if (salle.participants[client.name].role === ROLE.LOUP) {
      client.send(JSON.stringify(message));
      }
    }
  });
}

function diffuserTimer(idSalle, secondes, role, attribut) {
    const salle = sallesDeJeu[idSalle];
    if (!salle) return;
    const message = {
        type: salle.period,
        phase:salle.phase,
        attribut:attribut,
        timer: secondes
    };
    const message2 = {
        type: salle.period,
        phase:"TIMER_PHASE",
        attribut:attribut,
        timer: secondes
    };
    if (attribut === ATTRIBUTS.SORCIERE){
      diffuserSorciere(idSalle, attribut, secondes);
      return ;
    }
    else if (attribut === ATTRIBUTS.VOYANTE) {
      diffuserAttribut(idSalle, attribut, secondes);
      return ;
    }
    else if (role) {
      salle.joueurs.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            if (salle.participants[client.name].role === role)
              client.send(JSON.stringify(message));
            else
              client.send(JSON.stringify(message2));
        }
      });
      return ;
    }
    diffuser(idSalle, message);
}

function verifierFinDePartie(roomId){
  const salle = sallesDeJeu[roomId];
    let nbLoups = 0;
    let nbVillageois = 0;

    salle.joueurs_en_vie.forEach(pseudo => {
        if (salle.participants[pseudo].role === ROLE.LOUP) {
            nbLoups++;
        } else {
            nbVillageois++;
        }
    });
    // 2. On teste les conditions de victoire
    if (nbLoups === 0) {
      diffuser(roomId, {"type":salle.period, phase:"GAME_OVER","winner":"VILLAGEOIS"})
      salle.period ="GAME_OVER";
      return true;
    }
    if (nbVillageois <= 0) {
      diffuser(roomId, {"type":salle.period, phase:"GAME_OVER","winner":"LOUPS"});
      salle.period ="GAME_OVER";
      //terminerLaPartie(roomId, "LOUPS");
      return true;
    }
    return false;
}

function Deadmanaging(roomId, period, phase, func)
{
  salle = sallesDeJeu[roomId];
  const rolesPersos = [];
  salle.joueurs_en_vie = salle.joueurs_en_vie.filter(player=> !salle.joueurs_mort.includes(player));
  for (let index = 0; index < salle.joueurs_mort.length; index++) {
    let name = salle.joueurs_mort[index];
    console.log('joueur choisi est',name);
    salle.participants[name].estMort = true;
    rolesPersos.push(salle.participants[name].attribut);
    if (name === salle.maire) {
      salle.maire = undefined;
    }
  }
  const data = {
        type:"JOUR",
        phase:"MORT_VOTE",
        joueurs_en_vie:salle.joueurs_en_vie,
        joueurs_mort:salle.joueurs_mort,
        roles:rolesPersos,
  }
  if (salle.phase === PHASE.VOTE) {
    diffuser(roomId, data);
  }
  else if (salle.phase === PHASE.MAIRE_ELIMINE) {
    diffuser(roomId, data);
  }
  else{//on a tuer durant la nuit ducoup
    data.phase = 'MORT_NUIT';
    salle.wolfVictim = undefined;
    diffuser(roomId, data);
  }
  salle.phase = 'MORT_VOTE';
  salle.timeout = setTimeout(() => {
      salle.timeout = undefined;
      const chasseur = salle.joueurs_mort.find(p => salle.participants[p].attribut === "CHASSEUR");
      reinitialisationDay(roomId);
      if (chasseur) {
          //lancerPhase(roomId, "TIR_CHASSEUR");
      }
      else {
        if (verifierFinDePartie(roomId))
        {
          delete sallesDeJeu[roomId];
          return ;
        }
        salle.period = period;
        salle.phase = phase;
        salle.joueurs_mort = [];
        salle.listeForMaire = [];
        salle.choixDuMaire = undefined;
        func(roomId);
      }
    }, 3000);
}

function joueurElimineByMaire(roomId){
  const salle = sallesDeJeu[roomId];
  if (salle.choixDuMaire) {
    salle.joueurs_mort.push(salle.choixDuMaire); 
  }
}

function joueurElimine(roomId, phase){
  const salle = sallesDeJeu[roomId];
  const count = countVote(roomId);
  const maxVal = Math.max(...Object.values(count));
  let winners = [];
  if (maxVal > 0) {
    winners = Object.keys(count).filter(k => count[k] === maxVal); 
  }
  salle.voteActuel = {};
  console.log("les resultats des votes sont:",winners);
  if (winners.length === 1) {
    if (phase === PHASE.VOTE_LOUP) {
      salle.wolfVictim = winners[0];
    }
    salle.joueurs_mort.push(winners[0]);
  }
  else if (winners.length > 1){
    if (phase === PHASE.VOTE && salle.maire) {
      salle.phase = PHASE.MAIRE_ELIMINE;
      const tableau = Object.entries(salle.participants).filter(([cle])=>winners.includes(cle))
      .map(([cle, valeur]) => {
          return { name: cle, icone: valeur.iconPerso};
      });
      salle.listeForMaire = winners;
      const message = {
        type:salle.period,
        phase:PHASE.MAIRE_ELIMINE,
        liste:tableau,
      }
      diffuser(roomId, message);
    }
  }
}

function finPhase(roomId, func, period, phase) {
  const salle = sallesDeJeu[roomId];
  if (salle.phase === 'ATTENTE') {
    if (PhaseSuivanteDeNuit(roomId)) {
      console.log(salle.phase);
      func(roomId);
      return ;
    }
  }
  else if (salle.phase === PHASE.VOTE_MAIRE) {
    sendMaire(roomId);
  }
  else if (salle.phase === "TRANSITION_DAY") {
    if (!salle.maire)
      Deadmanaging(roomId, period, PHASE.VOTE_MAIRE, func);
    else
      Deadmanaging(roomId, period, phase, func)
    return ;
  }
  else if (salle.period === "JOUR" && salle.phase === "VOTE") {
    joueurElimine(roomId, salle.phase);
    if (salle.phase === PHASE.VOTE)
      Deadmanaging(roomId, period, phase, func);
    else
      func(roomId);
    return ;
  }
  else if (salle.period === "JOUR" && salle.phase === PHASE.MAIRE_ELIMINE) {
    joueurElimineByMaire(roomId);
    Deadmanaging(roomId, period, phase, func);
    return ;
  }
  else if (salle.phase === PHASE.VOTE_LOUP){
    joueurElimine(roomId, salle.phase);
    const sorciereVivante = salle.joueurs_en_vie.find(p => 
        salle.participants[p].attribut === ATTRIBUTS.SORCIERE
    );
    console.log("loup verifie si soso vie",sorciereVivante);
    if (sorciereVivante) {
      if (salle.participants[sorciereVivante].potionMort > 0 || salle.participants[sorciereVivante].potionVie > 0) {
        salle.phase = "SORCIERE";
        salle.voteActuel = {};
        func(roomId);
        return ;
      }
    }
  }
  else if (salle.phase === "SORCIERE" || salle.phase === "SORCIERE_KILLER") {
    joueurElimine(roomId, salle.phase);
  }
  salle.period = period;
  salle.phase = phase;
  salle.voteActuel = {};
  func(roomId);
}

function lancerTimer(roomId, timer, func, period, phase, role, attribut) {
    const salle = sallesDeJeu[roomId];
    salle.timerSeconds = timer;
    salle.interval = setInterval(() => {
        salle.timerSeconds--;
        diffuserTimer(roomId, salle.timerSeconds, role, attribut);
        if (salle.timerSeconds <= 0) {
          clearInterval(salle.interval);
          salle.interval = null;
          finPhase(roomId, func, period, phase);
        }
    }, 1000);
}

function sendMaire(roomId)
{
  const salle = sallesDeJeu[roomId];
  const count = countVote(roomId);
  const maxVal = Math.max(...Object.values(count));
  const winners = Object.keys(count).filter(k => count[k] === maxVal);
  salle.voteActuel = {};
  if (winners.length !== 1) {
    salle.maire = winners[Math.floor(Math.random() * winners.length)]
  }
  else
    salle.maire = winners[0];
  maire = {
    type:"CHOIX_MAIRE",
    name:"server",
    value:salle.maire,
    message:`${salle.maire}`+" a été élu Maire",
  }
  salle.joueurs.forEach(function each(client){
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(maire));
    }
  })
}

function etapeJour(roomId)
{
  const salle = sallesDeJeu[roomId];
  salle.typeNow = 'JOUR';
  switch (salle.phase) {
    case 'TRANSITION_DAY':
      lancerTimer(roomId, 2, etapeJour, "JOUR", "VOTE");
      break;
    case PHASE.VOTE_MAIRE:
      lancerTimer(roomId, 60, etapeJour, "JOUR", "VOTE");
      break;
    case PHASE.VOTE:
      lancerTimer(roomId, 120, PeriodeDuJeu, "NUIT", "ATTENTE");
      break;
    case PHASE.MAIRE_ELIMINE:
      lancerTimer(roomId, 30, PeriodeDuJeu, "NUIT", "ATTENTE");
  }
}
 
function etapeNuit(roomId)
{
  const salle = sallesDeJeu[roomId];
  salle.typeNow = 'NUIT';
    switch(salle.phase) {
        case "ATTENTE":
            lancerTimer(roomId, 4, PeriodeDuJeu, "NUIT", PHASE.VOTE_LOUP); // Lance le timer de 5s puis revient ici
            break;
        case "CHARGEMENT":
            salle.phase = "VOTE";
            lancerTimer(roomId, 6, PeriodeDuJeu); // Lance le timer de 30s puis revient ici
            break;
        case PHASE.VOYANTE:
            lancerTimer(roomId, 30, PeriodeDuJeu, "NUIT", PHASE.VOTE_LOUP, ROLE.VILLAGEOIS, ATTRIBUTS.VOYANTE); // Enchaîne sur la nuit
            break;
        case PHASE.VOTE_LOUP:
            lancerTimer(roomId, 30, PeriodeDuJeu, "JOUR", "TRANSITION_DAY", ROLE.LOUP, ATTRIBUTS.LOUP); // Enchaîne sur la nuit
            break;
        case "SORCIERE":
          lancerTimer(roomId, 30, PeriodeDuJeu, "JOUR", "TRANSITION_DAY", ROLE.SORCIERE, ATTRIBUTS.SORCIERE);
          break;
    }
}

function PeriodeDuJeu(roomId) {
    const salle = sallesDeJeu[roomId];
    console.log("periodedujeu", salle.period, salle.phase);
    switch (salle.period) {
      case "SEEYOURCARD":
        salle.phase = "NULL";
        lancerTimer(roomId, 10, PeriodeDuJeu, "NUIT", "ATTENTE");
        break ;
      case 'JOUR':
        etapeJour(roomId);
        break;
      case 'NUIT':
        etapeNuit(roomId);
        break;
    }
}

function countVote(Id){
  const count = {};
  const salle = sallesDeJeu[Id];
  salle.joueurs_en_vie.forEach( joueurs => {
    count[joueurs] = 0;
  });

  Object.values(salle.voteActuel).forEach(vote=>{
    if (vote) {
      count[vote] = (count[vote] || 0) + 1;
      if ((salle.timerSeconds >= 30) && (count[vote] >= Math.ceil(salle.joueurs_en_vie.length / 2))) {
        salle.timerSeconds = 25;
      }
    }
  });
  return count;
}

function ajouteVote(Id, data){
  if (data.myVote === sallesDeJeu[Id].voteActuel[data.nameVotant]) {
      delete sallesDeJeu[Id].voteActuel[data.nameVotant];
    return;
  }
  sallesDeJeu[Id].voteActuel[data.nameVotant] = data.myVote;
}

function reinitialisationDay(Id){
  salle = sallesDeJeu[Id];
  salle.wolfVictim = undefined;
  salle.joueurs_mort = [];
  salle.voteActuel = {};
}

function diffuserPlayerSalleCount(players, participants, numsPlayersForGame, name) {
  const tableauMixte = Object.entries(participants).map(([cle, valeur]) => {
    return { name: cle, icone: valeur.iconPerso};
  });
  const countMessage = JSON.stringify({
    type: 'CLIENT_COUNT',
    numsPlayersForGame:numsPlayersForGame,
    count: players.size,
    name:name,
    list_players:tableauMixte
  });
  players.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
          client.send(countMessage);
      }
  });
}

function diffuserAuxVivants(roomId, messageObj) {
    const salle = sallesDeJeu[roomId];
    const json = JSON.stringify(messageObj);

    salle.joueurs.forEach(client => {
      if (salle.joueurs_en_vie.includes(client.name) && client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
}

function diffuser(roomId, messageObj) {
    const salle = sallesDeJeu[roomId];
    const json = JSON.stringify(messageObj);

    salle.joueurs.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(json);
        }
    });
}

console.log('Serveur WebSocket démarré sur ws://localhost:8080');
function genererNouvelIdSalle() {
    let gameId;
    do{
      gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (sallesDeJeu[gameId]);
    return gameId;
}

wss.on('connection', function connection(ws) {
  console.log('Un nouveau client est connecté.', wss.clients.size);
  //broadcastClientCount();

  // Écoute les messages envoyés par ce client spécifique
  ws.on('message', function incoming(message) {
    try{
      const data = JSON.parse(message);
      if (data.type === 'DEBUT') {
        console.log("connexion sur", data.value);
      }
      else if (data.type === 'CREER_SALLE') {
          const gameId = genererNouvelIdSalle();
          sallesDeJeu[gameId] = {
            joueurs: new Set(),
            participants:{},
            joueurs_en_vie:[],
            joueurs_mort:[],
            candidateForMayor:[],
            voteActuel: {},
            encours:false,
            maire:undefined,
            numsPlayersForGame:4,
            choixDuMaire:undefined,
            listeForMaire:[],
          };
          sallesDeJeu[gameId].joueurs.add(ws);
          ws.gameId = gameId;
          ws.name = data.name;
          sallesDeJeu[gameId].participants[data.name]={
            name: data.name,
            ws: ws,                // La connexion actuelle
            estConnecte: true,      // État de la connexion
            estMort: false,         // État dans le jeu
            role: null,        // Sera rempli au lancement
            timeoutReconnexion: null // Pour le timer de grâce
          }
          console.log(`Salle créée : ${gameId}. Le client est ajouté.`);
          ws.send(JSON.stringify({ type: 'SALLE_CREEE', gameId: gameId }));
      }
      else if(data.type === 'VALIDER_CODE'){
        const gameId = data.gameId;
        const salle = sallesDeJeu[gameId];
        if (salle) {
          ws.send(JSON.stringify({type:"CODE_CORRECT", roomId:gameId}));
        }
        else{
          ws.send(JSON.stringify({type:"INVALIDE_CODE"}));
        }
      }
      else if (data.type === 'REJOINDRE_SALLE') {
         console.log('je suis dans rejoindre');
          const gameId = data.gameId;
          const salle_Cible = sallesDeJeu[gameId];
         console.log('le gameid de rejoindre est', gameId);
          if (salle_Cible) {
            if (salle_Cible.encours) {
              console.log('salle deja en cours');
              ws.close(4002, "session deja encours");
              return;
            }
           // console.log(salle_Cible.joueurs);
            for (let client of salle_Cible.joueurs) {
                  if (client.name === data.name) {
                      console.log('Ce pseudo est deja connecte');
                      ws.close(4001, "Une seule session autorisée en jeu.");
                      return;
                  }
            }
            ws.gameId = gameId;
            ws.name = data.name;
            salle_Cible.joueurs.add(ws); // rajouter l'unicite pour differencier chaque joueur
            salle_Cible.participants[data.name]={
              name: data.name,
              ws: ws,
              estConnecte: true,
              estMort: false,
              role: null, 
              timeoutReconnexion: null,
              iconPerso:data.iconPerso
            }
            console.log(`Client ajouté à la salle ${gameId}`);
            console.log(Object.keys(salle_Cible.participants))
            diffuserPlayerSalleCount(salle_Cible.joueurs, salle_Cible.participants, salle_Cible.numsPlayersForGame, ws.name);
          }
          else {
              console.log("salle n'existe pas");
              ws.send(JSON.stringify({ type: 'ERREUR', message: 'Cette salle nexiste pas.'}));
          }
      }
      else if (data.type === "NUMBER_PLAYER_FOR_GAME") {
        if (ws.gameId && sallesDeJeu[ws.gameId]) {
          const salle = sallesDeJeu[ws.gameId];
          if (data.numsPlayersForGame <= 11) {
            salle.numsPlayersForGame = data.numsPlayersForGame;
            const message = {
              type:"NUMBERS_PLAYERS_UPDATE",
              numsPlayersForGame:data.numsPlayersForGame
            }
            diffuser(ws.gameId,message);
          }
        }
      }
      else if (data.type === 'LAUNCH_GAME') {
        try {
          i = 0;
          if (ws.gameId) {
              if (sallesDeJeu[ws.gameId].interval) clearInterval(sallesDeJeu[ws.gameId].interval);
              if (sallesDeJeu[ws.gameId].timeout) clearTimeout(salle.timeout);
              const liste_players = Array.from(sallesDeJeu[ws.gameId].joueurs, obj=>obj.name);
              sallesDeJeu[ws.gameId].joueurs_en_vie = liste_players;
              array = [];
              array = algorithmAleatoire(ws.gameId);
              array = algorithFisher(array);
              sallesDeJeu[ws.gameId].joueurs.forEach(function each(client){
              if (client.readyState === WebSocket.OPEN) { 
                assignRole(ws.gameId, client.name, array[i]);
                client.send(JSON.stringify({type:"GAME_LAUNCH", carte:array[i], list_players:liste_players, roomId:ws.gameId}));
                i = i+1;
              }
            })
            sallesDeJeu[ws.gameId].encours = true;
            sallesDeJeu[ws.gameId].period = "SEEYOURCARD";
            sallesDeJeu[ws.gameId].typeNow = "LAUNCH_GAME";
            PeriodeDuJeu(ws.gameId);
          } 
        }
        catch(e){
          console.log(e);
        }
      }
      else if (data.type === 'VOTE') {
        if (ws.gameId) {
          sallesDeJeu[ws.gameId].joueurs.forEach(function each(client){
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({type:"VOTE_CLIENT", id:data.id}));
              }
            })
        }
      }
      else if (data.type === "CANDIDATE_MAIRE") {
        if (ws.gameId && sallesDeJeu[ws.gameId]) {
          const salle = sallesDeJeu[ws.gameId];
          if (salle.joueurs_en_vie.includes(ws.name)) {
            if (!salle.candidateForMayor.includes(ws.name)) {
              console.log('hehehe je me presente maire');
              const count = countVote(ws.gameId);
              salle.candidateForMayor.push(ws.name);
              const message = {
                type:data.type,
                list:salle.candidateForMayor,
                countVotes:count,
                votes:salle.voteActuel,
                votants:salle.voteActuel
              }
              diffuser(ws.gameId, message);
            }
          }
        }
      }
      else if (data.type === 'MY_VOTE_ELIMINATION' || data.type === 'MY_VOTE_MAIRE') {
        const salle = sallesDeJeu[ws.gameId];
        if (salle.phase === 'VOTE' || salle.phase === 'VOTE_LOUP' || salle.phase === "VOTE_MAIRE" || salle.phase === "SORCIERE_KILLER") {
          if (ws.gameId && sallesDeJeu[ws.gameId]) {
            data.nameVotant = ws.name;
            if (!salle.joueurs_en_vie.includes(data.nameVotant)) {
              ws.send(JSON.stringify({
                type: "ERROR",
                message: "Les morts ne parlent pas (et ne votent pas) !"
              }));
              return ;
            }
            if (!salle.joueurs_en_vie.includes(data.myVote))
            {
              ws.send(JSON.stringify({
                type: "ERROR",
                message: "on ne vote pas les morts !",
              }));
              return;
            }
            console.log('A',salle.timerSeconds,', jai recu le vote:',data);
            ajouteVote(ws.gameId, data);
            const count = countVote(ws.gameId);
            const message = {
                              type:data.type,
                              countVotes:count,
                              votes:salle.voteActuel,
                              myVote:salle.voteActuel[data.nameVotant],
                              nameVotant:data.nameVotant};
            if (salle.phase === PHASE.VOTE_LOUP) {
              diffuserLoups(ws.gameId, message);
            }
            else if (salle.phase === PHASE.SORCIERE_KILLER) {
              if (salle.participants[ws.name].attribut === ATTRIBUTS.SORCIERE)
                ws.send(JSON.stringify(message));
            }
            else
              diffuser(ws.gameId, message);
          }
        }
      }
      else if (data.type === PHASE.MAIRE_ELIMINE) {
        if (ws.gameId && sallesDeJeu[ws.gameId]) {
          const salle = sallesDeJeu[ws.gameId]
          if (salle.maire === ws.name){
            salle.choixDuMaire = data.choice;
            salle.timerSeconds = 1;
          } 
        }
      }
      else if (data.type === 'DO_NOTHING') {
        sallesDeJeu[ws.gameId].timerSeconds = 0;
      }
      else if (data.type === 'VOYANTE_OBSERVE'){
        if (ws.gameId && sallesDeJeu[ws.gameId]) {
          voyanteRegarde(ws, ws.gameId, data.name);
          console.log('avant le timer');
          sallesDeJeu[ws.gameId].timerSeconds = 5;
        }
      }
      else if (data.type === "SORCIERE_REPONSE") {
        if (ws.gameId && sallesDeJeu[ws.gameId]) {
          const salle = sallesDeJeu[ws.gameId];
          if (salle.participants[ws.name].attribut !== ATTRIBUTS.SORCIERE) {
            console.log("attribut is", salle.participants[ws.name].ATTRIBUTS)
            return ;
          }
          if (data.choice === 'SAUVER') {
            sorciereSauve(ws.gameId, ws.name);
          }
          else if (data.choice === 'TUER') {
            sorciereTuer(ws.gameId, ws.name);
          }
        }
      }
      else if (data.type === "RECONNEXION") {
        console.log('Dans reconnexion');
        if (!data.gameId || !sallesDeJeu[data.gameId]) {
        console.log('no pourquoi');
          ws.send(JSON.stringify({
              type: "ROOMID_DOESNT_EXIST",
          })); 
          return;
        }
        console.log('jai traverse');
        const joueur = sallesDeJeu[data.gameId].participants[data.name];
        if (joueur && joueur.estFantome) {
        ws.name = data.name;
        ws.gameId = data.gameId;
          clearTimeout(joueur.timerGrace); // STOP ! Il est revenu
          joueur.estFantome = false;
          joueur.ws = ws; // On lui donne la nouvelle socket
          const salle = sallesDeJeu[data.gameId];
          salle.joueurs.add(ws);
          // 🔄 SYNC : On lui renvoie l'état exact du jeu
          const count = countVote(ws.gameId);
          const message = {
                type: "REPRISE",
                typeNow:salle.typeNow,
                phase: salle.phase,
                carte:salle.participants[ws.name].carte,
                timer:salle.timerSeconds,
                myVote:salle.voteActuel[ws.name],
                nameVotant:ws.name,
                maire:salle.maire,
                joueurs_en_vie:salle.joueurs_en_vie,
                joueurs_mort:salle.joueurs_mort
            };
            switch (salle.phase) {
              case PHASE.VOTE_LOUP:
                message.attribut = ATTRIBUTS.LOUP;
                if (joueur.role === ROLE.LOUP){
                  message.countVotes = count;
                }
                else{
                  message.phase = "TIMER_PHASE";
                }
                break;
              case "SORCIERE":
                if (joueur.attribut === ATTRIBUTS.SORCIERE) {
                  message.victime = salle.wolfVictim;
                  message.potionVie = joueur.potionVie
                  message.potionMort = joueur.potionMort
                }
                else{
                  message.phase = "TIMER_PHASE";
                }
                break;
              case "SORCIERE_KILLER":
                if (joueur.attribut === ATTRIBUTS.SORCIERE) {
                  message.countVotes = count;
                }
                else
                  message.phase = "TIMER_PHASE";
                break;
              case "VOTE":
                  message.countVotes = count;
                  if (salle.timerSeconds <= 0) {
                    message.phase = "MORT_VOTE";
                  }
                break;
              case "VOTE_MAIRE":
                  message.list = salle.candidateForMayor;
                  message.countVotes = count;
                  break;
              case PHASE.MAIRE_ELIMINE:
                  message.liste = salle.listeForMaire;
                  break;
              case "TRANSITION_DAY":
                  if (salle.timerSeconds <= 0) {
                    message.phase = "MORT_NUIT";
                  }
                break;
              default:
                message.countVotes = count;
                break;
            }
            ws.send(JSON.stringify(message));
        }
        else
        {
            console.log('Ce pseudo est deja entrain de jouer');
            ws.close(4001, "Une seule session autorisée en jeu.");
            return;
        }
      }
      else{
        console.log('Message reçu : %s de la salle', message, ws.gameId);
        if (ws.gameId && sallesDeJeu[ws.gameId]) {
        //  console.log(sallesDeJeu[ws.gameId].participants);
          data.iconPerso = sallesDeJeu[ws.gameId].participants[ws.name].iconPerso;
           if (sallesDeJeu[ws.gameId].participants[ws.name].estMort) {
            diffuserMorts(ws.gameId, data);
           }
           else if (sallesDeJeu[ws.gameId].period === 'NUIT') {
          //  console.log(sallesDeJeu[ws.gameId].participants[ws.name].role);
              if (sallesDeJeu[ws.gameId].phase === PHASE.VOTE_LOUP && sallesDeJeu[ws.gameId].participants[ws.name].role === ROLE.LOUP) {
                diffuserLoups(ws.gameId, data);
              }
           }
           else{
              sallesDeJeu[ws.gameId].joueurs.forEach(function each(client){
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(data));
                }
              })
           }
        }
      /* wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
          
          }
        });*/
      }
    }
    catch(e){
      console.log('Catch Message reçu : %s', message);
      if (ws.gameId && sallesDeJeu[ws.gameId]) {
        sallesDeJeu[ws.gameId].joueurs.forEach(function each(client){
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        })
      }
    }
});

ws.on('close', (code) => {
  console.log('jsuis dans le close');
    const salle = sallesDeJeu[ws.gameId];
    const name = ws.name;
    const roomId = ws.gameId;
    if (!ws.gameId || !salle) return;
    salle.joueurs.delete(ws);
    const joueur = salle.participants[name];
    if (!joueur) return;
    if (code === 1000 || !salle.encours) { // le joueur quitte volentairement la salle genre il supprime la page
        console.log(`${name} a quitté proprement.`);
        eliminerDefinitivement(joueur, roomId); 
    }
    else {
        joueur.estFantome = true;
        console.log(`${name} a un souci de connexion. Attente de 60s...`);
        // On ne le retire pas, on attend qu'il revienne
        joueur.timerGrace = setTimeout(() => {
            if (joueur.estFantome) {
                console.log(`Délai dépassé pour ${name}. Élimination.`);
                eliminerDefinitivement(joueur, roomId);
            }
        }, 240000); // 2 minute de grâce
      }
    });
})

function eliminerDefinitivement(p, roomId){
  console.log('Un client s\'est déconnecté.');
  const salle = sallesDeJeu[roomId];
  if (salle) {
    salle.joueurs.delete(p.ws);
    salle.joueurs_en_vie = salle.joueurs_en_vie.filter(el=>p.name !== el);
    salle.joueurs_mort = salle.joueurs_mort.filter(el=>p.name !== el);
    delete salle.participants[p.name];
    const tableauMixte = Object.entries(salle.participants).map(([cle, valeur]) => {
      return { name: cle, icone: valeur.iconPerso};
    });
    const message ={
      type:'PLAYER_DECONNECTE',
      name:p.name,
      joueurs_en_vie: salle.joueurs_en_vie,
      list_players: tableauMixte
    };
    diffuser(roomId, message);
  }    //broadcastClientCount();
}
