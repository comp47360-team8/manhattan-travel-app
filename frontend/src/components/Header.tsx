type HeaderProps = {
  onLoginClick: () => void;
  onRegisterClick: () => void;
};

function Header({ onLoginClick, onRegisterClick }: HeaderProps) {
  return (
    <header className="explore-hero">
      <p className="hero-eyebrow">Manhattan Guide</p>
      <h1>Manhattan, at your best time</h1>
      <p className="hero-subtitle">Experience the city without the crowds.</p>

      <div className="hero-auth-actions">
        <button onClick={onLoginClick}>Login</button>
        <button onClick={onRegisterClick}>Register</button>
      </div>
    </header>
  );
}

export default Header;