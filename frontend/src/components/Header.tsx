type headerProps={
    // () => void defines a function prop that takes no arguments
    // and returns nothing. It is more specific than using Function.
    onLoginClick: ()=> void,
    onRegisterClick: ()=> void,
}

function Header({onLoginClick,onRegisterClick}: headerProps) {
    return (
        <header>
            <p className="Location">📍 Manhattan, NY</p>
            <h1>OffPeak NYC</h1>
            <p>Avoid crowds and still get the best out of Manhattan</p>
            <button onClick={onLoginClick}>Login</button>
            <button onClick={onRegisterClick}>Register</button>
        </header>
    );
    
}
export default Header;