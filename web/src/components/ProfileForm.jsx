import { useState } from 'react';
import styles from './ProfileForm.module.scss';

export default function ProfileForm({ initialValues, onSave }) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [address, setAddress] = useState(initialValues?.address ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    await onSave({ name: name.trim(), address: address.trim() });
    setSaving(false);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
      </label>
      <label className={styles.field}>
        Address
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          maxLength={500}
          rows={3}
        />
      </label>
      <div className={styles.field}>
        <span>Service Plan</span>
        <output className={styles.readOnly}>{initialValues?.servicePlan || 'Not available'}</output>
      </div>
      <button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
