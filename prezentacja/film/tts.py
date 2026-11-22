# Generuje lektora (ElevenLabs) dla całej narracji jednym ciągiem i dzieli go na sceny (TEMPO=1.07 domyślnie).
# Klucz tylko ze zmiennej środowiskowej ELEVENLABS_API_KEY (nie zapisujemy go nigdzie).
# Użycie: ELEVENLABS_API_KEY=... python3 tts.py [katalog_wyjściowy]
import base64, json, os, subprocess, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "audio"))
os.makedirs(OUT, exist_ok=True)
cfg = json.load(open(os.path.join(HERE, "narracja.json")))
key = os.environ["ELEVENLABS_API_KEY"]

# tekst całości + pozycje znaków każdego fragmentu
text, spans = "", []          # spans: (scena, indeks fragmentu, start, koniec)
for si, sc in enumerate(cfg["scenes"]):
    if si: text += "\n\n"
    for ci, ch in enumerate(sc["chunks"]):
        if ci: text += " "
        spans.append((si, ci, len(text), len(text) + len(ch["tts"])))
        text += ch["tts"]

body = {"text": text, "model_id": cfg["model_id"], "language_code": "pl",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.25, "use_speaker_boost": True}}
req = urllib.request.Request(
    f"https://api.elevenlabs.io/v1/text-to-speech/{cfg['voice_id']}/with-timestamps?output_format=mp3_44100_128",
    data=json.dumps(body).encode(), headers={"xi-api-key": key, "content-type": "application/json"})
res = json.load(urllib.request.urlopen(req, timeout=300))
full = os.path.join(OUT, "full.mp3")
open(full, "wb").write(base64.b64decode(res["audio_base64"]))
al = res.get("normalized_alignment") or res["alignment"]
starts, ends = al["character_start_times_seconds"], al["character_end_times_seconds"]
if len(starts) != len(text):
    print(f"uwaga: długość alignmentu {len(starts)} ≠ tekstu {len(text)}", file=sys.stderr)
    al = res["alignment"]; starts, ends = al["character_start_times_seconds"], al["character_end_times_seconds"]

def t_start(i): return starts[min(i, len(starts) - 1)]
def t_end(i): return ends[min(i, len(ends) - 1)]

TEMPO = float(os.environ.get("TEMPO", "1.07"))   # lekkie przyspieszenie bez zmiany wysokości głosu
fast = os.path.join(OUT, "full.wav")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", full, "-af", f"atempo={TEMPO}", "-ar", "48000", fast], check=True)
starts = [x / TEMPO for x in starts]; ends = [x / TEMPO for x in ends]
full = fast
total = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", full]))
scenes = []
for si, sc in enumerate(cfg["scenes"]):
    sp = [s for s in spans if s[0] == si]
    a, b = t_start(sp[0][2]), t_end(sp[-1][3] - 1)
    scenes.append({"id": sc["id"], "speech_start": a, "speech_end": b,
                   "chunks": [{"t": t_start(s[2]), "sub": sc["chunks"][s[1]]["sub"]} for s in sp]})
# granice cięcia: środek pauzy między scenami
for i, s in enumerate(scenes):
    s["cut_start"] = 0.0 if i == 0 else (scenes[i - 1]["speech_end"] + s["speech_start"]) / 2
    s["cut_end"] = total if i == len(scenes) - 1 else (s["speech_end"] + scenes[i + 1]["speech_start"]) / 2
for s in scenes:
    lead = s["speech_start"] - s["cut_start"]                     # cisza przed mową w segmencie
    s["lead"] = round(lead, 3)
    s["dur"] = round(s["cut_end"] - s["cut_start"], 3)
    s["speech"] = round(s["speech_end"] - s["cut_start"], 3)       # koniec mowy względem startu segmentu
    for c in s["chunks"]: c["t"] = round(c["t"] - s["cut_start"], 3)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{s['cut_start']:.3f}", "-to", f"{s['cut_end']:.3f}",
                    "-i", full, "-c:a", "pcm_s16le", "-ar", "48000", os.path.join(OUT, f"{s['id']}.wav")], check=True)
json.dump({"total": total, "scenes": scenes}, open(os.path.join(OUT, "timings.json"), "w"), ensure_ascii=False, indent=1)
print(f"lektor: {total:.1f} s, scen: {len(scenes)}")
for s in scenes: print(f"  {s['id']:4} mowa {s['speech']:.1f} s (segment {s['dur']:.1f} s)")
