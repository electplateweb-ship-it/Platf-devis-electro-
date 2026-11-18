import Link from "next/link";
import EspaceShell from "../../../components/EspaceShell";

export default function Confidentialite() {
  return (
    <EspaceShell>
      <main className="page">
        <Link href="/parametres" className="retour">‹ Paramètres</Link>
        <h1>Confidentialité et données</h1>

        <div className="carte">
          <h2 style={{ marginTop: 0 }}>Ce que la plateforme enregistre</h2>
          <p>
            Les informations de votre compte (e-mail, nom du responsable,
            téléphone, nom de l'établissement), puis vos clients, votre
            catalogue de matériels et vos devis.
          </p>

          <h2>Qui peut y accéder</h2>
          <p>
            Seul votre compte peut lire et modifier les données de votre
            établissement. Les autres établissements n'y ont pas accès.
          </p>

          <h2>Votre mot de passe</h2>
          <p>
            Il est stocké sous une forme protégée et n'est jamais affiché. Ne le
            partagez avec personne.
          </p>

          <h2>Votre adresse personnelle</h2>
          <p>
            Elle contient un identifiant aléatoire, sans votre nom ni mot de
            passe. Elle ne donne accès à rien sans connexion.
          </p>
        </div>
      </main>
    </EspaceShell>
  );
  }
