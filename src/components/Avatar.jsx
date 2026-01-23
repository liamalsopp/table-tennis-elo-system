import './Avatar.css';

export default function Avatar({ avatar, size = 'medium', showRarity = false }) {
  if (!avatar) {
    return <span className={`avatar avatar-${size}`}>👤</span>;
  }

  const rarityClass = showRarity ? `rarity-${avatar.rarity}` : '';

  return (
    <span className={`avatar avatar-${size} ${rarityClass}`} title={avatar.name}>
      {avatar.emoji}
      {showRarity && (
        <span className="rarity-badge">{avatar.rarity}</span>
      )}
    </span>
  );
}
