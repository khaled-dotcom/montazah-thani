# تشغيل المساعد على جهاز إنت مالكه

الموقع نفسه على Vercel وقاعدته على Neon — الاتنين مبيحتاجوش الجهاز ده.
اللي هنا هو **المساعد** بس: فتح الشكاوى وتوجيهها، حجز المواعيد وطباعة
البطاقة، والرد من قاعدة المعرفة المتولّدة من محتوى الموقع.

الملف ده بيشتغل زي ما هو على لابتوب في البيت أو على VM في السحابة. الفرق
الوحيد إن اللابتوب لازم يكون شغّال وصاحي.

## ليه Tailscale Funnel ومش فتح بورت في الراوتر

الموقع على Vercel لازم يوصل للمساعد من الإنترنت، والمساعد على جهاز
ورا NAT من غير IP ثابت. الحلول التقليدية — port forwarding + DNS
ديناميكي + شهادة — تلاتة حاجات تقع كل واحدة لوحدها.

Funnel بيدّي:

- عنوان عام ثابت `https://<TS_HOSTNAME>.<tailnet>.ts.net`
- شهادة HTTPS حقيقية (Let's Encrypt) بتتجدّد لوحدها
- **من غير أي بورت مفتوح على الجهاز** — الاتصال بيتعمل من جوّه لبرّه

وده مهم على لابتوب بيتنقل: مفيش بورت مكشوف على شبكة الكافيه.

## قبل ما تبدأ

- Docker شغّال
- ~6GB على القرص (صورة ~2GB + موديل 2.2GB + بوستجرس)
- ~4GB RAM فاضية وقت التشغيل
- مفتاح Tailscale: <https://login.tailscale.com/admin/settings/keys>
  خلّيه **Reusable**، و**Ephemeral = لأ** (عشان الهوية تعيش بعد إعادة التشغيل)

## التشغيل

```bash
cp .env.example .env      # املأه — الأسرار موجودة في .env بتاع المشروع
docker compose up -d --build
```

أول تشغيل بطيء: بينزّل موديل الـ embeddings (~2.2GB). بيتخزن في volume،
فاللي بعده بيبقى ثواني.

هات العنوان العام:

```bash
docker compose exec tunnel tailscale status --json | grep -i certdomain
```

ادخّل قاعدة المعرفة (من غيرها بيرد "معنديش المعلومة دي" على كل حاجة):

```bash
# على جهاز التطوير
npm run knowledge:export
# هنا
docker compose exec agent flask import-site-knowledge
```

الأمر ده بيطبع `district_id` — حطه في `AGENT_DISTRICT_ID` على Vercel،
وإلا المساعد هيسأل كل مواطن هو بيكتب من أنهي حي.

اعمل حساب موظف للداشبورد:

```bash
docker compose exec agent flask create-admin
```

## اربط الموقع بيه

على Vercel (production):

| | |
|---|---|
| `AGENT_URL` | `https://<TS_CERT_DOMAIN>` |
| `AGENT_TOKEN` | نفس اللي في `.env` هنا بالحرف |
| `AGENT_DISTRICT_ID` | اللي `import-site-knowledge` طبعه |

```bash
npx vercel deploy --prod
curl https://montazah-thani.vercel.app/api/health   # assistant.reachable = true
```

## اتأكد إن الـ proxy مظبوط

```bash
curl -H "Authorization: Bearer $AGENT_TOKEN" https://<TS_CERT_DOMAIN>/whoami
```

- `scheme` لازم `https` — لو `http` يبقى كل POST في الداشبورد هيرجع 403
- `client` لازم يبقى IP المواطن مش عنوان داخلي — لو داخلي، زوّد `TRUST_PROXY`

## لما الجهاز ينام

الشات بيرجع يجاوب من فهرس الموقع نفسه. اللي بيقف: فتح الشكاوى وحجز
المواعيد **من الشات**. اللي بيفضل شغّال: الموقع كله، فورم حجز المواعيد،
فورم التواصل، والداشبورد — كلهم على Vercel وNeon.

`restart: always` معناها إن الخدمات بترجع لوحدها لما Docker يقوم تاني.

## النقل لـ VM بعدين

انقل `agent/` جنب الملف ده، غيّر `build: ../../agent` لـ `build: ./agent`،
انقل `.env`، و`docker compose up -d --build`. العنوان بيفضل هو هو لو
نقلت الـ volume بتاع `tailscale-state`، وإلا اعمل مفتاح جديد وحدّث
`AGENT_URL`.
