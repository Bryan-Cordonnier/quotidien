package __PACKAGE__

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.os.SystemClock
import android.widget.Toast
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.provider.Settings
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

/**
 * Présence pour Max (le cerveau de Bryan) : activité (voiture, vélo, à pied, immobile) et événements d'utilisation qu'Android
 * enregistre déjà (écran, déverrouillages, appli au premier plan), envoyés directement au cerveau par Tailscale. Rien ne part tant que Bryan n'a pas ouvert le lien d'activation
 * (`quotidien-presence://activer?url=…&jeton=…`) ; `quotidien-presence://couper` arrête tout. Le cerveau ne garde que le dernier état.
 */
object Presence {
  private const val TOP = "quotidien.presence.TOP"
  private const val ACTIVITE = "quotidien.presence.ACTIVITE"

  fun prefs(c: Context) = c.getSharedPreferences("quotidien_presence", Context.MODE_PRIVATE)

  fun actif(c: Context): Boolean = prefs(c).getBoolean("actif", false) && !prefs(c).getString("jeton", "").isNullOrEmpty()

  private fun permis(c: Context, p: String) = c.checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED

  private fun intention(c: Context, action: String, mutable: Boolean): PendingIntent =
    PendingIntent.getBroadcast(
      c, action.hashCode(), Intent(c, PresenceRecepteur::class.java).setAction(action),
      PendingIntent.FLAG_UPDATE_CURRENT or (if (mutable) PendingIntent.FLAG_MUTABLE else PendingIntent.FLAG_IMMUTABLE),
    )

  /** Programme le relevé toutes les 15 min (inexact : Android regroupe les réveils, économe en batterie) et l'écoute de l'activité. */
  fun demarrer(c: Context) {
    if (!actif(c)) return
    val alarmes = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmes.setInexactRepeating(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + 60_000, AlarmManager.INTERVAL_FIFTEEN_MINUTES, intention(c, TOP, false))
    if (Build.VERSION.SDK_INT < 29 || permis(c, Manifest.permission.ACTIVITY_RECOGNITION)) {
      val types = listOf(DetectedActivity.IN_VEHICLE, DetectedActivity.ON_BICYCLE, DetectedActivity.WALKING, DetectedActivity.RUNNING, DetectedActivity.STILL)
      val transitions = types.map { ActivityTransition.Builder().setActivityType(it).setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER).build() }
      try {
        ActivityRecognition.getClient(c).requestActivityTransitionUpdates(ActivityTransitionRequest(transitions), intention(c, ACTIVITE, true))
      } catch (_: SecurityException) {}
    }
  }

  fun arreter(c: Context) {
    (c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(intention(c, TOP, false))
    try {
      ActivityRecognition.getClient(c).removeActivityTransitionUpdates(intention(c, ACTIVITE, true))
    } catch (_: SecurityException) {}
    prefs(c).edit().putBoolean("actif", false).apply()
  }

  /** L'accès aux statistiques d'utilisation (celles de Bien-être numérique) est donné à la main dans les réglages. */
  fun accesUtilisation(c: Context): Boolean {
    val ops = c.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    return ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), c.packageName) == AppOpsManager.MODE_ALLOWED
  }

  /** Les événements qu'Android a déjà enregistrés depuis le dernier envoi : écran, déverrouillages, appli au premier plan. */
  private fun evenements(c: Context, depuis: Long, jusqua: Long): JSONArray {
    val sortie = JSONArray()
    if (!accesUtilisation(c)) return sortie
    val stats = c.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val evs = stats.queryEvents(depuis, jusqua)
    val e = UsageEvents.Event()
    val noms = HashMap<String, String>()
    while (evs.hasNextEvent() && sortie.length() < 2000) {
      evs.getNextEvent(e)
      val genre = when (e.eventType) {
        UsageEvents.Event.SCREEN_INTERACTIVE -> "ecran_on"
        UsageEvents.Event.SCREEN_NON_INTERACTIVE -> "ecran_off"
        UsageEvents.Event.KEYGUARD_HIDDEN -> "deverrouillage"
        UsageEvents.Event.ACTIVITY_RESUMED -> "appli"
        else -> null
      } ?: continue
      val o = JSONObject().put("t", e.timeStamp).put("type", genre)
      if (genre == "appli") {
        val nom = noms.getOrPut(e.packageName) {
          try {
            c.packageManager.getApplicationLabel(c.packageManager.getApplicationInfo(e.packageName, 0)).toString()
          } catch (_: Exception) {
            e.packageName
          }
        }
        o.put("app", nom)
      }
      sortie.put(o)
    }
    return sortie
  }

  /** Relevé périodique : on lit ce qu'Android a noté depuis le dernier envoi, puis on l'envoie. */
  fun releve(c: Context, fin: () -> Unit) {
    val ecran = (c.getSystemService(Context.POWER_SERVICE) as PowerManager).isInteractive
    prefs(c).edit().putBoolean("ecran", ecran).apply()
    envoyer(c, fin)
  }

  fun activite(c: Context, intent: Intent, fin: () -> Unit) {
    val dernier = ActivityTransitionResult.extractResult(intent)?.transitionEvents?.lastOrNull()
    val nom = when (dernier?.activityType) {
      DetectedActivity.IN_VEHICLE -> "voiture"
      DetectedActivity.ON_BICYCLE -> "velo"
      DetectedActivity.WALKING, DetectedActivity.RUNNING -> "a_pied"
      DetectedActivity.STILL -> "immobile"
      else -> null
    }
    if (nom == null) return fin()
    prefs(c).edit().putString("activite", nom).apply()
    envoyer(c, fin)
  }

  /** Envoie l'état et les événements depuis le dernier envoi réussi (un envoi raté est rattrapé par le suivant), hors du fil principal. */
  private fun envoyer(c: Context, fin: () -> Unit) {
    if (!actif(c)) return fin()
    val p = prefs(c)
    val maintenant = System.currentTimeMillis()
    // au plus 24 h en arrière la première fois ; le cerveau ignore les doublons
    val depuis = maxOf(p.getLong("envoye_jusqua", 0L), maintenant - 86_400_000L)
    Thread {
      val etat = JSONObject().put("screen_on", p.getBoolean("ecran", true))
      p.getString("activite", null)?.let { etat.put("activity", it) }
      val evs = try {
        evenements(c, depuis, maintenant)
      } catch (_: Exception) {
        JSONArray()
      }
      if (evs.length() > 0) etat.put("events", evs)
      val corps = JSONObject().put("jsonrpc", "2.0").put("id", 1).put("method", "tools/call")
        .put("params", JSONObject().put("name", "presence_set").put("arguments", etat)).toString()
      try {
        val cx = URL(p.getString("url", "")).openConnection() as HttpURLConnection
        cx.requestMethod = "POST"
        cx.connectTimeout = 15_000
        cx.readTimeout = 15_000
        cx.doOutput = true
        cx.setRequestProperty("Authorization", "Bearer ${p.getString("jeton", "")}")
        cx.setRequestProperty("Content-Type", "application/json")
        cx.setRequestProperty("Accept", "application/json, text/event-stream")
        cx.outputStream.use { it.write(corps.toByteArray()) }
        cx.inputStream.use { it.readBytes() }
        cx.disconnect()
        p.edit().putLong("envoye_jusqua", maintenant).apply()
      } catch (_: Exception) {
        // cerveau injoignable (Tailscale coupé…) : le prochain relevé renverra l'état complet
      } finally {
        fin()
      }
    }.start()
  }
}

/** Réveils internes (relevé, activité) : non exporté, personne d'autre ne peut injecter un faux état. */
class PresenceRecepteur : BroadcastReceiver() {
  override fun onReceive(c: Context, intent: Intent) {
    val attente = goAsync()
    val fin = { attente.finish() }
    when (intent.action) {
      "quotidien.presence.TOP" -> Presence.releve(c, fin)
      "quotidien.presence.ACTIVITE" -> Presence.activite(c, intent, fin)
      else -> fin()
    }
  }
}

/** Après un redémarrage ou une mise à jour de l'application, les réveils sont reprogrammés. */
class PresenceDemarrage : BroadcastReceiver() {
  override fun onReceive(c: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) Presence.demarrer(c)
  }
}

/** Lien d'activation : enregistre l'adresse du cerveau et le jeton, demande les autorisations, démarre. Sans interface. */
class PresenceReglage : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val lien: Uri? = intent?.data
    if (lien?.host == "couper") {
      Presence.arreter(this)
      Toast.makeText(this, "Présence pour Max coupée.", Toast.LENGTH_LONG).show()
      finish()
      return
    }
    val url = lien?.getQueryParameter("url").orEmpty()
    val jeton = lien?.getQueryParameter("jeton").orEmpty()
    val hote = Uri.parse(url).host.orEmpty()
    // le cerveau n'est joignable que par Tailscale : on refuse toute autre adresse
    if (lien?.host != "activer" || !url.startsWith("https://") || !hote.endsWith(".ts.net") || !jeton.matches(Regex("cv_[A-Za-z0-9_-]{16,}"))) {
      Toast.makeText(this, "Lien d'activation invalide.", Toast.LENGTH_LONG).show()
      finish()
      return
    }
    Presence.prefs(this).edit().putString("url", url).putString("jeton", jeton).putBoolean("actif", true).apply()
    if (Build.VERSION.SDK_INT >= 29) requestPermissions(arrayOf(Manifest.permission.ACTIVITY_RECOGNITION), 1) else terminer()
  }

  override fun onRequestPermissionsResult(code: Int, permissions: Array<out String>, resultats: IntArray) {
    super.onRequestPermissionsResult(code, permissions, resultats)
    terminer()
  }

  private fun terminer() {
    Presence.demarrer(this)
    if (!Presence.accesUtilisation(this)) {
      // pas de fenêtre d'autorisation pour ça : Android n'offre que la page des réglages, où il faut activer Quotidien
      Toast.makeText(this, "Active « Quotidien » dans « Accès aux données d'utilisation ».", Toast.LENGTH_LONG).show()
      startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    } else {
      Toast.makeText(this, "Présence pour Max activée.", Toast.LENGTH_LONG).show()
    }
    finish()
  }
}
