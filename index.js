require('dotenv').config();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Plat = require('./plat');
const Commande = require('./commande');

const app = express();
app.use(cors());
app.use(express.json());

// Connexion admin : renvoie un jeton si le mot de passe est bon
app.post('/admin/login', (req, res) => {

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
        jwt.verify(jeton, process.env.JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ erreur: 'Jeton invalide ou expiré' });
    }
}

// Liste des plats
// Liste des plats (publique)
app.get('/plats', async (req, res) => {
    const plats = await Plat.find();
    res.json(plats);
});

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

// Enregistrer une commande
const PRIX_SUPPLEMENT = 500;

// Retire les retours à la ligne, coupe les espaces, limite la longueur
function nettoyer(texte, max) {
    return String(texte || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

app.post('/commande', async (req, res) => {

    const { client, articles } = req.body || {};

    // 1. Contrôler les infos du client
    if (!client || typeof client !== 'object') {
        return res.status(400).json({ erreur: 'Informations client manquantes' });
    }
    const nom = nettoyer(client.nom, 60);
    const telephone = nettoyer(client.telephone, 20);
    if (nom === '' || telephone.length < 6) {
        return res.status(400).json({ erreur: 'Nom ou téléphone invalide' });
    }

    // 2. Contrôler le panier
    if (!Array.isArray(articles) || articles.length === 0 || articles.length > 30) {
        return res.status(400).json({ erreur: 'Panier invalide' });
    }

    // 3. Reconstruire chaque ligne à partir de la base (le prix envoyé est ignoré)
    const lignesVerifiees = [];
    for (const a of articles) {
        if (!a || typeof a.nom !== 'string' || !Number.isInteger(a.quantite) || a.quantite < 1 || a.quantite > 20) {
            return res.status(400).json({ erreur: 'Article invalide' });
        }
        const plat = await Plat.findOne({ nom: a.nom, disponible: true });
        if (!plat) {
            return res.status(400).json({ erreur: 'Plat introuvable ou indisponible' });
        }
        const accepteSupplement = plat.nom.toLowerCase().includes('frites');
        const supplement = (a.supplement === true && accepteSupplement) ? PRIX_SUPPLEMENT : 0;
        lignesVerifiees.push({ nom: plat.nom, prix: plat.prix, quantite: a.quantite, supplement: supplement });
    }

    // 4. Enregistrer
    const commande = await Commande.create({
        client: {
            nom: nom,
            telephone: telephone,
            residence: nettoyer(client.residence, 100),
            modeReception: nettoyer(client.modeReception, 30)
        },
        articles: lignesVerifiees
    });

    // 5. Email
    const lignes = commande.articles
        .map(a => a.quantite + 'x ' + a.nom + (a.supplement ? ' (+ supplément frites)' : '') +
              ' - ' + ((a.prix + a.supplement) * a.quantite) + ' FCFA')
        .join('\n');
    const total = commande.articles.reduce((s, a) => s + (a.prix + a.supplement) * a.quantite, 0);

    try {
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'juniormbongue59@gmail.com',
            subject: 'Nouvelle commande de ' + commande.client.nom,
            text: 'Client : ' + commande.client.nom + '\n' +
                  'Téléphone : ' + commande.client.telephone + '\n' +
                  'Mode : ' + commande.client.modeReception + '\n' +
                  'Position : ' + (commande.client.residence || '-') + '\n\n' +
                  lignes + '\n\nTotal : ' + total + ' FCFA'
        });
    } catch (e) {
        console.log('Envoi e-mail échoué :', e.message);
    }

    res.status(201).json(commande);
});
// Liste des commandes (utile pour vérifier)
app.get('/commandes', verifierAdmin, async (req, res) => {
    const commandes = await Commande.find().sort({ dateCommande: 1 });
    res.json(commandes);
});
mongoose.connect(process.env.MONGO_URL).then(function() {
    const port = process.env.PORT || 3000;
    app.listen(port, function() {
        console.log('Serveur prêt sur le port ' + port);
    });
});