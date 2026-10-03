import { REGLAGES_DEFAUT, type Donnees, type Mission, type Rdv, type Reserve } from './types';

const CLE = 'budget-planning-v1';

function vide(): Donnees {
  return { version: 1, missions: [], reserves: [], rdvs: [], reglages: { ...REGLAGES_DEFAUT } };
}

function charger(): Donnees {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return vide();
    const d = JSON.parse(brut) as Donnees;
    if (d.version !== 1) return vide();
    return { ...vide(), ...d, reglages: { ...REGLAGES_DEFAUT, ...d.reglages } };
  } catch {
    return vide();
  }
}

export function nouvelId(): string {
  return crypto.randomUUID();
}

class Store {
  donnees = $state<Donnees>(charger());

  sauver() {
    try {
      localStorage.setItem(CLE, JSON.stringify(this.donnees));
    } catch {
      /* stockage indisponible : l'app reste utilisable sans persistance */
    }
  }

  ajouterMission(m: Mission) {
    this.donnees.missions.push(m);
    this.sauver();
  }
  supprimerMission(id: string) {
    this.donnees.missions = this.donnees.missions.filter((m) => m.id !== id);
    this.sauver();
  }
  ajouterReserve(r: Reserve) {
    this.donnees.reserves.push(r);
    this.sauver();
  }
  supprimerReserve(id: string) {
    this.donnees.reserves = this.donnees.reserves.filter((r) => r.id !== id);
    this.sauver();
  }
  ajouterRdv(r: Rdv) {
    this.donnees.rdvs.push(r);
    this.sauver();
  }
  supprimerRdv(id: string) {
    this.donnees.rdvs = this.donnees.rdvs.filter((r) => r.id !== id);
    this.sauver();
  }
  /** Ajoute ou retire des minutes sup pour un jour d'une mission. */
  ajusterSup(missionId: string, date: string, minutes: number) {
    const m = this.donnees.missions.find((x) => x.id === missionId);
    if (!m) return;
    if (minutes > 0) m.ajustementsSup[date] = minutes;
    else delete m.ajustementsSup[date];
    this.sauver();
  }
  /** Marque un jour d'une mission comme absent (ou le remet). */
  basculerAbsence(missionId: string, date: string) {
    const m = this.donnees.missions.find((x) => x.id === missionId);
    if (!m) return;
    m.exclusions = m.exclusions.includes(date) ? m.exclusions.filter((d) => d !== date) : [...m.exclusions, date];
    this.sauver();
  }
}

export const store = new Store();
