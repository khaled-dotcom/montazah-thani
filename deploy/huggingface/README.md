---
title: مساعد خدمة المواطن — حي المنتزه الثانية
emoji: 🏛️
colorFrom: blue
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
short_description: Citizen-service assistant for El Montazah II District, Alexandria
---

# مساعد خدمة المواطن — حي المنتزه الثانية

الخدمة دي بتشغّل مساعد خدمة المواطن بتاع
[موقع حي المنتزه الثانية](https://montazah-thani.vercel.app):
Flask + LangGraph فوق PostgreSQL/pgvector. بيفتح الشكاوى ويوجّهها للإدارة
المختصة، بيحجز المواعيد ويطلع بطاقة بالموعد، وبيرد على الأسئلة من قاعدة
معرفة متولّدة من محتوى الموقع نفسه.

**مش واجهة عامة.** الموقع هو اللي بيكلّمها من الخادم، و`/api/chat`
بيطلب `Authorization: Bearer <AGENT_TOKEN>` — من غيره بيرجّع 401.

## المتغيّرات المطلوبة (Settings → Variables and secrets)

| | |
|---|---|
| `SECRET_KEY` | secret — بيوقّع جلسات الداشبورد |
| `SQLALCHEMY_DATABASE_URI` | secret — Postgres مع pgvector |
| `GROQ_API_KEY` | secret — منه بيشتغل الفهم والرد |
| `AGENT_TOKEN` | secret — نفس القيمة المظبوطة على Vercel |
| `ALLOWED_ORIGINS` | variable — `https://montazah-thani.vercel.app` |
| `EMBEDDING_MODEL` | variable — لازم يساوي اللي اتخبز في الصورة |
| `SECURE_COOKIES` | variable — `1` |
| `ORG_NAME` / `ORG_SHORT` | variable |

## ملاحظة عن التخزين

الخطة المجانية مالهاش قرص باقي: بطاقات المواعيد في
`static/uploads/tickets/` بتروح مع كل إعادة تشغيل. رقم الموعد نفسه محفوظ
في Postgres وبيفضل صالح — البتاعة اللي بتضيع هي صورة البطاقة بس.
