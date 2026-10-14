import styles from './ProfileView.module.scss';

export default function ProfileView({ profile, onEdit }) {
  return (
    <section className={styles.card}>
      <dl>
        <dt>Name</dt>
        <dd>{profile.name}</dd>
        <dt>Address</dt>
        <dd className={styles.address}>{profile.address}</dd>
        <dt>Service Plan</dt>
        <dd>{profile.servicePlan || 'Not available'}</dd>
      </dl>
      <button type="button" onClick={onEdit}>
        Edit
      </button>
    </section>
  );
}
