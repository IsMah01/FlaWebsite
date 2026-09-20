# Plateforme Future Leaders Academy — guide de passation

Ce dépôt contient la plateforme publique et administrative de la Future Leaders Foundation. Ce document explique le parcours complet d’une édition, depuis l’ouverture des inscriptions jusqu’à la clôture de l’Académie. Il sert de mode opératoire au prochain responsable.

> Important : avant toute opération en masse, sauvegarder la base MySQL et vérifier le fichier importé. Les actions d’admission et les envois d’e-mails concernent de vraies personnes.

## 1. Vue d’ensemble du parcours

```text
Inscription et confirmation de l’e-mail
        ↓
Questionnaire de candidature
        ↓
Présélection : accepté / refusé / en traitement
        ↓
Affectation et réservation d’un entretien
        ↓
Entretien, notation et recommandation
        ↓
Décision finale : admis / liste d’attente / à décider
        ↓
E-mail d’admission et confirmation finale
        ↓
Espace participant : programme, présence, tâches, formulaires et points
        ↓
Exports, sauvegarde et clôture
```

## 2. Rôles et accès

### Super-admin

Le super-admin pilote toute l’édition : candidatures, comptes administrateurs, entretiens, admissions finales, participants, présence, points et exports.

- Connexion : `/admin/login`
- Tableau de bord : `/admin`
- Gestion des mini-admins : `/admin/mini-admins`

### Mini-admin / responsable d’entretien

Le mini-admin ne voit que les modules autorisés. Les permissions disponibles sont :

- `interviews` : affectations, créneaux, entretiens et évaluations ;
- `attendance` : sessions et présence ;
- `scores` : classement et corrections de points.

Les permissions se règlent dans `/admin/mini-admins`. Ne pas supprimer un mini-admin tant qu’il possède des candidats, des créneaux, des réservations ou des transferts en attente.

### Candidat

Le candidat utilise son compte pour confirmer son e-mail, remplir le questionnaire, réserver son entretien et, s’il est admis puis confirmé, accéder à l’espace participant.

## 3. Préparer une nouvelle édition

Avant d’ouvrir les inscriptions :

1. Sauvegarder la base de données et les fichiers privés.
2. Mettre à jour les dates, textes, PDF, liens de formulaires et visuels.
3. Configurer `.env`, en particulier le domaine, MySQL, JWT, SMTP et Google Calendar.
4. Tester l’envoi d’e-mails avec une adresse interne.
5. Tester un parcours complet avec un candidat de test créé dans `/admin/mini-admins`.
6. Créer les mini-admins et attribuer uniquement les permissions nécessaires.
7. Vérifier les pages publiques, la confidentialité et les conditions d’utilisation.

Les dates du programme se trouvent notamment dans `apps/frontend/src/pages/FinalCandidateProgramme.tsx`. Les dates limites et rappels sont configurés dans `.env`.

## 4. Inscriptions et questionnaire

### Parcours candidat

1. Création du compte sur `/signup`.
2. Confirmation de l’adresse depuis l’e-mail reçu.
3. Connexion sur `/signin`.
4. Envoi du questionnaire sur `/candidate-questionnaire`.

Un compte créé n’est pas encore une candidature complète. Le dossier apparaît dans la liste des candidatures après l’envoi du questionnaire.

### Suivi administrateur

Dans `/admin`, le tableau de bord permet de consulter les réponses, filtrer les dossiers, repérer les inscriptions incomplètes, exporter les listes, effectuer les relances et attribuer un statut :

- `pending` : dossier en traitement ;
- `accepted` : candidat retenu pour la phase orale ;
- `rejected` : candidat refusé à cette étape.

Le refus global envoie un e-mail à toutes les candidatures encore en traitement. Vérifier soigneusement le nombre affiché avant de confirmer.

## 5. Import et activation de candidats

Page : `/admin/candidate-invitations`

1. Télécharger le modèle Excel/CSV fourni.
2. Compléter les colonnes sans changer leur structure.
3. Importer le fichier et lire le rapport de validation.
4. Corriger les lignes invalides.
5. Confirmer l’import et l’envoi des invitations.
6. Suivre les états : en attente, activée, expirée ou annulée.

Un compte existant est accepté directement. Si son e-mail n’est pas confirmé, un nouveau lien lui est envoyé. Un nouveau candidat reçoit un lien d’activation. La page permet aussi de renvoyer ou d’annuler une invitation.

## 6. Préparer et gérer les entretiens

Pages : administration `/admin/interviews`, candidat `/interview`.

### Préparation

1. Créer les responsables dans `/admin/mini-admins` avec la permission `interviews`.
2. Connecter et tester Google Calendar/Meet si les liens Meet automatiques sont utilisés.
3. Affecter les candidats acceptés aux responsables.
4. Chaque responsable déclare ses disponibilités, ou le super-admin crée les créneaux.
5. Vérifier le fuseau marocain, la durée et les conflits.

### Ouverture des réservations

La réservation candidat est actuellement fermée par cette constante dans `apps/frontend/src/pages/InterviewBooking.tsx` :

```ts
const CANDIDATE_INTERVIEW_BOOKING_OPEN = false;
```

La protection serveur doit rester cohérente dans `api/interview-router.ts`. Pour une nouvelle édition, ouvrir puis tester la réservation des deux côtés avant de diffuser le lien.

### Pendant les entretiens

Le responsable peut voir ses rendez-vous, marquer un entretien terminé ou un candidat absent, saisir les notes et la recommandation, demander un transfert, ou gérer une annulation selon ses droits. Ne pas commencer la sélection finale tant que les évaluations attendues ne sont pas complètes.

## 7. Admission finale

Page : `/admin/final-admissions`

Cette page rassemble l’entretien, l’évaluation et la décision finale :

- `pending` : à décider ;
- `admitted` : admis définitivement ;
- `not_admitted_after_interview` : non admis / liste d’attente.

Procédure recommandée :

1. Filtrer par état d’entretien, recommandation ou responsable.
2. Exporter une liste de délibération si nécessaire.
3. Décider individuellement, ou importer le CSV contenant les e-mails des admis.
4. Contrôler les correspondances, inconnus et personnes placées en attente.
5. Vérifier une dernière fois la liste.
6. Envoyer les admissions avec le bouton dédié.

L’import des décisions n’envoie aucun e-mail. L’envoi est une action séparée. Après l’envoi d’une admission, certaines modifications sont bloquées pour éviter de contredire un message déjà reçu.

## 8. Confirmation finale et participants

Le candidat confirme sur `/confirmation-finale`. L’administration suit la liste dans `/admin/final-candidates`.

Cette page permet de distinguer les confirmations définitives, e-mails à confirmer et retraits, corriger une adresse, retirer ou rétablir un participant, exporter la liste finale et copier le lien public de confirmation. Seuls les participants confirmés accèdent à l’espace final.

## 9. Pendant l’Académie

### Espace participant

Page principale : `/espace-candidat-final`

- profil : `/espace-candidat-final/profil` ;
- points et classement : `/espace-candidat-final/points` ;
- jeu politique : `/espace-candidat-final/jeu-politique`.

La page principale contient aussi le programme, les liens permanents, les tâches et les formulaires.

### Présence par QR Code

Page admin : `/admin/attendance`

1. Créer ou sélectionner une session.
2. Vérifier le titre, le jour et l’heure.
3. Ouvrir la session et afficher le QR Code.
4. Les participants scannent `/presence/session/:token`.
5. Suivre les présents et les non-inscrits.
6. Corriger manuellement si nécessaire.
7. Fermer la session à la fin.

Les points de présence et de ponctualité sont attribués automatiquement. Éviter toute correction manuelle sans justification.

### Points et classement

Page admin : `/admin/scores`

Le classement additionne présence, ponctualité, tâches, formulaires et ajustements administratifs. La page permet d’exporter le classement, rechercher dans l’historique et ajouter ou retirer exceptionnellement des points avec un motif obligatoire. Toute correction reste dans le journal.

### Formulaires quotidiens

Page : `/admin/daily-forms`

Le super-admin publie et suit les formulaires, consulte les soumissions, contrôle les points et examine le journal de réparation. Vérifier le titre, le lien et la date de publication avant activation.

## 10. Clôturer une édition

1. Fermer les inscriptions, réservations et sessions encore ouvertes.
2. Vérifier confirmations finales et statuts d’entretien.
3. Exporter candidatures, admissions, participants, présences et classements utiles.
4. Sauvegarder MySQL et les fichiers privés.
5. Désactiver les rappels automatiques devenus inutiles.
6. Retirer les accès administratifs inutiles.
7. Renouveler les mots de passe et secrets transmis.
8. Appliquer la durée de conservation et la politique de suppression/anonymisation.
9. Vérifier les liens et documents des pages publiques finales.

Ne jamais supprimer directement des données avant une sauvegarde vérifiée et une décision claire sur leur conservation légale.

## 11. Carte des pages d’administration

| Page | Usage |
|---|---|
| `/admin` | Candidatures, statuts, exports et suivi global |
| `/admin/candidate-invitations` | Import et activation de candidats |
| `/admin/mini-admins` | Comptes, permissions et candidat de test |
| `/admin/interviews` | Affectations, créneaux, réservations et évaluations |
| `/admin/final-admissions` | Décisions finales et envoi des admissions |
| `/admin/final-candidates` | Confirmations et liste officielle |
| `/admin/attendance` | Sessions, QR Codes et corrections de présence |
| `/admin/scores` | Classement, historique et ajustements |
| `/admin/daily-forms` | Formulaires et suivi des soumissions |
| `/admin/jeu-politique` | Attribution et suivi des rôles |
| `/admin/profile` | Profil et raccourcis du mini-admin |

## 12. Architecture technique

- `nginx` : reverse proxy et fichiers frontend ;
- `frontend` : application React/Vite ;
- `backend` : API Node.js/tRPC, entrée canonique `api/boot.ts` ;
- `mysql` : MySQL 8 ;
- `mysql_data` : volume persistant de la base ;
- `private_uploads` : fichiers privés persistants.

Il n’existe pas de second serveur autonome : le backend compile `api/boot.ts` et les routeurs sous `api/`.

## 13. Installation locale

```bash
cp .env.example .env
docker compose up -d --build
```

Ouvrir `http://localhost`. Contrôles :

- `/api/health` : processus API disponible ;
- `/api/db-health` : connexion MySQL disponible, HTTP 503 en cas d’échec.

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose restart backend frontend
docker compose down
```

`docker compose down` conserve normalement les volumes. Ne jamais ajouter `-v` sans sauvegarde : cela supprimerait les données persistantes.

## 14. Déploiement et maintenance

Les secrets restent dans `.env` et ne doivent jamais être ajoutés à Git. En production, Caddy termine HTTPS et le service Docker Nginx reste lié à `127.0.0.1:8081`.

```bash
sudo install -m 0644 infra/caddy/Caddyfile /etc/caddy/Caddyfile
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl stop nginx
sudo systemctl disable nginx
sudo systemctl restart caddy
```

```bash
sudo ss -ltnp | grep -E ':80|:443|:8081'
curl -I http://flf.ma
curl -I https://flf.ma
curl https://flf.ma/api/health
curl https://flf.ma/api/db-health
```

Sauvegarder régulièrement `mysql_data` et `private_uploads`, puis tester leur restauration.

## 15. Variables importantes

Le modèle complet est dans `.env.example` :

- application : `APP_URL`, `APP_SECRET`, `JWT_SECRET` ;
- base : `MYSQL_*`, `DATABASE_URL` ;
- e-mails : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` ;
- rappels : activation, échéance, heure et fuseau ;
- Google : identifiants OAuth, URI de redirection et calendrier ;
- entretiens : rappels et nettoyage des créneaux expirés ;
- uploads : `MAX_UPLOAD_SIZE_MB` ;
- compte initial : `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`.

Après une modification de `.env`, redémarrer les services concernés et contrôler les journaux.

## 16. Checklist de passation

- [ ] Le successeur possède un super-admin personnel.
- [ ] Les anciens accès inutiles sont désactivés.
- [ ] Les secrets sont transmis par un canal sécurisé.
- [ ] Une sauvegarde récente a été restaurée en test.
- [ ] SMTP et Google Calendar/Meet ont été testés.
- [ ] Les formulaires, PDF, dates et liens à remplacer sont identifiés.
- [ ] Un candidat de test a terminé tout le parcours.
- [ ] Le responsable sait ouvrir et fermer inscriptions, entretiens et présence.
- [ ] Les exports de l’édition terminée sont archivés en sécurité.
- [ ] La durée de conservation des données personnelles est appliquée.
