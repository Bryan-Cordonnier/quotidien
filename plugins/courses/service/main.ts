// Page `serviceEntry` de Courses : aucune interface. Le moteur la charge le temps d'UN appel, puis la détruit : les données sont lues dans les
// réglages du plugin et réécrites en entier quand elles changent.
import { connect, ServiceError } from "@etabli/sdk";
import { executer, FONCTIONS } from "../src/service";
import { ErreurCourses } from "../src/types";

const etabli = await connect<unknown>();

etabli.services.handle(
  "courses",
  Object.fromEntries(
    Object.keys(FONCTIONS).map((fonction) => [
      fonction,
      async (args: unknown) => {
        try {
          const r = executer(etabli.settings.data, { ...etabli.parameters.values }, fonction, args);
          if (r.donnees) etabli.settings.update(r.donnees);
          return r.valeur;
        } catch (e) {
          if (e instanceof ErreurCourses) throw new ServiceError(e.code === "illisible" ? "erreur" : e.code, e.message);
          throw e;
        }
      },
    ]),
  ),
);
