import Link from "next/link";

export default function Accueil() {
  return (
    <main className="page">
      <span className="marque">Devis Électricien</span>

      <h1>Vos devis d'électricité, prêts à envoyer.</h1>
      <p className="sous-titre">
        Créez votre espace, enregistrez vos clients et votre catalogue de
        matériels, puis générez des devis PDF à votre nom.
      </p>

      <Link href="/inscription" className="bouton">
        Créer un compte
      </Link>
      <Link href="/connexion" className="bouton secondaire">
        Me connecter
      </Link>
      <p className="lien-bas">
        <Link href="/retrouver">Retrouver mon espace</Link>
      </p>
    </main>
  );
    }
