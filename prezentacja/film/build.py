# Składa film z klatek screencastu i lektora: python3 build.py <katalog_klatek> <wyjście.mp4>
# - czas klatek z timestampów → 30 fps CFR, okno cut-start/cut-end (czekanie na AI) wycięte,
# - segmenty lektora (audio/<scena>.wav) wstawione w momentach znaczników „scene”, głośność −16 LUFS.
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
tl = json.load(open(os.path.join(src, "timeline.json")))
frames, marks = tl["frames"], tl["marks"]
t0 = next(m["t"] for m in marks if m["type"] == "start")
t_end = next(m["t"] for m in marks if m["type"] == "end")
cuts, cs = [], None
for m in marks:
    if m["type"] == "cut-start": cs = m["t"]
    if m["type"] == "cut-end" and cs is not None: cuts.append((cs + 0.12, m["t"] - 0.12)); cs = None

def out_time(t):  # czas nagrania → czas w filmie
    return (t - t0) - sum(max(0, min(t, b) - a) for a, b in cuts)

keep = lambda t: not any(a < t < b for a, b in cuts)
fs = [f for f in frames if t0 - 0.05 <= f["t"] <= t_end and keep(f["t"])]
lines, total = [], 0.0
for i, f in enumerate(fs):
    nxt = fs[i + 1]["t"] if i + 1 < len(fs) else t_end
    d = max(out_time(nxt) - out_time(max(f["t"], t0)), 1 / 60)
    total += d
    lines.append(f"file '{os.path.join(src, f['file'])}'\nduration {d:.4f}")
lines.append(f"file '{os.path.join(src, fs[-1]['file'])}'")
lst = os.path.join(src, "concat.txt")
open(lst, "w").write("\n".join(lines) + "\n")
print(f"klatek: {len(fs)}, cięć: {len(cuts)}, długość: {total:.1f} s")

video = os.path.join(src, "video.mp4")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst,
                "-vf", "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p",
                "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-tune", "film", "-t", f"{total:.3f}", video], check=True)

# lektor
scenes = [m for m in marks if m["type"] == "scene"]
inputs, filt = [], []
for i, m in enumerate(scenes):
    inputs += ["-i", os.path.join(HERE, "audio", f"{m['label']}.wav")]
    ms = int(round(out_time(m["t"]) * 1000))
    filt.append(f"[{i + 1}:a]adelay={ms}|{ms}[a{i}]")
    print(f"  {m['label']:4} od {ms / 1000:6.2f} s")
mix = "".join(f"[a{i}]" for i in range(len(scenes)))
filt.append(f"{mix}amix=inputs={len(scenes)}:normalize=0:dropout_transition=0,"
            f"loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=0:{total:.3f}[aout]")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", video, *inputs, "-filter_complex", ";".join(filt),
                "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                "-movflags", "+faststart", out], check=True)
os.remove(video)
print("zapisano", out)
