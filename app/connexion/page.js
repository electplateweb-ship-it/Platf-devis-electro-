"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Connexion() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motdepasse, setMotdepasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function envoyer(e) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: motdepasse,
    });
    setChargement(false);

    if (error) {
      setErreur("E-mail ou mot de passe incorrect.");
      return;
    }
    router.push("/tableau-de-bord");
  }

  return (
    <main className="page">
      <Link href="/" className="marque">Devis Électricien</Link>
      <h1>Me connecter</h1>
      <p className="sous-titre">Retrouvez votre espace et vos devis.</p>

      <form onSubmit={envoyer} className="carte">
        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="mdp">Mot de passe</label>
        <input id="mdp" type="password" required autoComplete="current-password"
          value={motdepasse} onChange={(e) => setMotdepasse(e.target.value)} />

        <button className="bouton" type="submit" disabled={chargement}>
          {chargement ? "Connexion…" : "Me connecter"}
        </button>

        {erreur && <div className="message erreur">{erreur}</div>}
      </form>

      <p className="lien-bas">
        Pas encore de compte ? <Link href="/inscription">Créer un compte</Link>
      </p>
    </main>
  );
  }
