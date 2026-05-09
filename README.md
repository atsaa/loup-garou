# loup-garou
projet loup garou: le jeu consiste a voter en journee pour tuer les loups et la nuit les loups peuvent attaquer le village

Bon j'ai appris que visibility:hidden n'est pas animable
que display non plus
que la propriete innerhtml peut etre dangereuse pour des attaques xss
donc l'utiliser uniquement pour du cas statique et non des donne

problemes:

- si le message la sorciere va soigner ou eliminer un joueur n'apparait pas au reste des joueurs donc vivi etc.. c'est parce qu'il demeure dans la phase        timer_phase depuis la phase loup ou meme la phase voyante, je vais regler ca apres.
- rajouter un message pour signifier que le chasseur va tirer: je vais creer un type annonce pour gerer ca.
- ajuster aussi la liste des votes meme apres la reprise donc  quand un joueur actualise sa page