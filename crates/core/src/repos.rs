//! Alertes de repos légal : 11 h entre deux journées, 10 h par jour, 48 h par semaine.

use serde::{Deserialize, Serialize};

pub const REPOS_MIN_MIN: i64 = 11 * 60;
pub const JOURNEE_MAX_MIN: i64 = 10 * 60;
pub const SEMAINE_MAX_MIN: i64 = 48 * 60;
const SEMAINE_MIN: i64 = 7 * 24 * 60;

/// Plage de travail en minutes absolues (depuis un repère commun, ex. lundi 00 h 00).
/// Y compris les jours de réserve et les blocs de travail déclarés.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Plage {
    pub debut: i64,
    pub fin: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Alerte {
    /// Repos insuffisant entre deux plages consécutives (indices dans la liste triée).
    ReposInsuffisant {
        entre: usize,
        repos_min: i64,
    },
    JourneeTropLongue {
        plage: usize,
        duree_min: i64,
    },
    /// Semaine glissante de 7 jours démarrant à la plage donnée.
    SemaineTropLongue {
        depuis: usize,
        total_min: i64,
    },
}

/// Analyse des plages (triées par l'appelant ou non : on les trie ici).
pub fn verifier(plages: &[Plage]) -> Vec<Alerte> {
    let mut p: Vec<Plage> = plages.to_vec();
    p.sort_by_key(|x| x.debut);
    let mut alertes = Vec::new();
    for (i, pl) in p.iter().enumerate() {
        let duree = pl.fin - pl.debut;
        if duree > JOURNEE_MAX_MIN {
            alertes.push(Alerte::JourneeTropLongue {
                plage: i,
                duree_min: duree,
            });
        }
        if let Some(suiv) = p.get(i + 1) {
            let repos = suiv.debut - pl.fin;
            if repos < REPOS_MIN_MIN {
                alertes.push(Alerte::ReposInsuffisant {
                    entre: i,
                    repos_min: repos,
                });
            }
        }
    }
    for (i, pl) in p.iter().enumerate() {
        let limite = pl.debut + SEMAINE_MIN;
        let total: i64 = p[i..]
            .iter()
            .take_while(|x| x.debut < limite)
            .map(|x| x.fin.min(limite) - x.debut)
            .sum();
        if total > SEMAINE_MAX_MIN {
            alertes.push(Alerte::SemaineTropLongue {
                depuis: i,
                total_min: total,
            });
        }
    }
    alertes
}

#[cfg(test)]
mod tests {
    use super::*;

    const H: i64 = 60;
    const J: i64 = 24 * 60;

    #[test]
    fn rien_a_signaler() {
        let p = vec![
            Plage {
                debut: 8 * H,
                fin: 16 * H,
            },
            Plage {
                debut: J + 8 * H,
                fin: J + 16 * H,
            },
        ];
        assert!(verifier(&p).is_empty());
    }

    #[test]
    fn repos_insuffisant() {
        let p = vec![
            Plage {
                debut: 14 * H,
                fin: 22 * H,
            },
            Plage {
                debut: J + 6 * H,
                fin: J + 14 * H,
            },
        ];
        assert_eq!(
            verifier(&p),
            vec![Alerte::ReposInsuffisant {
                entre: 0,
                repos_min: 8 * H
            }]
        );
    }

    #[test]
    fn journee_trop_longue() {
        let p = vec![Plage {
            debut: 6 * H,
            fin: 17 * H,
        }];
        assert_eq!(
            verifier(&p),
            vec![Alerte::JourneeTropLongue {
                plage: 0,
                duree_min: 11 * H
            }]
        );
    }

    #[test]
    fn semaine_trop_longue() {
        // 6 jours de 9 h = 54 h
        let p: Vec<Plage> = (0..6)
            .map(|d| Plage {
                debut: d * J + 8 * H,
                fin: d * J + 17 * H,
            })
            .collect();
        let a = verifier(&p);
        assert!(a.contains(&Alerte::SemaineTropLongue {
            depuis: 0,
            total_min: 54 * H
        }));
    }

    #[test]
    fn plages_non_triees_acceptees() {
        let p = vec![
            Plage {
                debut: J + 8 * H,
                fin: J + 16 * H,
            },
            Plage {
                debut: 8 * H,
                fin: 16 * H,
            },
        ];
        assert!(verifier(&p).is_empty());
    }
}
