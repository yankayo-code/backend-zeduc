const { Resend } = require('resend');
const resend = new Resend('re_MHnoSCur_GAjdnDaJmSJJhaqJvmM5dajT');

resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'kayotaduyandimitri@gmail.com',
    subject: 'Test isolé',
    html: '<p>Ceci est un test direct.</p>'
})
.then(function(resultat) {
    console.log('RESULTAT COMPLET :', JSON.stringify(resultat));
})
.catch(function(erreur) {
    console.log('ERREUR COMPLETE :', JSON.stringify(erreur));
});