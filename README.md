# Job Finder (Canada)

A personal job-hunting app for iPhone, Android and desktop, modelled on swipe-to-apply apps like Sprout:

- **Discover**: swipe through fresh Canadian jobs. Right means interested, left means skip. Jobs come from LinkedIn, Indeed, Glassdoor and company sites (through JSearch), plus **Job Bank**, Adzuna and remote boards.
- **A few quick questions**: after you swipe right, the app asks about skills the job wants that your resume doesn't mention yet. Your answers are used as real facts, and nothing is made up.
- **One-tap prepare**: a tailored, ATS-friendly resume and a cover letter (DOCX and PDF) for that job.
- **Applications tracker**: Interested → Ready → Applied → Interviewing → Offer. "Open application" takes you to the employer's page with your documents ready, and one tap marks it as applied.
- **Interview prep**: 20–80 likely questions for the role, each with a model answer built from your resume.
- **Screens out old postings** and **asks your job level** (Internship → Director+). Also links to GC Jobs and provincial and municipal job sites.

> Unlike Sprout, Job Finder doesn't submit applications for you. LinkedIn, Indeed and most employer sites forbid automated applications, and they can ban accounts for it. Instead, it gets you to the application page with everything ready.

## Run it on your computer

```bash
npm install
cp .env.local.example .env.local   # then add your keys (see below)
npm run dev                         # open http://localhost:3000
```

## Keys

| Variable | Where to get it | Needed for |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | <https://console.anthropic.com> → Settings → API Keys (add a little credit under Billing) | Resume reading, tailoring, cover letters, interview prep |
| `RAPIDAPI_KEY` | <https://rapidapi.com> → search **JSearch** → subscribe to the free Basic plan → copy `X-RapidAPI-Key` | LinkedIn, Indeed and Glassdoor jobs |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | <https://developer.adzuna.com> (optional) | More Canadian listings |
| `APP_PASSWORD` | Make one up | Protects the hosted app. Leave it empty when running locally |
| `SESSION_SECRET` | Any long random string, e.g. `openssl rand -hex 32` | Signs your login cookie |

Without the AI or JSearch keys the app still runs. Job Bank and Remotive search work, and the AI features return clearly labelled sample text.

## Host it on Railway (so it works on your phone)

1. Sign in at <https://railway.com> with GitHub. The Hobby plan is about $5/month.
2. **New Project → Deploy from GitHub repo →** pick `job-finder`. Railway builds it using `railway.json`.
3. In the service, open **Settings → Volumes → Add volume**, mounted at `/data`. This keeps your resume, jobs and documents between deploys.
4. Under **Variables**, add `JOBFINDER_DB=/data/jobfinder.db`, `APP_PASSWORD`, `SESSION_SECRET`, `ANTHROPIC_API_KEY` and `RAPIDAPI_KEY`.
5. Under **Settings → Networking**, click **Generate Domain**. Open that URL and sign in with your password.

Every push to `main` redeploys automatically.

## Install on your phone

- **iPhone (Safari)**: open your Railway URL, tap **Share → Add to Home Screen**.
- **Android (Chrome)**: open the URL, then tap **Install app** (or **⋮ → Add to Home screen**).

It opens full-screen with its own icon, like a regular app.

## Development

```bash
npm test          # unit tests (sources, freshness, level, questions, auth, exports)
npm run typecheck
npm run lint
npm run build
```
