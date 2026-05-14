# Protection contre les abus d'upload

## Fichiers à copier

Copier :

- `api/lib/abuse-protection.ts` vers `app/api/lib/abuse-protection.ts`
- `api/upload-router.ts` vers `app/api/upload-router.ts`

## Ce que cela ajoute

1. Limite de 12 fichiers par heure par IP.
2. Limite anti-burst de 4 fichiers par minute par IP.
3. Suppression automatique des fichiers orphelins non référencés par la table `candidates`.
4. Journalisation sécurité dans `storage/logs/security.log`.
5. Conservation du stockage privé `storage/private/uploads`.

## Variables `.env` optionnelles

```env
MAX_UPLOAD_SIZE_MB=5
```

## Test local

1. Copier les fichiers.
2. Relancer le serveur :

```powershell
npm run dev
```

3. Tester un upload normal.
4. Tenter plusieurs uploads rapides : après 4 fichiers/minute, le serveur doit refuser.

## Important production

Cette protection en mémoire est suffisante pour un VPS unique. Si l'application est répartie sur plusieurs serveurs, utiliser Redis pour partager les limites entre instances.
