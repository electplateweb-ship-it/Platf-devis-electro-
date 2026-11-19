"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { obtenirEtablissement, normaliser } from "../../lib/etablissement";
import EspaceShell from "../../components/EspaceShell";

const SYMBOLES = { FCFA: "FCFA", EUR: "€", USD: "$" };
const STATUTS = ["brouillon", "envoyé", "accepté", "refusé"];
const CLASSES = {
  brouillon: "b-brouillon",
  "envoyé": "b-envoye",
  "accepté": "b-accepte",
  "refusé": "b-refuse",
};
const dateFr = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("fr-FR") : "");

function Contenu() {
  const router = useRouter();
  const [etab, setEtab] = useState(null);
  const [devis, setDevis] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    async function demarrer() {
      const e = await obtenirEtablissement();
      if (!e) {
        router.replace("/tableau-de-bord");
        return;
      }
      setEtab(e);
      const { data, error } = await supabase
        .from("quotations")
        .select("id, number, title, status, total, quote_date, customer_snapshot")
        .eq("establishment_id", e.id)
        .order("created_at", { ascending: false });
      if (error) setErreur(error.message);
      setDevis(data || []);
    }
    demarrer();
  }, [router]);

  const devise = SYMBOLES[etab?.currency] || etab?.currency || "FCFA";
  const f = (n) =>
    `${Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${devise}`;
  const nomClient = (d) =>
    d.customer_snapshot
      ? `${d.customer_snapshot.last_name || ""} ${d.customer_snapshot.first_name || ""}`.trim()
      : "Client supprimé";

  const affiches = useMemo(() => {
    if (!devis) return [];
    const q = normaliser(recherche.trim());
    return devis.filter((d) => {
      if (statut && d.status !== statut) return false;
      if (!q) return true;
      return normaliser(`${d.number} ${d.title} ${nomClient(d)}`).includes(q);
    });
  }, [devis, recherche, statut]);

  return (
    <main className="page">
      <div className="entete-liste">
        <h1>Devis</h1>
        <Link href="/devis/nouveau" className="bouton-ajout">+ Nouveau</Link>
      </div>

      {erreur && <div className="message erreur" style={{ marginBottom: 14 }}>{erreur}</div>}

      {devis === null ? (
        <p className="vide">Chargement…</p>
      ) : devis.length === 0 ? (
        <>
          <p className="vide">Aucun devis pour le moment.</p>
          <Link href="/devis/nouveau" className="bouton">Créer mon premier devis</Link>
        </>
      ) : (
        <>
          <p className="sous-titre">
            {devis.length} devis
          </p>
          <input type="search" placeholder="Rechercher par numéro, client, travaux…"
            aria-label="Rechercher un devis" value={recherche}
            onChange={(e) => setRecherche(e.target.value)} />
          <select aria-label="Filtrer par statut" value={statut}
            onChange={(e) => setStatut(e.target.value)} style={{ marginBottom: 14 }}>
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {affiches.length === 0 ? (
            <p className="vide">Aucun résultat.</p>
          ) : (
            affiches.map((d) => (
              <Link key={d.id} href={`/devis/${d.id}`} className="element">
                <span>
                  <div className="titre">
                    {d.number} <span className={`badge ${CLASSES[d.status] || ""}`}>{d.status}</span>
                  </div>
                  <div className="detail">{nomClient(d)}</div>
                  {d.title && <div className="detail">{d.title}</div>}
                </span>
                <span className="droite">
                  {f(d.total)}
                  <div className="detail">{dateFr(d.quote_date)}</div>
                </span>
              </Link>
            ))
          )}
        </>
      )}
    </main>
  );
}

export default function Devis() {
  return (
    <EspaceShell>
      <Contenu />
    </EspaceShell>
  );
}
