import Link from "next/link";
import EspaceShell from "../../../components/EspaceShell";

export default function APropos() {
  return (
    <EspaceShell>
      <main className="page">
        <Link href="/parametres" className="retour">‹ Paramètres</Link>
        <h1>À propos</h1>

        <div className="carte">
          <p>
            <strong>Devis Électricien</strong> est une plateforme pour les
            électriciens et les entreprises d'électricité. Chaque établissement
            a son espace privé, ses clients, son catalogue de matériels et ses
            devis.
          </p>
          <p>
            Les devis sont générés en PDF, avec les coordonnées et le logo de
            votre établissement, puis vous les téléchargez, les imprimez ou les
            envoyez vous-même par WhatsApp ou e-mail.
          </p>
        </div>

        <div className="carte">
          <h2 style={{ marginTop: 0 }}>Déjà disponible</h2>
          <p>Inscription, connexion, adresse personnelle, mode clair ou sombre.</p>
          <h2>Prochainement</h2>
          <p>
            Profil et logo de l'établissement, clients, catalogue de matériels,
            création et historique des devis, génération du PDF.
          </p>
        </div>

        <p className="lien-bas">Version 0.2</p>
      </main>
    </EspaceShell>
  );
    }
