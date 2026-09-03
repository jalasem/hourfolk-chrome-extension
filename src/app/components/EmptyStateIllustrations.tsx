import { useId } from 'react';
import styles from './EmptyStateIllustrations.module.css';

export function TimeOrbitIllustration() {
  const gradientId = useId();
  return (
    <div className={styles.frame} aria-hidden="true">
      <svg className={styles.art} viewBox="0 0 160 120" fill="none">
        <ellipse className={styles.orbitBack} cx="80" cy="61" rx="63" ry="27" transform="rotate(-12 80 61)" />
        <ellipse className={styles.orbitFront} cx="80" cy="61" rx="55" ry="39" transform="rotate(18 80 61)" />
        <circle className={styles.satellite} cx="24" cy="57" r="9" />
        <path className={styles.satelliteHand} d="M24 52v5l3 2" />
        <circle className={styles.satelliteCoral} cx="133" cy="79" r="7" />
        <circle className={styles.clockShadow} cx="80" cy="64" r="36" />
        <circle cx="80" cy="58" r="36" fill={`url(#${gradientId})`} className={styles.clockFace} />
        <circle className={styles.clockRim} cx="80" cy="58" r="35.5" />
        <path className={styles.tick} d="M80 29v5M80 82v5M51 58h5M104 58h5" />
        <path className={styles.hands} d="M80 40v19l13 8" />
        <circle className={styles.pin} cx="80" cy="58" r="3" />
        <defs>
          <linearGradient id={gradientId} x1="54" y1="31" x2="103" y2="88" gradientUnits="userSpaceOnUse">
            <stop className={styles.faceStart} />
            <stop offset="1" className={styles.faceEnd} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function ReminderOrbitIllustration() {
  const gradientId = useId();
  return (
    <div className={styles.frame} aria-hidden="true">
      <svg className={styles.art} viewBox="0 0 160 120" fill="none">
        <circle className={styles.reminderHalo} cx="80" cy="59" r="48" />
        <path className={styles.reminderArc} d="M39 47a45 45 0 0 1 72-25" />
        <path className={styles.reminderArcMuted} d="M121 73a45 45 0 0 1-70 27" />
        <circle className={styles.alertDotShadow} cx="121" cy="25" r="10" />
        <circle className={styles.alertDot} cx="121" cy="22" r="9" />
        <circle className={styles.bellShadow} cx="80" cy="66" r="34" />
        <circle cx="80" cy="60" r="34" fill={`url(#${gradientId})`} className={styles.clockFace} />
        <path className={styles.bell} d="M60 70h40c-4-5-6-10-6-18a14 14 0 0 0-28 0c0 8-2 13-6 18Z" />
        <path className={styles.bellClapper} d="M75 76a6 6 0 0 0 10 0" />
        <path className={styles.bellShine} d="M71 50a9 9 0 0 1 7-7" />
        <defs>
          <linearGradient id={gradientId} x1="58" y1="36" x2="103" y2="88" gradientUnits="userSpaceOnUse">
            <stop className={styles.faceStart} />
            <stop offset="1" className={styles.faceEnd} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
