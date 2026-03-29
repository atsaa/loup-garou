const ASSET = "images/Cartes";

const ATTRIBUTS = {
    VILLAGEOIS:'aucun',
    LOUP:'tue des villageois',
    SORCIERE:'',
    VOYANTE:'',
    PETITE_FILLE:'',
    CUPIDON:'join deux cartes',
    CHASSEUR:'',
    CHASSEUR:'chasseur',
}

const ROLE = {
    VILLAGEOIS:'villageois',
    LOUP:'loup'
};

const DESCRIPTION = {
    VILLAGEOIS:"Sa parole est son seul pouvoir de persuasion pour éliminer les Loups-Garous. Il doit rester à l'affût d'indices, et identifier les coupables.",
    LOUP:" Durant la nuit, les Loups-Garous se réunissent pour voter l'élimination d'un joueur. Pendant la journée, ils doivent éviter d'être démasqués",
    SORCIERE:"Chaque nuit, elle se réveille et peut utiliser l'une de ses deux potions : soigner la victime des Loups-Garous, ou tuer quelqu’un.",
    VOYANTE:"je vois",
    PETITE_FILLE:"La nuit, elle espionne discrètement les Loups-Garous pendant leurs discussions.",
    CUPIDON:"La première nuit, il désigne deux joueurs comme Amoureux. Si l'un d'eux meurt, l'autre le suivra dans sa tombe",
    CHASSEUR:'chasseur',
}


class carte {
    constructor(name, url, role, attribut, description)
    {
        this.name = name; //le nom de la carte
        this.url = url; //url de l'image
        this.role = role; // villageois ou loup
        this.attribut = attribut; //ses facultes
        this.description = description; // sa desription
        this.life = 1;// si tu es envie ou mort
        this.line='none';
    }
    liason(target, target2)
    {
        if (this.attribut === ATTRIBUTS.CUPIDON)
        {
            target.line = target2.name;
            target2.line = target.name;
        }
    }
};

const datas = [
    new carte("loup", ASSET+"/LoupGarou.png", ROLE.LOUP, ATTRIBUTS.LOUP,DESCRIPTION.LOUP),
    new carte("villageois", ASSET+"/SimpleVillageois.png", ROLE.VILLAGEOIS, ATTRIBUTS.VILLAGEOIS,DESCRIPTION.VILLAGEOIS),
    new carte("sorciere", ASSET+"/Sorciere.png", ROLE.VILLAGEOIS, ATTRIBUTS.SORCIERE,DESCRIPTION.SORCIERE),
    new carte("voyante", ASSET+"/Voyante.png", ROLE.VILLAGEOIS, ATTRIBUTS.VOYANTE,DESCRIPTION.VOYANTE),
    new carte("chasseur", ASSET+"/Chasseur.png", ROLE.VILLAGEOIS, ATTRIBUTS.CHASSEUR,DESCRIPTION.CHASSEUR),
    new carte("petite fille", ASSET+"/PetiteFille.png", ROLE.VILLAGEOIS, ATTRIBUTS.PETITE_FILLE,DESCRIPTION.PETITE_FILLE),
    new carte("cupidon", ASSET+"/Cupidon.png", ROLE.VILLAGEOIS, ATTRIBUTS.CUPIDON,DESCRIPTION.CUPIDON),
];
module.exports = datas;
