// Remet une sauvegarde dans une base. Ne supprime jamais rien :
// une collection qui contient déjà des données est ignorée.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');

const dossier = process.argv[2];
const nomBase = process.argv[3];

if (!dossier || !nomBase) {
    console.log('Utilisation : node restaurer.js sauvegardes/AAAA-MM-JJ_HHhMM nom_de_la_base');
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URL).then(async function() {
    const base = mongoose.connection.getClient().db(nomBase);
    const fichiers = fs.readdirSync(dossier).filter(function(f) { return f.endsWith('.json'); });

    for (const fichier of fichiers) {
        const nom = fichier.replace('.json', '');
        const documents = EJSON.parse(fs.readFileSync(path.join(dossier, fichier), 'utf8'));
        const collection = base.collection(nom);

        if ((await collection.countDocuments()) > 0) {
            console.log(nom + ' : ignorée (elle contient déjà des données)');
            continue;
        }
        if (documents.length > 0) {
            await collection.insertMany(documents);
        }
        console.log(nom + ' : ' + documents.length + ' documents restaurés');
    }

    await mongoose.disconnect();
}).catch(function(erreur) {
    console.log('Restauration échouée :', erreur.message);
    process.exit(1);
});