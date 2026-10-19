# Job Finder (Canada)

A personal job-hunting app for iPhone, Android and desktop, modelled on swipe-to-apply apps like Sprout, and built for **every career path**: skilled trades, healthcare, education, hospitality and retail, transportation, government, office, creative and tech.

- **Discover**: swipe through fresh Canadian jobs. Right means interested, left means skip. Jobs come from LinkedIn, Indeed, Glassdoor and company sites (through JSearch), plus **Job Bank**, Adzuna and remote boards.
- **A few quick questions**: after you swipe right, the app asks about skills the job wants that your resume doesn't mention yet. Your answers are used as real facts, and nothing is made up.
- **Automatic application kit**: from each job description, the app builds an ATS-friendly tailored resume, a cover letter and interview questions with model answers, in the background while you keep swiping. In Settings (on My resume), choose whether a right swipe asks the quick questions first or builds the kit straight away. Pasted jobs build their kit automatically too.
- **Licences first when they matter**: for trades, healthcare, driving and similar roles, required tickets, licences and registrations (Red Seal, AZ, RPN, Smart Serve…) move to the top of the resume.
- **Applications tracker**: Interested → Ready → Applied → Interviewing → Offer. "Open application" takes you to the employer's page with your documents ready, and one tap marks it as applied. If you can't finish (site error, account needed, posting closed), mark it **Couldn't apply** with the reason, and it stays in To do with a **Try again** button.
- **Daily new-job alerts**: a push notification once a day at the time you choose, listing jobs from your search that you haven't seen yet. Works on Android, and on iPhone once the app is added to the Home Screen (iOS 16.4+).
- **First-run setup**: a short welcome flow covering your resume, level and location, first search, swipe preference and alerts.
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

Daily alerts are sent by the running server, so leave Railway's **App Sleeping** (serverless) setting **off**. Push keys are created automatically and stored in the database. To manage them yourself, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (a `mailto:` address).

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
