"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { obtenirEtablissement } from "../../lib/etablissement";
import ChampMotDePasse from "../../components/ChampMotDePasse";

export default function Retrouver() {
  const [etape, setEtape] = useState("chargement"); // chargement | email | code | ok
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [attente, setAttente] = useState(0);
  const [etab, setEtab] = useState(null);
  const [copie, setCopie] = useState(false);

  const [mdp, setMdp] = useState("");
  const [msgMdp, setMsgMdp] = useState(null);
  const [enregMdp, setEnregMdp] = useState(false);

  async function afficherEspace() {
    setEtab(await obtenirEtablissement());
    setEtape("ok");
  }

  // Au chargement : déjà connecté (ou arrivée par le lien du message) ?
  useEffect(() => {
    async function demarrer() {
      if (typeof window !== "undefined" && window.location.hash.includes("error")) {
        setErreur("Le lien a expiré ou a déjà été utilisé. Demandez un nouveau code.");
        setEtape("email");
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await afficherEspace();
      else setEtape("email");
    }
    demarrer();
  }, []);

  // Décompte avant de pouvoir redemander un code
  useEffect(() => {
    if (attente <= 0) return;
    const minuteur = setTimeout(() => setAttente(attente - 1), 1000);
    return () => clearTimeout(minuteur);
  }, [attente]);

  async function envoyerCode(ev) {
    if (ev) ev.preventDefault();
    setErreur("");
    setChargement(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/retrouver`,
      },
    });
    setChargement(false);

    // Trop de demandes : on le dit. Toute autre erreur reste neutre, pour ne pas
    // révéler si une adresse e-mail possède ou non un compte.
    if (error && (error.status === 429 || /rate limit|too many|security purposes/i.test(error.message))) {
      setErreur("Trop de demandes. Patientez une minute, puis réessayez.");
      return;
    }
    setCode("");
    setAttente(60);
    setEtape("code");
  }

  async function verifier(ev) {
    ev.preventDefault();
    setErreur("");
    setChargement(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setChargement(false);
    if (error) {
      setErreur("Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau.");
      return;
    }
    await afficherEspace();
  }

  async function enregistrerMotDePasse(ev) {
    ev.preventDefault();
    setMsgMdp(null);
    if (mdp.length < 8) {
      setMsgMdp({ type: "erreur", texte: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    setEnregMdp(true);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setEnregMdp(false);
    if (error) {
      setMsgMdp({ type: "erreur", texte: error.message });
      return;
    }
    setMdp("");
    setMsgMdp({ type: "ok", texte: "Nouveau mot de passe enregistré." });
  }

  async function copierAdresse(adresse) {
    try {
      await navigator.clipboard.writeText(adresse);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  }

  if (etape === "chargement") {
    return <main className="page"><p>Chargement…</p></main>;
  }

  // ---------- Étape 1 : adresse e-mail ----------
  if (etape === "email") {
    return (
      <main className="page">
        <Link href="/" className="marque">Devis Électricien</Link>
        <h1>Retrouver mon espace</h1>
        <p className="sous-titre">
          Entrez l'adresse e-mail de votre compte. Nous vous envoyons un code de
          vérification : il permet de retrouver votre adresse personnelle ou de
          changer votre mot de passe.
        </p>

        <form onSubmit={envoyerCode} className="carte">
          <label htmlFor="email" style={{ marginTop: 0 }}>Adresse e-mail</label>
          <input id="email" type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />

          <button className="bouton" type="submit" disabled={chargement}>
            {chargement ? "Envoi…" : "Envoyer le code"}
          </button>
          {erreur && <div className="message erreur">{erreur}</div>}
        </form>

        <p className="lien-bas">
          <Link href="/connexion">Retour à la connexion</Link>
        </p>
      </main>
    );
  }

  // ---------- Étape 2 : code reçu ----------
  if (etape === "code") {
    return (
      <main className="page">
        <Link href="/" className="marque">Devis Électricien</Link>
        <h1>Vérification</h1>
        <p className="sous-titre">
          Si un compte existe pour <strong>{email}</strong>, un message vient
          d'être envoyé. Saisissez le code reçu, ou ouvrez le lien contenu dans
          le message. Pensez à regarder dans les courriers indésirables.
        </p>

        <form onSubmit={verifier} className="carte">
          <label htmlFor="code" style={{ marginTop: 0 }}>Code de vérification</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code"
            maxLength={10} required value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))} />

          <button className="bouton" type="submit" disabled={chargement || code.length < 6}>
            {chargement ? "Vérification…" : "Vérifier"}
          </button>
          <button type="button" className="bouton secondaire"
            disabled={attente > 0 || chargement} onClick={() => envoyerCode()}>
            {attente > 0 ? `Renvoyer un code (${attente} s)` : "Renvoyer un code"}
          </button>
          {erreur && <div className="message erreur">{erreur}</div>}
        </form>

        <p className="lien-bas">
          <button type="button" onClick={() => { setErreur(""); setEtape("email"); }}
            style={{ background: "none", border: 0, padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", fontSize: "1rem" }}>
            Changer d'adresse e-mail
          </button>
        </p>
      </main>
    );
  }

  // ---------- Étape 3 : identité vérifiée ----------
  const adresse = etab ? `${window.location.origin}/espace/${etab.slug}` : "";

  return (
    <main className="page">
      <Link href="/" className="marque">Devis Électricien</Link>
      <h1>Votre espace</h1>
      <p className="sous-titre">Votre identité est vérifiée. Vous êtes connecté.</p>

      {etab && (
        <div className="carte">
          <h2 style={{ marginTop: 0 }}>{etab.name}</h2>
          <div className="adresse">{adresse}</div>
          <button className="bouton secondaire" onClick={() => copierAdresse(adresse)}>
            {copie ? "Adresse copiée" : "Copier mon adresse"}
          </button>
        </div>
      )}
      <Link href="/tableau-de-bord" className="bouton">Accéder à mon espace</Link>

      <form onSubmit={enregistrerMotDePasse} className="carte" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Nouveau mot de passe</h2>
        <p className="discret">Facultatif : utile si vous avez oublié votre mot de passe.</p>
        <label htmlFor="nmdp">Nouveau mot de passe</label>
        <ChampMotDePasse id="nmdp" name="nmdp" autoComplete="new-password"
          value={mdp} onChange={(e) => setMdp(e.target.value)} />
        <button className="bouton secondaire" type="submit" disabled={enregMdp}>
          {enregMdp ? "Enregistrement…" : "Enregistrer le mot de passe"}
        </button>
        {msgMdp && <div className={`message ${msgMdp.type}`}>{msgMdp.texte}</div>}
      </form>
    </main>
  );
}
