//! Calcul du net : intérim et réserve.

use crate::div_arrondi;
use serde::{Deserialize, Serialize};

/// Cotisations salariales par défaut (22 %), en points de base.
pub const COTISATIONS_DEFAUT_BP: i64 = 2200;
/// Seuil hebdomadaire d'heures normales par défaut (35 h).
pub const SEUIL_HEBDO_DEFAUT_MIN: i64 = 35 * 60;

/// Une journée de mission.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct JourMission {
    /// Heure de début, minutes depuis minuit.
    pub debut_min: i64,
    /// Heure de fin ; si `fin <= debut`, la journée passe minuit.
    pub fin_min: i64,
    /// Pause non payée.
    pub pause_min: i64,
    /// Minutes supplémentaires ajoutées après coup (« +1 h ce soir »), payées au taux sup.
    #[serde(default)]
    pub sup_manuel_min: i64,
}

impl JourMission {
    /// Minutes planifiées et payées (pause déduite), hors ajustement manuel.
    pub fn minutes_planifiees(&self) -> i64 {
        let mut duree = self.fin_min - self.debut_min;
        if duree <= 0 {
            duree += 24 * 60;
        }
        (duree - self.pause_min).max(0)
    }
}

/// Une semaine de mission (les heures sup se calculent par semaine).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SemaineMission {
    pub jours: Vec<JourMission>,
}

/// Paramètres d'une mission d'intérim.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EntreeInterim {
    /// Taux horaire brut, en centimes.
    pub taux_cents: i64,
    /// Taux horaire brut des heures supplémentaires, en centimes (propre à la mission).
    pub taux_sup_cents: i64,
    /// Seuil hebdomadaire au-delà duquel les heures sont supplémentaires.
    #[serde(default = "seuil_defaut")]
    pub seuil_hebdo_min: i64,
    /// Cotisations salariales, en points de base (2200 = 22 %).
    #[serde(default = "cotis_defaut")]
    pub cotisations_bp: i64,
    pub semaines: Vec<SemaineMission>,
}

fn seuil_defaut() -> i64 {
    SEUIL_HEBDO_DEFAUT_MIN
}
fn cotis_defaut() -> i64 {
    COTISATIONS_DEFAUT_BP
}

/// Résultat du calcul de paie d'intérim.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct PaieInterim {
    pub minutes_normales: i64,
    pub minutes_sup: i64,
    pub brut_base_cents: i64,
    pub ifm_cents: i64,
    pub cp_cents: i64,
    pub brut_total_cents: i64,
    pub net_cents: i64,
}

/// Net d'une mission d'intérim.
///
/// * heures normales / sup par semaine (sup = au-delà du seuil + ajustements manuels) ;
/// * IFM = 10 % du brut de base ; CP = 10 % de (brut de base + IFM) ;
/// * net = brut total × (1 − cotisations).
pub fn calculer_interim(e: &EntreeInterim) -> PaieInterim {
    let mut normales = 0;
    let mut sup = 0;
    for semaine in &e.semaines {
        let planifie: i64 = semaine
            .jours
            .iter()
            .map(JourMission::minutes_planifiees)
            .sum();
        let manuel: i64 = semaine.jours.iter().map(|j| j.sup_manuel_min.max(0)).sum();
        normales += planifie.min(e.seuil_hebdo_min);
        sup += (planifie - e.seuil_hebdo_min).max(0) + manuel;
    }
    let brut_base =
        div_arrondi(normales * e.taux_cents, 60) + div_arrondi(sup * e.taux_sup_cents, 60);
    let ifm = div_arrondi(brut_base, 10);
    let cp = div_arrondi(brut_base + ifm, 10);
    let brut_total = brut_base + ifm + cp;
    let net = div_arrondi(brut_total * (10_000 - e.cotisations_bp), 10_000);
    PaieInterim {
        minutes_normales: normales,
        minutes_sup: sup,
        brut_base_cents: brut_base,
        ifm_cents: ifm,
        cp_cents: cp,
        brut_total_cents: brut_total,
        net_cents: net,
    }
}

/// Paramètres de la paie de réserve.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EntreeReserve {
    /// Solde journalière imposable, en centimes (défaut 6000).
    pub tarif_jour_cents: i64,
    /// Indemnité journalière non imposable hors base, en centimes (défaut 3800).
    pub indemnite_hors_base_cents: i64,
    #[serde(default = "cotis_defaut")]
    pub cotisations_bp: i64,
    /// Un booléen par jour : `true` si hors base.
    pub jours_hors_base: Vec<bool>,
}

/// Résultat du calcul de paie de réserve.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct PaieReserve {
    pub jours: i64,
    pub jours_hors_base: i64,
    /// Total imposable avant cotisations.
    pub brut_imposable_cents: i64,
    /// Total non imposable (indemnités hors base).
    pub non_imposable_cents: i64,
    pub net_cents: i64,
}

/// Net de jours de réserve : la solde est cotisée, l'indemnité hors base ne l'est pas.
pub fn calculer_reserve(e: &EntreeReserve) -> PaieReserve {
    let jours = e.jours_hors_base.len() as i64;
    let hors_base = e.jours_hors_base.iter().filter(|&&h| h).count() as i64;
    let brut_imposable = jours * e.tarif_jour_cents;
    let non_imposable = hors_base * e.indemnite_hors_base_cents;
    let net_imposable = div_arrondi(brut_imposable * (10_000 - e.cotisations_bp), 10_000);
    PaieReserve {
        jours,
        jours_hors_base: hors_base,
        brut_imposable_cents: brut_imposable,
        non_imposable_cents: non_imposable,
        net_cents: net_imposable + non_imposable,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn jour(debut_h: i64, fin_h: i64, pause: i64) -> JourMission {
        JourMission {
            debut_min: debut_h * 60,
            fin_min: fin_h * 60,
            pause_min: pause,
            sup_manuel_min: 0,
        }
    }

    fn semaine_35h() -> SemaineMission {
        // 5 × (8h-16h, pause 60) = 5 × 7h = 35 h
        SemaineMission {
            jours: vec![jour(8, 16, 60); 5],
        }
    }

    fn entree(semaines: Vec<SemaineMission>) -> EntreeInterim {
        EntreeInterim {
            taux_cents: 1300,
            taux_sup_cents: 1625,
            seuil_hebdo_min: SEUIL_HEBDO_DEFAUT_MIN,
            cotisations_bp: COTISATIONS_DEFAUT_BP,
            semaines,
        }
    }

    #[test]
    fn minutes_planifiees_deduit_la_pause() {
        assert_eq!(jour(8, 16, 60).minutes_planifiees(), 420);
    }

    #[test]
    fn journee_de_nuit_passe_minuit() {
        let j = JourMission {
            debut_min: 22 * 60,
            fin_min: 6 * 60,
            pause_min: 30,
            sup_manuel_min: 0,
        };
        assert_eq!(j.minutes_planifiees(), 8 * 60 - 30);
    }

    #[test]
    fn semaine_35h_pas_de_sup() {
        let p = calculer_interim(&entree(vec![semaine_35h()]));
        assert_eq!(p.minutes_normales, 2100);
        assert_eq!(p.minutes_sup, 0);
        // 35 h × 13 € = 455 € ; IFM 45,50 ; CP 50,05 ; brut 550,55 ; net 22 % -> 429,43
        assert_eq!(p.brut_base_cents, 45_500);
        assert_eq!(p.ifm_cents, 4_550);
        assert_eq!(p.cp_cents, 5_005);
        assert_eq!(p.brut_total_cents, 55_055);
        assert_eq!(p.net_cents, 42_943);
    }

    #[test]
    fn semaine_39h_quatre_heures_sup() {
        // 5 × 7 h 48 = 39 h
        let j = JourMission {
            debut_min: 8 * 60,
            fin_min: 16 * 60 + 48,
            pause_min: 60,
            sup_manuel_min: 0,
        };
        let p = calculer_interim(&entree(vec![SemaineMission { jours: vec![j; 5] }]));
        assert_eq!(p.minutes_normales, 2100);
        assert_eq!(p.minutes_sup, 240);
        // 455 + 4 × 16,25 = 520 € de brut de base
        assert_eq!(p.brut_base_cents, 52_000);
    }

    #[test]
    fn sup_manuel_paye_au_taux_sup_sans_depasser_le_seuil() {
        let mut s = semaine_35h();
        s.jours[2].sup_manuel_min = 60;
        let p = calculer_interim(&entree(vec![s]));
        assert_eq!(p.minutes_normales, 2100);
        assert_eq!(p.minutes_sup, 60);
        assert_eq!(p.brut_base_cents, 45_500 + 1_625);
    }

    #[test]
    fn les_semaines_sont_independantes() {
        let court = SemaineMission {
            jours: vec![jour(8, 16, 60); 3],
        }; // 21 h
        let p = calculer_interim(&entree(vec![court, semaine_35h()]));
        assert_eq!(p.minutes_normales, 21 * 60 + 35 * 60);
        assert_eq!(p.minutes_sup, 0);
    }

    #[test]
    fn mission_vide() {
        assert_eq!(calculer_interim(&entree(vec![])), PaieInterim::default());
    }

    #[test]
    fn reserve_hors_base() {
        let p = calculer_reserve(&EntreeReserve {
            tarif_jour_cents: 6000,
            indemnite_hors_base_cents: 3800,
            cotisations_bp: COTISATIONS_DEFAUT_BP,
            jours_hors_base: vec![true; 13],
        });
        assert_eq!(p.brut_imposable_cents, 78_000);
        assert_eq!(p.non_imposable_cents, 49_400);
        // 780 € × 0,78 = 608,40 + 494 = 1 102,40
        assert_eq!(p.net_cents, 60_840 + 49_400);
    }

    #[test]
    fn reserve_sur_base_sans_indemnite() {
        let p = calculer_reserve(&EntreeReserve {
            tarif_jour_cents: 6000,
            indemnite_hors_base_cents: 3800,
            cotisations_bp: COTISATIONS_DEFAUT_BP,
            jours_hors_base: vec![false, true],
        });
        assert_eq!(p.jours, 2);
        assert_eq!(p.jours_hors_base, 1);
        assert_eq!(p.non_imposable_cents, 3800);
    }
}
