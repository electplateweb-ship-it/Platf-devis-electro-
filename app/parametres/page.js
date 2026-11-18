"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import EspaceShell, { useTheme } from "../../components/EspaceShell";

const OPTIONS = [
  { valeur: "clair", titre: "Clair", detail: "Fond clair, texte foncé" },
  { valeur: "sombre", titre: "Sombre", detail: "Fond sombre, plus reposant le soir" },
  { valeur: "auto", titre: "Automatique", detail: "Suit le réglage de votre téléphone" },
];

function Contenu() {
  const router = useRouter();
  const { preference, changer } = useTheme();
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email || "");
    });
  }, []);

  async function deconnecter() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <main className="page">
      <span className="marque">Devis Électricien</span>
      <h1>Paramètres</h1>
      {email && <p className="sous-titre">Connecté avec {email}</p>}

      <div className="carte">
        <h2 style={{ marginTop: 0 }}>Mon établissement</h2>
        <Link href="/parametres/profil" className="ligne-lien">
          Profil, coordonnées et logo <span className="fleche">›</span>
        </Link>
      </div>

      <div className="carte">
        <h2 style={{ marginTop: 0 }}>Apparence</h2>
        <div role="radiogroup" aria-label="Mode d'éclairage">
          {OPTIONS.map((o) => (
            <label key={o.valeur} className="choix">
              <input
                type="radio"
                name="apparence"
                value={o.valeur}
                checked={preference === o.valeur}
                onChange={() => changer(o.valeur)}
              />
              <span>
                <strong>{o.titre}</strong>
                <small>{o.detail}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="carte">
        <h2 style={{ marginTop: 0 }}>Informations</h2>
        <Link href="/parametres/a-propos" className="ligne-lien">
          À propos <span className="fleche">›</span>
        </Link>
        <Link href="/parametres/faq" className="ligne-lien">
          Questions fréquentes <span className="fleche">›</span>
        </Link>
        <Link href="/parametres/confidentialite" className="ligne-lien">
          Confidentialité et données <span className="fleche">›</span>
        </Link>
      </div>

      <button className="bouton secondaire" onClick={deconnecter}>
        Me déconnecter
      </button>

      <p className="lien-bas">Version 0.2</p>
    </main>
  );
}

export default function Parametres() {
  return (
    <EspaceShell>
      <Contenu />
    </EspaceShell>
  );
        }
