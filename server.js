

/*  connexion et autorisation au serveur render.com */
const http = require('http');
const fs = require('fs');
const path = require('path');

//import { datas } from './data.js';
// server.js (Backend Node.js)
//const { consoleOrigin } = require('firebase-tools/lib/api');
const WebSocket = require('ws');
const datas = require('./data.js');
//const { cli } = require('firebase-tools');
//const client = require('firebase-tools');
// Crée un serveur WebSocket sur le port 8080

//definir le port dynamique de render
const PORT = process.env.port || 8080;
const app = express();

// 1. Créer le serveur qui envoie ton HTML/JS aux joueurs
const server = http.createServer((req, res) => {
    // Si tu as un dossier "public", ajuste le chemin ici
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';

    const extname = path.extname(filePath);
    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end("Fichier non trouvé");
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
        }
    });
});
/**/
//const wss = new WebSocket.Server({ port: 8080 }); sur localhost
const wss = new WebSocket.Server({ server });


server.listen(PORT, () => {
    console.log(`Le village est en ligne sur le port ${PORT}`);
});









const sallesDeJeu = {};

const ROLE = {
    VILLAGEOIS:'villageois',
    LOUP:'loup'
};

const ATTRIBUTS = {
    VILLAGEOIS:'villageois',
    LOUP:'loup',
    SORCIERE:'sorciere',
    PETITE_FILLE:'petite fille',
    CUPIDON:'cupdion',
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

function reinitialiserVote(roomId)
{
  const counts = countVote(roomId);
    salle.joueurs.forEach(function each(client){
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
          type:"MY_VOTE_ELIMINATION",
          votes:counts,
          myVote:null,
          nameVotant:null}));
      }
    });
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
  sallesDeJeu[roomId].joueurs_role[name] = {
                                            "role":data.role,
                                            "attribut":data.name,
                                            };
  if (data.name === ATTRIBUTS.SORCIERE) {
    sallesDeJeu[roomId].joueurs_role[name].potionVie = 1;
    sallesDeJeu[roomId].joueurs_role[name].potionMort = 1;
  }
  /*else if (data.attribut === ATTRIBUTS.CUPIDON) {
    sallesDeJeu[roomId].joueurs_role[name]. = 1;
  }*/
}
function sorciereSauve(roomId, name){
  console.log('i am there');
  const salle = sallesDeJeu[roomId];
  if (!salle.joueurs_role[name].potionVie) {
    return ;
  }
  salle.joueurs_mort = [];
  salle.wolfVictim = undefined;
  // = salle.joueurs_mort.
  salle.joueurs_role[name].potionVie = 0;
  salle.timerSeconds = 0;
}

function sorciereTuer(roomId, name){
  const salle = sallesDeJeu[roomId];
  if (!salle.joueurs_role[name].potionMort) {
    return ;
  }
  salle.phase ="SORCIERE_KILLER";
  salle.joueurs_role[name].potionMort = 0;
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
          if (salle.joueurs_role[client.name].attribut === attribut)
          {
            const potion_vie = salle.joueurs_role[client.name].potionVie;
            const potion_mort = salle.joueurs_role[client.name].potionMort;
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

function diffuserLoups(){

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
    if (attribut === ATTRIBUTS.SORCIERE){
      diffuserSorciere(idSalle, attribut, secondes);
      return ;
    }
    if (role) {
      salle.joueurs.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            if (salle.joueurs_role[client.name].role === role)
              client.send(JSON.stringify(message));
            else
            {
              message.phase = "TIMER_PHASE";
              client.send(JSON.stringify(message));
            }
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
        if (salle.joueurs_role[pseudo].role === ROLE.LOUP) {
            nbLoups++;
        } else {
            nbVillageois++;
        }
    });
    // 2. On teste les conditions de victoire
    if (nbLoups === 0) {
      salle.period = "GAME_OVER";
      diffuser(roomId, {"type":"GAME_OVER","winner":"VILLAGEOIS"})
      return true;
    }
    if (nbVillageois <= 0) {
      salle.period ="GAME_OVER";
      diffuser(roomId, {"type":"GAME_OVER","winner":"LOUPS"});
      //terminerLaPartie(roomId, "LOUPS");
      return true;
    }
    return false;
}

function Deadmanaging(roomId, period, phase, func)
{
  salle = sallesDeJeu[roomId];
  salle.joueurs_en_vie = salle.joueurs_en_vie.filter(player=> !salle.joueurs_mort.includes(player));
  const data = {
        type:"JOUR",
        phase:"MORT_VOTE",
        joueurs_en_vie:salle.joueurs_en_vie,
        joueurs_mort:salle.joueurs_mort,
  }
  if (phase === 'VOTE') {
    diffuser(roomId, data);
  }//on a tuer durant la nuit ducoup
  else if (salle.joueurs_mort.length != 0){
    data.phase = 'MORT_NUIT';
    salle.wolfVictim = undefined;
    diffuser(roomId, data);
  }
  salle.period = period;
  salle.phase = phase;
  salle.timeout = setTimeout(() => {
      salle.timeout = undefined;  
      const chasseur = salle.joueurs_mort.find(p => salle.joueurs_role[p].attribut === "CHASSEUR");
      reinitialisationDay(roomId);
      if (chasseur) {
          //lancerPhase(roomId, "TIR_CHASSEUR");
      }
      else {
        if (verifierFinDePartie(roomId))
          return ;
        func(roomId);
      }
    }, 2000);
}

function joueurElimine(roomId, phase){
  const salle = sallesDeJeu[roomId];
  const count = countVote(roomId);
  const maxVal = Math.max(...Object.values(count));
  const winners = Object.keys(count).filter(k => count[k] === maxVal);
  salle.voteActuel = {};
  console.log(winners);
  if (winners.length === 1) {
    if (phase === "VOTE_LOUP") {
      salle.wolfVictim = winners[0];
    }
    salle.joueurs_mort.push(winners[0]);
  }
  /*if (phase === "VOTE") {
    if (winners.length === 1 ) {
      salle.joueurs_mort = winners;
    } 
  }
  else if (phase === "VOTE_LOUP") {
      if (winners.length !== 1)
        return ;
      salle.wolfVictim = winners[0];
      salle.joueurs_mort.push(winners[0]);
  }*/
}

function finPhase(roomId, func, period, phase) {
  const salle = sallesDeJeu[roomId];
  if (salle.phase === "VOTE_MAIRE") {
    sendMaire(roomId);
  }
  else if (salle.period === "JOUR" && salle.phase === "VOTE") {
    joueurElimine(roomId, salle.phase);
    Deadmanaging(roomId, period, phase, func);
    return ;
  }
  else if (salle.phase === "VOTE_LOUP"){
    joueurElimine(roomId, salle.phase);
    const sorciereVivante = salle.joueurs_en_vie.find(p => 
        salle.joueurs_role[p].attribut === ATTRIBUTS.SORCIERE
    );
    console.log(sorciereVivante);
    if (sorciereVivante) {
      if (salle.joueurs_role[sorciereVivante].potionMort > 0 || salle.joueurs_role[sorciereVivante].potionVie > 0) {
        salle.phase = "SORCIERE";
        salle.voteActuel = {};
        func(roomId);
        return ;
      }
    }
    Deadmanaging(roomId, period, phase, func);
    return;
  }
  else if (salle.phase === "SORCIERE" || salle.phase === "SORCIERE_KILLER") {
    joueurElimine(roomId, salle.phase);
    Deadmanaging(roomId, period, phase, func);
    return ;
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
  const salles = sallesDeJeu[roomId];
  salles.maire = "roro";
  message = {
    type:"MESSAGE",
    name:"server",
    message:"roro a été élu Maire",
  }
  maire = {
    type:"CHOIX_MAIRE",
    value:"roro"
  }
  salles.joueurs.forEach(function each(client){
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      client.send(JSON.stringify(maire));
    }
  })
}

function etapeJour(roomId)
{
  const salle = sallesDeJeu[roomId];
  switch (salle.phase) {
    case 'VOTE_MAIRE':
      lancerTimer(roomId, 1, etapeJour, "JOUR", "VOTE");
      break;
    case 'VOTE':
      lancerTimer(roomId, 10, PeriodeDuJeu, "NUIT", "ATTENTE");
      break;
  }
}
 
function etapeNuit(roomId)
{
  const salle = sallesDeJeu[roomId];

    switch(salle.phase) {
        case "ATTENTE":
            lancerTimer(roomId, 5, PeriodeDuJeu, "NUIT", "VOTE_LOUP"); // Lance le timer de 5s puis revient ici
            break;
        case "CHARGEMENT":
            salle.phase = "VOTE";
            lancerTimer(roomId, 1, PeriodeDuJeu); // Lance le timer de 30s puis revient ici
            break;
        case "VOTE_LOUP":
            lancerTimer(roomId, 10, PeriodeDuJeu, "JOUR", "VOTE", ROLE.LOUP, ATTRIBUTS.LOUP); // Enchaîne sur la nuit
            break;
        case "SORCIERE":
            lancerTimer(roomId, 10, PeriodeDuJeu, "JOUR", "VOTE", ROLE.SORCIERE, ATTRIBUTS.SORCIERE);
            break;
    }
}

function PeriodeDuJeu(roomId) {
    const salle = sallesDeJeu[roomId];
    console.log("periodedujeu", salle.period, salle.phase);
    switch (salle.period) {
      case "SEEYOURCARD":
        salle.phase = "NULL";
        lancerTimer(roomId, 2, PeriodeDuJeu, "JOUR", "VOTE_MAIRE");
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
  sallesDeJeu[Id].joueurs_en_vie.forEach( joueurs => {
    count[joueurs] = 0;
  });

  Object.values(sallesDeJeu[Id].voteActuel).forEach(vote=>{
    if (vote) {
      count[vote] = (count[vote] || 0) + 1;
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

function diffuserPlayerSalleCount(players) {
  const countMessage = JSON.stringify({
    type: 'CLIENT_COUNT',
    count: players.size,
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
  console.log('Un nouveau client est connecté. %d');
  //broadcastClientCount();

  // Écoute les messages envoyés par ce client spécifique
  ws.on('message', function incoming(message) {
    try{
      const data = JSON.parse(message);
      if (data.type === 'CREER_SALLE') {
          const gameId = genererNouvelIdSalle();
          sallesDeJeu[gameId] = {
            joueurs: new Set(),
            joueurs_en_vie:[],
            joueurs_mort:[],
            voteActuel: {},
            joueurs_role:{},
          };
          sallesDeJeu[gameId].joueurs.add(ws);
          ws.gameId = gameId;
          ws.name = data.name;
          console.log(sallesDeJeu);
          console.log(`Salle créée : ${gameId}. Le client est ajouté.`);
          ws.send(JSON.stringify({ type: 'SALLE_CREEE', gameId: gameId }));
      }
      else if (data.type === 'REJOINDRE_SALLE') {
          const gameId = data.gameId;
          const salle_Cible = sallesDeJeu[gameId];
          if (salle_Cible) {
            for (let client of salle_Cible.joueurs) {
                  if (client.name === data.name) {
                      salle_Cible.delete(client);
                      client.terminate(); 
                  }
            }
            ws.gameId = gameId;
            ws.name = data.name;
            salle_Cible.joueurs.add(ws); // rajouter l'unicite pour differencier chaque joueur
            console.log(`Client ajouté à la salle ${gameId}`);
            diffuserPlayerSalleCount(salle_Cible.joueurs);
          }
          else {
              ws.send(JSON.stringify({ type: 'ERREUR', message: 'Cette salle nexiste pas.'}));
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
              sallesDeJeu[ws.gameId].joueurs.forEach(function each(client){
              if (client.readyState === WebSocket.OPEN) {
                assignRole(ws.gameId, client.name, datas[i]);
                client.send(JSON.stringify({type:"GAME_LAUNCH", data:datas[i], list_players:liste_players}));
                i = i+1;
              }
            })
            sallesDeJeu[ws.gameId].period = "SEEYOURCARD";
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
      else if (data.type === 'MY_VOTE_ELIMINATION') {
        if (ws.gameId) {
          data.nameVotant = ws.name;
          if (!sallesDeJeu[ws.gameId].joueurs_en_vie.includes(data.nameVotant)) {
            ws.send(JSON.stringify({
              type: "ERROR",
              message: "Les morts ne parlent pas (et ne votent pas) !"
            }));
            return ;
          }
          if (!sallesDeJeu[ws.gameId].joueurs_en_vie.includes(data.myVote))
          {
            ws.send(JSON.stringify({
              type: "ERROR",
              message: "on ne vote pas les morts !",
            }));
            return;
          }
          console.log('jai recu le vote');
          ajouteVote(ws.gameId, data);
          const count = countVote(ws.gameId);
          sallesDeJeu[ws.gameId].joueurs.forEach(function each(client){
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                                type:data.type,
                                votes:count,
                                myVote:sallesDeJeu[ws.gameId].voteActuel[data.nameVotant],
                                nameVotant:data.nameVotant}));
              }
            })
        }
      }
      else if (data.type === "SORCIERE_REPONSE") {
        if (ws.gameId) {
          const salle = sallesDeJeu[ws.gameId];
          if (salle.joueurs_role[ws.name].attribut !== ATTRIBUTS.SORCIERE) {
            console.log(ws.name);
            console.log("attribut is", salle.joueurs_role[ws.name].ATTRIBUTS)
            return ;
          }
          if (data.choice === 'SAUVER') {
            console.log('huzjvuz pop');
            sorciereSauve(ws.gameId, ws.name);
          }
          else if (data.choice === 'TUER') {
            console.log('tuer');
            sorciereTuer(ws.gameId, ws.name);
          }
        }
      }
      else{
        console.log('Message reçu : %s', message);
        if (ws.gameId) {
            sallesDeJeu[ws.gameId].joueurs.forEach(function each(client){
            if (client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          })
        }
      /* wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
          
          }
        });*/
      }
    }
    catch(e){
      console.log('Catch Message reçu : %s', message);
      if (ws.gameId) {
        sallesDeJeu[ws.gameId].joueurs.forEach(function each(client){
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        })
      }
    }
});

ws.on('close', () => {
      if (ws.gameId)
        reinitialisationDay(ws.gameId);
      console.log('Un client s\'est déconnecté.');
      const salle = sallesDeJeu[ws.gameId];
      if (salle) {
        salle.joueurs.delete(ws); 
      }
      //broadcastClientCount();
  });
});