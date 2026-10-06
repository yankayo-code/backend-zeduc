require('dotenv').config();
const mongoose = require('mongoose');
const Plat = require('./plat');

const cheminMongoDB = process.env.MONGO_URL;

mongoose.connect(cheminMongoDB).then(function() {
    console.log('Connecté à MongoDB, insertion en cours...');

    const platsAInserer = [
        {
        nom: 'Roti de poulet riz frites',
        prix: 1500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPQadHlL0zgfMT3aJK_3vgkaT__Rvii8P8cXfXPe2cHFkN7TeAMuYvl1B5&s=10'
        },
        {
        nom: 'Roti de poulet riz simple',
        prix: 1200,
        image: 'https://static.wixstatic.com/media/9aa5b4_a425604e6d2241c08883289f6eace65f~mv2.jpg/v1/fill/w_959,h_720,al_c,q_85,enc_avif,quality_auto/9aa5b4_a425604e6d2241c08883289f6eace65f~mv2.jpg'
        },
        {
        nom: 'Rôti de poulet frites uniquement',
        prix: 1500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRAgOdxUyCURpcW-OVJ5HggpOUOzwAoNz4GixBQtbpcbTdVFpWoIq19yzt6&s=10'
        },
        {
        nom: 'Poulet braisé frites de plantain',
        prix: 2000,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_JQeiw759JIktZPMCHzo3yTaJ7_aRIEwjZpUgYNM3I1YDodZUBpC9ygXi&s=10'
        },
        {
        nom: 'Poulet mayo frites de plantain',
        prix: 2500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRm8GnOkyqFAE32m6U-0OkwnEV0Eqye7BioVlb9hy0m7b6NwFIB7LOGFl57&s=10'
        },
        {
        nom: 'DG',
        prix: 2000,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqK-vvZGk7Wbr60kTxrdeTTfflUf5nQrS1Qic2ZsSkWpn-7kxaqDomyj-n&s=10'
        },
        {
        nom: 'Bolognaises spaghetti',
        prix: 1000,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnJX6h3PwBD2nTnqQ7MufeTdqeh5ChSXrZiKWokI-fAAbnXaYsu_vm4LYO&s=10'
        },
        {
        nom: 'Bolognaises spaghetti frites de plantain',
        prix: 1500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT86zUuo4giLH1zgCDDFwQWlPdIUvOr7SwJVOSz4kkPoWq4UxziiqC6mR6g&s=10'
        },
        {
        nom: 'Bolognaises frites uniquement',
        prix: 1500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSnYpTns2WkEdoKWkpY0jr5xaNDPrKq-OUbbEQfKn1VTg&s'
        },
        {
        nom: 'Koki',
        prix: 1000,
        image: 'https://github.com/yankayo-code/Interface-client/blob/main/koki.png?raw=true'
        },
        {
        nom: 'Pilé plantain mûr',
        prix: 1000,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSl9dBu0UbO3nAUwkJzaWv3Kf8higkawYvia0lOPK9k64561ZR5CzPzEW8&s=10'
        },
        {
        nom: 'Porc braisé frites de plantain',
        prix: 2500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcZab6IOGtaprJCIAiY_IcLHCv6BTNS2Xlt3QQ2DcAbw&s=10'
        },
        {
        nom: 'Saucisses braisées frites de plantain',
        prix: 2500,
        image: 'https://i.pinimg.com/736x/89/30/e5/8930e52eda7c92e19c4ef101027eac65.jpg'
        },
        {
        nom: 'Okok salé',
        prix: 1000,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDx7Fr76-AVHaX-6wtUM-sjw_N5EGJBftEtW3-R9UrNQ&s=10'
        },
        {
        nom: 'Eru fufu',
        prix: 1000,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsTiYNky3EHRY1NlztC2QkBAf9fOh-tWqL1M5lID_lFKc9bjth1Lrajj8&s=10'
        },
        {
        nom: 'Ndole Miondo',
        prix: 1000,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRciZP3UkkHE4XLtx3i9dAjND6K8ANWvH1FplPAMwNMy2SXnYRmLJJOr0eR&s=10'
        },
        {
        nom: 'Ndole riz',
        prix: 1000,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqeqbGWZMNsuUXNFXYV9E89D6TuBHXvjXJbJYA6puOoQ&s=10'
        },
        {
        nom: 'Ndole Miondo frites',
        prix: 1500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTp6qoKklf3tNQo7Jjz5VFkOR9MGl4rvY-7Fkt0pHOlbg&s=10'
        },
        {
        nom: 'Ndole frites uniquement',
        prix: 1500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSGld65UT5uM_3JtiSg59NKih0lljM9g3qtB0T0TwUHnQ&s=10'
        },
        {
        nom: 'Ndole riz frites',
        prix: 1500,
        image: 'https://github.com/yankayo-code/Interface-client/blob/main/Ndole%20riz%20frites.png?raw=true'
        },
        {
        nom: 'Ndole Miondo riz',
        prix: 1500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTUt6EZglQzh1AAFw9cXcfYk2fJt5g0b8jtG5tRL8_8wsUwQ-4SMlTueMcn&s=10'
        },
        {
        nom: 'Boulettes riz frites',
        prix: 1500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxPplD34onxEBreU_3ivPBlkG22129h2ksmJHz9qYyBQ&s=10'
        },
        {
        nom: 'Boulettes riz',
        prix: 1000,
        image: 'https://www.minuterice.ca/wp-content/uploads/2022/12/maple-teriyaki-meatballs_sq.jpg'
        },
        {
        nom: 'Boulettes frites uniquement',
        prix: 1500,
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTr4-LA_CZYoSpQMxUr4RD3z1HAw4aggYcBNzuGUDMUNVkYw5fSZA6xazA&s=10'
        },
        {
        nom: 'Poulet pané',
        prix: 2000,
        image: 'https://media.ikwen.com/tchopetyamo/kako/photos/8_ewi89ja.small.jpg'
        },
    ];

    

    Plat.insertMany(platsAInserer)
        .then(function() {
            console.log(platsAInserer.length + ' plats insérés avec succès !');
            mongoose.disconnect();
        })
        .catch(function(erreur) {
            console.log('Erreur insertion :', erreur);
            mongoose.disconnect();
        });
});