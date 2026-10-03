//! Heures de départ, de réveil et de coucher, calculées à rebours.
//!
//! Les heures sont en minutes depuis minuit du **jour de l'événement** ; une valeur
//! négative signale la veille (ex. coucher à 22 h 30 = -90).

use serde::{Deserialize, Serialize};

/// Réglages d'une journée avec un événement à lieu extérieur.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct EntreeHoraires {
    /// Heure de début de l'événement.
    pub debut_min: i32,
    /// Marge d'avance à l'arrivée (ex. 10).
    pub marge_arrivee_min: i32,
    /// Temps de trajet de base, sans majoration.
    pub trajet_min: i32,
    /// Majoration du trajet en points de base (1500 = +15 % aux heures de pointe).
    #[serde(default)]
    pub majoration_trajet_bp: i32,
    /// Chaussures, clés, descendre, démarrer, GPS, décoller.
    pub mise_en_route_min: i32,
    /// Douche, habillage, petit-déjeuner.
    pub preparation_min: i32,
    /// Durée de sommeil cible.
    pub sommeil_min: i32,
    /// Délai pour s'endormir.
    pub endormissement_min: i32,
    /// Pré-alerte avant l'heure de décision (ex. 5).
    #[serde(default = "pre_alerte_defaut")]
    pub pre_alerte_min: i32,
    /// Rappel avant l'heure de coucher (ex. 30).
    #[serde(default = "rappel_coucher_defaut")]
    pub rappel_coucher_min: i32,
}

fn pre_alerte_defaut() -> i32 {
    5
}
fn rappel_coucher_defaut() -> i32 {
    30
}

/// Chronologie calculée.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlanHoraires {
    pub trajet_majore_min: i32,
    pub arrivee_visee_min: i32,
    /// Heure à laquelle les roues tournent.
    pub depart_reel_min: i32,
    /// « Tu dois partir maintenant ».
    pub decision_partir_min: i32,
    /// « Tu dois partir dans X min ».
    pub pre_alerte_min: i32,
    pub reveil_min: i32,
    pub coucher_min: i32,
    pub rappel_coucher_min: i32,
}

/// Trajet majoré, arrondi à la minute supérieure.
pub fn trajet_majore(trajet_min: i32, majoration_bp: i32) -> i32 {
    let num = i64::from(trajet_min) * (10_000 + i64::from(majoration_bp));
    ((num + 9_999).div_euclid(10_000)) as i32
}

/// Calcule la chronologie de la journée à rebours.
pub fn calculer_horaires(e: &EntreeHoraires) -> PlanHoraires {
    let trajet = trajet_majore(e.trajet_min, e.majoration_trajet_bp);
    let arrivee = e.debut_min - e.marge_arrivee_min;
    let depart = arrivee - trajet;
    let decision = depart - e.mise_en_route_min;
    let reveil = decision - e.preparation_min;
    let coucher = reveil - e.sommeil_min - e.endormissement_min;
    PlanHoraires {
        trajet_majore_min: trajet,
        arrivee_visee_min: arrivee,
        depart_reel_min: depart,
        decision_partir_min: decision,
        pre_alerte_min: decision - e.pre_alerte_min,
        reveil_min: reveil,
        coucher_min: coucher,
        rappel_coucher_min: coucher - e.rappel_coucher_min,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> EntreeHoraires {
        EntreeHoraires {
            debut_min: 8 * 60,
            marge_arrivee_min: 10,
            trajet_min: 30,
            majoration_trajet_bp: 0,
            mise_en_route_min: 10,
            preparation_min: 45,
            sommeil_min: 8 * 60,
            endormissement_min: 15,
            pre_alerte_min: 5,
            rappel_coucher_min: 30,
        }
    }

    #[test]
    fn exemple_du_cahier_des_charges() {
        let p = calculer_horaires(&base());
        assert_eq!(p.arrivee_visee_min, 7 * 60 + 50);
        assert_eq!(p.depart_reel_min, 7 * 60 + 20);
        assert_eq!(p.decision_partir_min, 7 * 60 + 10);
        assert_eq!(p.pre_alerte_min, 7 * 60 + 5);
    }

    #[test]
    fn coucher_la_veille_en_negatif() {
        let p = calculer_horaires(&base());
        // réveil 6 h 25 ; coucher = 6 h 25 − 8 h − 15 min = 22 h 10 la veille
        assert_eq!(p.reveil_min, 6 * 60 + 25);
        assert_eq!(p.coucher_min, 6 * 60 + 25 - 8 * 60 - 15);
        assert!(p.coucher_min < 0);
        assert_eq!(p.rappel_coucher_min, p.coucher_min - 30);
    }

    #[test]
    fn majoration_arrondie_au_superieur() {
        assert_eq!(trajet_majore(30, 0), 30);
        assert_eq!(trajet_majore(30, 1500), 35); // 34,5 -> 35
        assert_eq!(trajet_majore(20, 1000), 22);
        assert_eq!(trajet_majore(0, 1500), 0);
    }

    #[test]
    fn la_majoration_avance_le_depart() {
        let mut e = base();
        e.majoration_trajet_bp = 2000; // 30 -> 36
        let p = calculer_horaires(&e);
        assert_eq!(p.trajet_majore_min, 36);
        assert_eq!(p.decision_partir_min, 7 * 60 + 4);
    }
}
