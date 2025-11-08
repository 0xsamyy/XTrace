// src/components/HeaderBar.tsx
import { useNavigationStore } from '../services/navigationService';
import { useFilterStore } from '../stores/filterStore';
import { useHealthStore } from '../stores/healthStore';
import { initiateFetch } from '../appController';
import './HeaderBar.css';

/** Health status badge */
function HealthBadge() {
  const status = useHealthStore((state) => state.status);

  let text = 'Checking...';
  if (status === 'online') text = 'Backend: Online';
  if (status === 'offline') text = 'Backend: Offline';

  return (
    <div className="health-badge">
      <span className={`health-badge-dot ${status}`} />
      <span>{text}</span>
    </div>
  );
}

export function HeaderBar() {
  const history = useNavigationStore((state) => state.history);
  const goHome = useNavigationStore((state) => state.home);
  const goBack = useNavigationStore((state) => state.back);
  const jumpTo = useNavigationStore((state) => state.jumpTo);
  const setCentralAccount = useFilterStore((state) => state.setCentralAccount);

  const truncate = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const handleHomeClick = () => {
    const homeAccount = goHome();
    if (homeAccount) {
      setCentralAccount(homeAccount);
      initiateFetch(); // <- no options arg
    }
  };

  const handleBackClick = () => {
    const prevAccount = goBack();
    if (prevAccount) {
      setCentralAccount(prevAccount);
      initiateFetch(); // <- no options arg
    }
  };

  const handleJumpClick = (account: string) => {
    const jumped = jumpTo(account);
    if (jumped) {
      setCentralAccount(jumped);
      initiateFetch(); // <- no options arg
    }
  };

  const safeHistory = Array.isArray(history) ? history : [];

  return (
    <div className="header-bar">
      {/* Breadcrumbs */}
      <nav className="breadcrumb-nav">
        <button
          className="breadcrumb-button"
          onClick={handleHomeClick}
          disabled={safeHistory.length <= 1}
        >
          Home
        </button>
        <button
          className="breadcrumb-button"
          onClick={handleBackClick}
          disabled={safeHistory.length <= 1}
        >
          Back
        </button>
        <span className="breadcrumb-separator">|</span>

        {safeHistory.map((account, index) => (
          <span key={account}>
            {index > 0 && <span className="breadcrumb-separator"> &gt; </span>}
            {index === safeHistory.length - 1 ? (
              <span style={{ color: 'var(--color-text-primary)' }}>
                {truncate(account)}
              </span>
            ) : (
              <button
                className="breadcrumb-link"
                title={`Go back to ${account}`}
                onClick={() => handleJumpClick(account)}
              >
                {truncate(account)}
              </button>
            )}
          </span>
        ))}
      </nav>

      {/* Health badge on the far right */}
      <HealthBadge />
    </div>
  );
}