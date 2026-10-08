// Mise en forme des dates de la page Courses (français : « 09/10 »).
import { decomposer, type Jour } from "@etabli/ui/civil";

const pad = (n: number): string => String(n).padStart(2, "0");

/** « 09/10 » */
export function jourMois(j: Jour): string {
  const { mois, jour } = decomposer(j);
  return `${pad(jour)}/${pad(mois)}`;
}