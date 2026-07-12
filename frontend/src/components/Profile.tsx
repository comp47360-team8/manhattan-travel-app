import { useState } from "react";

import type { AuthUser, ProfilePreferences } from "../types";

type ProfileProps = {
  user: AuthUser;
  onLogout: () => void;
};

const PROFILE_PREFERENCES_KEY = "offpeak_profile_preferences";

/*
  Loads locally stored profile preferences.

  The backend does not currently provide a profile-preferences endpoint,
  so this keeps the setting working in the browser until that endpoint exists.
*/
function loadPreferences(): ProfilePreferences {
  const fallbackPreferences: ProfilePreferences = {
    stepFreeRoutes: false,
  };

  try {
    const storedPreferences = localStorage.getItem(PROFILE_PREFERENCES_KEY);

    if (!storedPreferences) {
      return fallbackPreferences;
    }

    const parsedPreferences = JSON.parse(
      storedPreferences
    ) as Partial<ProfilePreferences>;

    return {
      stepFreeRoutes: parsedPreferences.stepFreeRoutes === true,
    };
  } catch (error) {
    console.error("Could not load profile preferences:", error);
    return fallbackPreferences;
  }
}

function Profile({ user, onLogout }: ProfileProps) {
  const [preferences, setPreferences] =
    useState<ProfilePreferences>(loadPreferences);

  function toggleStepFreeRoutes() {
    const updatedPreferences: ProfilePreferences = {
      ...preferences,
      stepFreeRoutes: !preferences.stepFreeRoutes,
    };

    setPreferences(updatedPreferences);

    localStorage.setItem(
      PROFILE_PREFERENCES_KEY,
      JSON.stringify(updatedPreferences)
    );
  }

  return (
    <main className="profile-page">
      <section className="profile-container">
        <div className="profile-heading">
          <p className="section-eyebrow">Your account</p>
          <h1>Profile</h1>
          <p>
            Manage your account details and travel preferences for future
            itineraries.
          </p>
        </div>

        <section className="profile-identity-card">
          <div className="profile-avatar" aria-hidden="true">
            {user.displayName.charAt(0).toUpperCase()}
          </div>

          <div>
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
                  When enabled, itinerary planning will prioritise accessible
                  attractions and step-free options.
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
            This preference is currently saved on this device and can be
            connected to the backend profile system later.
          </p>
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <p className="section-eyebrow">Account details</p>
            <h2>Your information</h2>
          </div>

          <div className="profile-account-card">
            <div>
              <span>Email address</span>
              <strong>{user.email}</strong>
            </div>

            <div>
              <span>Display name</span>
              <strong>{user.displayName}</strong>
            </div>
          </div>
        </section>

        <section className="profile-signout-section">
          <div>
            <h2>Sign out</h2>
            <p>
              You will need to log in again to view saved places and
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