"""보고서의 파일 참조·요청 원문·출력 보존·보호 파일을 검증한다."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / 'long_report'
OUT = REPORT / 'outputs'
tex = (REPORT / 'long_report.tex').read_text(encoding='utf-8')
checklist = (REPORT / 'requirements_checklist.tex').read_text(encoding='utf-8')
log = []
refs = re.findall(r'\{((?:figures|outputs)/[^{}]+)\}', tex)
refs += re.findall(r'\\input\{([^{}]+)\}', tex)
assert all((REPORT / ref).is_file() for ref in refs)
log.append(f'본문 파일 참조 {len(refs)}개 존재: 통과')
assert r'\fillin' not in tex
assert not re.search(r'threeclass|three.class|세\s*클래스|3분류', tex + checklist, re.I)
log.append('빈 fillin 및 제외 대상 실험 없음: 통과')
prompts = [
    '첫번째 사진 가리는거',
    '회색말고 흰색으로 가려주고, 검은 부분을 더 가려주라',
    '원형말고 네모낳게 가려주라',
    '자 이번엔 두번째 사진, 원이미지 비율 레이아웃 그대로 유지하면서 무채색으로만 바꿔줘',
    '이번엔 세번쨰 사진, 원이미지 비율 레이아웃 그대로 유지하면서 무채색으로만 바꿔줘',
    '네번쨰 사진, 원이미지 비율 레이아웃 그대로 유지하면서 정면으로만 바꿔줘',
    '이번엔 정면 흐뭇하게 웃는 얼굴로 바꿔줘 나머지는 원본 유지하면서',
    '이번엔 정면에 흐뭇하게 웃는 얼굴에 추가로 베레모를 벗겨줘',
    '이번엔 금속테 안경을 씌워줘',
    '이번엔 우측하단 김완선 글자를 두배크기로 키워줘',
]
assert all('“' + p + '”' in tex for p in prompts)
assert tex.count('“이번엔 금속테 안경을 씌워줘”') == 2
log.append('P7 제공된 요청 원문 및 안경 요청 두 호출 보존: 통과')
for t in (tex, checklist):
    braces = 0
    for token in re.findall(r'(?<!\\)[{}]', t):
        braces += 1 if token == '{' else -1
        assert braces >= 0
    assert braces == 0
    stack = []
    for env in re.finditer(r'\\(begin|end)\{([^{}]+)\}', t):
        if env[1] == 'begin':
            stack.append(env[2])
        else:
            assert stack.pop() == env[2], env[0]
    assert not stack
log.append('LaTeX 환경 시작/종료 대응: 통과')
from PIL import Image
for p in (REPORT / 'figures').iterdir():
    if p.suffix.lower() in ('.png', '.jpg'):
        with Image.open(p) as im:
            im.verify()
log.append('포함 이미지 읽기 검증: 통과')
before = json.loads((OUT / 'protected_hashes.json').read_text(encoding='utf-8'))
for relative, expected in before.items():
    actual = hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()
    assert actual == expected, relative
log.append('소스·짧은 보고서 보호 SHA256 동일: 통과')
for name in ['run_output.txt', 'scratch_output.txt', 'frozen_output.txt', 'lr3e4_output.txt', 'clean_output.txt', 'check.txt', 'compare.txt', 'overlap.txt', 'clean_count.txt']:
    b = (ROOT / 'results' / name).read_bytes()
    original = b.decode('utf-16') if b.startswith((b'\xff\xfe', b'\xfe\xff')) else b.decode('utf-8-sig')
    assert (OUT / name).read_text(encoding='utf-8') == original.replace('\r\n', '\n')
log.append('저장 출력 전체 텍스트 보존(인코딩/줄끝 제외): 통과')
assert checklist.count(r'\item') == 25
log.append('README Write this down 개별 항목 25개 대응표: 존재 (증거 부족은 부분 충족으로 표기)')
xe = shutil.which('xelatex')
if xe:
    for i in range(2):
        p = subprocess.run([xe, '-interaction=nonstopmode', '-halt-on-error', 'long_report.tex'], cwd=REPORT, capture_output=True)
        (OUT / f'xelatex_pass_{i+1}.txt').write_bytes(p.stdout + p.stderr)
        log.append(f'XeLaTeX {i+1}회 종료 코드: {p.returncode}')
        if p.returncode:
            break
else:
    log.append('XeLaTeX 실행 파일 없음: 컴파일 미실행, 설치하지 않음. Overleaf에서 XeLaTeX으로 컴파일 필요.')
log.append('이름·학번은 근거가 없어 제출자 확인 필요.')
status = subprocess.run(['git', 'status', '--short'], cwd=ROOT, capture_output=True).stdout.decode('utf-8')
(OUT / 'final_git_status.txt').write_text(status, encoding='utf-8')
(OUT / 'verification.txt').write_text('\n'.join(log) + '\n', encoding='utf-8')
print('\n'.join(log))
print('REPORT_STATIC_VERIFICATION_SUCCESS')