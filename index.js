require('dotenv').config();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Plat = require('./plat');
const Commande = require('./commande');
const Client = require('./client');
const Boisson = require('./boisson');
const Supplement = require('./supplement');
const Reglage = require('./reglage');
const Abonnement = require('./abonnement');
const webpush = require('web-push');
const { estOuvertHoraire, prochaineOuverture, prochaineFermeture } = require('./horaires');
const app = express();

app.use(cors());
app.use(express.json());
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:contact@example.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}



// Bonto place un relais devant ton serveur : sans cette ligne, toutes les requêtes
// sembleraient venir de la même adresse et tes clients se bloqueraient entre eux
app.set('trust proxy', 1);

// Connexion admin : 5 mauvais essais maximum par 15 minutes et par adresse IP
const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erreur: 'Trop de tentatives. Réessayez dans 15 minutes.' }
});

// Commandes : 20 par 15 minutes et par adresse IP
const limiteCommande = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erreur: 'Trop de commandes envoyées. Réessayez dans quelques minutes.' }
});

// Inscription des clients : 20 par 15 minutes et par adresse IP
const limiteInscription = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erreur: 'Trop de tentatives. Réessayez plus tard.' }
});

// Connexion admin : renvoie un jeton si le mot de passe est bon
app.post('/admin/login', limiteLogin, async (req, res) => {
    const { motDePasse } = req.body || {};

    
    if (!motDePasse || motDePasse !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ erreur: 'Mot de passe incorrect' });
    }

    const jeton = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ jeton: jeton });
});

// Gardien : laisse passer uniquement ceux qui ont un jeton valide
function verifierAdmin(req, res, next) {
    const entete = req.headers.authorization || '';
    const jeton = entete.startsWith('Bearer ') ? entete.slice(7) : null;

    if (!jeton) {
        return res.status(401).json({ erreur: 'Non autorisé' });
    }

    try {
        const donnees = jwt.verify(jeton, process.env.JWT_SECRET);
        if (donnees.role !== 'admin') {
            return res.status(403).json({ erreur: 'Accès refusé' });
        }
        next();
    } catch (e) {
        res.status(401).json({ erreur: 'Jeton invalide ou expiré' });
    }
}


// Ouvrir ou fermer le secteur client (admin)
// Calcule l'état du secteur client : horaires, fermeture anticipée ou ouverture exceptionnelle
async function etatSecteur() {
    const maintenant = new Date();
    const reglage = await Reglage.findOne({ cle: 'secteurClient' });
    const dansHoraires = estOuvertHoraire(maintenant);
    const fermeManuelle = dansHoraires && !!(reglage && reglage.fermeJusquA && reglage.fermeJusquA > maintenant);
    const ouvertureExceptionnelle = !dansHoraires && !!(reglage && reglage.ouvertJusquA && reglage.ouvertJusquA > maintenant);
    const ouvert = dansHoraires ? !fermeManuelle : ouvertureExceptionnelle;

    let rouvre = null;
    if (!ouvert) {
        rouvre = dansHoraires ? reglage.fermeJusquA : prochaineOuverture(maintenant);
    }
    return { ouvert, dansHoraires, fermeManuelle, ouvertureExceptionnelle, rouvre };
}

async function secteurOuvert() {
    return (await etatSecteur()).ouvert;
}

// État du secteur client (public : le site client le lit)
app.get('/etat', async (req, res) => {
    try {
        res.json(await etatSecteur());
    } catch (e) {
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// Fermer plus tôt / ouvrir exceptionnellement, ou annuler (admin)
app.put('/admin/etat', verifierAdmin, async (req, res) => {
    const { ouvert } = req.body || {};
    if (typeof ouvert !== 'boolean') {
        return res.status(400).json({ erreur: 'Valeur invalide' });
    }
    try {
        const maintenant = new Date();
        const dansHoraires = estOuvertHoraire(maintenant);
        let changement;
        if (ouvert) {
            // Dans les horaires : on annule la fermeture. Hors horaires : ouverture exceptionnelle.
            changement = { fermeJusquA: null, ouvertJusquA: dansHoraires ? null : prochaineFermeture(maintenant) };
        } else {
            // Dans les horaires : on ferme plus tôt. Hors horaires : on annule l'ouverture exceptionnelle.
            changement = { ouvertJusquA: null, fermeJusquA: dansHoraires ? prochaineOuverture(maintenant) : null };
        }
        await Reglage.findOneAndUpdate(
            { cle: 'secteurClient' },
            changement,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json(await etatSecteur());
    } catch (e) {
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// Gardien des commandes : refuse tout quand le restaurant est fermé
async function verifierOuvert(req, res, next) {
    try {
        if (!(await secteurOuvert())) {
            return res.status(403).json({
                erreur: 'Nous sommes fermés pour le moment. Les commandes reprendront bientôt.',
                ferme: true
            });
        }
        next();
    } catch (e) {
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
}

app.get('/plats', async (req, res) => {
    const plats = await Plat.find();
    res.json(plats);
});

// Gardien des clients : exige le jeton reçu à l'inscription et retrouve le client dans la base
async function verifierClient(req, res, next) {
    const entete = req.headers.authorization || '';
    const jeton = entete.startsWith('Bearer ') ? entete.slice(7) : null;

    if (!jeton) {
        return res.status(401).json({ erreur: 'Identification requise' });
    }

    try {
        const donnees = jwt.verify(jeton, process.env.JWT_SECRET);
        if (donnees.role !== 'client' || !mongoose.isValidObjectId(donnees.id)) {
            return res.status(403).json({ erreur: 'Accès refusé' });
        }
        const client = await Client.findById(donnees.id);
        if (!client) {
            return res.status(401).json({ erreur: 'Client inconnu' });
        }
        req.client = client;
        next();
    } catch (e) {
        res.status(401).json({ erreur: 'Session expirée' });
    }
}

// Activer / désactiver UN seul plat (admin seulement)
app.put('/plats/:id', verifierAdmin, async (req, res) => {
    const { disponible } = req.body || {};

    if (typeof disponible !== 'boolean') {
        return res.status(400).json({ erreur: 'Valeur invalide' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ erreur: 'Identifiant invalide' });
    }

    const plat = await Plat.findByIdAndUpdate(
        req.params.id,
        { disponible: disponible },
        { new: true }
    );

    if (!plat) {
        return res.status(404).json({ erreur: 'Plat introuvable' });
    }
    res.json(plat);
});

// Boissons disponibles (publique)
app.get('/boissons', async (req, res) => {
    const boissons = await Boisson.find({ disponible: true }).sort({ nom: 1 });
    res.json(boissons);
});

// Toutes les boissons, pour l'admin
app.get('/admin/boissons', verifierAdmin, async (req, res) => {
    const boissons = await Boisson.find().sort({ nom: 1 });
    res.json(boissons);
});

// Activer / désactiver une boisson (admin)
app.put('/boissons/:id', verifierAdmin, async (req, res) => {
    const { disponible } = req.body || {};
    if (typeof disponible !== 'boolean') {
        return res.status(400).json({ erreur: 'Valeur invalide' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ erreur: 'Identifiant invalide' });
    }
    const boisson = await Boisson.findByIdAndUpdate(req.params.id, { disponible: disponible }, { new: true });
    if (!boisson) {
        return res.status(404).json({ erreur: 'Boisson introuvable' });
    }
    res.json(boisson);
});

// Suppléments disponibles (publique)
app.get('/supplements', async (req, res) => {
    const supplements = await Supplement.find({ disponible: true }).sort({ nom: 1 });
    res.json(supplements);
});

// Tous les suppléments, pour l'admin
app.get('/admin/supplements', verifierAdmin, async (req, res) => {
    const supplements = await Supplement.find().sort({ nom: 1 });
    res.json(supplements);
});

// Activer / désactiver un supplément (admin)
app.put('/supplements/:id', verifierAdmin, async (req, res) => {
    const { disponible } = req.body || {};
    if (typeof disponible !== 'boolean') {
        return res.status(400).json({ erreur: 'Valeur invalide' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ erreur: 'Identifiant invalide' });
    }
    const supplement = await Supplement.findByIdAndUpdate(req.params.id, { disponible: disponible }, { new: true });
    if (!supplement) {
        return res.status(404).json({ erreur: 'Supplément introuvable' });
    }
    res.json(supplement);
});

// Ajouter un plat (admin)
app.post('/plats', verifierAdmin, async (req, res) => {
    const { nom, prix, image } = req.body || {};
    const nomPropre = nettoyer(nom, 80);
    const imagePropre = nettoyer(image, 500);

    if (nomPropre.length < 2) {
        return res.status(400).json({ erreur: 'Nom invalide' });
    }
    if (!Number.isInteger(prix) || prix < 1 || prix > 1000000) {
        return res.status(400).json({ erreur: 'Prix invalide (un nombre entier en FCFA)' });
    }
    if (!/^https:\/\/[^\s"']+$/.test(imagePropre)) {
        return res.status(400).json({ erreur: 'Lien de photo invalide (il doit commencer par https://)' });
    }
    // Les commandes retrouvent un plat par son nom : deux plats ne peuvent pas porter le même
    if (await Plat.findOne({ nom: nomPropre })) {
        return res.status(409).json({ erreur: 'Un plat porte déjà ce nom' });
    }

    const plat = await Plat.create({ nom: nomPropre, prix: prix, image: imagePropre });
    res.status(201).json(plat);
});

// Ajouter une boisson (admin)
app.post('/boissons', verifierAdmin, async (req, res) => {
    const { nom, prix } = req.body || {};
    const nomPropre = nettoyer(nom, 60);

    if (nomPropre.length < 2) {
        return res.status(400).json({ erreur: 'Nom invalide' });
    }
    if (!Number.isInteger(prix) || prix < 1 || prix > 1000000) {
        return res.status(400).json({ erreur: 'Prix invalide (un nombre entier en FCFA)' });
    }
    if (await Boisson.findOne({ nom: nomPropre })) {
        return res.status(409).json({ erreur: 'Une boisson porte déjà ce nom' });
    }

    const boisson = await Boisson.create({ nom: nomPropre, prix: prix });
    res.status(201).json(boisson);
});

// Le restaurant affecte (ou retire) l'option supplément d'un plat (admin)
app.put('/plats/:id/supplement', verifierAdmin, async (req, res) => {
    const { supplementAutorise } = req.body || {};
    if (typeof supplementAutorise !== 'boolean') {
        return res.status(400).json({ erreur: 'Valeur invalide' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ erreur: 'Identifiant invalide' });
    }
    const plat = await Plat.findByIdAndUpdate(req.params.id, { supplementAutorise: supplementAutorise }, { new: true });
    if (!plat) {
        return res.status(404).json({ erreur: 'Plat introuvable' });
    }
    res.json(plat);
});

// Modifier le prix et supprimer : plats, boissons et suppléments (admin)
[
    { chemin: 'plats', Modele: Plat, libelle: 'Plat' },
    { chemin: 'boissons', Modele: Boisson, libelle: 'Boisson' },
    { chemin: 'supplements', Modele: Supplement, libelle: 'Supplément' }
].forEach(function(r) {

    app.put('/' + r.chemin + '/:id/prix', verifierAdmin, async (req, res) => {
        const { prix } = req.body || {};
        if (!Number.isInteger(prix) || prix < 1 || prix > 1000000) {
            return res.status(400).json({ erreur: 'Prix invalide (un nombre entier en FCFA)' });
        }
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ erreur: 'Identifiant invalide' });
        }
        try {
            const element = await r.Modele.findByIdAndUpdate(req.params.id, { prix: prix }, { new: true });
            if (!element) {
                return res.status(404).json({ erreur: r.libelle + ' introuvable' });
            }
            res.json(element);
        } catch (e) {
            res.status(500).json({ erreur: 'Erreur serveur' });
        }
    });

    app.delete('/' + r.chemin + '/:id', verifierAdmin, async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ erreur: 'Identifiant invalide' });
        }
        try {
            const element = await r.Modele.findByIdAndDelete(req.params.id);
            if (!element) {
                return res.status(404).json({ erreur: r.libelle + ' introuvable' });
            }
            res.json({ supprime: true });
        } catch (e) {
            res.status(500).json({ erreur: 'Erreur serveur' });
        }
    });
});


// Retire les retours à la ligne, coupe les espaces, limite la longueur
function nettoyer(texte, max) {
    return String(texte || '').replace(/[\r\n]+/g, ' ').replace(/[<>]/g, '').trim().slice(0, max);
}

// Uniformise un numéro : retire espaces, tirets, parenthèses et l'indicatif +237
function normaliserTelephone(texte) {
    let t = String(texte || '').replace(/[\s.\-()]/g, '');
    if (t.startsWith('+237')) {
        t = t.slice(4);
    } else if (t.startsWith('00237')) {
        t = t.slice(5);
    }
    return t;
}

// Inscription d'un client : renvoie un jeton à garder sur le téléphone
app.post('/clients/inscription', limiteInscription, async (req, res) => {
    const { nom, telephone } = req.body || {};

    const nomPropre = nettoyer(nom, 60);
    const telephonePropre = normaliserTelephone(telephone);

    if (nomPropre.length < 2) {
        return res.status(400).json({ erreur: 'Nom invalide' });
    }
    if (!/^\+?\d{8,15}$/.test(telephonePropre)) {
        return res.status(400).json({ erreur: 'Numéro de téléphone invalide' });
    }

    const client = await Client.findOneAndUpdate(
        { telephone: telephonePropre },
        { nom: nomPropre, derniereVisite: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const jeton = jwt.sign(
        { role: 'client', id: client._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: '180d' }
    );

    res.status(201).json({
        jeton: jeton,
        client: { nom: client.nom, telephone: client.telephone }
    });
});

// Adresse de livraison : lettres (accents compris), espaces et . , ' ’ - / ( ) seulement, sans chiffres
function adresseValide(texte) {
    return /^[\p{L} .,'’\-\/()]{3,100}$/u.test(texte) && /\p{L}/u.test(texte);
}

app.post('/commande', limiteCommande, verifierOuvert, verifierClient, async (req, res) => {
    // Vérifie une liste d'options { nom, quantite } (boissons ou suppléments) à partir de la base.
    // Les prix envoyés par le site sont ignorés. Renvoie null si une option est invalide ou indisponible.
    async function verifierOptions(liste, Modele) {
    if (liste === undefined) {
        return [];
    }
    if (!Array.isArray(liste) || liste.length > 20) {
        return null;
    }
    const resultat = [];
    for (const o of liste) {
        if (!o || typeof o.nom !== 'string' || !Number.isInteger(o.quantite) || o.quantite < 1 || o.quantite > 20) {
            return null;
        }
        const element = await Modele.findOne({ nom: o.nom, disponible: true });
        if (!element) {
            return null;
        }
        resultat.push({ nom: element.nom, prix: element.prix, quantite: o.quantite });
    }
    return resultat;
    }

    const { articles, modeReception, residence } = req.body || {};

    // 1. Mode de réception : « sur-place » par défaut, « livraison » avec une adresse
    const mode = modeReception === undefined ? 'sur-place' : modeReception;
    if (mode !== 'sur-place' && mode !== 'livraison') {
        return res.status(400).json({ erreur: 'Mode de réception invalide' });
    }
    const adresse = mode === 'livraison' ? nettoyer(residence, 100) : '';
    if (mode === 'livraison' && adresse.length < 3) {
        return res.status(400).json({ erreur: 'Merci d\'indiquer votre adresse de livraison' });
    }
    if (mode === 'livraison' && !adresseValide(adresse)) {
        return res.status(400).json({ erreur: 'Adresse invalide : utilisez seulement des lettres, sans chiffres.' });
    }

    // 2. Contrôler le panier
    if (!Array.isArray(articles) || articles.length === 0 || articles.length > 30) {
        return res.status(400).json({ erreur: 'Panier invalide' });
    }


    // 3. Reconstruire chaque ligne à partir de la base (les prix envoyés sont ignorés)
    const lignesVerifiees = [];
    for (const a of articles) {
        if (!a || typeof a.nom !== 'string' || !Number.isInteger(a.quantite) || a.quantite < 1 || a.quantite > 20) {
            return res.status(400).json({ erreur: 'Article invalide' });
        }
        const plat = await Plat.findOne({ nom: a.nom, disponible: true });
        if (!plat) {
            return res.status(400).json({ erreur: 'Plat introuvable ou indisponible' });
        }

        const boissons = await verifierOptions(a.boissons, Boisson);
        if (boissons === null) {
            return res.status(400).json({ erreur: 'Boisson invalide ou indisponible' });
        }

        const supplements = await verifierOptions(a.supplements, Supplement);
        if (supplements === null) {
            return res.status(400).json({ erreur: 'Supplément invalide ou indisponible' });
        }
        if (supplements.length > 0 && !plat.supplementAutorise) {
            return res.status(400).json({ erreur: 'Ce plat n\'accepte pas de supplément' });
        }

        lignesVerifiees.push({
            nom: plat.nom,
            prix: plat.prix,
            quantite: a.quantite,
            boissons: boissons,
            supplements: supplements
        });
    }



    // 4. Enregistrer
    const commande = await Commande.create({
        clientId: req.client._id,
        client: {
            nom: req.client.nom,
            telephone: req.client.telephone,
            residence: adresse,
            modeReception: mode
        },
        articles: lignesVerifiees
    });

    // 5. Email
    const prixOptions = liste => liste.reduce((s, o) => s + o.prix * o.quantite, 0);
    const prixLigne = a => a.prix * a.quantite + prixOptions(a.boissons) + prixOptions(a.supplements);

    const lignes = commande.articles.map(a => {
        let texte = a.quantite + 'x ' + a.nom + ' - ' + (a.prix * a.quantite) + ' FCFA';
        a.boissons.forEach(b => {
            texte += '\n   + ' + b.quantite + 'x ' + b.nom + ' (boisson) - ' + (b.prix * b.quantite) + ' FCFA';
        });
        a.supplements.forEach(s => {
            texte += '\n   + ' + s.quantite + 'x ' + s.nom + ' (supplément) - ' + (s.prix * s.quantite) + ' FCFA';
        });
        return texte;
    }).join('\n');
    const total = commande.articles.reduce((s, a) => s + prixLigne(a), 0);

        notifierAdmins(
            'Nouvelle commande',
            commande.client.nom + ' · ' + total + ' FCFA · ' + (commande.client.modeReception === 'livraison' ? 'livraison' : 'sur place')
            ).catch(function(e) {
            console.log('Notification échouée :', e.message);
        });

        try {
        const enLivraison = commande.client.modeReception === 'livraison';
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'juniormbongue59@gmail.com',
            subject: (enLivraison ? 'LIVRAISON - ' : 'Sur place - ') + 'Nouvelle commande de ' + commande.client.nom,
            text: 'Client : ' + commande.client.nom + '\n' +
                  'Téléphone : ' + commande.client.telephone + '\n' +
                  'Mode : ' + (enLivraison ? 'LIVRAISON' : 'Sur place') + '\n' +
                  (enLivraison ? 'Adresse : ' + commande.client.residence + '\n' : '') +
                  '\n' + lignes + '\n\nTotal : ' + total + ' FCFA'
        });
    } catch (e) {
        console.log('Envoi e-mail échoué :', e.message);
    }

    res.status(201).json(commande);
});

// ---------- Notifications push ----------

// Clé publique : le site en a besoin pour s'abonner
app.get('/notifications/cle', (req, res) => {
    res.json({ cle: process.env.VAPID_PUBLIC_KEY || null });
});

function lireAbonnement(corps) {
    const a = (corps && corps.abonnement) || {};
    const keys = a.keys || {};
    if (typeof a.endpoint !== 'string' || !a.endpoint.startsWith('https://') ||
        typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
        return null;
    }
    return { endpoint: a.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

// Appareil d'un client identifié
app.post('/notifications/abonnement', limiteInscription, verifierClient, async (req, res) => {
    const abonnement = lireAbonnement(req.body);
    if (!abonnement) {
        return res.status(400).json({ erreur: 'Abonnement invalide' });
    }
    try {
        await Abonnement.findOneAndUpdate(
            { endpoint: abonnement.endpoint },
            { role: 'client', clientId: req.client._id, endpoint: abonnement.endpoint, keys: abonnement.keys },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// Appareil du restaurateur
app.post('/admin/notifications/abonnement', verifierAdmin, async (req, res) => {
    const abonnement = lireAbonnement(req.body);
    if (!abonnement) {
        return res.status(400).json({ erreur: 'Abonnement invalide' });
    }
    try {
        await Abonnement.findOneAndUpdate(
            { endpoint: abonnement.endpoint },
            { role: 'admin', clientId: null, endpoint: abonnement.endpoint, keys: abonnement.keys },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json({ ok: true });
    } catch (e) {
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// Envoie un message à tous les appareils qui correspondent au filtre
async function envoyerPush(filtre, contenu) {
    if (!process.env.VAPID_PUBLIC_KEY) { return; }
    const abonnements = await Abonnement.find(filtre);
    const message = JSON.stringify(contenu);
    for (const a of abonnements) {
        try {
            await webpush.sendNotification(
                { endpoint: a.endpoint, keys: { p256dh: a.keys.p256dh, auth: a.keys.auth } },
                message
            );
        } catch (e) {
            // Appareil désinscrit ou expiré : on le retire
            if (e.statusCode === 404 || e.statusCode === 410) {
                await Abonnement.deleteOne({ _id: a._id });
            } else {
                console.log('Notification échouée :', e.statusCode || e.message);
            }
        }
    }
}

function notifierClient(clientId, titre, corps) {
    if (!clientId) { return Promise.resolve(); }
    return envoyerPush({ clientId: clientId }, { titre: titre, corps: corps, url: '/' });
}

function notifierAdmins(titre, corps) {
    return envoyerPush({ role: 'admin' }, { titre: titre, corps: corps, url: '/admin.html' });
}

function notifierTousLesClients(titre, corps) {
    return envoyerPush({ role: { $ne: 'admin' } }, { titre: titre, corps: corps, url: '/' });
}

// « Menu mis à jour » : un bouton de l'admin, au plus un envoi toutes les 30 minutes
let dernierEnvoiMenu = 0;

app.post('/admin/notifier-menu', verifierAdmin, (req, res) => {
    const maintenant = Date.now();
    if (maintenant - dernierEnvoiMenu < 30 * 60 * 1000) {
        return res.status(429).json({ erreur: 'Une notification du menu a déjà été envoyée il y a moins de 30 minutes.' });
    }
    dernierEnvoiMenu = maintenant;
    notifierTousLesClients('ZEDUC PLACE', 'Le menu du jour a été mis à jour. Venez découvrir les plats !').catch(function(e) {
        console.log('Notification échouée :', e.message);
    });
    res.json({ ok: true });
});
// Liste des commandes (admin) : ?statut=terminee pour l'historique, sinon les commandes à traiter
app.get('/commandes', verifierAdmin, async (req, res) => {
    try {
        const terminees = req.query.statut === 'terminee';
        const filtre = terminees ? { statut: 'terminee' } : { statut: { $ne: 'terminee' } };
        const tri = terminees ? { termineeLe: -1 } : { dateCommande: 1 };
        const commandes = await Commande.find(filtre).sort(tri).limit(100);
        res.json(commandes);
    } catch (e) {
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});

// Terminer une commande (admin) : livrée ou servie
app.put('/commandes/:id/terminer', verifierAdmin, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ erreur: 'Identifiant invalide' });
    }
    try {
        const commande = await Commande.findOneAndUpdate(
            { _id: req.params.id, statut: { $ne: 'terminee' } },
            { statut: 'terminee', termineeLe: new Date() },
            { new: true }
        );
        if (!commande) {
            return res.status(404).json({ erreur: 'Commande introuvable ou déjà terminée' });
        }
        if (commande.client.modeReception === 'livraison') {
            notifierClient(commande.clientId, 'ZEDUC PLACE', 'Votre commande est arrivée !').catch(function(e) {
            console.log('Notification échouée :', e.message);
        });
        }
        // Plus tard : si commande.client.modeReception === 'livraison', prévenir le client ici
        res.json(commande);
    } catch (e) {
        res.status(500).json({ erreur: 'Erreur serveur' });
    }
});
mongoose.connect(process.env.MONGO_URL).then(function() {
    const port = process.env.PORT || 3000;
    app.listen(port, function() {
        console.log('Serveur prêt sur le port ' + port);
    });
}).catch(function(erreur) {
    console.log('Connexion MongoDB échouée :', erreur.message);
});