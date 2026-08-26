#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════
#  يبني ريبو الـ Space ويدفعه لـ Hugging Face.
#
#  الـ Space لازم يبقى ريبو لوحده على HF، والـ agent/ عايش جوّه ريبو
#  الموقع — فالسكربت ده بيجمّع نسخة نضيفة في مجلد مؤقت (كود المساعد +
#  الـ Dockerfile وكارت الـ Space اللي جنبه) ويدفعها. مفيش submodules ولا
#  ريبو تاني بيتسجّل في الشجرة دي.
#
#  الاستعمال:
#      HF_TOKEN=hf_xxx ./deploy/huggingface/deploy.sh <owner>/<space-name>
#
#  التوكن لازم يكون write. اعمله من:
#      https://huggingface.co/settings/tokens
# ══════════════════════════════════════════════════════════════════════════
set -euo pipefail

SPACE="${1:-}"
if [[ -z "$SPACE" || "$SPACE" != */* ]]; then
  echo "usage: HF_TOKEN=hf_xxx $0 <owner>/<space-name>" >&2
  exit 2
fi
if [[ -z "${HF_TOKEN:-}" ]]; then
  echo "HF_TOKEN is not set. Create a write token at https://huggingface.co/settings/tokens" >&2
  exit 2
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
AGENT="$ROOT/agent"

[[ -f "$AGENT/app.py" ]] || { echo "agent/app.py not found under $ROOT" >&2; exit 1; }

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "▸ staging the assistant into $STAGE"

# نفس استثناءات agent/.dockerignore. لقطات الـ docs (3.9MB) والأسرار
# والكاش مالهمش لزمة على الـ Space، والـ .env لو اتدفع بالغلط بيبقى
# مفتاح Groq منشور للعالم.
tar -C "$AGENT" -cf - \
  --exclude='.git' \
  --exclude='.gitignore' \
  --exclude='.env' \
  --exclude='.env.example' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='*.pyo' \
  --exclude='venv' \
  --exclude='myenv' \
  --exclude='instance' \
  --exclude='static/uploads' \
  --exclude='docs' \
  --exclude='*.log' \
  --exclude='*.db' \
  --exclude='*.sqlite3' \
  --exclude='docker-compose.yml' \
  --exclude='Dockerfile' \
  . | tar -C "$STAGE" -xf -

# البطاقات بتتكتب هنا وقت التشغيل؛ الطبقة لازم تبقى موجودة في الصورة.
mkdir -p "$STAGE/static/uploads/tickets"
touch "$STAGE/static/uploads/tickets/.gitkeep"

cp "$HERE/Dockerfile" "$STAGE/Dockerfile"
cp "$HERE/README.md"  "$STAGE/README.md"

cat > "$STAGE/.gitattributes" <<'ATTRS'
*.png filter=lfs diff=lfs merge=lfs -text
*.ttf filter=lfs diff=lfs merge=lfs -text
ATTRS

cd "$STAGE"
git init -q
git checkout -q -b main
git config user.email "noreply@montazah-thani.local"
git config user.name  "montazah-thani deploy"
git add -A
git commit -q -m "Deploy citizen-service assistant"

echo "▸ pushing to https://huggingface.co/spaces/$SPACE"
# التوكن بيتحط في الـ URL بتاع الـ push بس — عمره ما بيتكتب في config
# باقي بعد ما المجلد المؤقت يتمسح.
git push -q --force "https://user:${HF_TOKEN}@huggingface.co/spaces/${SPACE}.git" main

echo "✓ pushed. Build log: https://huggingface.co/spaces/${SPACE}?logs=build"
echo
echo "Next, if you have not already, set these under Settings → Variables and secrets:"
echo "  secrets  : SECRET_KEY, SQLALCHEMY_DATABASE_URI, GROQ_API_KEY, AGENT_TOKEN"
echo "  variables: ALLOWED_ORIGINS, EMBEDDING_MODEL, SECURE_COOKIES, ORG_NAME, ORG_SHORT"
