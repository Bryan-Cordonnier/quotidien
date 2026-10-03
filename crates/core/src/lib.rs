//! Cœur métier : paie, horaires de départ/coucher, alertes de repos.
//!
//! Tous les montants sont en **centimes** (`i64`), toutes les durées en **minutes**.
//! Aucune dépendance à une UI ou à une horloge : fonctions pures, testables.

pub mod horaires;
pub mod paie;
pub mod repos;

/// Arrondi à l'entier le plus proche (moitié vers le haut) de `num / den`, `den > 0`.
pub(crate) fn div_arrondi(num: i64, den: i64) -> i64 {
    debug_assert!(den > 0);
    (2 * num + den).div_euclid(2 * den)
}
