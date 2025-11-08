# Running the Realistic Email Thread Test

## Quick Start

```bash
# 1. Ensure API key is set
export CLAUDE_API_KEY=sk-ant-...

# 2. Build the project
npm run build

# 3. Run the automated test
node test-messy-thread.js
```

This will:
- Load 12 messy, realistic emails
- Detect speech acts (takes ~30-60 seconds)
- Run 4 test queries (takes ~20-40 seconds)
- Display results showing how Schrute handles real-world complexity

**Expected runtime**: ~1-2 minutes
**Estimated API cost**: ~$0.10-0.15

## What You'll See

The test validates:
- ✅ All 12 emails parse correctly
- ✅ Thread correctly assembled (1 thread, 5 participants)
- ✅ Speech acts detected (commitments, decisions, requests, questions)
- ✅ Nickname resolution works (Bobby → Bob Smith)
- ✅ Non-participant mentions handled correctly (Carol mentioned but not on thread)
- ✅ Complex queries answered accurately

## Manual Testing (CLI)

For deeper exploration, use the interactive CLI:

```bash
npm run cli

# Load the messy thread
schrute> load events/thread-messy-realistic.yaml

# Explore the results
schrute> threads
schrute> status
schrute> acts
schrute> acts commitment
schrute> acts decision

# Test complex queries
schrute> query What vendor did we choose and why?
schrute> query What did Bobby commit to?
schrute> query What happened with the timeline compression proposal?
schrute> query Is the deadline moving to March?
schrute> query What did Carol say about cloud migration?
schrute> query Who is "Johnson" referring to in Bob's email?
```

See **REALISTIC_EMAIL_TEST.md** for the complete test plan with 10 detailed test scenarios.

## What This Tests

This email thread includes **every complication** that makes real-world emails hard:

### Edge Cases Covered

1. **Nickname variations**: Alice → "Al", Bob → "Bobby"
2. **People mentioned but not on thread**: Carol, Mike, Sarah, Elena, Jennifer, Rachel, Kevin, Michael, Greg, Karen (11 people mentioned, only 5 on thread)
3. **Irrelevant chit chat**: Weekend plans, zoo visits, lunch mentions
4. **Past conversation references**: "Like we discussed in November..."
5. **Thread drift**: Budget → vendors → timeline → testing → DR costs
6. **Inline quoting**: `> quoted text` format
7. **Ambiguous pronouns**: "he said", "they decided"
8. **Partial participant changes**: Frank added mid-thread
9. **Typos and informal language**: "gonna", "lol", emoji
10. **Conflicting information**: Testing responsibility dispute, March deadline rumor
11. **Complex decision chains**: Multiple proposals, some approved, some rejected
12. **Subject line changes**: 4 different subjects in one thread

### Key Test Questions

- Can Schrute parse messy, informal emails?
- Does speech act detection work with mixed topics and chit chat?
- Are nicknames correctly resolved to full names?
- Does it distinguish participants from mentioned-but-absent people?
- Can it track complex decisions despite evolving/conflicting information?
- Does it filter chit chat from business content?
- Can it handle ambiguous references?

## Success Criteria

**Minimum passing**: 80% of test criteria from REALISTIC_EMAIL_TEST.md

**Critical must-pass**:
- All 12 emails parse (no failures)
- Single thread correctly assembled
- ≥70% of key speech acts detected
- Final decisions (msg-012) all captured
- No fabricated info from non-participants
- No chit chat mistaken for business decisions

## If Tests Fail

Document any issues in a findings document:

1. **What failed?** - Specific test cases that didn't pass
2. **How severe?** - Blocker, major concern, or minor issue?
3. **Root cause?** - Parsing? Claude API? Logic error?
4. **Mitigation?** - Can it be fixed easily or needs redesign?

Use findings to decide:
- ✅ **80%+ pass**: Ready for semi-real testing (anonymized real emails)
- ⚠️ **60-80% pass**: Address major issues, then retest
- 🔴 **<60% pass**: Significant redesign needed

## Next Steps After Testing

### If Tests Pass (≥80%)

Move to next Spiral Model iteration:
1. Test with anonymized real email exports
2. Have non-technical user try teaching skills
3. Validate with actual project communications

### If Tests Reveal Issues (<80%)

Another prototyping spiral:
1. Identify highest-risk failures
2. Implement fixes/improvements
3. Retest with messy thread
4. Iterate until passing

## Files Created

- `events/thread-messy-realistic.yaml` - 12-email thread with all edge cases
- `REALISTIC_EMAIL_TEST.md` - Comprehensive test plan (10 test scenarios)
- `test-messy-thread.js` - Automated validation script
- `RUN_REALISTIC_TEST.md` - This file (quick start guide)

## Cost Estimate

**Automated test script** (`test-messy-thread.js`):
- Speech act detection: 12 emails × ~$0.005 = ~$0.06
- 4 queries: 4 × ~$0.02 = ~$0.08
- **Total**: ~$0.14

**Full manual test plan** (all 10 test scenarios):
- ~30 queries: 30 × ~$0.02 = ~$0.60
- **Total**: ~$0.60-0.75

These are estimates. Actual costs depend on prompt sizes and response lengths.
