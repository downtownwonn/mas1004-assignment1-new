"""기존 증거를 보고서 폴더에 복사하고 가벼운 검증만 수행한다."""
from pathlib import Path
import csv
import io
import json
import hashlib
import shutil
import subprocess
import re
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / "long_report"
FIG = REPORT / "figures"
OUT = REPORT / "outputs"
FIG.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def protected():
    return {str(p.relative_to(ROOT)): digest(p) for folder in ("src", "short_report")
            for p in (ROOT / folder).rglob("*") if p.is_file() and "__pycache__" not in p.parts}

before = protected()
status = subprocess.run(["git", "status", "--short"], cwd=ROOT, capture_output=True).stdout.decode("utf-8")
(OUT / "initial_git_status.txt").write_text(status, encoding="utf-8")
(OUT / "protected_hashes.json").write_text(json.dumps(before, ensure_ascii=False, indent=2), encoding="utf-8")
manifest = []
for tag in ("run", "scratch", "frozen", "lr3e4", "clean"):
    for suffix in ("curves.png", "confusion.png"):
        src = ROOT / "results" / f"{tag}_{suffix}"
        shutil.copy2(src, FIG / src.name)
        manifest.append((str(src.relative_to(ROOT)), f"figures/{src.name}", digest(src)))
for name in ("clean_worst.png", "P2_preprocessing.png"):
    src = ROOT / "results" / name
    shutil.copy2(src, FIG / name)
    manifest.append((str(src.relative_to(ROOT)), f"figures/{name}", digest(src)))
for src in sorted((ROOT / "results/P5_experiments").glob("*.png")):
    dest = FIG / ("p7_" + src.name)
    shutil.copy2(src, dest)
    manifest.append((str(src.relative_to(ROOT)), "figures/" + dest.name, digest(src)))

def read_text(p):
    b = p.read_bytes()
    if b.startswith((b"\xff\xfe", b"\xfe\xff")):
        return b.decode("utf-16")
    try:
        return b.decode("utf-8-sig")
    except UnicodeDecodeError:
        return b.decode("cp949")

names = [f"{t}_output.txt" for t in ("run", "scratch", "frozen", "lr3e4", "clean")]
names += ["check.txt", "compare.txt", "overlap.txt", "clean_count.txt", "step13_inspection.txt"]
for name in names:
    src = ROOT / "results" / name
    text = read_text(src)
    (OUT / name).write_text(text, encoding="utf-8", newline="")
    assert (OUT / name).read_text(encoding="utf-8") == text.replace("\r\n", "\n")
    manifest.append((str(src.relative_to(ROOT)), "outputs/" + name, digest(src)))

from PIL import Image
examples = [
    ("data/removed/2000s_korean_album_covers/q22_0005.jpg", "junk_collage.jpg"),
    ("data/removed/1980s_1990s_korean_album_covers/q03_0022.jpg", "junk_package.jpg"),
    ("data/removed/1980s_1990s_korean_album_covers/q19_0022.jpg", "junk_angle.jpg"),
    ("data/new_images/2010s_korean_album_covers/2013.webp", "new_2013.png"),
    ("data/new_images/2010s_korean_album_covers/2012'.webp", "new_2012_prime.png"),
    ("data/new_images/1980s_1990s_korean_album_covers/1985.jpg", "new_1985.jpg"),
    ("data/new_images/2010s_korean_album_covers/2012.webp", "new_2012.png"),
    ("data/new_images/2010s_korean_album_covers/2014.webp", "new_2014.png"),
]
for path, name in examples:
    src = ROOT / path
    with Image.open(src) as im:
        im.load()
        if src.suffix == ".webp":
            im.convert("RGB").save(FIG / name)
        else:
            shutil.copy2(src, FIG / name)
    manifest.append((path, "figures/" + name, digest(src)))

rows = list(csv.DictReader(io.StringIO(read_text(ROOT / "data/removed/log.csv"))))
classes = ["1980s_1990s_korean_album_covers", "2000s_korean_album_covers", "2010s_korean_album_covers", "2020s_korean_album_covers"]
reasons = list(dict.fromkeys(r["reason"] for r in rows))
with (OUT / "removal_by_class.csv").open("w", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    w.writerow(["사유", *classes, "합계"])
    for reason in reasons:
        counts = [sum(r["reason"] == reason and r["class"] == c for r in rows) for c in classes]
        w.writerow([reason, *counts, sum(counts)])
suspect_text = read_text(ROOT / "results/cleaning/suspects/suspects.csv")
all_suspects = list(csv.DictReader(io.StringIO(suspect_text)))
suspects = [s for s in all_suspects if s['label'] != 'copy of']
pairs = [s for s in all_suspects if s['label'] == 'copy of']
removed = {r["file"] for r in rows}
audit = [f"삭제 로그 행 수: {len(rows)}", f"의심 이미지 행 수: {len(suspects)}", f"근접 복사 쌍 행 수: {len(pairs)}"]
for c in classes:
    count = sum(s["label"] == c and int(s["rank_in_class"]) <= 20 and s["file"] in removed for s in suspects)
    audit.append(f"{c}: 상위 20개 중 로그에 기록된 제외 {count}")
audit.append("로그 날짜별 행 수: " + str(dict(Counter(r["when"][:10] for r in rows))))
audit.append("첫 단계 기록: " + str(sum(r["when"] < "2026-10-12T22:22" for r in rows)))

import sys
sys.path.insert(0, str(ROOT))
import numpy as np
from torchvision import transforms
from src.data import prepare_image, MEAN, STD, RESIZE, CROP
source = ROOT / "data/clean/1980s_1990s_korean_album_covers/1985.jpg"
with Image.open(source) as im:
    original_size = im.size
    resized = transforms.Resize(RESIZE, interpolation=transforms.InterpolationMode.BILINEAR)(im.convert("RGB"))
    crop = transforms.CenterCrop(CROP)(resized)
    recovered = np.rint((prepare_image(im).transpose(1, 2, 0) * np.array(STD) + np.array(MEAN)) * 255).clip(0, 255).astype(np.uint8)
    equal = np.array_equal(recovered, np.asarray(crop))
    assert equal
    audit += [f"P2 원본: {source.relative_to(ROOT)}", f"원본 크기: {original_size}", f"확대 크기: {resized.size}", f"RGB 자르기 크기: {crop.size}", f"정규화 역변환 RGB 픽셀 완전 일치: {equal}"]
with Image.open(FIG / "P2_preprocessing.png") as im:
    im.verify()
audit.append("기존 P2 비교 PNG 읽기 검증: 통과 (기존 그림 재생성 없음)")
meta = json.loads((ROOT / "docs/model.json").read_text(encoding="utf-8"))
selftest = json.loads((ROOT / "docs/selftest.json").read_text(encoding="utf-8"))
audit += [f"웹 클래스 수: {len(meta['labels'])}", f"웹 자체검사 사례 수: {len(selftest['cases'])}", f"ONNX 파일 바이트: {(ROOT / 'docs/model.onnx').stat().st_size}"]
assert before == protected()
audit.append("소스 및 짧은 보고서 SHA256 변경 없음: 통과")
gap_lines = []
for tag in ('run', 'scratch', 'frozen', 'lr3e4', 'clean'):
    text = read_text(ROOT / f'results/{tag}_output.txt')
    train = float(re.search(r'^train accuracy ([\d.]+)%', text, re.M)[1])
    test = float(re.search(r'^test  accuracy ([\d.]+)%', text, re.M)[1])
    gap_lines.append(f'{tag}: 훈련 {train:.1f}% - 테스트 {test:.1f}% = {train-test:.1f} 퍼센트포인트')
gap_lines.extend(['scratch - run: 50.8% - 46.8% = 4.0 퍼센트포인트', 'run - frozen: 46.8% - 43.7% = 3.1 퍼센트포인트', 'lr3e4 - run: 54.0% - 46.8% = 7.2 퍼센트포인트'])
(OUT / 'accuracy_gaps.txt').write_text('\n'.join(gap_lines) + '\n', encoding='utf-8')
(OUT / "asset_audit.txt").write_text("\n".join(audit) + "\n", encoding="utf-8")
with (OUT / "asset_manifest.csv").open("w", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    w.writerow(["원본", "보고서용 복사본", "원본 SHA256"])
    w.writerows(manifest)
print("\n".join(audit))
print("ASSET_PREPARATION_SUCCESS")