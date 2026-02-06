/**
 * OAuth Callback Handler
 * 
 * This page is loaded in the OAuth popup window after Google authentication.
 * It allows Enoki to complete the zkLogin flow without interfering with
 * the main app's URL (which may have invoice data in the hash).
 * 
 * Usage:
 * 1. Add to Google OAuth Redirect URIs: http://localhost:5173/oauth-callback
 * 2. Enoki SDK will automatically handle the OAuth response in this popup
 * 3. The popup will close automatically after successful authentication
 */
export default function OAuthCallback() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔐</div>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>Completing Sign In...</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Please wait while we finish setting up your account.
        </p>
        <div style={{ marginTop: '30px', fontSize: '14px', opacity: 0.7 }}>
          This window will close automatically.
        </div>
      </div>
    </div>
  );
}
