import { useEffect, useState } from 'react';
import { getProfile, saveProfile } from '../../api/profile.js';
import ProfileForm from './components/ProfileForm.jsx';
import ProfileView from './components/ProfileView.jsx';
import MessengerCode from './MessengerCode.jsx';

export default function App() {
  const [profile, setProfile] = useState(null);
  const [mode, setMode] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    getProfile()
      .then((saved) => {
        setProfile(saved);
        setMode(saved ? 'view' : 'edit');
      })
      .catch((err) => {
        setError(err.message);
        setMode('edit');
      });
  }, []);

  async function handleSave(values) {
    setError('');
    try {
      const saved = await saveProfile(values);
      setProfile(saved);
      setMode('view');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <main className="container">
        <h1>Profile</h1>
        {error && <p className="error" role="alert">{error}</p>}
        {mode === 'loading' && <p>Loading...</p>}
        {mode === 'edit' && <ProfileForm initialValues={profile} onSave={handleSave} />}
        {mode === 'view' && profile && (
          <ProfileView profile={profile} onEdit={() => setMode('edit')} />
        )}
      </main>
      <MessengerCode />
    </>
  );
}
