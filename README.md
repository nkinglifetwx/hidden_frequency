# Hidden Frequencies

Petit site responsive de découverte musicale. Il permet de décrire une ambiance, de rechercher des morceaux, d'écouter les extraits disponibles, de garder ses favoris pendant la session et d'ouvrir les morceaux dans le catalogue musical.

## Lancer le site
Ouvre `index.html` dans un navigateur. Pour un test fiable, utilise un petit serveur local (par exemple l'extension Live Server de VS Code), car certaines fonctionnalités réseau peuvent être bloquées selon le navigateur.

## Hébergement gratuit avec GitHub Pages
1. Crée un compte sur https://github.com si nécessaire.
2. Crée un nouveau dépôt public, par exemple `hidden-frequencies`.
3. Envoie les trois fichiers `index.html`, `style.css` et `app.js` à la racine du dépôt.
4. Ouvre **Settings → Pages**.
5. Dans **Build and deployment**, choisis **Deploy from a branch**, sélectionne `main` et `/ (root)`, puis **Save**.
6. Après quelques minutes, GitHub fournit une adresse publique du type `https://ton-pseudo.github.io/hidden-frequencies/`. Envoie ce lien.

## À savoir
- Le site utilise l'API de recherche iTunes, sans clé API. Les résultats sont des correspondances textuelles, pas une IA qui comprend réellement toutes les nuances d'une description.
- Les extraits audio et pochettes ne sont disponibles que lorsque le catalogue les fournit. Le lien « OPEN TRACK » ouvre la fiche du morceau.
- Les favoris sont gardés uniquement en mémoire pendant que la page reste ouverte : pas de compte ni de base de données.
- Pour une vraie recommandation par IA (compréhension sémantique, personnalisation, historique), il faudrait ajouter un backend et une clé API stockée côté serveur. Ne mets jamais une clé secrète directement dans `app.js`.
- Le site n'affirme pas que les morceaux sont inconnus ou peu populaires : il s'agit d'un explorateur musical pour sortir de ses habitudes.
