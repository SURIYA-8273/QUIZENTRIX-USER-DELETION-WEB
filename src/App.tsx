import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './App.css';

function App() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setMessage({
        type: 'success',
        text: 'A deletion link has been sent to your email. Please check your inbox and click the link to continue.',
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send login link' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session) return;
    
    // Add an extra confirmation since this is irreversible
    const confirmed = window.confirm(
      "Are you absolutely sure you want to permanently delete your account and all associated data? This action cannot be undone."
    );
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // On success, clear the local session and show success state
      await supabase.auth.signOut();
      setDeleted(true);
      setMessage({
        type: 'success',
        text: 'Your account has been permanently deleted.',
      });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'An error occurred while deleting your account' });
    } finally {
      setLoading(false);
    }
  };

  if (deleted) {
    return (
      <div className="container">
        <div className="glass-card">
          <div className="logo">Quizentrix</div>
          <h1>Account Deleted</h1>
          <div className="success-message">
            Your account and all associated data have been permanently removed from our systems.
          </div>
          <p>We're sorry to see you go. If you ever change your mind, you can always create a new account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="glass-card">
        <div className="logo">Quizentrix</div>
        
        {!session ? (
          <>
            <h1>Delete Account</h1>
            <p>Enter the email address associated with your account. We will send you a secure link to confirm the deletion.</p>
            
            {message && (
              <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleLogin} className="input-group">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="primary" disabled={loading}>
                {loading ? <div className="loader"></div> : 'Send Deletion Link'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Confirm Deletion</h1>
            <p>You are currently authenticated as <strong>{session.user.email}</strong>.</p>
            
            {message && (
              <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
                {message.text}
              </div>
            )}
            
            <p style={{ color: '#fca5a5' }}>
              Proceeding will permanently delete your account, including all your progress, data, and active subscriptions. This cannot be undone.
            </p>

            <button 
              onClick={handleDeleteAccount} 
              className="danger" 
              disabled={loading}
            >
              {loading ? <div className="loader"></div> : 'Permanently Delete My Account'}
            </button>

            <button 
              onClick={() => supabase.auth.signOut()} 
              style={{ background: 'transparent', color: '#94a3b8', marginTop: '1rem' }}
              disabled={loading}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
