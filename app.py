import subprocess, threading, signal
from flask import Flask, request, jsonify, render_template_string

app = Flask(__name__)

process = None
logs = []
status = "Idle"

HTML = """
<!DOCTYPE html>
<html>
<head>
<title>BintuNet</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { background:#111; color:#fff; font-family:sans-serif; padding:20px }
input, select, button { width:100%; padding:12px; margin:8px 0; border-radius:8px; border:none }
button { background:#0a84ff; color:white; font-size:18px }
.stop { background:#ff453a }
.log { background:#000; height:220px; overflow:auto; padding:10px; font-size:12px }
.status { font-weight:bold; margin:10px 0 }
</style>
</head>
<body>

<h2>BintuNet – Simple Live Controller</h2>

<input id="tiktok" placeholder="TikTok Live URL">
<input id="yt" placeholder="YouTube RTMP URL">
<input id="fb" placeholder="Facebook RTMP URL (optional)">

<select id="fps">
  <option value="15">15 FPS</option>
  <option value="25">25 FPS</option>
  <option value="30">30 FPS</option>
</select>

<button onclick="start()">▶ START STREAM</button>
<button class="stop" onclick="stop()">⏹ STOP</button>

<div class="status" id="status">Status: Idle</div>
<div class="log" id="log"></div>

<script>
function start(){
  fetch("/start", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      tiktok: document.getElementById("tiktok").value,
      yt: document.getElementById("yt").value,
      fb: document.getElementById("fb").value,
      fps: document.getElementById("fps").value
    })
  });
}

function stop(){
  fetch("/stop", {method:"POST"});
}

setInterval(()=>{
  fetch("/logs")
    .then(r=>r.json())
    .then(d=>{
      document.getElementById("log").innerText = d.logs.join("\\n");
      document.getElementById("status").innerText = "Status: " + d.status;
    });
}, 1000);
</script>

</body>
</html>
"""

def reader(pipe):
    for line in iter(pipe.readline, b""):
        logs.append(line.decode(errors="ignore").strip())
    pipe.close()

@app.route("/")
def index():
    return render_template_string(HTML)

@app.route("/start", methods=["POST"])
def start_stream():
    global process, status, logs
    data = request.json
    logs.clear()

    tiktok = data["tiktok"]
    yt = data["yt"]
    fb = data.get("fb", "")
    fps = data["fps"]

    outputs = f"[f=flv]{yt}"
    if fb:
        outputs += f"|[f=flv]{fb}"

    cmd = f"""
streamlink \
--http-header "User-Agent=Mozilla/5.0 (Linux; Android 10)" \
--http-header "Referer=https://www.tiktok.com/" \
-O {tiktok} hd | ffmpeg \
-re \
-i pipe:0 \
-map 0:v:0 \
-map 0:a:0 \
-c:v libx264 \
-preset ultrafast \
-tune zerolatency \
-r {fps} \
-b:v 1200k \
-maxrate 1200k \
-bufsize 2400k \
-g 30 \
-pix_fmt yuv420p \
-c:a aac \
-b:a 128k \
-ar 44100 \
-ac 2 \
-af "aresample=async=1:first_pts=0" \
-f tee "{outputs}"
"""

    process = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    threading.Thread(target=reader, args=(process.stderr,), daemon=True).start()
    status = "Streaming"
    return jsonify(ok=True)

@app.route("/stop", methods=["POST"])
def stop_stream():
    global process, status
    if process:
        process.send_signal(signal.SIGTERM)
        process = None
    status = "Stopped"
    return jsonify(ok=True)

@app.route("/logs")
def get_logs():
    return jsonify(logs=logs[-300:], status=status)

if __name__ == "__main__":
    app.run("127.0.0.1", 5000)def start():
    global process, status, muted
    data = request.json
    muted = False
    logs.clear()

    tiktok = data["tiktok"]
    yt = data["yt"]
    fb = data.get("fb", "")
    fps = data["fps"]

    if data["ratio"] == "mobile":
        scale = "scale=720:-2,pad=720:1280:(ow-iw)/2:(oh-ih)/2"
    else:
        scale = "scale=1280:-2,pad=1280:720:(ow-iw)/2:(oh-ih)/2"

    outputs = f"[f=flv]{yt}"
    if fb:
        outputs += f"|[f=flv]{fb}"

    cmd = f"""
streamlink \
--http-header "User-Agent=Mozilla/5.0 (Linux; Android 10)" \
--http-header "Referer=https://www.tiktok.com/" \
-O {tiktok} best | \
ffmpeg -re -i pipe:0 \
-map 0:v:0 -map 0:a:0 \
-vf "{scale}" \
-r {fps} \
-c:v libx264 -preset ultrafast -tune zerolatency \
-pix_fmt yuv420p \
-c:a aac -b:a 128k -ar 44100 -ac 2 \
-af "aresample=async=1:first_pts=0" \
-f tee "{outputs}"
"""

    process = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        preexec_fn=os.setsid
    )

    threading.Thread(target=reader, args=(process.stderr,), daemon=True).start()
    status = "Streaming"
    return jsonify(ok=True)

@app.route("/mute", methods=["POST"])
def mute():
    global muted
    if not process:
        return jsonify(ok=False)
    muted = not muted
    os.killpg(os.getpgid(process.pid), signal.SIGUSR1)
    return jsonify(muted=muted)

@app.route("/stop", methods=["POST"])
def stop():
    global process, status
    if process:
        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        process = None
    status = "Stopped"
    return jsonify(ok=True)

@app.route("/logs")
def get_logs():
    return jsonify(logs=logs[-200:], status=status)

if __name__ == "__main__":
    app.run("127.0.0.1", 5000)
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
