# zkLogin/Enoki Blockers & Questions

**Date**: February 5, 2026  
**Status**: 🟡 Testing in progress  
**Goal**: Get zkLogin working for Pay402 payment widget

---

## 🎯 Current Status

- [ ] Enoki API key obtained
- [ ] Test page created (`/zklogin-test`)
- [ ] OAuth redirect configured
- [ ] Sign-in flow tested
- [ ] SUI address derived
- [ ] Balance check working
- [ ] Ready for payment integration

---

## ❌ Blockers (Fill in as discovered)

### Blocker 1: [Title]

**Error Message**:

```
[Paste exact error message here]
```

**Configuration**:

```env
VITE_SUI_NETWORK=testnet
VITE_ENOKI_API_KEY=enoki_public_... (redacted)
# Other relevant config
```

**Steps to Reproduce**:

1. Open http://localhost:5173/zklogin-test
2. Click "Sign in with Google"
3. [What happens?]

**Expected**: [What should happen]

**Actual**: [What actually happens]

**Browser Console**:

```
[Paste relevant console errors]
```

**Screenshots**: [Attach if helpful]

---

### Blocker 2: [Title]

[Same format as above]

---

## ❓ Questions for Sui DevRel

### Configuration Questions

1. **Enoki API Key Scope**:

   - Q: Does the API key need specific scopes or permissions?
   - A: [Pending]

2. **Network Requirements**:

   - Q: Can zkLogin work on localnet, or testnet only?
   - A: [Pending - docs say testnet required]

3. **OAuth Redirect URLs**:

   - Q: Do we need to configure redirect URLs for each environment?
   - A: [Pending]

4. **Google OAuth Client ID**:
   - Q: Do we need our own Google OAuth app, or can we use Enoki's?
   - A: [Pending]

### Technical Questions

5. **Session Persistence**:

   - Q: How long does a zkLogin session last?
   - A: [Pending]

6. **Transaction Signing**:

   - Q: How do we sign transactions with zkLogin? (Different from keypair?)
   - A: [Pending]

7. **Gas Sponsorship**:

   - Q: Does zkLogin work with gas-sponsored transactions?
   - A: [Pending - critical for our use case]

8. **Address Derivation**:
   - Q: Is the SUI address deterministic per Google account?
   - A: [Pending - expecting yes]

### Integration Questions

9. **Facilitator Integration**:

   - Q: Any special considerations for PTB signing with zkLogin?
   - A: [Pending]

10. **Error Handling**:
    - Q: What are common zkLogin errors and how to handle them?
    - A: [Pending]

---

## 📊 Test Results

### Test 1: Basic Sign-In

**Date**: [Fill in]  
**Result**: ⏳ Pending / ✅ Success / ❌ Failed

**Details**:

- Clicked "Sign in with Google": [Yes/No]
- Redirected to Google: [Yes/No]
- Redirected back: [Yes/No]
- Address derived: [Yes/No, if yes: 0x...]
- Error messages: [None/List them]

### Test 2: Address Persistence

**Date**: [Fill in]  
**Result**: ⏳ Pending / ✅ Success / ❌ Failed

**Details**:

- Signed in once: [Yes/No]
- Refreshed page: [Yes/No]
- Same address: [Yes/No]
- Session persisted: [Yes/No]

### Test 3: Balance Check

**Date**: [Fill in]  
**Result**: ⏳ Pending / ✅ Success / ❌ Failed

**Details**:

- Called facilitator /balance endpoint: [Yes/No]
- Response: [Success/Error]
- Balance data: [Received/Not received]

### Test 4: Transaction Signing

**Date**: [Fill in]  
**Result**: ⏳ Pending / ✅ Success / ❌ Failed

**Details**:

- Built test PTB: [Yes/No]
- Attempted to sign: [Yes/No]
- Signature generated: [Yes/No]
- Error: [None/List]

---

## 🔧 Workarounds Attempted

### Workaround 1: [Title]

**Problem**: [Describe issue]

**Attempted Fix**: [What we tried]

**Result**: ⏳ Pending / ✅ Worked / ❌ Didn't work

**Notes**: [Additional details]

---

### Workaround 2: [Title]

[Same format]

---

## 📝 Debug Logs

### Full Debug Log from Test Page

```
[Paste debug logs from zkLogin test page]
```

### Browser Console (Full)

```
[Paste browser console output]
```

### Network Tab (OAuth Requests)

```
Request 1: POST https://accounts.google.com/...
Response: [Status code, relevant headers/body]

Request 2: GET http://localhost:5173/auth?code=...
Response: [Status code]
```

---

## 🎯 Action Items

### For Us

- [ ] Obtain Enoki API key
- [ ] Configure OAuth redirect
- [ ] Test basic sign-in
- [ ] Document all errors
- [ ] Prepare questions for DevRel

### For Sui DevRel

- [ ] Review configuration
- [ ] Answer technical questions
- [ ] Help debug specific errors
- [ ] Provide example code (if available)

---

## 📞 DevRel Contact Info

**Contact Method**: [Discord / Email / GitHub Issue]  
**Contact Name**: [DevRel person]  
**Message Sent**: [Date/Time]  
**Response Expected**: [Date/Time]

---

## 🔄 Updates Log

| Date       | Update                   | Status   |
| ---------- | ------------------------ | -------- |
| 2026-02-05 | Created blocker document | -        |
| [Date]     | [Update]                 | [Status] |

---

## ✅ Resolution (When Complete)

**Final Status**: ⏳ In Progress / ✅ Resolved / ❌ Blocked

**Solution**: [What fixed it]

**Changes Made**: [List all changes]

**Lessons Learned**:

1. [Lesson 1]
2. [Lesson 2]
3. [Lesson 3]

**Next Steps**: [What to do after resolution]

---

**Note**: Keep this document updated as you test. It will be invaluable for DevRel discussions!
