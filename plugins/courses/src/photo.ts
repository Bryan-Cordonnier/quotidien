// Prépare une photo pour l'IA : réduite (1600 px au plus sur le grand côté) et recompressée en JPEG, pour que l'envoi soit rapide et léger
// (un ticket reste lisible à cette taille, et la photo d'un téléphone fait souvent plusieurs Mo). Rien n'est gardé : la photo n'est ni
// enregistrée ni conservée, elle part une seule fois vers l'IA.
import type { AiImage } from "@etabli/sdk";

const OCTETS_MAX = 40_000_000;

export async function preparerPhoto(fichier: File, cote = 1600): Promise<AiImage> {
  if (!fichier.type.startsWith("image/")) throw new Error("Ce fichier n'est pas une image.");
  if (fichier.size > OCTETS_MAX) throw new Error("Cette photo est trop lourde (40 Mo au plus).");
  const image = await createImageBitmap(fichier).catch(() => {
    throw new Error("Cette photo n'a pas pu être ouverte : essayez un autre format (JPEG ou PNG).");
  });
  const echelle = Math.min(1, cote / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * echelle));
  canvas.height = Math.max(1, Math.round(image.height * echelle));
  const dessin = canvas.getContext("2d");
  if (!dessin) throw new Error("Le navigateur ne peut pas préparer cette photo.");
  dessin.fillStyle = "#ffffff";
  dessin.fillRect(0, 0, canvas.width, canvas.height);
  dessin.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("La photo n'a pas pu être préparée.");
  const octets = new Uint8Array(await blob.arrayBuffer());
  let binaire = "";
  for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return { mime: "image/jpeg", data: btoa(binaire) };
}