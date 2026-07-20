import type { AuthUser, ProfilePreferences } from "../types";

type ProfileProps = {
  user: AuthUser;
  onLogout: () => void;
  preferences: ProfilePreferences;
  onPreferencesChange: (preferences: ProfilePreferences) => void;
};

function Profile({
  user,
  onLogout,
  preferences,
  onPreferencesChange,
}: ProfileProps) {
  function toggleAccessiblePlaces() {
    const updated = {
      ...preferences,
      stepFreeRoutes: !preferences.stepFreeRoutes,
    };

    onPreferencesChange(updated);
  }

  return (
    <main className="profile-page">
      <section className="profile-container">
        <header className="profile-heading">
          <p className="section-eyebrow">Your account</p>
          <h1>Profile</h1>
          <p>
            Review your account details and choose the accessibility settings
            used while planning future Manhattan trips.
          </p>
        </header>

        <section className="profile-identity-card" aria-label="Profile summary">
          <div className="profile-avatar" aria-hidden="true">
            {user.displayName.charAt(0).toUpperCase()}
          </div>

          <div className="profile-identity-copy">
            <span className="profile-status">Signed in</span>
            <h2>{user.displayName}</h2>
            <p>{user.email}</p>
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <p className="section-eyebrow">Travel preferences</p>
            <h2>Accessibility</h2>
          </div>

          <div className="profile-preference-card">
            <div className="profile-preference-content">
              <span className="profile-preference-icon" aria-hidden="true">
                ♿
              </span>

              <div>
                <h3>I need wheelchair-accessible attractions</h3>
                <p>
                  Show confirmed accessible attractions first and warn me
                  when accessibility information is limited or unavailable.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={
                preferences.stepFreeRoutes
                  ? "profile-toggle active"
                  : "profile-toggle"
              }
              onClick={toggleAccessiblePlaces}
              role="switch"
              aria-checked={preferences.stepFreeRoutes}
              aria-label="Prioritise wheelchair-accessible attractions"
            >
              <span />
            </button>
          </div>

          <p className="profile-preference-note">
            Your account preference is restored when you sign in. Changes made
            here update this device immediately, prioritise suitable places,
            and never hide attractions or prevent you from choosing them.
          </p>
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <p className="section-eyebrow">Account details</p>
            <h2>Your information</h2>
          </div>

          <div className="profile-account-card">
            <div>
              <span>Display name</span>
              <strong>{user.displayName}</strong>
            </div>

            <div>
              <span>Email address</span>
              <strong>{user.email}</strong>
            </div>
          </div>
        </section>

        <section className="profile-signout-section">
          <div>
            <h2>Sign out</h2>
            <p>
              You will need to log in again to access saved places and saved
              itineraries.
            </p>
          </div>

          <button
            type="button"
            className="profile-signout-button"
            onClick={onLogout}
          >
            Log out
          </button>
        </section>
      </section>
    </main>
  );
}

export default Profile;
