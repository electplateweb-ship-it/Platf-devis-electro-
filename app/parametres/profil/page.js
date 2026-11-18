"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import EspaceShell from "../../../components/EspaceShell";

const TYPES_ACCEPTES = ["image/png", "image/jpeg", "image/webp"];

// Réduit le logo (600 px max) pour qu'il reste léger et net sur les devis
function reduireImage(fichier) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      const max = 600;
      const ratio = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      const jpeg = fichier.type === "image/jpeg";
      if (jpeg) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const type = jpeg ? "image/jpeg" : "image/png";
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve({ blob, type, ext: jpeg ? "jpg" : "png" })
            : reject(new Error("conversion")),
        type,
        0.9
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("lecture"));
    };
    img.src = url;
  });
}

const vide = (v) => (v && v.trim() ? v.trim() : null);

function Contenu() {
  const router = useRouter();
  const [etab, setEtab] = useState(null);
  const [form, setForm] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [message, setMessage] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [envoiLogo, setEnvoiLogo] = useState(false);

  async function chargerLogo(chemin) {
    if (!chemin) {
      setLogoUrl("");
      return;
    }
    const { data } = await supabase.storage
      .from("logos")
      .createSignedUrl(chemin, 3600);
    setLogoUrl(data?.signedUrl || "");
  }

  useEffect(() => {
    async function charger() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/connexion");
        return;
      }
      const { data } = await supabase
        .from("establishments")
        .select("*")
        .eq("owner_id", session.user.id)
        .maybeSingle();
      if (!data) {
        router.replace("/tableau-de-bord");
        return;
      }
      setEtab(data);
      setForm({
        name: data.name ?? "",
        manager_name: data.manager_name ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        address: data.address ?? "",
        tax_id: data.tax_id ?? "",
        registration_number: data.registration_number ?? "",
        currency: data.currency ?? "FCFA",
        default_conditions: data.default_conditions ?? "",
      });
      chargerLogo(data.logo_path);
    }
    charger();
  }, [router]);

  const changer = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function enregistrer(e) {
    e.preventDefault();
    setMessage(null);
    if (!form.name.trim()) {
      setMessage({ type: "erreur", texte: "Le nom de l'établissement est obligatoire." });
      return;
    }
    setEnregistrement(true);
    const { error } = await supabase
      .from("establishments")
      .update({
        name: form.name.trim(),
        manager_name: vide(form.manager_name),
        phone: vide(form.phone),
        email: vide(form.email),
        address: vide(form.address),
        tax_id: vide(form.tax_id),
        registration_number: vide(form.registration_number),
        currency: form.currency,
        default_conditions: vide(form.default_conditions),
      })
      .eq("id", etab.id);
    setEnregistrement(false);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }
    setMessage({ type: "ok", texte: "Profil enregistré." });
  }

  async function envoyerLogo(e) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    setMessage(null);

    if (!TYPES_ACCEPTES.includes(fichier.type)) {
      setMessage({ type: "erreur", texte: "Choisissez une image PNG, JPEG ou WEBP." });
      return;
    }

    setEnvoiLogo(true);
    try {
      const { blob, type, ext } = await reduireImage(fichier);
      const chemin = `${etab.id}/logo-${Date.now()}.${ext}`;

      const { error: errEnvoi } = await supabase.storage
        .from("logos")
        .upload(chemin, blob, { contentType: type, upsert: false });
      if (errEnvoi) throw errEnvoi;

      const { error: errMaj } = await supabase
        .from("establishments")
        .update({ logo_path: chemin })
        .eq("id", etab.id);
      if (errMaj) throw errMaj;

      if (etab.logo_path) {
        await supabase.storage.from("logos").remove([etab.logo_path]);
      }
      setEtab({ ...etab, logo_path: chemin });
      await chargerLogo(chemin);
      setMessage({ type: "ok", texte: "Logo enregistré." });
    } catch (err) {
      setMessage({ type: "erreur", texte: err.message || "Envoi du logo impossible." });
    }
    setEnvoiLogo(false);
  }

  async function retirerLogo() {
    if (!etab.logo_path) return;
    setMessage(null);
    setEnvoiLogo(true);
    const { error } = await supabase
      .from("establishments")
      .update({ logo_path: null })
      .eq("id", etab.id);
    if (error) {
      setMessage({ type: "erreur", texte: error.message });
    } else {
      await supabase.storage.from("logos").remove([etab.logo_path]);
      setEtab({ ...etab, logo_path: null });
      setLogoUrl("");
      setMessage({ type: "ok", texte: "Logo retiré." });
    }
    setEnvoiLogo(false);
  }

  if (!form) {
    return <main className="page"><p>Chargement…</p></main>;
  }

  return (
    <main className="page">
      <Link href="/parametres" className="retour">‹ Paramètres</Link>
      <h1>Mon établissement</h1>
      <p className="sous-titre">Ces informations apparaîtront sur vos devis PDF.</p>

      <div className="carte">
        <h2 style={{ marginTop: 0 }}>Logo</h2>
        {logoUrl ? (
          <div className="logo-zone">
            <img src={logoUrl} alt="Logo de l'établissement" />
          </div>
        ) : (
          <p className="discret">Aucun logo pour le moment.</p>
        )}

        <label className="bouton secondaire" htmlFor="logo">
          {envoiLogo ? "Envoi en cours…" : logoUrl ? "Changer le logo" : "Ajouter un logo"}
        </label>
        <input id="logo" type="file" accept="image/png,image/jpeg,image/webp"
          onChange={envoyerLogo} disabled={envoiLogo} style={{ display: "none" }} />

        {logoUrl && (
          <button type="button" className="bouton secondaire" onClick={retirerLogo}
            disabled={envoiLogo}>
            Retirer le logo
          </button>
        )}
      </div>

      <form onSubmit={enregistrer} className="carte">
        <h2 style={{ marginTop: 0 }}>Coordonnées</h2>

        <label htmlFor="name">Nom de l'établissement</label>
        <input id="name" name="name" required value={form.name} onChange={changer} />

        <label htmlFor="manager_name">Nom du responsable</label>
        <input id="manager_name" name="manager_name" value={form.manager_name}
          onChange={changer} />

        <label htmlFor="phone">Téléphone</label>
        <input id="phone" name="phone" type="tel" value={form.phone} onChange={changer} />

        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" value={form.email} onChange={changer} />

        <label htmlFor="address">Adresse</label>
        <textarea id="address" name="address" rows={3} value={form.address}
          onChange={changer} />

        <label htmlFor="tax_id">
          Numéro fiscal (IFU) <span className="optionnel">facultatif</span>
        </label>
        <input id="tax_id" name="tax_id" value={form.tax_id} onChange={changer} />

        <label htmlFor="registration_number">
          Registre de commerce (RCCM) <span className="optionnel">facultatif</span>
        </label>
        <input id="registration_number" name="registration_number"
          value={form.registration_number} onChange={changer} />

        <h2>Devis</h2>

        <label htmlFor="currency">Monnaie</label>
        <select id="currency" name="currency" value={form.currency} onChange={changer}>
          <option value="FCFA">FCFA</option>
          <option value="EUR">Euro (€)</option>
          <option value="USD">Dollar ($)</option>
        </select>

        <label htmlFor="default_conditions">
          Conditions habituelles <span className="optionnel">facultatif</span>
        </label>
        <textarea id="default_conditions" name="default_conditions" rows={5}
          placeholder="Ex. : devis valable 30 jours, acompte de 50 % à la commande…"
          value={form.default_conditions} onChange={changer} />

        <button className="bouton" type="submit" disabled={enregistrement}>
          {enregistrement ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      {message && <div className={`message ${message.type}`}>{message.texte}</div>}

      <h2>Aperçu de l'en-tête du devis</h2>
      <div className="apercu-devis">
        <div className="apercu-ligne">
          {logoUrl && <img src={logoUrl} alt="" />}
          <div>
            <strong>{form.name || "Nom de l'établissement"}</strong>
            {form.manager_name && <div>{form.manager_name}</div>}
            {form.phone && <div>Tél. : {form.phone}</div>}
            {form.email && <div>{form.email}</div>}
            {form.address && <div style={{ whiteSpace: "pre-line" }}>{form.address}</div>}
            {form.tax_id && <div>IFU : {form.tax_id}</div>}
            {form.registration_number && <div>RCCM : {form.registration_number}</div>}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Profil() {
  return (
    <EspaceShell>
      <Contenu />
    </EspaceShell>
  );
        }
