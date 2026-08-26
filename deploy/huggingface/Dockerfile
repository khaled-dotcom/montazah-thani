# ══════════════════════════════════════════════════════════════════════════
#  الصورة اللي بتشتغل على Hugging Face Spaces.
#
#  فرقها عن agent/Dockerfile حاجتين:
#
#  1. البورت 7860 — ده اللي Spaces بيوجّه الترافيك عليه.
#  2. موديل الـ embeddings متخزّن جوّه الصورة، مش بيتنزّل عند التشغيل.
#     في compose الموديل بيعيش في volume وبينزل مرة واحدة؛ على Spaces مفيش
#     قرص باقي في الخطة المجانية، يعني كل إعادة تشغيل هتنزّل 2.2GB تاني
#     والمواطن مستني. تنزيله وقت البناء بيخلي الإقلاع ثواني.
# ══════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

# Spaces بيشغّل الكونتينر بمستخدم uid 1000، فبنعمله من دلوقتي ونملّك
# /app ليه — أي حاجة الكود بيكتبها (البطاقات، كاش الموديل) لازم تبقى ليه.
RUN useradd -m -u 1000 appuser

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    # خط عربي لبطاقة الموعد. DejaVu شايل صيغ العرض العربية اللي
    # arabic_reshaper بيولّدها — من غيره البطاقة بتطلع مربعات.
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

ENV EMBEDDING_CACHE_DIR=/app/.embedding_cache \
    HOME=/app \
    PYTHONUNBUFFERED=1 \
    PORT=7860

RUN mkdir -p /app/static/uploads/tickets /app/.embedding_cache \
    && chown -R appuser:appuser /app

USER appuser

# نزّل الموديل وقت البناء. لازم يبقى نفس اللي EMBEDDING_MODEL هيتظبط عليه
# وقت التشغيل — لو اختلفوا، الكونتينر هينزّل التاني عند أول رسالة وهي
# بالظبط الحاجة اللي بنتجنبها. غيّرهم مع بعض.
ARG EMBEDDING_MODEL=intfloat/multilingual-e5-large
ENV EMBEDDING_MODEL=${EMBEDDING_MODEL}
RUN python -c "\
from fastembed import TextEmbedding; \
import os; \
TextEmbedding(model_name=os.environ['EMBEDDING_MODEL'], cache_dir=os.environ['EMBEDDING_CACHE_DIR']); \
print('baked', os.environ['EMBEDDING_MODEL'])"

EXPOSE 7860

# init-db بيعمل الجداول وامتداد pgvector لو لسه مش موجودين، فأول إقلاع على
# قاعدة فاضية بيظبط نفسه. warm-embeddings بيحمّل الموديل من القرص للذاكرة
# قبل ما gunicorn يبدأ يستقبل.
CMD ["sh", "-c", "flask init-db && flask warm-embeddings && exec gunicorn -w 2 --threads 4 --timeout 120 -b 0.0.0.0:7860 --access-logfile - --error-logfile - app:app"]
