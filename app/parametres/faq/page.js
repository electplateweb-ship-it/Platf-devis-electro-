import Link from "next/link";
import EspaceShell from "../../../components/EspaceShell";

export default function Faq() {
  return (
    <EspaceShell>
      <main className="page">
        <Link href="/parametres" className="retour">‹ Paramètres</Link>
        <h1>Questions fréquentes</h1>

        <div className="carte">
          <details>
            <summary>Où trouver mon adresse personnelle ?</summary>
            <p>
              Elle est affichée sur l'écran Accueil, avec un bouton pour la
              copier. Si vous l'avez perdue, appuyez sur « Retrouver mon
              espace » depuis la page d'accueil du site : après vérification
              par un code envoyé par e-mail, elle s'affiche de nouveau.
            </p>
          </details>

          <details>
            <summary>L'adresse personnelle suffit-elle pour entrer dans mon espace ?</summary>
            <p>
              Non. C'est un raccourci vers votre espace. Si vous n'êtes pas
              connecté, vous devez d'abord saisir votre e-mail et votre mot de
              passe.
            </p>
          </details>

          <details>
            <summary>Les autres électriciens voient-ils mes données ?</summary>
            <p>
              Non. Chaque établissement ne voit que ses propres clients,
              matériels et devis. Cette séparation est appliquée directement
              par la base de données.
            </p>
          </details>

          <details>
            <summary>Comment passer en mode sombre ?</summary>
            <p>
              Ouvrez Paramètres, puis Apparence, et choisissez Clair, Sombre ou
              Automatique. Votre choix est mémorisé sur ce téléphone.
            </p>
          </details>

          <details>
            <summary>Puis-je utiliser mon compte sur un autre téléphone ?</summary>
            <p>
              Oui. Connectez-vous avec le même e-mail et le même mot de passe.
              Le mode clair ou sombre se règle séparément sur chaque appareil.
            </p>
          </details>

          <details>
            <summary>J'ai oublié mon mot de passe, que faire ?</summary>
            <p>
              Sur la page de connexion, appuyez sur « Mot de passe oublié ou
              adresse perdue ? », entrez votre adresse e-mail puis le code
              reçu, et choisissez un nouveau mot de passe. Vous pouvez aussi le
              changer à tout moment dans Paramètres, puis Sécurité.
            </p>
          </details>
        </div>
      </main>
    </EspaceShell>
  );
                }
