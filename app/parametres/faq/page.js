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
              copier. Gardez-la dans vos favoris ou envoyez-la-vous par
              message.
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
              La récupération d'accès par code sera ajoutée prochainement. En
              attendant, contactez l'administrateur de la plateforme.
            </p>
          </details>
        </div>
      </main>
    </EspaceShell>
  );
                }
