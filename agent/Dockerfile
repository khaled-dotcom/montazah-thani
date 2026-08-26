FROM python:3.11-slim

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

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# موديل الـ embeddings (~2.2GB) بيتخزن في volume مش جوه الـ image — عشان
# الـ image يفضل صغير، والموديل ينزل مرة واحدة ويعيش عبر إعادة البناء.
ENV EMBEDDING_CACHE_DIR=/app/.embedding_cache

RUN mkdir -p /app/static/uploads/tickets /app/.embedding_cache

# non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 4500

# warm-embeddings بيحمّل الموديل قبل ما السيرفر يبدأ يستقبل، فأول مواطن
# يبعت رسالة ما يستناش التحميل.
CMD ["sh", "-c", "flask init-db && flask warm-embeddings && exec gunicorn -w 2 --threads 4 --timeout 120 -b 0.0.0.0:4500 --access-logfile - --error-logfile - app:app"]
