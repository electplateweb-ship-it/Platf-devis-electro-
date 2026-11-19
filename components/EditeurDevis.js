"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { obtenirEtablissement, normaliser } from "../lib/etablissement";

const UNITES = ["pièce", "m", "ml", "m²", "lot", "forfait", "heure", "jour", "kg"];
const STATUTS = ["brouillon", "envoyé", "accepté", "refusé"];
const ETAPES = ["Client", "Travaux", "Calcul", "Finalisation"];
const SYMBOLES = { FCFA: "FCFA", EUR: "€", USD: "$" };
const CLIENT_VIDE = { last_name: "", first_name: "", phone: "", email: "", address: "" };

const num = (v) => {
  const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
};
const nul = (v) => (v && String(v).trim() ? String(v).trim() : null);
const jour = (decalage = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  return d.toLocaleDateString("sv-SE"); // AAAA-MM-JJ
};
let compteur = 0;
const ligneVide = () => ({
  cle: `l${Date.now()}_${compteur++}`,
  designation: "",
  description: "",
  quantity: "1",
  unit: "pièce",
  unit_price: "",
});

export default function EditeurDevis({ devisId }) {
  const router = useRouter();
  const [chargement, setChargement] = useState(true);
  const [etab, setEtab] = useState(null);
  const [clients, setClients] = useState([]);
  const [materiels, setMateriels] = useState([]);
  const [etape, setEtape] = useState(1);
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const [devis, setDevis] = useState({
    number: "",
    customer_id: "",
    title: "",
    quote_date: "",
    valid_until: "",
    status: "brouillon",
    labor_cost: "",
    extra_fees: "",
    discount: "",
    conditions: "",
  });
  const [lignes, setLignes] = useState([ligneVide()]);

  const [rechercheClient, setRechercheClient] = useState("");
  const [nouveauClient, setNouveauClient] = useState(false);
  const [formClient, setFormClient] = useState(CLIENT_VIDE);

  const [selecteur, setSelecteur] = useState(false);
  const [rechercheMat, setRechercheMat] = useState("");
  const [ajoutees, setAjoutees] = useState(0);

  const devise = SYMBOLES[etab?.currency] || etab?.currency || "FCFA";
  const f = (n) =>
    `${Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${devise}`;

  const majDevis = (champ, valeur) => setDevis((d) => ({ ...d, [champ]: valeur }));
  const majLigne = (cle, champ, valeur) =>
    setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, [champ]: valeur } : l)));

  // ---------- Chargement ----------
  useEffect(() => {
    async function demarrer() {
      const e = await obtenirEtablissement();
      if (!e) {
        router.replace("/tableau-de-bord");
        return;
      }
      setEtab(e);

      const [rc, rm] = await Promise.all([
        supabase.from("customers").select("*").eq("establishment_id", e.id).order("last_name"),
        supabase.from("materials").select("*").eq("establishment_id", e.id).order("name"),
      ]);
      const cl = rc.data || [];
      setClients(cl);
      setMateriels(rm.data || []);

      if (devisId) {
        const { data: q } = await supabase
          .from("quotations")
          .select("*")
          .eq("id", devisId)
          .eq("establishment_id", e.id)
          .maybeSingle();
        if (!q) {
          router.replace("/devis");
          return;
        }
        const { data: items } = await supabase
          .from("quotation_items")
          .select("*")
          .eq("quotation_id", devisId)
          .order("position");
        setDevis({
          number: q.number,
          customer_id: q.customer_id || "",
          title: q.title || "",
          quote_date: q.quote_date || "",
          valid_until: q.valid_until || "",
          status: q.status || "brouillon",
          labor_cost: q.labor_cost ? String(q.labor_cost) : "",
          extra_fees: q.extra_fees ? String(q.extra_fees) : "",
          discount: q.discount ? String(q.discount) : "",
          conditions: q.conditions || "",
        });
        setLignes(
          items && items.length
            ? items.map((i) => ({
                cle: `i${i.id}`,
                designation: i.designation || "",
                description: i.description || "",
                quantity: String(i.quantity ?? 1),
                unit: i.unit || "pièce",
                unit_price: i.unit_price != null ? String(i.unit_price) : "",
              }))
            : [ligneVide()]
        );
      } else {
        setDevis((d) => ({
          ...d,
          quote_date: jour(0),
          valid_until: jour(30),
          conditions: e.default_conditions || "",
        }));
        if (cl.length === 0) setNouveauClient(true);
      }
      setChargement(false);
    }
    demarrer();
  }, [devisId, router]);

  // ---------- Calculs ----------
  const sousTotal = lignes.reduce((s, l) => s + num(l.quantity) * num(l.unit_price), 0);
  const total = sousTotal + num(devis.labor_cost) + num(devis.extra_fees) - num(devis.discount);
  const valides = lignes.filter((l) => l.designation.trim());
  const client = clients.find((c) => c.id === devis.customer_id);

  const clientsAffiches = useMemo(() => {
    const q = normaliser(rechercheClient.trim());
    if (!q) return clients;
    return clients.filter((c) =>
      normaliser(`${c.last_name} ${c.first_name} ${c.phone}`).includes(q)
    );
  }, [clients, rechercheClient]);

  const materielsAffiches = useMemo(() => {
    const q = normaliser(rechercheMat.trim());
    if (!q) return materiels;
    return materiels.filter((m) => normaliser(`${m.name} ${m.category}`).includes(q));
  }, [materiels, rechercheMat]);

  // ---------- Client ----------
  async function creerClient(e) {
    e.preventDefault();
    setMessage(null);
    setEnCours(true);
    const { data, error } = await supabase
      .from("customers")
      .insert({
        establishment_id: etab.id,
        last_name: formClient.last_name.trim(),
        first_name: nul(formClient.first_name),
        phone: nul(formClient.phone),
        email: nul(formClient.email),
        address: nul(formClient.address),
      })
      .select()
      .single();
    setEnCours(false);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    setClients((cl) =>
      [...cl, data].sort((a, b) => (a.last_name || "").localeCompare(b.last_name || "", "fr"))
    );
    majDevis("customer_id", data.id);
    setFormClient(CLIENT_VIDE);
    setNouveauClient(false);
  }

  // ---------- Lignes ----------
  function ajouterDepuisCatalogue(m) {
    setLignes((ls) => {
      const base = ls.filter((l) => l.designation.trim() || num(l.unit_price) > 0);
      return [
        ...base,
        {
          ...ligneVide(),
          designation: m.name,
          unit: UNITES.includes(m.unit) ? m.unit : "pièce",
          unit_price: m.usual_price != null ? String(m.usual_price) : "",
        },
      ];
    });
    setAjoutees((n) => n + 1);
  }

  function verifierLignes() {
    if (valides.length === 0) return "Ajoutez au moins une ligne de travaux ou de matériel.";
    if (valides.some((l) => num(l.quantity) <= 0)) return "La quantité doit être supérieure à 0.";
    return null;
  }

  // ---------- Navigation ----------
  function suivant() {
    setMessage(null);
    if (etape === 1 && !devis.customer_id) {
      setMessage({ type: "erreur", texte: "Choisissez un client ou créez-en un." });
      return;
    }
    if (etape === 2) {
      const err = verifierLignes();
      if (err) {
        setMessage({ type: "erreur", texte: err });
        return;
      }
    }
    if (etape === 3 && total < 0) {
      setMessage({ type: "erreur", texte: "La remise dépasse le total du devis." });
      return;
    }
    setEtape(etape + 1);
    window.scrollTo(0, 0);
  }

  function precedent() {
    setMessage(null);
    setEtape(etape - 1);
    window.scrollTo(0, 0);
  }

  // ---------- Enregistrement ----------
  async function enregistrer() {
    setMessage(null);
    if (!client) {
      setEtape(1);
      setMessage({ type: "erreur", texte: "Choisissez un client." });
      return;
    }
    const err = verifierLignes();
    if (err) {
      setEtape(2);
      setMessage({ type: "erreur", texte: err });
      return;
    }
    if (total < 0) {
      setEtape(3);
      setMessage({ type: "erreur", texte: "La remise dépasse le total du devis." });
      return;
    }

    setEnCours(true);
    const donnees = {
      customer_id: client.id,
      quote_date: devis.quote_date || null,
      valid_until: devis.valid_until || null,
      status: devis.status,
      title: nul(devis.title),
      labor_cost: num(devis.labor_cost),
      extra_fees: num(devis.extra_fees),
      discount: num(devis.discount),
      conditions: nul(devis.conditions),
      establishment_snapshot: {
        name: etab.name,
        manager_name: etab.manager_name,
        phone: etab.phone,
        email: etab.email,
        address: etab.address,
        tax_id: etab.tax_id,
        registration_number: etab.registration_number,
        logo_path: etab.logo_path,
        currency: etab.currency,
      },
      customer_snapshot: {
        last_name: client.last_name,
        first_name: client.first_name,
        phone: client.phone,
        email: client.email,
        address: client.address,
      },
    };
    const items = valides.map((l) => ({
      designation: l.designation.trim(),
      description: nul(l.description),
      quantity: num(l.quantity),
      unit: l.unit,
      unit_price: num(l.unit_price),
    }));

    const { error } = await supabase.rpc("save_quotation", {
      p_establishment: etab.id,
      p_quotation: devisId || null,
      p_data: donnees,
      p_items: items,
    });
    setEnCours(false);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    router.push("/devis");
  }

  async function supprimerDevis() {
    if (!window.confirm(`Supprimer le devis ${devis.number} ? Cette action est définitive.`)) return;
    setEnCours(true);
    const { error } = await supabase.from("quotations").delete().eq("id", devisId);
    setEnCours(false);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    router.push("/devis");
  }

  // ---------- Affichage ----------
  if (chargement) {
    return <main className="page"><p>Chargement…</p></main>;
  }

  // Sélecteur du catalogue
  if (selecteur) {
    return (
      <main className="page">
        <div className="entete-liste">
          <h1>Catalogue</h1>
          <button className="bouton-ajout" onClick={() => setSelecteur(false)}>
            Terminer{ajoutees > 0 ? ` (${ajoutees})` : ""}
          </button>
        </div>
        <p className="sous-titre">Appuyez sur un élément pour l'ajouter au devis.</p>

        {materiels.length === 0 ? (
          <p className="vide">
            Votre catalogue est vide. Ajoutez des matériels dans l'onglet Catalogue
            ou créez une ligne libre.
          </p>
        ) : (
          <>
            <input type="search" placeholder="Rechercher un matériel…"
              aria-label="Rechercher dans le catalogue" value={rechercheMat}
              onChange={(e) => setRechercheMat(e.target.value)} />
            {materielsAffiches.map((m) => (
              <button type="button" key={m.id} className="element"
                onClick={() => ajouterDepuisCatalogue(m)}>
                <span>
                  <div className="titre">{m.name}</div>
                  {m.category && <div className="detail">{m.category}</div>}
                </span>
                <span className="droite">
                  {f(m.usual_price)}
                  <div className="detail">par {m.unit || "pièce"}</div>
                </span>
              </button>
            ))}
            {materielsAffiches.length === 0 && <p className="vide">Aucun résultat.</p>}
          </>
        )}
      </main>
    );
  }

  return (
    <main className="page">
      <Link href="/devis" className="retour">‹ Devis</Link>
      <h1>{devisId ? `Devis ${devis.number}` : "Nouveau devis"}</h1>

      <div className="etapes" aria-hidden="true">
        {ETAPES.map((nom, i) => (
          <div key={nom} className={`etape ${i + 1 <= etape ? "faite" : ""}`} />
        ))}
      </div>
      <p className="sous-titre">Étape {etape} sur 4 : {ETAPES[etape - 1]}</p>

      {/* ---------- Étape 1 : client ---------- */}
      {etape === 1 && (
        <>
          {clients.length > 0 && !nouveauClient && (
            <>
              <input type="search" placeholder="Rechercher un client…"
                aria-label="Rechercher un client" value={rechercheClient}
                onChange={(e) => setRechercheClient(e.target.value)} />
              {clientsAffiches.map((c) => (
                <button type="button" key={c.id}
                  className={`element ${devis.customer_id === c.id ? "choisi" : ""}`}
                  onClick={() => majDevis("customer_id", c.id)}>
                  <span>
                    <div className="titre">{c.last_name} {c.first_name || ""}</div>
                    {c.phone && <div className="detail">{c.phone}</div>}
                  </span>
                  <span className="titre" aria-hidden="true">
                    {devis.customer_id === c.id ? "✓" : ""}
                  </span>
                </button>
              ))}
              {clientsAffiches.length === 0 && <p className="vide">Aucun résultat.</p>}
            </>
          )}

          {!nouveauClient ? (
            <button type="button" className="bouton secondaire"
              onClick={() => setNouveauClient(true)}>
              + Nouveau client
            </button>
          ) : (
            <form onSubmit={creerClient} className="carte">
              <h2 style={{ marginTop: 0 }}>Nouveau client</h2>

              <label htmlFor="nc_nom">Nom</label>
              <input id="nc_nom" required value={formClient.last_name}
                onChange={(e) => setFormClient({ ...formClient, last_name: e.target.value })} />

              <label htmlFor="nc_prenom">Prénom</label>
              <input id="nc_prenom" required value={formClient.first_name}
                onChange={(e) => setFormClient({ ...formClient, first_name: e.target.value })} />

              <label htmlFor="nc_tel">Téléphone</label>
              <input id="nc_tel" type="tel" required value={formClient.phone}
                onChange={(e) => setFormClient({ ...formClient, phone: e.target.value })} />

              <label htmlFor="nc_email">
                Adresse e-mail <span className="optionnel">facultatif</span>
              </label>
              <input id="nc_email" type="email" value={formClient.email}
                onChange={(e) => setFormClient({ ...formClient, email: e.target.value })} />

              <label htmlFor="nc_adresse">
                Adresse du chantier <span className="optionnel">facultatif</span>
              </label>
              <textarea id="nc_adresse" rows={2} value={formClient.address}
                onChange={(e) => setFormClient({ ...formClient, address: e.target.value })} />

              <button className="bouton" type="submit" disabled={enCours}>
                {enCours ? "Enregistrement…" : "Enregistrer le client"}
              </button>
              {clients.length > 0 && (
                <button type="button" className="bouton secondaire"
                  onClick={() => setNouveauClient(false)}>
                  Annuler
                </button>
              )}
            </form>
          )}
        </>
      )}

      {/* ---------- Étape 2 : travaux ---------- */}
      {etape === 2 && (
        <>
          <div className="carte">
            <label htmlFor="titre" style={{ marginTop: 0 }}>
              Intitulé des travaux <span className="optionnel">facultatif</span>
            </label>
            <input id="titre" placeholder="Ex. : Installation électrique d'une villa"
              value={devis.title} onChange={(e) => majDevis("title", e.target.value)} />
          </div>

          {lignes.map((l, index) => (
            <div className="carte" key={l.cle}>
              <h2 style={{ marginTop: 0 }}>Ligne {index + 1}</h2>

              <label htmlFor={`d_${l.cle}`} style={{ marginTop: 0 }}>Désignation</label>
              <input id={`d_${l.cle}`} value={l.designation}
                onChange={(e) => majLigne(l.cle, "designation", e.target.value)} />

              <label htmlFor={`x_${l.cle}`}>
                Description <span className="optionnel">facultatif</span>
              </label>
              <textarea id={`x_${l.cle}`} rows={2} value={l.description}
                onChange={(e) => majLigne(l.cle, "description", e.target.value)} />

              <div className="grille-2">
                <div>
                  <label htmlFor={`q_${l.cle}`}>Quantité</label>
                  <input id={`q_${l.cle}`} inputMode="decimal" value={l.quantity}
                    onChange={(e) => majLigne(l.cle, "quantity", e.target.value)} />
                </div>
                <div>
                  <label htmlFor={`u_${l.cle}`}>Unité</label>
                  <select id={`u_${l.cle}`} value={l.unit}
                    onChange={(e) => majLigne(l.cle, "unit", e.target.value)}>
                    {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <label htmlFor={`p_${l.cle}`}>Prix unitaire ({devise})</label>
              <input id={`p_${l.cle}`} inputMode="decimal" placeholder="0" value={l.unit_price}
                onChange={(e) => majLigne(l.cle, "unit_price", e.target.value)} />

              <div className="ligne-total grand">
                <span>Montant</span>
                <strong>{f(num(l.quantity) * num(l.unit_price))}</strong>
              </div>

              {lignes.length > 1 && (
                <button type="button" className="bouton danger"
                  onClick={() => setLignes((ls) => ls.filter((x) => x.cle !== l.cle))}>
                  Supprimer cette ligne
                </button>
              )}
            </div>
          ))}

          <button type="button" className="bouton secondaire"
            onClick={() => { setAjoutees(0); setRechercheMat(""); setSelecteur(true); }}>
            + Ajouter depuis le catalogue
          </button>
          <button type="button" className="bouton secondaire"
            onClick={() => setLignes((ls) => [...ls, ligneVide()])}>
            + Ajouter une ligne libre
          </button>
        </>
      )}

      {/* ---------- Étape 3 : calcul ---------- */}
      {etape === 3 && (
        <div className="carte">
          <div className="ligne-total">
            <span>Sous-total ({valides.length} ligne{valides.length > 1 ? "s" : ""})</span>
            <strong>{f(sousTotal)}</strong>
          </div>

          <label htmlFor="mo">Main-d'œuvre ({devise})</label>
          <input id="mo" inputMode="decimal" placeholder="0" value={devis.labor_cost}
            onChange={(e) => majDevis("labor_cost", e.target.value)} />

          <label htmlFor="frais">Frais supplémentaires ({devise})</label>
          <input id="frais" inputMode="decimal" placeholder="0" value={devis.extra_fees}
            onChange={(e) => majDevis("extra_fees", e.target.value)} />

          <label htmlFor="remise">Remise ({devise})</label>
          <input id="remise" inputMode="decimal" placeholder="0" value={devis.discount}
            onChange={(e) => majDevis("discount", e.target.value)} />

          <div className="ligne-total grand" style={{ marginTop: 16 }}>
            <span>Total général</span>
            <strong>{f(total)}</strong>
          </div>
        </div>
      )}

      {/* ---------- Étape 4 : finalisation ---------- */}
      {etape === 4 && (
        <>
          <div className="carte">
            <div className="ligne-total">
              <span>Client</span>
              <strong>{client ? `${client.last_name} ${client.first_name || ""}` : "—"}</strong>
            </div>
            {devis.title && (
              <div className="ligne-total"><span>Travaux</span><strong>{devis.title}</strong></div>
            )}
            <div className="ligne-total">
              <span>Lignes</span><strong>{valides.length}</strong>
            </div>
            <div className="ligne-total grand">
              <span>Total général</span><strong>{f(total)}</strong>
            </div>
          </div>

          <div className="carte">
            <label htmlFor="date" style={{ marginTop: 0 }}>Date du devis</label>
            <input id="date" type="date" value={devis.quote_date}
              onChange={(e) => majDevis("quote_date", e.target.value)} />

            <label htmlFor="validite">Valable jusqu'au</label>
            <input id="validite" type="date" value={devis.valid_until}
              onChange={(e) => majDevis("valid_until", e.target.value)} />

            <label htmlFor="statut">Statut</label>
            <select id="statut" value={devis.status}
              onChange={(e) => majDevis("status", e.target.value)}>
              {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <label htmlFor="conditions">
              Conditions <span className="optionnel">facultatif</span>
            </label>
            <textarea id="conditions" rows={5} value={devis.conditions}
              placeholder="Ex. : acompte de 50 % à la commande, solde à la fin des travaux."
              onChange={(e) => majDevis("conditions", e.target.value)} />
          </div>
        </>
      )}

      {message && <div className={`message ${message.type}`}>{message.texte}</div>}

      <div className="boutons-etape">
        {etape > 1 && (
          <button type="button" className="bouton secondaire" onClick={precedent}>
            Retour
          </button>
        )}
        {etape < 4 ? (
          <button type="button" className="bouton" onClick={suivant}>Suivant</button>
        ) : (
          <button type="button" className="bouton" onClick={enregistrer} disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer le devis"}
          </button>
        )}
      </div>

      {etape === 4 && devisId && (
        <button type="button" className="bouton danger" onClick={supprimerDevis}
          disabled={enCours}>
          Supprimer ce devis
        </button>
      )}
    </main>
  );
}
