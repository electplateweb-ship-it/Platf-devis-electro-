"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import EspaceShell from "../../../components/EspaceShell";
import ChampMotDePasse from "../../../components/ChampMotDePasse";

function Contenu() {
  const [mdp, setMdp] = useState("");
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function enregistrer(e) {
    e.preventDefault();
    setMessage(null);
    if (mdp.length < 8) {
      setMessage({ type: "erreur", texte: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setEnCours(false);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    setMdp("");
    setMessage({ type: "ok", texte: "Mot de passe modifié." });
  }

  return (
    <main className="page">
      <Link href="/parametres" className="retour">‹ Paramètres</Link>
      <h1>Mot de passe</h1>
      <p className="sous-titre">Choisissez un nouveau mot de passe (8 caractères minimum).</p>

      <form onSubmit={enregistrer} className="carte">
        <label htmlFor="mdp" style={{ marginTop: 0 }}>Nouveau mot de passe</label>
        <ChampMotDePasse id="mdp" name="mdp" autoComplete="new-password"
          value={mdp} onChange={(e) => setMdp(e.target.value)} />
        <button className="bouton" type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message && <div className={`message ${message.type}`}>{message.texte}</div>}
      </form>
    </main>
  );
}

export default function MotDePasse() {
  return (
    <EspaceShell>
      <Contenu />
    </EspaceShell>
  );
      }
