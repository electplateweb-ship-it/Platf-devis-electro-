"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { obtenirEtablissement } from "../../../lib/etablissement";
import { recupererPdf } from "../../../lib/pdf-client";
import EspaceShell from "../../../components/EspaceShell";

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
  const { id } = useParams();
  const router = useRouter();
  const [etab, setEtab] = useState(null);
  const [q, setQ] = useState(null);
  const [items, setItems] = useState([]);
  const [action, setAction] = useState("");
  const [message, setMessage] = useState(null);
  const cachePdf = useRef(null);

  // Le PDF est préparé en arrière-plan pour que les boutons répondent vite
  function pdf() {
    if (!cachePdf.current) {
      cachePdf.current = recupererPdf(id).catch((e) => {
        cachePdf.current = null;
        throw e;
      });
    }
    return cachePdf.current;
  }

  useEffect(() => {
    async function demarrer() {
      const e = await obtenirEtablissement();
      if (!e) {
        router.replace("/tableau-de-bord");
        return;
      }
      setEtab(e);
      const { data: devis } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", id)
        .eq("establishment_id", e.id)
        .maybeSingle();
      if (!devis) {
        router.replace("/devis");
        return;
      }
      const { data: lignes } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", id)
        .order("position");
      setQ(devis);
      setItems(lignes || []);
      pdf().catch(() => {});
    }
    demarrer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  function enregistrerFichier(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${q.number}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function telecharger() {
    setMessage(null);
    setAction("telecharger");
    try {
      enregistrerFichier(await pdf());
      setMessage({ type: "ok", texte: "PDF téléchargé." });
    } catch (e) {
      setMessage({ type: "erreur", texte: e.message });
    }
    setAction("");
  }

  async function voir() {
    setMessage(null);
    setAction("voir");
    const fenetre = window.open("", "_blank");
    try {
      const url = URL.createObjectURL(await pdf());
      if (fenetre) fenetre.location.href = url;
      else window.location.href = url;
    } catch (e) {
      if (fenetre) fenetre.close();
      setMessage({ type: "erreur", texte: e.message });
    }
    setAction("");
  }

  async function partager() {
    setMessage(null);
    setAction("partager");
    try {
      const blob = await pdf();
      const fichier = new File([blob], `${q.number}.pdf`, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
        await navigator.share({
          files: [fichier],
          title: `Devis ${q.number}`,
          text: `Devis ${q.number} - ${etab.name}`,
        });
      } else {
        enregistrerFichier(blob);
        setMessage({
          type: "ok",
          texte:
            "Le partage direct n'est pas disponible ici. Le PDF est téléchargé : joignez-le depuis WhatsApp ou votre messagerie.",
        });
      }
    } catch (e) {
      if (e.name !== "AbortError") setMessage({ type: "erreur", texte: e.message });
    }
    setAction("");
  }

  async function changerStatut(statut) {
    setMessage(null);
    const { error } = await supabase.from("quotations").update({ status: statut }).eq("id", id);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    setQ({ ...q, status: statut });
    setMessage({ type: "ok", texte: "Statut mis à jour." });
  }

  if (!q) {
    return <main className="page"><p>Chargement…</p></main>;
  }

  const devise = SYMBOLES[q.establishment_snapshot?.currency || etab?.currency] ||
    etab?.currency || "FCFA";
  const f = (n) =>
    `${Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${devise}`;
  const cli = q.customer_snapshot || {};
  const nomClient = `${cli.last_name || ""} ${cli.first_name || ""}`.trim() || "Client supprimé";
  const sousTotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <main className="page">
      <Link href="/devis" className="retour">‹ Devis</Link>
      <h1>
        {q.number}{" "}
        <span className={`badge ${CLASSES[q.status] || ""}`}>{q.status}</span>
      </h1>
      <p className="sous-titre">
        {dateFr(q.quote_date)}
        {q.valid_until ? ` · valable jusqu'au ${dateFr(q.valid_until)}` : ""}
      </p>

      <div className="carte">
        <h2 style={{ marginTop: 0 }}>Document</h2>
        <button className="bouton" onClick={telecharger} disabled={!!action}>
          {action === "telecharger" ? "Préparation…" : "Télécharger le PDF"}
        </button>
        <button className="bouton secondaire" onClick={voir} disabled={!!action}>
          {action === "voir" ? "Préparation…" : "Voir / imprimer"}
        </button>
        <button className="bouton secondaire" onClick={partager} disabled={!!action}>
          {action === "partager" ? "Préparation…" : "Partager (WhatsApp, e-mail…)"}
        </button>
        {message && <div className={`message ${message.type}`}>{message.texte}</div>}
      </div>

      <div className="carte">
        <div className="ligne-total">
          <span>Client</span>
          <strong>{nomClient}</strong>
        </div>
        {cli.phone && (
          <div className="ligne-total"><span>Téléphone</span><strong>{cli.phone}</strong></div>
        )}
        {q.title && (
          <div className="ligne-total"><span>Travaux</span><strong>{q.title}</strong></div>
        )}
      </div>

      <div className="carte">
        {items.map((i) => (
          <div className="ligne-total" key={i.id}>
            <span>
              {i.designation}
              <br />
              <small className="discret">
                {Number(i.quantity).toLocaleString("fr-FR")} {i.unit} × {f(i.unit_price)}
              </small>
            </span>
            <strong>{f(i.amount)}</strong>
          </div>
        ))}
        <div className="ligne-total"><span>Sous-total</span><strong>{f(sousTotal)}</strong></div>
        {Number(q.labor_cost) > 0 && (
          <div className="ligne-total"><span>Main-d'œuvre</span><strong>{f(q.labor_cost)}</strong></div>
        )}
        {Number(q.extra_fees) > 0 && (
          <div className="ligne-total"><span>Frais supplémentaires</span><strong>{f(q.extra_fees)}</strong></div>
        )}
        {Number(q.discount) > 0 && (
          <div className="ligne-total"><span>Remise</span><strong>- {f(q.discount)}</strong></div>
        )}
        <div className="ligne-total grand">
          <span>Total général</span>
          <strong>{f(q.total)}</strong>
        </div>
      </div>

      <div className="carte">
        <label htmlFor="statut" style={{ marginTop: 0 }}>Statut du devis</label>
        <select id="statut" value={q.status} onChange={(e) => changerStatut(e.target.value)}>
          {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Link href={`/devis/${id}/modifier`} className="bouton secondaire">
        Modifier le devis
      </Link>
    </main>
  );
}

export default function VoirDevis() {
  return (
    <EspaceShell>
      <Contenu />
    </EspaceShell>
  );
                                                }
