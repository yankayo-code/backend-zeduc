require('dotenv').config();
const mongoose = require('mongoose');
const Plat = require('./plat');

const ANCIEN = 'https://github.com/yankayo-code/Interface-client/blob/main/';
const NOUVEAU = 'https://zeduc-front.yan-kayo.workers.dev/';

mongoose.connect(process.env.MONGO_URL).then(async function() {
    const plats = await Plat.find();
    let nombre = 0;

    for (const plat of plats) {
        if (plat.image && plat.image.startsWith(ANCIEN)) {
            const fichier = plat.image.slice(ANCIEN.length).replace('?raw=true', '');
            plat.image = NOUVEAU + fichier;
            await plat.save();
            nombre++;
            console.log(plat.nom + ' -> ' + plat.image);
        }
    }

    console.log(nombre + ' plats mis à jour');
    await mongoose.disconnect();
});