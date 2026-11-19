import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const A4 = [595.28, 841.89];
const MARGE = 40;
const LARGEUR = A4[0] - MARGE * 2;
const BAS = 70; // limite basse du contenu (laisse la place au pied de page)

const MARINE = rgb(0.078, 0.137, 0.235);
const TEXTE = rgb(0.11, 0.14, 0.19);
const GRIS = rgb(0.38, 0.42, 0.47);
const TRAIT = rgb(0.82, 0.85, 0.88);
const FOND = rgb(0.95, 0.96, 0.97);
const BLANC = rgb(1, 1, 1);

const SYMBOLES = { FCFA: "FCFA", EUR: "€", USD: "$" };

function repondreErreur(statut, erreur) {
  return new Response(JSON.stringify({ erreur }), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

// 1 250 000,5 : espaces classiques (le PDF n'accepte pas les espaces fines)
function nombre(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const [ent, dec] = Math.abs(v).toFixed(2).split(".");
  const groupe = ent.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (v < 0 ? "-" : "") + groupe + (dec === "00" ? "" : "," + dec);
}

function dateFr(d) {
  if (!d) return "";
  const [a, m, j] = String(d).slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}

// Remplace les caractères que la police du PDF ne sait pas écrire
function preparer(police) {
  const permis = new Set(police.getCharacterSet());
  return (texte) =>
    String(texte ?? "")
      .replace(/[\u202F\u00A0\u2009]/g, " ")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\r/g, "")
      .split("")
      .map((c) => (c === "\n" || permis.has(c.codePointAt(0)) ? c : "?"))
      .join("");
}

// Découpe un texte en lignes qui tiennent dans la largeur donnée
function couper(texte, police, taille, largeur) {
  const lignes = [];
  for (const paragraphe of String(texte).split("\n")) {
    let courante = "";
    for (const mot of paragraphe.split(" ")) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (police.widthOfTextAtSize(essai, taille) <= largeur) {
        courante = essai;
        continue;
      }
      if (courante) lignes.push(courante);
      let reste = mot;
      while (police.widthOfTextAtSize(reste, taille) > largeur && reste.length > 1) {
        let i = reste.length;
        while (i > 1 && police.widthOfTextAtSize(reste.slice(0, i), taille) > largeur) i--;
        lignes.push(reste.slice(0, i));
        reste = reste.slice(i);
      }
      courante = reste;
    }
    lignes.push(courante);
  }
  return lignes;
}

async function chargerLogo(supabase, chemins) {
  for (const chemin of chemins.filter(Boolean)) {
    const { data, error } = await supabase.storage.from("logos").download(chemin);
    if (!error && data) {
      return { chemin, octets: new Uint8Array(await data.arrayBuffer()) };
    }
  }
  return null;
}

export async function GET(request, { params }) {
  try {
    const jeton = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jeton) return repondreErreur(401, "Connexion requise.");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${jeton}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const { data: utilisateur, error: errUtilisateur } = await supabase.auth.getUser(jeton);
    if (errUtilisateur || !utilisateur?.user) {
      return repondreErreur(401, "Session expirée. Reconnectez-vous.");
    }

    // Les règles de sécurité (RLS) garantissent que seul le propriétaire accède au devis
    const { data: q } = await supabase
      .from("quotations")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (!q) return repondreErreur(404, "Devis introuvable.");

    const { data: lignesDevis } = await supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", q.id)
      .order("position");
    const items = lignesDevis || [];

    const etab = q.establishment_snapshot || {};
    const cli = q.customer_snapshot || {};
    const devise = SYMBOLES[etab.currency] || etab.currency || "FCFA";

    // Logo : celui du devis, sinon le logo actuel de l'établissement
    const { data: actuel } = await supabase
      .from("establishments")
      .select("logo_path")
      .eq("id", q.establishment_id)
      .maybeSingle();
    const logoFichier = await chargerLogo(supabase, [etab.logo_path, actuel?.logo_path]);

    // ---------- Construction du PDF ----------
    const doc = await PDFDocument.create();
    doc.setTitle(`Devis ${q.number}`);
    doc.setProducer("Devis Électricien");
    const normal = await doc.embedFont(StandardFonts.Helvetica);
    const gras = await doc.embedFont(StandardFonts.HelveticaBold);
    const t = preparer(normal);

    const pages = [];
    let page;
    let y;
    function nouvellePage() {
      page = doc.addPage(A4);
      pages.push(page);
      y = A4[1] - MARGE;
    }
    nouvellePage();

    function ecrire(texte, x, yy, o = {}) {
      const { police = normal, taille = 10, couleur = TEXTE, droite = false } = o;
      const s = t(texte);
      const w = police.widthOfTextAtSize(s, taille);
      page.drawText(s, { x: droite ? x - w : x, y: yy, size: taille, font: police, color: couleur });
    }
    function trait(yy, epaisseur = 0.6, couleur = TRAIT, x1 = MARGE, x2 = MARGE + LARGEUR) {
      page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: epaisseur, color: couleur });
    }

    // --- En-tête : logo + coordonnées à gauche, numéro à droite ---
    let xTexte = MARGE;
    let hautLogo = 0;
    if (logoFichier) {
      try {
        const estPng = logoFichier.chemin.toLowerCase().endsWith(".png");
        const image = estPng
          ? await doc.embedPng(logoFichier.octets)
          : await doc.embedJpg(logoFichier.octets);
        const dims = image.scaleToFit(90, 60);
        page.drawImage(image, { x: MARGE, y: y - dims.height, width: dims.width, height: dims.height });
        xTexte = MARGE + dims.width + 14;
        hautLogo = dims.height;
      } catch {
        // logo illisible : on continue sans
      }
    }

    const largeurGauche = MARGE + 300 - xTexte;
    let yG = y - 14;
    for (const ligne of couper(t(etab.name || "Établissement"), gras, 15, largeurGauche)) {
      ecrire(ligne, xTexte, yG, { police: gras, taille: 15, couleur: MARINE });
      yG -= 18;
    }
    const contacts = [
      etab.manager_name,
      etab.phone ? `Tél. : ${etab.phone}` : null,
      etab.email,
      etab.address,
      etab.tax_id ? `IFU : ${etab.tax_id}` : null,
      etab.registration_number ? `RCCM : ${etab.registration_number}` : null,
    ].filter(Boolean);
    for (const c of contacts) {
      for (const ligne of couper(t(c), normal, 9, largeurGauche)) {
        ecrire(ligne, xTexte, yG, { taille: 9, couleur: GRIS });
        yG -= 12;
      }
    }

    const droiteX = MARGE + LARGEUR;
    let yD = y - 22;
    ecrire("DEVIS", droiteX, yD, { police: gras, taille: 24, couleur: MARINE, droite: true });
    yD -= 20;
    ecrire(`N° ${q.number}`, droiteX, yD, { police: gras, taille: 11, droite: true });
    yD -= 15;
    ecrire(`Date : ${dateFr(q.quote_date)}`, droiteX, yD, { taille: 9.5, couleur: GRIS, droite: true });
    if (q.valid_until) {
      yD -= 12;
      ecrire(`Valable jusqu'au ${dateFr(q.valid_until)}`, droiteX, yD, { taille: 9.5, couleur: GRIS, droite: true });
    }

    y = Math.min(yG, yD, y - hautLogo) - 14;
    trait(y, 1.5, MARINE);
    y -= 18;

    // --- Bloc client ---
    const nomClient = `${cli.last_name || ""} ${cli.first_name || ""}`.trim() || "Client";
    const lignesClient = [];
    if (cli.phone) lignesClient.push(`Tél. : ${cli.phone}`);
    if (cli.email) lignesClient.push(cli.email);
    if (cli.address) lignesClient.push(...couper(t(`Chantier : ${cli.address}`), normal, 9.5, LARGEUR - 24));
    const hautClient = 12 + 14 + 16 + lignesClient.length * 13 + 8;
    page.drawRectangle({ x: MARGE, y: y - hautClient, width: LARGEUR, height: hautClient, color: FOND });
    let yc = y - 16;
    ecrire("CLIENT", MARGE + 12, yc, { police: gras, taille: 8, couleur: GRIS });
    yc -= 16;
    ecrire(nomClient, MARGE + 12, yc, { police: gras, taille: 11.5 });
    for (const l of lignesClient) {
      yc -= 13;
      ecrire(l, MARGE + 12, yc, { taille: 9.5 });
    }
    y -= hautClient + 16;

    // --- Intitulé ---
    if (q.title) {
      for (const l of couper(t(`Objet : ${q.title}`), gras, 11, LARGEUR)) {
        ecrire(l, MARGE, y - 10, { police: gras, taille: 11, couleur: MARINE });
        y -= 15;
      }
      y -= 8;
    }

    // --- Tableau des lignes ---
    const X_DES = MARGE + 8;
    const L_DES = 245;
    const X_QTE = MARGE + 335; // bord droit
    const X_PU = MARGE + 425; // bord droit
    const X_MONT = MARGE + LARGEUR - 8; // bord droit

    function enteteTableau() {
      page.drawRectangle({ x: MARGE, y: y - 22, width: LARGEUR, height: 22, color: MARINE });
      ecrire("Désignation", X_DES, y - 15, { police: gras, taille: 9, couleur: BLANC });
      ecrire("Qté", X_QTE, y - 15, { police: gras, taille: 9, couleur: BLANC, droite: true });
      ecrire("Prix unit.", X_PU, y - 15, { police: gras, taille: 9, couleur: BLANC, droite: true });
      ecrire(`Montant (${devise})`, X_MONT, y - 15, { police: gras, taille: 9, couleur: BLANC, droite: true });
      y -= 22;
    }
    enteteTableau();

    let sousTotal = 0;
    for (const it of items) {
      const quantite = Number(it.quantity) || 0;
      const prixUnitaire = Number(it.unit_price) || 0;
      const montant = it.amount != null ? Number(it.amount) : quantite * prixUnitaire;
      sousTotal += montant;

      const lDes = couper(t(it.designation || ""), gras, 10, L_DES);
      const lDesc = it.description ? couper(t(it.description), normal, 8.5, L_DES) : [];
      const hauteur = 9 + lDes.length * 13 + lDesc.length * 11 + 7;

      if (y - hauteur < BAS) {
        nouvellePage();
        enteteTableau();
      }
      let yl = y - 17;
      for (const l of lDes) {
        ecrire(l, X_DES, yl, { police: gras, taille: 10 });
        yl -= 13;
      }
      for (const l of lDesc) {
        ecrire(l, X_DES, yl + 2, { taille: 8.5, couleur: GRIS });
        yl -= 11;
      }
      ecrire(`${nombre(quantite)} ${it.unit || ""}`.trim(), X_QTE, y - 17, { taille: 9.5, droite: true });
      ecrire(nombre(prixUnitaire), X_PU, y - 17, { taille: 9.5, droite: true });
      ecrire(nombre(montant), X_MONT, y - 17, { police: gras, taille: 9.5, droite: true });
      y -= hauteur;
      trait(y);
    }

    // --- Totaux ---
    const mo = Number(q.labor_cost) || 0;
    const frais = Number(q.extra_fees) || 0;
    const remise = Number(q.discount) || 0;
    const lignesTotaux = [["Sous-total", sousTotal]];
    if (mo) lignesTotaux.push(["Main-d'œuvre", mo]);
    if (frais) lignesTotaux.push(["Frais supplémentaires", frais]);
    if (remise) lignesTotaux.push(["Remise", -remise]);
    const totalGeneral = sousTotal + mo + frais - remise;

    const hautTotaux = lignesTotaux.length * 18 + 40;
    if (y - hautTotaux < BAS) nouvellePage();
    y -= 14;
    const X_LABEL = MARGE + 280;
    for (const [label, valeur] of lignesTotaux) {
      ecrire(label, X_LABEL, y - 3, { taille: 10, couleur: GRIS });
      ecrire(`${nombre(valeur)} ${devise}`, X_MONT, y - 3, { taille: 10, droite: true });
      y -= 18;
    }
    y -= 4;
    page.drawRectangle({ x: X_LABEL - 10, y: y - 22, width: MARGE + LARGEUR - X_LABEL + 10, height: 28, color: MARINE });
    ecrire("TOTAL GÉNÉRAL", X_LABEL, y - 12, { police: gras, taille: 10, couleur: BLANC });
    ecrire(`${nombre(totalGeneral)} ${devise}`, X_MONT, y - 12, { police: gras, taille: 12, couleur: BLANC, droite: true });
    y -= 22 + 24;

    // --- Conditions ---
    if (q.conditions && q.conditions.trim()) {
      if (y < BAS + 40) nouvellePage();
      ecrire("CONDITIONS", MARGE, y, { police: gras, taille: 9, couleur: MARINE });
      y -= 14;
      for (const l of couper(t(q.conditions.trim()), normal, 9, LARGEUR)) {
        if (y < BAS + 10) nouvellePage();
        ecrire(l, MARGE, y, { taille: 9 });
        y -= 12;
      }
      y -= 14;
    }

    // --- Signatures ---
    if (y - 120 < BAS) nouvellePage();
    const LB = 240;
    const HB = 78;
    const yb = y - HB - 16;
    ecrire("Le client", MARGE, y - 4, { police: gras, taille: 9.5 });
    ecrire("« Bon pour accord », date et signature", MARGE, y - 15, { taille: 8.5, couleur: GRIS });
    page.drawRectangle({ x: MARGE, y: yb, width: LB, height: HB, borderColor: TRAIT, borderWidth: 0.8 });
    const xr = MARGE + LARGEUR - LB;
    ecrire("L'établissement", xr, y - 4, { police: gras, taille: 9.5 });
    ecrire("Date, signature et cachet", xr, y - 15, { taille: 8.5, couleur: GRIS });
    page.drawRectangle({ x: xr, y: yb, width: LB, height: HB, borderColor: TRAIT, borderWidth: 0.8 });

    // --- Pied de page sur chaque page ---
    pages.forEach((p, i) => {
      page = p;
      trait(40, 0.5);
      ecrire(`${etab.name || ""} - Devis ${q.number}`, MARGE, 27, { taille: 8, couleur: GRIS });
      ecrire(`Page ${i + 1} / ${pages.length}`, MARGE + LARGEUR, 27, { taille: 8, couleur: GRIS, droite: true });
    });

    const octets = await doc.save();
    return new Response(octets, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${q.number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Erreur PDF :", e);
    return repondreErreur(500, "Génération du PDF impossible. Réessayez dans un instant.");
  }
                  }
