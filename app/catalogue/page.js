"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { obtenirEtablissement, normaliser } from "../../lib/etablissement";
import EspaceShell from "../../components/EspaceShell";

const UNITES = ["pièce", "m", "ml", "m²", "lot", "forfait", "heure", "jour", "kg"];
const CATEGORIES_SUGGEREES = [
  "Câbles et fils", "Appareillage", "Protection", "Éclairage",
  "Tableaux et coffrets", "Conduits et goulottes", "Main-d'œuvre", "Autre",
];
const VIDE = { name: "", category: "", unit: "pièce", usual_price: "" };
const SYMBOLES = { FCFA: "FCFA", EUR: "€", USD: "$" };
const nul = (v) => (v && v.trim() ? v.trim() : null);

function Contenu() {
  const router = useRouter();
  const [etab, setEtab] = useState(null);
  const [materiels, setMateriels] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [edition, setEdition] = useState(null);
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const devise = SYMBOLES[etab?.currency] || etab?.currency || "FCFA";
  const prix = (n) =>
    `${Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${devise}`;

  async function charger(idEtab) {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("establishment_id", idEtab)
      .order("name", { ascending: true });
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      setMateriels([]);
      return;
    }
    setMateriels(data || []);
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
    if (!materiels) return [];
    const q = normaliser(recherche.trim());
    if (!q) return materiels;
    return materiels.filter((m) =>
      normaliser(`${m.name} ${m.category}`).includes(q)
    );
  }, [materiels, recherche]);

  const categories = useMemo(() => {
    const utilisees = (materiels || []).map((m) => m.category).filter(Boolean);
    return Array.from(new Set([...utilisees, ...CATEGORIES_SUGGEREES]));
  }, [materiels]);

  const changer = (e) => setEdition({ ...edition, [e.target.name]: e.target.value });

  async function enregistrer(e) {
    e.preventDefault();
    setMessage(null);

    const nombre = parseFloat(String(edition.usual_price).replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(nombre) || nombre < 0) {
      setMessage({ type: "erreur", texte: "Entrez un prix valide (par exemple 2500)." });
      return;
    }

    setEnCours(true);
    const donnees = {
      name: edition.name.trim(),
      category: nul(edition.category),
      unit: edition.unit,
      usual_price: nombre,
    };
    const requete = edition.id
      ? supabase.from("materials").update(donnees).eq("id", edition.id)
      : supabase.from("materials").insert({ ...donnees, establishment_id: etab.id });
    const { error } = await requete;
    setEnCours(false);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    await charger(etab.id);
    setEdition(null);
    setMessage({ type: "ok", texte: "Matériel enregistré." });
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer « ${edition.name} » du catalogue ?`)) return;
    setEnCours(true);
    const { error } = await supabase.from("materials").delete().eq("id", edition.id);
    setEnCours(false);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    await charger(etab.id);
    setEdition(null);
    setMessage({ type: "ok", texte: "Matériel supprimé." });
  }

  // ---------- Formulaire ----------
  if (edition) {
    return (
      <main className="page">
        <button type="button" className="retour" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", fontSize: "1rem" }}
          onClick={() => { setEdition(null); setMessage(null); }}>
          ‹ Catalogue
        </button>
        <h1>{edition.id ? "Modifier le matériel" : "Nouveau matériel"}</h1>

        <form onSubmit={enregistrer} className="carte">
          <label htmlFor="name">Désignation</label>
          <input id="name" name="name" required placeholder="Ex. : Câble 2,5 mm²"
            value={edition.name} onChange={changer} />

          <label htmlFor="category">
            Catégorie <span className="optionnel">facultatif</span>
          </label>
          <input id="category" name="category" list="liste-categories"
            value={edition.category} onChange={changer} />
          <datalist id="liste-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>

          <label htmlFor="unit">Unité</label>
          <select id="unit" name="unit" value={edition.unit} onChange={changer}>
            {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>

          <label htmlFor="usual_price">Prix habituel ({devise})</label>
          <input id="usual_price" name="usual_price" required inputMode="decimal"
            placeholder="0" value={edition.usual_price} onChange={changer} />

          <button className="bouton" type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </button>
          {edition.id && (
            <button type="button" className="bouton danger" onClick={supprimer} disabled={enCours}>
              Supprimer ce matériel
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
        <h1>Catalogue</h1>
        <button className="bouton-ajout" onClick={() => { setMessage(null); setEdition({ ...VIDE }); }}>
          + Ajouter
        </button>
      </div>

      {message && <div className={`message ${message.type}`} style={{ marginBottom: 14 }}>{message.texte}</div>}

      {materiels === null ? (
        <p className="vide">Chargement…</p>
      ) : materiels.length === 0 ? (
        <p className="vide">
          Votre catalogue est vide. Ajoutez vos matériels et services habituels
          pour les retrouver en un appui lors de la création d'un devis.
        </p>
      ) : (
        <>
          <p className="sous-titre">
            {materiels.length} élément{materiels.length > 1 ? "s" : ""}
          </p>
          <input type="search" placeholder="Rechercher un matériel ou une catégorie…"
            aria-label="Rechercher dans le catalogue" value={recherche}
            onChange={(e) => setRecherche(e.target.value)} />

          {affiches.length === 0 ? (
            <p className="vide">Aucun résultat.</p>
          ) : (
            affiches.map((m) => (
              <button key={m.id} className="element" onClick={() => {
                setMessage(null);
                setEdition({
                  id: m.id,
                  name: m.name ?? "",
                  category: m.category ?? "",
                  unit: m.unit ?? "pièce",
                  usual_price: m.usual_price != null ? String(m.usual_price) : "",
                });
              }}>
                <span>
                  <div className="titre">{m.name}</div>
                  {m.category && <div className="detail">{m.category}</div>}
                </span>
                <span className="droite">
                  {prix(m.usual_price)}
                  <div className="detail">par {m.unit || "pièce"}</div>
                </span>
              </button>
            ))
          )}
        </>
      )}
    </main>
  );
}

export default function Catalogue() {
  return (
    <EspaceShell>
      <Contenu />
    </EspaceShell>
  );
                    }
