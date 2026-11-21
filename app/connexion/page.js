"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import ChampMotDePasse from "../../components/ChampMotDePasse";

export default function Connexion() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motdepasse, setMotdepasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  // Déjà connecté (par exemple après le lien reçu par e-mail) : direction l'espace
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/tableau-de-bord");
    });
  }, [router]);

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
        <ChampMotDePasse
          id="mdp"
          name="motdepasse"
          autoComplete="current-password"
          value={motdepasse}
          onChange={(e) => setMotdepasse(e.target.value)}
        />

        <button className="bouton" type="submit" disabled={chargement}>
          {chargement ? "Connexion…" : "Me connecter"}
        </button>

        {erreur && <div className="message erreur">{erreur}</div>}
      </form>

      <p className="lien-bas">
        Pas encore de compte ? <Link href="/inscription">Créer un compte</Link>
      </p>
      <p className="lien-bas">
        <Link href="/retrouver">Mot de passe oublié ou adresse perdue ?</Link>
      </p>
    </main>
  );
    }
