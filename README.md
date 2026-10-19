# Job Finder (Canada)

A personal job-hunting app that runs on your Mac:

- **Find jobs**: searches LinkedIn, Indeed, Glassdoor and company career sites (through JSearch), **Job Bank**, Adzuna and remote boards in one go. It also links to GC Jobs, provincial public service sites and municipal job sites.
- **Screens out old postings**: a "posted within" filter, age stamps on every job, hidden expired or undated jobs, repost detection, and a "Check if still open" button.
- **Asks what level you're applying for** (Internship → Director+), filters out jobs that don't fit, and flags stretch roles.
- **Tailors your resume** to each job's keywords without inventing anything, and exports ATS-friendly **DOCX and PDF** files.
- **Writes cover letters** in a Canadian business format.
- **Interview prep**: 20–80 likely questions for the role (behavioural, technical, situational and company questions, plus questions to ask them), each with a model answer built from your resume.

## Setup

1. Install dependencies (Node.js 22+):
   ```bash
   npm install
   ```
2. Create your keys file:
   ```bash
   cp .env.local.example .env.local
   ```
   Then fill in:
   - `ANTHROPIC_API_KEY`: from <https://console.anthropic.com/settings/keys>. It powers resume reading, tailoring, cover letters and interview prep.
   - `RAPIDAPI_KEY`: sign up at <https://rapidapi.com>, then subscribe to the free **JSearch** plan. This adds LinkedIn, Indeed and Glassdoor results.
   - Optional: `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` from <https://developer.adzuna.com>.

   Without keys the app still runs. Job Bank and Remotive search work, and the AI features return clearly labelled sample text.
3. Start it:
   ```bash
   npm run dev
   ```
   Then open <http://localhost:3000>.

## Using it

1. **My resume**: upload your resume (PDF/DOCX) or paste it, check the details, and choose the level you're applying for.
2. **Find jobs**: search and save the jobs you like. Use the government sites panel for GC Jobs and provincial postings.
3. Open a job to **tailor your resume**, **write a cover letter** and **generate interview questions**. Download DOCX or PDF.
4. Found a job somewhere else? Use **Saved jobs → Paste a job**.

## Notes

- Your data stays on your computer in `data/jobfinder.db`.
- Job Bank has no public API, so the app reads its public search pages at a polite rate for personal use. You can turn it off in the Sources filter.
- Search results are cached for 6 hours to save your JSearch quota (about 200 requests a month on the free plan).
- The AI is told never to invent experience. Keywords you don't have are listed under "Left out" rather than added.

## Development

```bash
npm test          # unit tests (sources, freshness, level detection, exports)
npm run typecheck
npm run lint
```
