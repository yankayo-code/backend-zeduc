// Sauvegarde de toute la base dans le dossier "sauvegardes" (un fichier par collection)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');

mongoose.connect(process.env.MONGO_URL).then(async function() {
    const base = mongoose.connection.db;

    // Nom du dossier, par exemple : sauvegardes/2026-10-23_14h05
    const horodatage = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', 'h');
    const dossier = path.join(__dirname, 'sauvegardes', horodatage);
    fs.mkdirSync(dossier, { recursive: true });

    const collections = await base.listCollections().toArray();
    for (const info of collections) {
        if (info.name.startsWith('system.')) {
            continue;
        }
        const documents = await base.collection(info.name).find({}).toArray();
        // EJSON garde les types (identifiants, dates) pour pouvoir restaurer à l'identique
        fs.writeFileSync(path.join(dossier, info.name + '.json'), EJSON.stringify(documents, null, 2));
        console.log(info.name + ' : ' + documents.length + ' documents');
    }

    console.log('Sauvegarde terminée : ' + dossier);
    await mongoose.disconnect();
}).catch(function(erreur) {
    console.log('Sauvegarde échouée :', erreur.message);
    process.exit(1);
});