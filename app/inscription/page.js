"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Inscription() {
  const router = useRouter();
  const [form, setForm] = useState({
    etablissement: "",
    responsable: "",
    telephone: "",
    email: "",
    motdepasse: "",
  });
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [chargement, setChargement] = useState(false);

  const changer = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function envoyer(e) {
    e.preventDefault();
    setErreur("");
    setInfo("");

    if (form.motdepasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setChargement(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.motdepasse,
      options: {
        data: {
          etablissement: form.etablissement.trim(),
          responsable: form.responsable.trim(),
          telephone: form.telephone.trim(),
        },
      },
    });
    setChargement(false);

    if (error) {
      setErreur(error.message);
      return;
    }

    if (data.session) {
      router.push("/tableau-de-bord");
    } else {
      setInfo(
        "Compte créé. Ouvrez le message de confirmation envoyé à votre adresse e-mail, puis connectez-vous."
      );
    }
  }

  return (
    <main className="page">
      <Link href="/" className="marque">Devis Électricien</Link>
      <h1>Créer mon compte</h1>
      <p className="sous-titre">Votre établissement aura son propre espace privé.</p>

      <form onSubmit={envoyer} className="carte">
        <label htmlFor="etablissement">Nom de l'établissement</label>
        <input id="etablissement" name="etablissement" required
          value={form.etablissement} onChange={changer} />

        <label htmlFor="responsable">Nom du responsable</label>
        <input id="responsable" name="responsable" required
          value={form.responsable} onChange={changer} />

        <label htmlFor="telephone">Téléphone</label>
        <input id="telephone" name="telephone" type="tel" required
          value={form.telephone} onChange={changer} />

        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email"
          value={form.email} onChange={changer} />

        <label htmlFor="motdepasse">Mot de passe</label>
        <input id="motdepasse" name="motdepasse" type="password" required
          autoComplete="new-password" value={form.motdepasse} onChange={changer} />

        <button className="bouton" type="submit" disabled={chargement}>
          {chargement ? "Création en cours…" : "Créer mon compte"}
        </button>

        {erreur && <div className="message erreur">{erreur}</div>}
        {info && <div className="message ok">{info}</div>}
      </form>

      <p className="lien-bas">
        Déjà un compte ? <Link href="/connexion">Me connecter</Link>
      </p>
    </main>
  );
    }
