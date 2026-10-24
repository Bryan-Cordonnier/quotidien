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
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

/**
 * Présence pour Max (le cerveau de Bryan) : écran allumé ou éteint, activité (voiture, vélo, à pied, immobile) et position
 * approximative, envoyés directement au cerveau par Tailscale. Rien ne part tant que Bryan n'a pas ouvert le lien d'activation
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

  /** Relevé périodique : état de l'écran, puis position approximative si permise, puis envoi. */
  fun releve(c: Context, fin: () -> Unit) {
    val ecran = (c.getSystemService(Context.POWER_SERVICE) as PowerManager).isInteractive
    prefs(c).edit().putBoolean("ecran", ecran).apply()
    if (!permis(c, Manifest.permission.ACCESS_COARSE_LOCATION)) {
      envoyer(c, fin)
      return
    }
    try {
      LocationServices.getFusedLocationProviderClient(c).getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, null)
        .addOnCompleteListener { t ->
          if (t.isSuccessful) t.result?.let { prefs(c).edit().putString("lat", it.latitude.toString()).putString("lon", it.longitude.toString()).apply() }
          envoyer(c, fin)
        }
    } catch (_: Exception) {
      envoyer(c, fin)
    }
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

  /** Envoie tout l'état connu (un envoi raté est rattrapé par le suivant), hors du fil principal. */
  private fun envoyer(c: Context, fin: () -> Unit) {
    if (!actif(c)) return fin()
    val p = prefs(c)
    val etat = JSONObject().put("screen_on", p.getBoolean("ecran", true))
    p.getString("activite", null)?.let { etat.put("activity", it) }
    val lat = p.getString("lat", null)?.toDoubleOrNull()
    val lon = p.getString("lon", null)?.toDoubleOrNull()
    if (lat != null && lon != null) etat.put("lat", lat).put("lon", lon)
    val corps = JSONObject().put("jsonrpc", "2.0").put("id", 1).put("method", "tools/call")
      .put("params", JSONObject().put("name", "presence_set").put("arguments", etat)).toString()
    Thread {
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
    val demandes = mutableListOf(Manifest.permission.ACCESS_COARSE_LOCATION)
    if (Build.VERSION.SDK_INT >= 29) demandes += Manifest.permission.ACTIVITY_RECOGNITION
    requestPermissions(demandes.toTypedArray(), 1)
  }

  override fun onRequestPermissionsResult(code: Int, permissions: Array<out String>, resultats: IntArray) {
    super.onRequestPermissionsResult(code, permissions, resultats)
    val position = checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    if (code == 1 && position && Build.VERSION.SDK_INT >= 29 &&
      checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED
    ) {
      // Android ouvre ici la page « Autoriser tout le temps » : sans elle, la position ne part pas écran éteint
      Toast.makeText(this, "Choisis « Autoriser tout le temps » pour que la position marche en arrière-plan.", Toast.LENGTH_LONG).show()
      requestPermissions(arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION), 2)
      return
    }
    Presence.demarrer(this)
    Toast.makeText(this, "Présence pour Max activée.", Toast.LENGTH_LONG).show()
    finish()
  }
}
