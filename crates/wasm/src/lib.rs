//! Pont WebAssembly : expose le cœur de calcul à l'interface via JSON.
//!
//! Chaque fonction prend et renvoie une chaîne JSON. Une entrée invalide renvoie
//! `{"erreur": "..."}` plutôt que de lever une exception.

use budget_core::{horaires, paie, repos};
use serde::{de::DeserializeOwned, Serialize};
use wasm_bindgen::prelude::*;

fn appliquer<E: DeserializeOwned, S: Serialize>(json: &str, f: impl FnOnce(&E) -> S) -> String {
    match serde_json::from_str::<E>(json) {
        Ok(entree) => serde_json::to_string(&f(&entree)).unwrap_or_else(|e| erreur(&e.to_string())),
        Err(e) => erreur(&e.to_string()),
    }
}

fn erreur(message: &str) -> String {
    serde_json::json!({ "erreur": message }).to_string()
}

#[wasm_bindgen]
pub fn calculer_interim(json: &str) -> String {
    appliquer(json, paie::calculer_interim)
}

#[wasm_bindgen]
pub fn calculer_reserve(json: &str) -> String {
    appliquer(json, paie::calculer_reserve)
}

#[wasm_bindgen]
pub fn calculer_horaires(json: &str) -> String {
    appliquer(json, horaires::calculer_horaires)
}

#[wasm_bindgen]
pub fn verifier_repos(json: &str) -> String {
    match serde_json::from_str::<Vec<repos::Plage>>(json) {
        Ok(plages) => serde_json::to_string(&repos::verifier(&plages))
            .unwrap_or_else(|e| erreur(&e.to_string())),
        Err(e) => erreur(&e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn horaires_via_json() {
        let json = r#"{"debut_min":480,"marge_arrivee_min":10,"trajet_min":30,"mise_en_route_min":10,
            "preparation_min":45,"sommeil_min":480,"endormissement_min":15}"#;
        let v: serde_json::Value = serde_json::from_str(&calculer_horaires(json)).unwrap();
        assert_eq!(v["decision_partir_min"], 430);
        assert_eq!(v["pre_alerte_min"], 425);
    }

    #[test]
    fn entree_invalide() {
        let v: serde_json::Value = serde_json::from_str(&calculer_interim("{}")).unwrap();
        assert!(v["erreur"].is_string());
    }

    #[test]
    fn interim_via_json() {
        let json = r#"{"taux_cents":1300,"taux_sup_cents":1625,"semaines":[{"jours":[
            {"debut_min":480,"fin_min":960,"pause_min":60}]}]}"#;
        let v: serde_json::Value = serde_json::from_str(&calculer_interim(json)).unwrap();
        assert_eq!(v["minutes_normales"], 420);
        assert_eq!(v["brut_base_cents"], 9100);
    }
}
