"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { obtenirEtablissement, normaliser } from "../../lib/etablissement";
import EspaceShell from "../../components/EspaceShell";

const VIDE = { last_name: "", first_name: "", phone: "", email: "", address: "" };
const nul = (v) => (v && v.trim() ? v.trim() : null);

function Contenu() {
  const router = useRouter();
  const [etab, setEtab] = useState(null);
  const [clients, setClients] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [edition, setEdition] = useState(null); // null = liste, sinon le formulaire
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function charger(idEtab) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("establishment_id", idEtab)
      .order("last_name", { ascending: true });
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      setClients([]);
      return;
    }
    setClients(data || []);
  }

  useEffect(() => {
    async function demarrer() {
      const e = await obtenirEtablissement();
      if (!e) {
        router.replace("/tableau-de-bord");
        return;
      }
      setEtab(e);
      await charger(e.id);
    }
    demarrer();
  }, [router]);

  const affiches = useMemo(() => {
    if (!clients) return [];
    const q = normaliser(recherche.trim());
    if (!q) return clients;
    return clients.filter((c) =>
      normaliser(`${c.last_name} ${c.first_name} ${c.phone} ${c.address}`).includes(q)
    );
  }, [clients, recherche]);

  const changer = (e) => setEdition({ ...edition, [e.target.name]: e.target.value });

  async function enregistrer(e) {
    e.preventDefault();
    setMessage(null);
    setEnCours(true);
    const donnees = {
      last_name: edition.last_name.trim(),
      first_name: nul(edition.first_name),
      phone: nul(edition.phone),
      email: nul(edition.email),
      address: nul(edition.address),
    };
    const requete = edition.id
      ? supabase.from("customers").update(donnees).eq("id", edition.id)
      : supabase.from("customers").insert({ ...donnees, establishment_id: etab.id });
    const { error } = await requete;
    setEnCours(false);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    await charger(etab.id);
    setEdition(null);
    setMessage({ type: "ok", texte: "Client enregistré." });
  }

  async function supprimer() {
    const nom = `${edition.last_name} ${edition.first_name || ""}`.trim();
    if (!window.confirm(`Supprimer le client ${nom} ? Cette action est définitive.`)) return;
    setEnCours(true);
    const { error } = await supabase.from("customers").delete().eq("id", edition.id);
    setEnCours(false);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    await charger(etab.id);
    setEdition(null);
    setMessage({ type: "ok", texte: "Client supprimé." });
  }

  // ---------- Formulaire ----------
  if (edition) {
    return (
      <main className="page">
        <button type="button" className="retour" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", fontSize: "1rem" }}
          onClick={() => { setEdition(null); setMessage(null); }}>
          ‹ Clients
        </button>
        <h1>{edition.id ? "Modifier le client" : "Nouveau client"}</h1>

        <form onSubmit={enregistrer} className="carte">
          <label htmlFor="last_name">Nom</label>
          <input id="last_name" name="last_name" required value={edition.last_name} onChange={changer} />

          <label htmlFor="first_name">Prénom</label>
          <input id="first_name" name="first_name" required value={edition.first_name} onChange={changer} />

          <label htmlFor="phone">Téléphone</label>
          <input id="phone" name="phone" type="tel" required value={edition.phone} onChange={changer} />

          <label htmlFor="email">
            Adresse e-mail <span className="optionnel">facultatif</span>
          </label>
          <input id="email" name="email" type="email" value={edition.email} onChange={changer} />

          <label htmlFor="address">
            Adresse du chantier <span className="optionnel">facultatif</span>
          </label>
          <textarea id="address" name="address" rows={3} value={edition.address} onChange={changer} />

          <button className="bouton" type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </button>
          {edition.id && (
            <button type="button" className="bouton danger" onClick={supprimer} disabled={enCours}>
              Supprimer ce client
            </button>
          )}

          {message && <div className={`message ${message.type}`}>{message.texte}</div>}
        </form>
      </main>
    );
  }

  // ---------- Liste ----------
  return (
    <main className="page">
      <div className="entete-liste">
        <h1>Clients</h1>
        <button className="bouton-ajout" onClick={() => { setMessage(null); setEdition({ ...VIDE }); }}>
          + Ajouter
        </button>
      </div>

      {message && <div className={`message ${message.type}`} style={{ marginBottom: 14 }}>{message.texte}</div>}

      {clients === null ? (
        <p className="vide">Chargement…</p>
      ) : clients.length === 0 ? (
        <p className="vide">Aucun client pour le moment. Appuyez sur « Ajouter » pour créer le premier.</p>
      ) : (
        <>
          <p className="sous-titre">
            {clients.length} client{clients.length > 1 ? "s" : ""}
          </p>
          <input type="search" placeholder="Rechercher par nom, téléphone, adresse…"
            aria-label="Rechercher un client" value={recherche}
            onChange={(e) => setRecherche(e.target.value)} />

          {affiches.length === 0 ? (
            <p className="vide">Aucun résultat.</p>
          ) : (
            affiches.map((c) => (
              <button key={c.id} className="element" onClick={() => {
                setMessage(null);
                setEdition({
                  id: c.id,
                  last_name: c.last_name ?? "",
                  first_name: c.first_name ?? "",
                  phone: c.phone ?? "",
                  email: c.email ?? "",
                  address: c.address ?? "",
                });
              }}>
                <span>
                  <div className="titre">{c.last_name} {c.first_name || ""}</div>
                  {c.phone && <div className="detail">{c.phone}</div>}
                  {c.address && <div className="detail">{c.address}</div>}
                </span>
                <span className="detail" aria-hidden="true">›</span>
              </button>
            ))
          )}
        </>
      )}
    </main>
  );
}

export default function Clients() {
  return (
    <EspaceShell>
      <Contenu />
    </EspaceShell>
  );
      }
