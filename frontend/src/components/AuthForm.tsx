type AuthFormProps={
     onXClick: ()=> void,
     onLoginClick: ()=> void,
     onRegisterClick: ()=> void,
     authMode: string, 
}

function Authform({onXClick,onRegisterClick,onLoginClick, authMode}: AuthFormProps) {
    if (authMode === "login") {
         return(
        <section className="auth-card">

            <button className="close-button" onClick={onXClick}>×</button>
            
            <h2>Login</h2>
            

            <label>Email</label>
            <input type="email" placeholder="Please enter your email"/>
            
            <label>Password</label>
            <input type="password" placeholder="Please enter your password"/>
            <p className="forgot-password" /*onClick={handleForgotPassword}*/ >Forgot password?</p>

            <button type="button">Login</button>
            <p className="signup-link">Don't have an account? <span onClick={onRegisterClick}>Sign up</span></p>
            

        </section>
    );
}
      if (authMode === "register") {
    return (
      <section className="auth-card">
        <button className="close-button" onClick={onXClick}>×</button>

        <h2>Sign Up</h2>

        <label>Username</label>
        <input type="text" placeholder="Please enter a username" />

        <label>Email</label>
        <input type="email" placeholder="Please enter your email" />

        <label>Password</label>
        <input type="password" placeholder="Please enter your password" />

        <label>Confirm Password</label>
        <input type="password" placeholder="Please confirm your password" />

        <button type="button">Sign Up</button>

        <p className="signup-link">
          Already have an account? <span onClick={onLoginClick}>Log in</span>
        </p>
      </section>
    );
  }

  return null;
}

export default Authform;