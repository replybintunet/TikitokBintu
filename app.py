import subprocess, threading, signal, os
from flask import Flask, request, jsonify, render_template_string

app = Flask(__name__)

process = None
logs = []
status = "Idle"
muted = False
last_config = None

HTML = """
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BintuNet</title>
<style>
body{background:#0f0f0f;color:#fff;font-family:sans-serif;padding:15px}
input,select,button{width:100%;padding:12px;margin:6px 0;border-radius:8px;border:none}
button{font-size:16px}
.start{background:#00c853}
.stop{background:#d50000}
.mute{background:#ffab00;color:#000}
.status{margin:10px 0;font-weight:bold}
.log{background:#000;height:220px;overflow:auto;padding:10px;font-size:12px}
</style>
</head>
<body>

<h2>🎥 BintuNet Live Controller</h2>

<input id="tiktok" placeholder="TikTok Live URL">
<input id="yt" placeholder="YouTube RTMP URL">
<input id="fb" placeholder="Facebook RTMP URL (optional)">

<select id="ratio">
  <option value="mobile">YouTube Mobile (9:16)</option>
  <option value="desktop">YouTube Desktop (16:9)</option>
</select>

<select id="fps">
  <option value="20">20 FPS</option>
  <option value="25">25 FPS</option>
  <option value="30">30 FPS</option>
</select>

<button class="start" onclick="start()">▶ START</button>
<button class="mute" onclick="mute()">🔇 MUTE / UNMUTE</button>
<button class="stop" onclick="stop()">⏹ STOP</button>

<div class="status" id="status">Status: Idle</div>
<div class="log" id="log"></div>

<script>
function start(){
 fetch('/start',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    tiktok:tiktok.value,
    yt:yt.value,
    fb:fb.value,
    ratio:ratio.value,
    fps:fps.value
  })
 })
}
function stop(){fetch('/stop',{method:'POST'})}
function mute(){fetch('/mute',{method:'POST'})}

setInterval(()=>{
 fetch('/logs').then(r=>r.json()).then(d=>{
  log.innerText=d.logs.join("\\n");
  status.innerText="Status: "+d.status;
 })
},1000)
</script>

</body>
</html>
"""

def log_reader(pipe):
    for line in iter(pipe.readline, b''):
        logs.append(line.decode(errors="ignore").strip())
    pipe.close()

def start_stream(config, mute_audio=False):
    global process, status

    tiktok = config["tiktok"]
    yt = config["yt"]
    fb = config.get("fb","")
    fps = config["fps"]

    if config["ratio"] == "mobile":
        vf = "scale=720:-2,pad=720:1280:(ow-iw)/2:(oh-ih)/2"
    else:
        vf = "scale=1280:-2,pad=1280:720:(ow-iw)/2:(oh-ih)/2"

    audio = "-an" if mute_audio else "-c:a aac -b:a 128k -ar 44100 -ac 2"

    outputs = f"[f=flv]{yt}"
    if fb:
        outputs += f"|[f=flv]{fb}"

    cmd = f"""
streamlink \
--http-header "User-Agent=Mozilla/5.0 (Linux; Android 10)" \
--http-header "Referer=https://www.tiktok.com/" \
-O {tiktok} best | \
ffmpeg -re -i pipe:0 \
-map 0:v:0 -map 0:a? \
-vf "{vf}" \
-r {fps} \
-c:v libx264 -preset ultrafast -tune zerolatency \
-pix_fmt yuv420p \
{audio} \
-af "aresample=async=1:first_pts=0" \
-f tee "{outputs}"
"""

    process = subprocess.Popen(
        cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    threading.Thread(target=log_reader, args=(process.stderr,), daemon=True).start()
    status = "Streaming"

@app.route("/")
def index():
    return render_template_string(HTML)

@app.route("/start", methods=["POST"])
def start():
    global last_config, muted
    last_config = request.json
    muted = False
    start_stream(last_config, mute_audio=False)
    return jsonify(ok=True)

@app.route("/mute", methods=["POST"])
def mute():
    global muted, process
    if not last_config:
        return jsonify(ok=False)

    if process:
        process.send_signal(signal.SIGTERM)

    muted = not muted
    start_stream(last_config, mute_audio=muted)
    return jsonify(muted=muted)

@app.route("/stop", methods=["POST"])
def stop():
    global process, status
    if process:
        process.send_signal(signal.SIGTERM)
        process = None
    status = "Stopped"
    return jsonify(ok=True)

@app.route("/logs")
def get_logs():
    return jsonify(logs=logs[-200:], status=status)

if __name__ == "__main__":
    app.run("127.0.0.1", 5000)
