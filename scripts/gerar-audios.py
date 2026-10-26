"""Gera os áudios do XinXon com vozes offline (sherpa-onnx).

zh: matcha-icefall-zh-baker (+ vocos) · pt-BR: piper faber (CC0)
Saída: <app>/public/audio/{zh,pt}/<id>.mp3 e <app>/src/content/audio.json
"""
import hashlib, json, os, re, shutil, subprocess, sys, tempfile, unicodedata

import sherpa_onnx
import soundfile as sf

APP = '/home/claude/xinxon'
TTS = '/home/claude/tts'
texts = json.load(open(f'{TTS}/texts.json'))

# ---------- léxico: acrescenta palavras do conteúdo que faltam, com o pinyin certo ----------
MARKS = {}
for base, chars in {'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'v': 'ǖǘǚǜ'}.items():
    for t, c in enumerate(chars, 1):
        MARKS[c] = (base, t)


def syllables(pinyin: str):
    """'Zhōngguó rén' -> ['zhong1', 'guo2', 'ren2'] (neutro sem número)."""
    p = pinyin.lower().replace('ü', 'v').replace("'", ' ')
    p = re.sub(r'[^a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜv ]', ' ', p)
    out = []
    for word in p.split():
        # separa sílabas: cada sílaba tem uma vogal-núcleo; usa um regex de sílabas do pinyin
        for syl in re.findall(r"(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[aeiouvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(?:ng|n(?![aeiouvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])|r(?![aeiouvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]))?", word):
            tone = 0
            plain = ''
            for ch in syl:
                if ch in MARKS:
                    b, tone = MARKS[ch]
                    plain += b
                else:
                    plain += ch
            out.append(plain + (str(tone) if tone else ''))
    return out


def sandhi(syls):
    s = list(syls)
    for i in range(len(s) - 1):
        if s[i].endswith('3') and s[i + 1].endswith('3'):
            s[i] = s[i][:-1] + '2'
    return s


src_model = f'{TTS}/matcha-icefall-zh-baker'
model_dir = f'{TTS}/zh-model'
if os.path.exists(model_dir):
    shutil.rmtree(model_dir)
shutil.copytree(src_model, model_dir)
lex_path = f'{model_dir}/lexicon.txt'
known = {}
for line in open(lex_path, encoding='utf8'):
    parts = line.split()
    if parts:
        known.setdefault(parts[0], parts[1:])
tokens = {l.split()[0] for l in open(f'{model_dir}/tokens.txt', encoding='utf8') if l.strip()}
added = []
for item in texts['zh']:
    t, py = item['text'], item['pinyin']
    if not py or len(t) < 2 or not re.fullmatch(r'[一-鿿]+', t) or t in known:
        continue
    syls = sandhi(syllables(py))
    if len(syls) != len(t) or any(s not in tokens for s in syls):
        print('  (ignorado no léxico)', t, py, syls)
        continue
    added.append((t, syls))
with open(lex_path, 'a', encoding='utf8') as f:
    for t, syls in added:
        f.write(f"{t} {' '.join(syls)}\n")
with open(f'{model_dir}/dict/user.dict.utf8', 'a', encoding='utf8') as f:
    for t, _ in added:
        f.write(f'{t} 100000 n\n')
print('léxico +', ', '.join(f"{t}={' '.join(s)}" for t, s in added))

# ---------- vozes ----------
zh_tts = sherpa_onnx.OfflineTts(
    sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            matcha=sherpa_onnx.OfflineTtsMatchaModelConfig(
                acoustic_model=f'{model_dir}/model-steps-3.onnx',
                vocoder=f'{TTS}/vocos-22khz-univ.onnx',
                lexicon=lex_path,
                tokens=f'{model_dir}/tokens.txt',
                dict_dir=f'{model_dir}/dict',
            ),
            num_threads=4,
        ),
        rule_fsts=f'{model_dir}/phone.fst,{model_dir}/date.fst,{model_dir}/number.fst',
    )
)
pt_dir = f'{TTS}/vits-piper-pt_BR-faber-medium'


class PiperPt:
    """Voz pt-BR via Piper (a frente de fonemas do sherpa não vem com espeak)."""

    def to_wav(self, text, wav_path, speed=1.0):
        subprocess.run(
            [sys.executable, '-m', 'piper', '-m', f'{pt_dir}/pt_BR-faber-medium.onnx', '-f', wav_path, '--length-scale', str(round(1 / speed, 2))],
            input=text.encode('utf8'), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )


pt_tts = PiperPt()


def file_id(text: str) -> str:
    return hashlib.sha1(unicodedata.normalize('NFC', text).encode('utf8')).hexdigest()[:12]


def synth(tts, text, out_mp3, speed=1.0, pad=0.12):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        if isinstance(tts, PiperPt):
            tts.to_wav(text, tmp.name, speed)
        else:
            audio = tts.generate(text, sid=0, speed=speed)
            sf.write(tmp.name, audio.samples, audio.sample_rate)
        subprocess.run(
            ['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-af', f'adelay={int(pad*1000)},apad=pad_dur={pad},loudnorm=I=-16:TP=-1.5',
             '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '48k', out_mp3],
            check=True,
        )
        os.unlink(tmp.name)


manifest = {'zh': {}, 'pt': {}}
for lang in ('zh', 'pt'):
    os.makedirs(f'{APP}/public/audio/{lang}', exist_ok=True)

for item in texts['zh']:
    t = item['text']
    fid = file_id(t)
    out = f'{APP}/public/audio/zh/{fid}.mp3'
    # Palavras soltas um pouco mais devagar, para quem está começando.
    speed = 0.85 if len(t) <= 3 else 0.9
    if not os.path.exists(out):
        synth(zh_tts, t, out, speed=speed)
    manifest['zh'][t] = fid

for p in texts['pt']:
    clean = re.sub(r'\((a|s|as|os)\)', '', p)
    clean = re.sub(r'[.!?]+$', '', clean).strip()
    prompt = f'Como se diz: {clean}?'
    fid = file_id(prompt)
    out = f'{APP}/public/audio/pt/{fid}.mp3'
    if not os.path.exists(out):
        synth(pt_tts, prompt, out, speed=1.05)
    manifest['pt'][prompt] = fid

json.dump(manifest, open(f'{APP}/src/content/audio.json', 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print('zh', len(manifest['zh']), 'pt', len(manifest['pt']))
