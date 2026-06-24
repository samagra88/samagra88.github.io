name: email-automation-hitl
description: Production-grade multi-agent email automation with human-in-the-loop review. Classify, validate, and respond to emails using CrewAI agents with intelligent LLM orchestration (Groq, Claude, Gemini fallbacks). Use when user wants to automate customer emails, build AI support systems, implement multi-agent workflows, or deploy intelligent routing with human oversight.

---

# Email Automation with Human-in-the-Loop (HITL)

**Multi-Agent Workflow Engine for Intelligent Email Processing**

Automate customer email handling using multi-agent AI reasoning with guaranteed human review. Features intelligent fallback routing between LLMs, production-grade database architecture, and real-time dashboard for human decision-making.

---

## Quick Reference

**HITL = Human-in-the-Loop** - AI suggests, humans approve. No emails sent without review.

**Key Insight:** Modern email automation isn't about removing humans—it's about augmenting them. Agents classify & draft, humans review & approve.

---

## Workflow

### Step 1: Gmail Ingestion & Queue Setup

**Fetch Unread Emails from Gmail:**
```bash
# Enable Gmail IMAP and generate App Password
# Add to .env:
GMAIL_USER=@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# Worker loop runs continuously, fetches UNSEEN emails every 60 seconds
python worker_loop.py
```

**Verify IMAP Connection:**
```bash
# Test Gmail IMAP access
python3 << 'EOF'
import imaplib
mail = imaplib.IMAP4_SSL("imap.gmail.com")
mail.login(os.getenv("GMAIL_USER"), os.getenv("GMAIL_APP_PASSWORD"))
mail.select("inbox")
_, messages = mail.search(None, "UNSEEN")
print(f"Unread emails: {len(messages[0].split())}")
mail.logout()
EOF
```

**Create Supabase Table:**
```sql
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  content TEXT,
  category TEXT,        -- Sales, Technical, Refund
  urgency INT,          -- 1-10 scale
  summary TEXT,
  ai_draft TEXT,        -- AI response for human review
  tone_score INT,
  accuracy_check BOOLEAN,
  policy_compliance TEXT,
  final_decision TEXT,
  status TEXT DEFAULT 'pending',  -- pending, Processing, Sent, Rejected
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### Step 2: Multi-Agent Reasoning Setup

**Define Agent Pipeline:**

```python
# crew_agent.py structure
classifier = Agent(
    role="Email Classifier",
    goal="Categorize and assess urgency",
    llm="groq/llama-3.1-8b-instant",  # Primary
)

fact_checker = Agent(
    role="Business Fact-Checker",
    goal="Verify against business FAQs",
    llm="groq/llama-3.1-8b-instant",
)

quality_scorer = Agent(
    role="Quality Assurance Specialist",
    goal="Evaluate tone, accuracy, compliance",
    llm="groq/llama-3.1-8b-instant",
)

email_crew = Crew(
    agents=[classifier, fact_checker, quality_scorer],
    tasks=[classification_task, fact_check_task, quality_task],
    verbose=True
)
```

**Define Output Schema:**

```python
class FinalReport(BaseModel):
    category: Literal["Refund", "Technical", "Sales"]
    urgency: int = Field(default=5)
    summary: str
    tone_score: int = Field(default=5)
    accuracy_check: bool = Field(default=False)
    policy_compliance: str = Field(default="No match")
    final_decision: Literal["Pass", "Fail"] = Field(default="Fail")
```

**Test Agents Locally:**

```bash
# Single email test
python crew_agent.py

# Check Render logs for agent execution
render logs email-automation-agent-1 --tail 100
```

---

### Step 3: LLM Orchestration & Fallback Strategy

**Configure Multi-LLM Router:**

| LLM | Use Case | Cost | Latency | Reliability |
|-----|----------|------|---------|-------------|
| **Groq (Primary)** | Fast classification | $0 free | 0.5-1s | 99.9% |
| **Claude (Secondary)** | Complex reasoning | $0.03-0.15 | 1.5-3s | 99% |
| **Gemini (Tertiary)** | Burst capacity | Free (20/day) | 1-2s | Limited |

**Set Environment Variables:**

```bash
# .env
GROQ_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=  # Optional fallback
```

**Test Fallback Logic:**

```python
# Simulate Groq failure, verify Claude takes over
# In crew_agent.py, temporarily set:
llm="groq/invalid-model"  # Will fail
# Check logs for error handling + fallback to Claude
```

**Monitor LLM Performance:**

```bash
# Check which LLM is being used per email
sqlite3 email_logs.db "SELECT email_id, llm_used, latency_ms FROM llm_calls ORDER BY created_at DESC LIMIT 10;"
```

---

### Step 4: Human-in-the-Loop Dashboard

**Launch Streamlit Dashboard:**

```bash
streamlit run dashboard.py
# Accessible at http://localhost:8501
```

**Dashboard Features:**

```
📊 Analytics Section:
  - AI Autonomy Rate (% auto-sent without human intervention)
  - Human Review Backlog (# pending emails)
  - Time Saved (calculated from auto-replies)

📝 Pending Action Items:
  - Display classified emails grouped by urgency
  - Show AI draft response
  - Human can: Edit → Approve & Send OR Reject

🔒 Validator Agent:
  - Scans edited drafts for sensitive data (API keys, passwords)
  - Blocks unsafe responses
  - Uses Groq/Claude for security scanning
```

**Key User Actions:**

```
1. View Email
   ↓
2. Review AI Classification (Category, Urgency, Summary)
   ↓
3. Review AI Draft Response
   ↓
4. Edit if needed (optional)
   ↓
5. Click "Approve & Send"
   ↓
6. Security Validator scans draft
   ↓
7. If SAFE → Send (update status='Sent')
   If UNSAFE → Block (ask to fix)
```

---

### Step 5: Production Deployment

**Build Docker Container:**

```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

# Start worker loop + dashboard
CMD ["sh", "-c", "python worker_loop.py & streamlit run dashboard.py"]
```

**Deploy to Render:**

```bash
# 1. Push to GitHub
git add .
git commit -m "Deploy email automation to production"
git push origin main

# 2. Create Render Web Service
#    - GitHub repo: samagra88/email-automation-agent-1
#    - Build command: (auto-detect Dockerfile)
#    - Start command: ./start.sh

# 3. Set Environment Variables in Render Dashboard
GROQ_API_KEY=xxx
ANTHROPIC_API_KEY=xxx
SUPABASE_URL=xxx
SUPABASE_KEY=xxx
GMAIL_USER=xxx
GMAIL_APP_PASSWORD=xxx

# 4. Deploy
# Render auto-builds Docker image, runs 24/7
```

**Verify Production Deployment:**

```bash


# Monitor logs in real-time
render logs your-service-name --tail 100 --follow

# Check Supabase for incoming emails
SELECT COUNT(*) FROM emails WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

### Step 6: Validation & Monitoring

**Check Email Processing Pipeline:**

```sql
-- Emails processed in last hour
SELECT status, COUNT(*) as count 
FROM emails 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- Emails taking longest to process
SELECT id, subject, 
  EXTRACT(EPOCH FROM (updated_at - created_at)) as processing_time_seconds
FROM emails
ORDER BY processing_time_seconds DESC
LIMIT 5;

-- AI quality metrics
SELECT AVG(tone_score) as avg_tone, 
  SUM(CASE WHEN accuracy_check THEN 1 ELSE 0 END)::float / COUNT(*) as accuracy_rate
FROM emails
WHERE final_decision = 'Pass';
```

**Monitor LLM Costs:**

```bash
# Track API calls per LLM
SELECT llm_provider, COUNT(*) as calls, 
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as cost_usd
FROM llm_calls
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY llm_provider
ORDER BY cost_usd DESC;

# Expected: Groq dominates (free tier), Claude backup
```

**Generate Production Report:**

```
## Email Automation System Report

### Processing Metrics (Last 30 Days)
- Total Emails Processed: X
- Auto-Approved (final_decision=Pass): Y (Z%)
- Pending Human Review: A
- Sent: B
- Rejected: C

### LLM Usage
- Groq Calls: X (primary)
- Claude Calls: Y (fallback triggered Z times)
- Gemini Calls: 0 (free tier limit)
- Total Cost: $X

### Quality Metrics
- Average Tone Score: 6.2/10
- Accuracy Rate: 89%
- Average Processing Time: 2.3s
- Zero Failures: ✅

### Recommendations
1. Tone scores trending down → review prompt engineering
2. Accuracy check passes rate increasing → model improving
3. No Gemini fallbacks triggered → Groq tier 1 strategy working
```

---

## Platform-Specific Considerations

### Email Provider Variations

**Gmail IMAP:**
- Mark-as-read strategy: After processing, mark UNSEEN → SEEN
- Fetch strategy: UNSEEN filter minimizes duplicates
- Rate limits: None, fully unlimited for personal accounts
- Recommended: Mark as read immediately after insert to Supabase

**Outlook/Microsoft 365 (Future):**
- Use Microsoft Graph API instead of IMAP
- OAuth2 required (more complex auth)
- Better rate limits documented
- Supports batching (multiple emails per request)

**Corporate Email:**
- May require VPN/SSL cert
- Rate limiting stricter
- RLS important (different orgs see different emails)

### LLM Provider Variations

**Groq (Primary Choice):**
- Inference: Ultra-fast (0.5s)
- Cost: Free tier 100k/month
- Fallback: When API errors occur

**Claude (Secondary):**
- Inference: Balanced (1.5-3s)
- Cost: $0.03 input / $0.15 output per 1K tokens
- Strength: Complex reasoning, nuanced language

**Gemini (Tertiary):**
- Inference: Fast (1-2s)
- Cost: Free (20 req/day limit)
- Use case: Burst capacity only, not primary

---

## Skill Dependencies

**This project requires:**

✅ CrewAI — Agent framework & orchestration  
✅ Pydantic — Schema validation & type safety  
✅ Supabase — PostgreSQL database with RLS  
✅ Streamlit — Human dashboard UI  
✅ IMAP/Gmail API — Email ingestion  
✅ Docker — Container deployment  
✅ Groq/Claude/Gemini APIs — LLM inference  

**Best paired with:**

📚 [Multi-LLM Orchestration Guide](./docs/llm-strategy.md) — Cost optimization, fallback patterns  
🏗️ [Database Design & RLS](./docs/database-architecture.md) — Schema, security policies  
⚙️ [Deployment & DevOps](./docs/deployment.md) — Docker, Render, monitoring  
📊 [Cost Analysis](./docs/cost-analysis.md) — Economics of multi-LLM systems  

---

## References & Resources

**Internal Documentation:**
- `/docs/architecture.md` — Complete system design with diagrams
- `/docs/failure-scenarios.md` — Real incidents & recovery patterns
- `/docs/api-integration.md` — Gmail, Supabase, LLM API integration details
- `/docs/schema-definitions.md` — Pydantic models, database schema
- `/docs/deployment-checklist.md` — Pre-production verification steps

**External Resources:**
- [CrewAI Docs](https://docs.crewai.com) — Agent framework
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security) — Database security
- [Groq API Docs](https://groq.com/api-docs) — LLM inference
- [Render Deployment](https://render.com/docs) — Container hosting
- [Streamlit Docs](https://docs.streamlit.io) — Dashboard framework

**Case Studies & Examples:**
- [Email Automation Portfolio](https://your-username.github.io) — Interactive technical breakdown
- [Cost Engineering Report](./docs/cost-analysis.md) — $20 → $5/month optimization
- [Multi-LLM Fallback Strategy](./docs/llm-orchestration.md) — Real failure recovery

---

## Getting Help

**Issues & Questions:**
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common problems
- Review [Architecture Docs](./docs/architecture.md) for system design questions
- Search [Discussions](https://github.com/yourusername/email-automation-agent-1/discussions) for similar issues

**Development Setup:**
```bash
# Clone and setup
git clone https://github.com/samagra88/email-automation-agent.git
cd email-automation-agent
cp .env.example .env
# Fill in API keys
pip install -r requirements.txt
python worker_loop.py  # Terminal 1
streamlit run dashboard.py  # Terminal 2 (http://localhost:8501)
```

---

## Performance & Monitoring

**Key Metrics to Track:**

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Email Processing Latency | < 3s | > 10s |
| LLM Fallback Rate | < 5% | > 20% |
| AI Autonomy Rate | > 70% | < 50% |
| Accuracy Rate | > 85% | < 75% |
| Tone Score | 6-8/10 | < 4 |
| Uptime | 99.9% | < 99% |

**Health Check Script:**

```bash
# Run daily to verify system health
python scripts/health_check.py

# Output:
# ✅ Gmail connection: OK
# ✅ Supabase connection: OK
# ✅ LLM APIs: All responding
# ✅ Processed 42 emails in last 24h
# ✅ Avg tone score: 6.8/10
# ⚠️ Warning: 3 fallbacks to Claude in last hour
```

---

**Version:** 1.0.0  
**Last Updated:** June 2026  
**Status:** Production-Ready with Active Development  
**License:** MIT

---
