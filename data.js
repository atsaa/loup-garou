const ASSET = "images/Cartes/";

const ATTRIBUTS = {
    VILLAGEOIS:'aucun',
    LOUP:'tue des villageois',
    SORCIERE:'',
    PETITE_FILLE:'',
    CUPIDON:'join deux cartes',
}

const ROLE = {
    VILLAGEOIS:'villageois',
    LOUP:'loup'
};

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
    new carte("loup", ASSET+"/Loup Garou.png", ROLE.LOUP, ATTRIBUTS.LOUP,""),
    new carte("villageois", ASSET+"/Simple Villageois.png", ROLE.VILLAGEOIS, ATTRIBUTS.VILLAGEOIS,""),
    new carte("petite fille", ASSET+"/PetiteFille.png", ROLE.VILLAGEOIS, ATTRIBUTS.PETITE_FILLE,""),
    new carte("sorciere", ASSET+"/Sorcière.png", ROLE.VILLAGEOIS, ATTRIBUTS.SORCIERE,""),
    new carte("cupidon", ASSET+"/Cupidon.png", ROLE.VILLAGEOIS, ATTRIBUTS.CUPIDON,""),
];
module.exports = datas;