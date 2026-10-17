// Réglages du site. Tant qu'une adresse est vide, le bouton correspondant affiche « Bientôt disponible ».
window.ONE_SITE = {
  // Fichier d'installation du logiciel pour Windows. Il doit être fabriqué avec l'adresse du serveur en ligne
  // (VITE_API_URL), jamais avec localhost ; construire.mjs le copie depuis le dossier installateur/.
  installer: 'telechargements/GesSchool-installation.exe',
  // Adresse de l'application sur téléphone : c'est celle du serveur.
  appUrl: 'https://gesschool.onetechnologie.com',
  // Le serveur qui reçoit les demandes de devis et les envoie par e-mail à One Technologie.
  quoteUrl: 'https://gesschool.onetechnologie.com/api/public/quote',
  // Adresse et numéro proposés si l'envoi direct échoue.
  email: 'contact@onetechnologie.com',
  whatsapp: '2250142905825',
};
