# CareSync - Patient Care SaaS

แพลตฟอร์มบริหารจัดการศูนย์ดูแลผู้สูงอายุแบบ multi-tenant พร้อม Caregiver Portal, Family Portal และ Alert Center

## Tech Stack

- Next.js 16 + React 19 + Tailwind CSS 4
- Prisma 7 + PostgreSQL
- Better Auth
- Stripe subscription billing

## Quick Start

### 1. Install dependencies

```bash
cd patient-care-ui
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

ตั้งค่า `DATABASE_URL` และ `BETTER_AUTH_SECRET` ใน `.env`

### 3. Set up database

```bash
npm run db:migrate
```

สำหรับ Neon แนะนำให้ตั้ง `DATABASE_URL_UNPOOLED` เป็น direct connection สำหรับ migration

### 4. Run dev server

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

## App Routes

| Route | Description |
| --- | --- |
| `/` | Landing page |
| `/login`, `/signup` | Authentication |
| `/onboarding` | สร้าง workspace ใหม่ |
| `/dashboard` | Redirect ไป org dashboard |
| `/{orgId}/dashboard` | Workspace dashboard |
| `/{orgId}/caregiver` | บันทึกสัญญาณชีพ ยา และ Pain Map |
| `/{orgId}/family` | Family portal |
| `/{orgId}/alert` | Alert center + AI risk |

## API Routes

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/patients?orgId=` | GET | รายชื่อผู้สูงอายุพร้อมสถานะ |
| `/api/vitals?orgId=&patientId=` | GET | ประวัติสัญญาณชีพ |
| `/api/vitals` | POST | บันทึกสัญญาณชีพและสร้าง alert อัตโนมัติ |

## Scripts

```bash
npm run dev
npm run build
npm run db:migrate
npm run db:migrate:deploy
npm run db:setup
```

## Security

- Middleware ป้องกัน routes ที่ต้อง login
- API routes ตรวจสอบ session และ org membership
- สัญญาณชีพผิดปกติสร้าง alert อัตโนมัติ

## LINE LIFF Setup

Set these values in `.env`:

```bash
NEXT_PUBLIC_LINE_LIFF_ID=""
LINE_CHANNEL_SECRET=""
LINE_CHANNEL_ACCESS_TOKEN=""
```

In LINE Developers Console:

- Set the LIFF endpoint URL to `https://your-domain.com/liff`.
- Set the Messaging API webhook URL to `https://your-domain.com/api/line/webhook`.
- For local testing, expose the dev server with a HTTPS tunnel such as ngrok and use the tunnel URL.
