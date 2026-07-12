import { useState } from "react";

import type { AuthUser, ProfilePreferences } from "../types";

type ProfileProps = {
  user: AuthUser;
  onLogout: () => void;
};

const PROFILE_PREFERENCES_KEY = "offpeak_profile_preferences";

/*
  I keep the accessibility preference on this device because the backend
  does not currently expose a profile-preferences endpoint.
*/
function loadPreferences(): ProfilePreferences {
  const fallback: ProfilePreferences = { stepFreeRoutes: false };

  try {
    const stored = localStorage.getItem(PROFILE_PREFERENCES_KEY);

    if (!stored) {
      return fallback;
    }

    const parsed = JSON.parse(stored) as Partial<ProfilePreferences>;
    return { stepFreeRoutes: parsed.stepFreeRoutes === true };
  } catch {
    return fallback;
  }
}

function Profile({ user, onLogout }: ProfileProps) {
  const [preferences, setPreferences] =
    useState<ProfilePreferences>(loadPreferences);

  function toggleStepFreeRoutes() {
    const updated = {
      ...preferences,
      stepFreeRoutes: !preferences.stepFreeRoutes,
    };

    setPreferences(updated);
    localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(updated));
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
                <h3>I need step-free routes</h3>
                <p>
                  Prioritise accessible attractions and step-free options when
                  creating an itinerary.
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
              onClick={toggleStepFreeRoutes}
              role="switch"
              aria-checked={preferences.stepFreeRoutes}
              aria-label="Use step-free routes"
            >
              <span />
            </button>
          </div>

          <p className="profile-preference-note">
            This preference is saved on this device until a backend profile
            preference endpoint is available.
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
