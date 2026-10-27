import { describe, expect, it } from "vitest";
import { budget, casesParDefaut, invites, PREFERENCES_DEFAUT, construireConsigne, debutConseille, lireListeIa, lirePlanIa, repasVoulus, type Questionnaire } from "./concocter";
import { ajouterPlan, ajouterPrix, ajouterRecette, basculerFavori, definirNutrition, definirUstensiles, donneesVides, lireDonnees, modifierRecette, supprimerRecette } from "./donnees";
import { lireFusionIa } from "./fusion";
import { prevoir } from "./semaine";
import { aDemander, mettreATester, repondre } from "./teste";
import { lireNutritionIa, moyenneMangee } from "./nutrition";
import { basePrix, chiffrer, jetons, prixParMagasin } from "./prix";
import { ErreurRepas, type Recette } from "./types";

const carbo = { nom: "Pâtes carbonara", categorie: "Pâtes", portions: 2, tempsMin: 20, ingredients: [{ nom: "spaghetti", quantite: "200 g" }, { nom: "lardons", quantite: "150 g" }, { nom: "œufs", quantite: "2" }], etapes: ["Cuire les pâtes.", "Mélanger."], ustensiles: ["casserole", "poêle"] };

function refus(f: () => unknown): ErreurRepas {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurRepas) return e;
    throw e;
  }
  throw new Error("Un refus était attendu.");
}

describe("données", () => {
  it("une recette s'ajoute, se modifie, se supprime ; les données se relisent à l'identique", () => {
    const a = ajouterRecette(donneesVides(), carbo);
    expect(a.id).toBe("r1");
    expect(a.donnees.recettes[0]).toMatchObject({ nom: "Pâtes carbonara", source: "moi", notes: "" });
    let d = modifierRecette(a.donnees, "r1", { ...carbo, portions: 4 });
    expect(d.recettes[0]?.portions).toBe(4);
    d = definirUstensiles(d, ["Four", "four", "Poêle"]);
    expect(d.ustensiles).toEqual(["Four", "Poêle"]);
    expect(lireDonnees(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(supprimerRecette(d, "r1").recettes).toEqual([]);
  });

  it("refuse une recette sans ingrédient, une catégorie inconnue, un champ inconnu", () => {
    expect(refus(() => ajouterRecette(donneesVides(), { ...carbo, ingredients: [] })).code).toBe("argument_invalide");
    expect(refus(() => ajouterRecette(donneesVides(), { ...carbo, categorie: "Bizarre" })).code).toBe("argument_invalide");
    expect(refus(() => ajouterRecette(donneesVides(), { ...carbo, gout: "bon" })).code).toBe("argument_invalide");
  });

  it("des données présentes mais illisibles sont une erreur, jamais des données vides", () => {
    expect(lireDonnees(null).recettes).toEqual([]);
    expect(refus(() => lireDonnees({ schema: 9, suivant: 1, recettes: [] })).code).toBe("illisible");
    expect(refus(() => lireDonnees("n'importe quoi")).code).toBe("illisible");
  });

  it("un nouveau relevé de prix remplace l'ancien du même article dans le même magasin", () => {
    let d = ajouterPrix(donneesVides(), [{ nom: "Spaghetti 500 g", magasin: "Lidl", prixCents: 85, jour: "2026-10-10" }]);
    d = ajouterPrix(d, [{ nom: "spaghetti 500 g", magasin: "lidl", prixCents: 79, jour: "2026-10-16", source: "max" }]);
    expect(d.prix).toHaveLength(1);
    expect(d.prix[0]).toMatchObject({ prixCents: 79, source: "max" });
  });

  it("on garde les 20 derniers plans", () => {
    let d = donneesVides();
    for (let i = 0; i < 22; i++) d = ajouterPlan(d, { cree: "2026-10-16", debut: "2026-10-17", jours: 7, budgetCents: 7000, exceptionnel: false, envies: "", repas: [], courses: [], magasinConseille: "", totaux: [], totalCents: 0, remarques: "", envoye: false }).donnees;
    expect(d.plans).toHaveLength(20);
    expect(d.plans[0]?.id).toBe("p22");
  });
});

describe("prix et magasin", () => {
  const tickets = [
    { nom: "Spaghetti n°5 Barilla 500g", magasin: "Leclerc", prixCents: 95, fois: 3 },
    { nom: "Spaghetti 500g", magasin: "Lidl", prixCents: 79, fois: 2 },
    { nom: "Lardons fumés 2x75g", magasin: "Leclerc", prixCents: 199, fois: 1 },
    { nom: "Lardons fumés", magasin: "Lidl", prixCents: 249, fois: 1 },
    { nom: "Oeufs x12", magasin: "Lidl", prixCents: 289, fois: 1 },
  ];
  const base = basePrix(tickets, [{ nom: "Oeufs boîte de 12", magasin: "Leclerc", prixCents: 310, unite: "boîte", jour: "2026-10-15", source: "max" }]);

  it("les mots qui comptent, sans unités ni petits mots", () => {
    expect(jetons("Spaghetti n°5 Barilla 500g")).toEqual(["spaghetti", "barilla"]);
    expect(jetons("Paquet de pâtes 1 kg")).toEqual(["pate"]);
  });

  it("une ligne retrouve son prix dans chaque magasin où elle a été vue", () => {
    const p = prixParMagasin("Spaghetti 500 g", base);
    expect(p.get("Lidl")).toBe(79);
    expect(p.get("Leclerc")).toBe(95);
  });

  it("le magasin conseillé est le moins cher pour TOUTE la liste, pas article par article", () => {
    // Lidl : 2 × 0,79 + 2,49 + 2,89 = 6,96 € ; Leclerc : 2 × 0,95 + 1,99 + 3,10 = 6,99 €
    const c = chiffrer(
      [
        { nom: "Spaghetti 500 g", pour: "carbo", unites: 2, estimeCents: 100 },
        { nom: "Lardons fumés", pour: "carbo", unites: 1, estimeCents: 200 },
        { nom: "Oeufs boîte de 12", pour: "carbo", unites: 1, estimeCents: 300 },
      ],
      base,
    );
    expect(c.totaux.map((t) => [t.magasin, t.totalCents])).toEqual([["Lidl", 696], ["Leclerc", 699]]);
    expect(c.magasin).toBe("Lidl");
    expect(c.totalCents).toBe(696);
  });

  it("un article jamais vu est compté à l'estimation de l'IA, partout pareil (un magasin n'est pas moins cher parce qu'il manque des articles)", () => {
    const c = chiffrer(
      [
        { nom: "Spaghetti 500 g", pour: "", unites: 1, estimeCents: 100 },
        { nom: "Mozzarella", pour: "pizza", unites: 2, estimeCents: 120 },
      ],
      base,
    );
    expect(c.totaux.find((t) => t.magasin === "Lidl")?.totalCents).toBe(79 + 240);
    expect(c.lignes[1]).toMatchObject({ prixUnitaireCents: 120, estime: true });
  });

  it("sans aucun prix connu, le total est celui des estimations", () => {
    const c = chiffrer([{ nom: "Farine 1 kg", pour: "", unites: 1, estimeCents: 90 }], basePrix([], []));
    expect(c).toMatchObject({ magasin: "", totalCents: 90, inconnues: 0 });
  });
});

describe("concocter", () => {
  const q = (reste: Partial<Questionnaire> = {}): Questionnaire => ({ debut: "2026-10-19", jours: 7, foyer: 1, cases: casesParDefaut("2026-10-19", 7, 1), economieCents: 0, envies: "pizza et carbo", preferences: PREFERENCES_DEFAUT, ...reste });

  it("courses le samedi : la semaine commence le dimanche qui suit", () => {
    expect(debutConseille("2026-10-16", 6)).toBe("2026-10-18"); // vendredi → samedi 17 → dimanche 18
    expect(debutConseille("2026-10-17", 6)).toBe("2026-10-18"); // le samedi même
  });

  it("par défaut midi et soir pour le foyer : 14 repas sur une semaine", () => {
    expect(repasVoulus(q())).toHaveLength(14);
  });

  it("budget : la semaine de Courses ramenée aux jours, moins l'économie voulue", () => {
    expect(budget(q(), 7000)).toMatchObject({ habituelCents: 7000, exceptionnel: false, viseCents: 7000 });
    expect(budget(q({ jours: 4, cases: casesParDefaut("2026-10-19", 4, 1) }), 7000).viseCents).toBe(4000);
    expect(budget(q({ economieCents: 1000 }), 7000).viseCents).toBe(6000);
  });

  it("12 amis un soir : semaine exceptionnelle, le budget suit le nombre de parts au même coût par part", () => {
    const cases = casesParDefaut("2026-10-19", 7, 1);
    cases["2026-10-24"]!.soir = 13;
    const b = budget(q({ cases }), 7000);
    expect(b.exceptionnel).toBe(true);
    expect(b.parts).toBe(26);
    expect(b.viseCents).toBe(13_000); // 70 € pour 14 parts → 5 € la part × 26
  });

  it("un invité un seul soir : seul ce repas a plus de parts, et la consigne le dit", () => {
    const cases = casesParDefaut("2026-10-19", 7, 1);
    cases["2026-10-23"]!.soir = 2;
    const qq = q({ cases, preferences: { ...PREFERENCES_DEFAUT, gamelles: true, restes: false } });
    expect(budget(qq, 7000)).toMatchObject({ parts: 15, exceptionnel: false });
    expect(invites(qq)).toEqual(["vendredi 23 soir : 2 personnes (1 invité)"]);
    const c = construireConsigne(qq, { budgetSemaineCents: 7000, ustensiles: [], recettes: [], prix: [], sante: null });
    expect(c).toContain("vendredi 23 soir : 2 personnes (1 invité)");
    expect(c).toContain("GAMELLE");
    expect(c).toContain("Pas de restes");
  });

  it("la consigne parle des repas, du budget, des envies, des ustensiles et des recettes connues", () => {
    const r = { id: "r3", ...carbo, notes: "", source: "moi" } as Recette;
    const c = construireConsigne(q(), { budgetSemaineCents: 7000, ustensiles: ["four", "poêle"], recettes: [r], prix: [], sante: { caloriesJour: 2200 } });
    expect(c).toContain("70,00 €");
    expect(c).toContain("pizza et carbo");
    expect(c).toContain("four, poêle");
    expect(c).toContain("[r3] Pâtes carbonara");
    expect(c).toContain("caloriesJour");
  });

  it("la réponse de l'IA est lue strictement : seuls les repas demandés, recettes existantes, quantités bornées", () => {
    const qq = q({ jours: 2, cases: casesParDefaut("2026-10-19", 2, 2) });
    const texte = JSON.stringify({
      repas: [
        { jour: "2026-10-19", moment: "midi", plat: "Carbonara", recette: "r1" },
        { jour: "2026-10-19", moment: "soir", plat: "Pizza maison", recette: "", nouvelleRecette: { nom: "Pizza maison", categorie: "Pizzas et tartes", portions: 2, ingredients: [{ nom: "farine", quantite: "250 g" }], etapes: ["Pétrir"], ustensiles: ["four"] } },
        { jour: "2026-10-19", moment: "soir", plat: "Doublon", recette: "" },
        { jour: "2026-10-25", moment: "midi", plat: "Hors plan", recette: "" },
        { jour: "2026-10-20", moment: "midi", plat: "Salade", recette: "r999" },
      ],
      courses: [
        { nom: "Spaghetti 500 g", pour: "carbo", unites: 2.4, prixUnitaire: 0.9 },
        { nom: "spaghetti 500 g", pour: "doublon", unites: 1, prixUnitaire: 1 },
        { nom: "Truffe", unites: 999, prixUnitaire: 9999 },
      ],
      remarques: "Budget tenu.",
    });
    const recettes = [{ id: "r1", ...carbo, notes: "", source: "moi" }] as Recette[];
    const lu = lirePlanIa("Voici : " + texte, qq, recettes);
    if (typeof lu === "string") throw new Error(lu);
    expect(lu.repas.map((r) => [r.jour, r.moment, r.plat, r.recetteId, r.personnes])).toEqual([
      ["2026-10-19", "midi", "Carbonara", "r1", 2],
      ["2026-10-19", "soir", "Pizza maison", null, 2],
      ["2026-10-20", "midi", "Salade", null, 2],
    ]);
    expect(lu.repas[1]?.nouvelle).toMatchObject({ nom: "Pizza maison", categorie: "Pizzas et tartes" });
    expect(lu.oublies).toBe(1);
    expect(lu.courses).toEqual([
      { nom: "Spaghetti 500 g", pour: "carbo", unites: 2, estimeCents: 90 },
      { nom: "Truffe", pour: "", unites: 50, estimeCents: null },
    ]);
    expect(lirePlanIa("pas du json", qq, recettes)).toContain("illisible");
    expect(lirePlanIa(JSON.stringify({ repas: [], courses: [], remarques: "" }), qq, recettes)).toContain("aucun");
  });

  it("une liste faite à partir de recettes est lue avec les mêmes règles", () => {
    const lu = lireListeIa(JSON.stringify({ courses: [{ nom: "Farine 1 kg", pour: "pizza", unites: 1, prixUnitaire: 0.95 }], remarques: "ok" }));
    expect(lu).toEqual({ courses: [{ nom: "Farine 1 kg", pour: "pizza", unites: 1, estimeCents: 95 }], remarques: "ok" });
    expect(lireListeIa(JSON.stringify({ courses: [], remarques: "" }))).toContain("aucun article");
  });
});

describe("favoris, valeurs nutritionnelles et fusion avec la liste de courses", () => {
  const base = { nom: "Pâtes carbo", categorie: "Pâtes", portions: 2, ingredients: [{ nom: "spaghetti", quantite: "200 g" }] };

  it("le favori et les valeurs se gardent quand le formulaire modifie la recette", () => {
    let d = ajouterRecette(donneesVides(), base).donnees;
    d = basculerFavori(d, "r1");
    d = definirNutrition(d, { r1: { kcal: 650, proteines: 28, glucides: 80, lipides: 22 }, r9: { kcal: 1, proteines: 1, glucides: 1, lipides: 1 } });
    d = modifierRecette(d, "r1", { ...base, nom: "Carbonara" });
    expect(d.recettes[0]).toMatchObject({ nom: "Carbonara", favori: true, nutrition: { kcal: 650 } });
    expect(lireDonnees(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });

  it("la moyenne suit les parts des repas concoctés, sinon toutes les recettes", () => {
    let d = ajouterRecette(donneesVides(), base).donnees;
    d = ajouterRecette(d, { ...base, nom: "Salade" }).donnees;
    expect(moyenneMangee(d)).toBeNull();
    d = definirNutrition(d, { r1: { kcal: 600, proteines: 30, glucides: 80, lipides: 20 }, r2: { kcal: 300, proteines: 10, glucides: 20, lipides: 10 } });
    expect(moyenneMangee(d)).toMatchObject({ kcal: 450, base: "recettes", nombre: 2 });
    d = ajouterPlan(d, { cree: "2026-10-16", debut: "2026-10-17", jours: 1, budgetCents: 0, exceptionnel: false, envies: "", repas: [{ jour: "2026-10-17", moment: "soir", personnes: 3, plat: "Carbo", recetteId: "r1" }, { jour: "2026-10-17", moment: "midi", personnes: 1, plat: "Salade", recetteId: "r2" }], courses: [], magasinConseille: "", totaux: [], totalCents: 0, remarques: "", envoye: false }).donnees;
    expect(moyenneMangee(d)).toMatchObject({ kcal: 525, proteines: 25, base: "repas", nombre: 4 });
  });

  it("la réponse nutrition et la fusion de l'IA sont lues strictement", () => {
    expect(lireNutritionIa('{"recettes":[{"id":"r1","kcal":650.4,"proteines":28,"glucides":80,"lipides":22},{"id":"r7","kcal":1,"proteines":1,"glucides":1,"lipides":1},{"id":"r2","kcal":-5}]}', ["r1", "r2"])).toEqual({ r1: { kcal: 650, proteines: 28, glucides: 80, lipides: 22 } });
    const f = lireFusionIa('{"articles":["Pâtes 500 g","Œufs x12","Œufs x12","Lardons 2 × 75 g"],"remarques":"Œufs en commun : boîte de 12 au lieu de 6."}', ["Pâtes 500 g", "Œufs x6"]);
    expect(f).toEqual({ articles: ["Pâtes 500 g", "Œufs x12", "Lardons 2 × 75 g"], ajoutes: ["Œufs x12", "Lardons 2 × 75 g"], retires: ["Œufs x6"], remarques: "Œufs en commun : boîte de 12 au lieu de 6." });
    expect(typeof lireFusionIa("pas du json", [])).toBe("string");
  });
});

describe("testée", () => {
  const base = () => {
    let d = ajouterRecette(donneesVides(), carbo).donnees;
    d = mettreATester(d, "r1", "l3", "2026-10-26");
    return d;
  };
  it("attend que la liste soit réglée, puis l'heure du repas prévu", () => {
    let d = base();
    expect(aDemander(d, ["l3"], "2026-10-28", 0)).toEqual([]);
    d = prevoir(d, { jour: "2026-10-28", moment: "soir", plat: "", recetteId: "r1", heureMin: 19 * 60 });
    expect(aDemander(d, [], "2026-10-28", 18 * 60)).toEqual([]);
    expect(aDemander(d, [], "2026-10-28", 20 * 60).map((r) => r.id)).toEqual(["r1"]);
  });
  it("sans repas prévu, demande dès le lendemain ; la réponse marque « testée » et ne redemande plus", () => {
    let d = base();
    expect(aDemander(d, [], "2026-10-26", 0)).toEqual([]);
    expect(aDemander(d, [], "2026-10-27", 0)).toHaveLength(1);
    d = repondre(d, "r1", 4, "2026-10-27");
    expect(d.recettes[0]).toMatchObject({ note: 4, teste: "2026-10-27" });
    expect(d.aTester).toEqual([]);
    d = modifierRecette(d, "r1", { ...carbo, portions: 3 });
    expect(d.recettes[0]?.teste).toBe("2026-10-27");
    expect(lireDonnees(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(repondre(base(), "r1", null, "2026-10-27").recettes[0]?.teste).toBeNull();
  });
});

