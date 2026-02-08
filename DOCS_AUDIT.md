# Pay402 Documentation Audit & Cleanup Plan

**Date:** February 8, 2026  
**Purpose:** Identify key content docs, remove outdated files, organize for hackathon submission

---

## Key Content Documents (KEEP - Judge-Facing)

### Root Level
- ✅ **README.md** - Main project overview (updated with Railway URLs)
- ✅ **RAILWAY-DEPLOYMENT-SUMMARY.md** - Deployment details
- ✅ **RELEASE-NOTES-v1.1.0-railway-prod.md** - Latest release notes
- ⚠️ **HACKMONEY-DEMO-READY.md** - Demo guide (review for accuracy)

### docs/
- ✅ **docs/PROBLEM_STATEMENT.md** - Market context, competitive analysis (NEW)
- ✅ **docs/SECURITY_MODEL.md** - Trust model, PTB verification
- ⚠️ **docs/RECEIPT_ARCHITECTURE.md** - On-chain receipt design (verify current)

### docs/architecture/
- ✅ **docs/architecture/FLOW_DIAGRAM.md** - Visual diagrams (NEW)
- ✅ **docs/architecture/ARCHITECTURE.md** - Technical specification
- ✅ **docs/architecture/COMPONENT_BREAKDOWN.md** - Component details
- ✅ **docs/architecture/DESIGN_RATIONALE.md** - Design decisions

### docs/deployment/
- ✅ **docs/deployment/WIDGET_DEPLOYMENT.md** - Widget build/deploy guide

### docs/development/
- ✅ **docs/development/DEVELOPMENT_GUIDE.md** - Developer onboarding
- ⚠️ **docs/development/TESTING.md** - Testing strategy (may be outdated)

### Component READMEs
- ✅ **facilitator/README.md** - Facilitator service docs
- ✅ **merchant/README.md** - Merchant demo docs
- ✅ **widget/README.md** - Widget docs

### Submission Artifacts
- ✅ **submission_artefacts/LOGO_PROMPTS.md** - Logo generation
- ✅ **submission_artefacts/PRESENTATION_OUTLINE_v2.md** - Presentation content
- ✅ **submission_artefacts/screenshots/** - Demo screenshots

---

## Outdated/Redundant Files (ARCHIVE or DELETE)

### Phase Completion Docs (Historical, Not Judge-Facing)
- ❌ **PHASE-0-COMPLETE.md** - Superseded
- ❌ **PHASE-0.5-COMPLETE.md** - Superseded
- ❌ **PHASE-1-COMPLETE.md** - Superseded
- ❌ **PHASE-2A-REWRITE-COMPLETE.md** - Superseded
- ❌ **PHASE-2A-ZKLOGIN-TEST.md** - Superseded
- ❌ **MILESTONE-v0.1.0-localnet.md** - Superseded by testnet

**Action:** Move to `docs/archive/milestones/`

### zkLogin Debugging Docs (Historical)
- ❌ **ZKLOGIN-BLOCKERS.md** - Resolved
- ❌ **ZKLOGIN-ERROR-FAILED-TO-FETCH.md** - Resolved
- ❌ **ZKLOGIN-STATUS.md** - Superseded
- ❌ **ZKLOGIN-BREAKTHROUGH.md** - Superseded by SUCCESS
- ❌ **ZKLOGIN-BREAKTHROUGH-SUCCESS.md** - Superseded by SUCCESS
- ⚠️ **ZKLOGIN-SUCCESS.md** - Final status (keep or merge into README?)
- ❌ **ZKLOGIN-SIGNING-FIX.md** - Historical fix
- ❌ **REPRODUCE-ZKLOGIN-SIGNING-ISSUE.md** - Debug doc

**Action:** Keep `ZKLOGIN-SUCCESS.md` as reference, move rest to `docs/archive/zklogin_debugging/`

### Deployment Planning Docs (Pre-Railway)
- ❌ **TESTNET-DEPLOYMENT-PLAN.md** - Superseded by Railway deployment
- ❌ **TESTNET-DEPLOYMENT.md** - Superseded
- ❌ **TESTNET-QUICKSTART.md** - Superseded by Railway
- ⚠️ **TESTNET-ZKLOGIN-FLOW.md** - Still relevant? (review)

**Action:** Move to `docs/archive/deployment_planning/`

### Vercel Deployment Docs (Not Used - Railway Instead)
- ❌ **VERCEL-CONFIG-TEMPLATES.md** - Not used
- ❌ **VERCEL-DEPLOYMENT-PLAN.md** - Not used
- ❌ **VERCEL-EXECUTIVE-SUMMARY.md** - Not used
- ❌ **VERCEL-QUICK-START.md** - Not used
- ❌ **VERCEL-TECHNICAL-ASSESSMENT.md** - Not used

**Action:** Move to `docs/archive/vercel_attempt/`

### Setup/Config Docs (Developer-Facing, Not Judge-Facing)
- ⚠️ **ENOKI-API-KEY-GUIDE.md** - Keep for developers
- ⚠️ **ENOKI-APPROACH-ANALYSIS.md** - Archive (historical decision)
- ⚠️ **ENOKI-PORTAL-NAVIGATION.md** - Keep for developers
- ⚠️ **ENV-TEMPLATE-STRATEGY.md** - Archive (implementation detail)
- ❌ **SECURITY-AUDIT-ENV-FILES.md** - Archive (audit result)
- ⚠️ **SETUP-SCRIPT-GUIDE.md** - Keep for developers

**Action:** Review for development vs historical

### DevRel/Support Docs (Historical Questions)
- ❌ **DEVREL-QUESTION.md** - Historical
- ❌ **DEVREL-QUESTION-V2.md** - Historical
- ❌ **DEVREL-CODE-REFERENCE.md** - Historical
- ❌ **OAUTH-UPDATE-EXPLAINED.md** - Historical

**Action:** Move to `docs/archive/devrel/`

### Network/Debugging Docs (Developer Tooling)
- ⚠️ **NETWORK-SWITCHING.md** - Keep for developers
- ❌ **NETWORK-SWITCHING-IMPLEMENTATION.md** - Archive (historical)
- ⚠️ **SUI-DRAINAGE-ANALYSIS.md** - Archive (historical issue)
- ⚠️ **PORT_STATUS.md** - Archive (temp debug doc)
- ❌ **SCRIPT-BEHAVIOR.md** - Archive

**Action:** Archive debugging docs

### Testing Docs (Mixed - Some Keep, Some Archive)
- ⚠️ **TESTING-STRATEGY.md** - Review for current relevance
- ❌ **TEST-COVERAGE-REALITY-CHECK.md** - Archive
- ❌ **docs/E2E_FLOW_COMPLETE.md** - Archive (historical milestone)
- ❌ **docs/E2E_TEST_RESULTS.md** - Archive (old results)
- ❌ **docs/FINAL_STATUS.md** - Archive (old status)
- ❌ **docs/IMPLEMENTATION_STATUS.md** - Archive (old status)
- ❌ **docs/TEST_STATUS_SUMMARY.md** - Archive (old status)
- ❌ **docs/testing/** folder - Archive (detailed debugging)

**Action:** Keep high-level testing strategy, archive detailed test results

### Sponsored Transaction Debugging (Historical)
- ❌ **docs/SPONSORED_TRANSACTIONS_ANALYSIS.md** - Archive
- ❌ **docs/SPONSORED_TRANSACTION_FIX.md** - Archive
- ❌ **docs/SPONSORED_TX_VALIDATION.md** - Archive

**Action:** Move to `docs/archive/sponsored_tx_debugging/`

### Move Contract Docs (Historical)
- ❌ **docs/MOVE_CI_CD.md** - Archive
- ❌ **docs/MOVE_CONTRACT_FIX.md** - Archive

**Action:** Move to `docs/archive/move_debugging/`

### X402 Implementation Docs (Historical)
- ❌ **docs/X402_V2_AND_TESTING_COMPLETE.md** - Archive
- ❌ **docs/X402_V2_COMPLIANCE_AND_CROSS_CHAIN.md** - Archive (future plans)
- ❌ **docs/X402_V2_IMPLEMENTATION_SUMMARY.md** - Archive

**Action:** Move to `docs/archive/x402_implementation/`

### Validation/Verification Docs (Technical Details)
- ⚠️ **docs/VALIDATION_IMPLEMENTATION.md** - Review (might be useful for judges)
- ❌ **docs/VERIFIER_COIN_TYPE_VALIDATION.md** - Archive (implementation detail)
- ⚠️ **docs/reference/VERIFIER_EXPLAINER.md** - Keep (explains PTB verification)
- ⚠️ **docs/security/PTB_VERIFIER_SECURITY.md** - Keep (security model)

**Action:** Keep high-level explainers, archive implementation details

### Misc
- ⚠️ **EXPLORER-LINKS.md** - Keep (useful reference)
- ⚠️ **FACILITATOR-ASSET-LINKS.md** - Keep (useful reference)
- ⚠️ **TESTNET-TREASURY-FUNDING.md** - Keep (funding guide)
- ⚠️ **ZKLOGIN-SETUP-GUIDE.md** - Keep for developers
- ❌ **ZKLOGIN-SETUP.md** - Duplicate? (review)
- ⚠️ **DOCS_INDEX.md** - Update with new structure

---

## Recommended Actions

### 1. Create Archive Structure
```
docs/archive/
├── milestones/          # PHASE-* completion docs
├── zklogin_debugging/   # zkLogin troubleshooting history
├── deployment_planning/ # Pre-Railway deployment docs
├── vercel_attempt/      # Unused Vercel deployment docs
├── devrel/              # Historical support questions
├── sponsored_tx_debugging/ # Gas sponsorship fixes
├── move_debugging/      # Move contract fixes
├── x402_implementation/ # x402 protocol implementation history
└── testing_history/     # Detailed test results
```

### 2. Update Root README.md
- ✅ Already updated with Railway URLs
- ✅ Problem statement added
- ✅ Architecture diagram linked

### 3. Create DOCS_INDEX.md (Navigation for Judges)
```markdown
# Pay402 Documentation Index

## Start Here (Judges)
1. [README.md](./README.md) - Project overview
2. [Problem Statement](./docs/PROBLEM_STATEMENT.md) - Why Pay402, why SUI
3. [Flow Diagram](./docs/architecture/FLOW_DIAGRAM.md) - Visual architecture

## Technical Deep Dive
- [Architecture Spec](./docs/architecture/ARCHITECTURE.md)
- [Security Model](./docs/SECURITY_MODEL.md)
- [PTB Verifier](./docs/reference/VERIFIER_EXPLAINER.md)

## Deployment
- [Railway Summary](./RAILWAY-DEPLOYMENT-SUMMARY.md)
- [Release Notes](./RELEASE-NOTES-v1.1.0-railway-prod.md)

## Developers
- [Development Guide](./docs/development/DEVELOPMENT_GUIDE.md)
- [Component READMEs](./facilitator/README.md)
```

### 4. Review & Update Key Docs
- ⚠️ **HACKMONEY-DEMO-READY.md** - Verify demo flow matches Railway deployment
- ⚠️ **docs/SECURITY_MODEL.md** - Ensure current with implementation
- ⚠️ **docs/RECEIPT_ARCHITECTURE.md** - Verify matches deployed contract

---

## Execution Plan (30 minutes)

1. **Create archive/ directory** (5 min)
   - Move ~60 historical files

2. **Update DOCS_INDEX.md** (10 min)
   - Create navigation for judges

3. **Review 3 key docs** (15 min)
   - HACKMONEY-DEMO-READY.md
   - docs/SECURITY_MODEL.md
   - docs/RECEIPT_ARCHITECTURE.md

---

## Files to Keep (Final List - 25 docs)

### Root (10)
1. README.md ✅
2. RAILWAY-DEPLOYMENT-SUMMARY.md ✅
3. RELEASE-NOTES-v1.1.0-railway-prod.md ✅
4. HACKMONEY-DEMO-READY.md ⚠️
5. EXPLORER-LINKS.md
6. FACILITATOR-ASSET-LINKS.md
7. TESTNET-TREASURY-FUNDING.md
8. ZKLOGIN-SUCCESS.md
9. ZKLOGIN-SETUP-GUIDE.md
10. ENOKI-PORTAL-NAVIGATION.md

### docs/ (15)
1. docs/PROBLEM_STATEMENT.md ✅
2. docs/SECURITY_MODEL.md ⚠️
3. docs/RECEIPT_ARCHITECTURE.md ⚠️
4. docs/architecture/FLOW_DIAGRAM.md ✅
5. docs/architecture/ARCHITECTURE.md ✅
6. docs/architecture/COMPONENT_BREAKDOWN.md ✅
7. docs/architecture/DESIGN_RATIONALE.md ✅
8. docs/deployment/WIDGET_DEPLOYMENT.md ✅
9. docs/development/DEVELOPMENT_GUIDE.md ✅
10. docs/reference/VERIFIER_EXPLAINER.md ✅
11. docs/security/PTB_VERIFIER_SECURITY.md ✅
12. facilitator/README.md ✅
13. merchant/README.md ✅
14. widget/README.md ✅
15. submission_artefacts/ (all files) ✅

---

**Next Steps:**
1. Execute cleanup (move to archive/)
2. Update DOCS_INDEX.md
3. Review 3 key docs for accuracy
4. Commit cleanup as single "docs: organize for submission"

**Estimated Time:** 30 minutes
