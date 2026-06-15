import { useState } from "react";

type AuthFormProps={
     onXClick: ()=> void,
     onLoginClick: ()=> void,
     onRegisterClick: ()=> void,
     authMode: string, 
}

function Authform({onXClick,onRegisterClick,onLoginClick, authMode}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");


    async function handleLogin() {
    const response = await fetch("http://localhost:8000/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    const data = await response.json();
    if (response.ok){
      setAuthMessage(data.message || "Success");
    }
    else{
      setAuthMessage(data.detail || "Something went wrong");
    }
    console.log(data);
    }

    async function handleRegister() {
    const response = await fetch("http://localhost:8000/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        display_name: username,
        password: password,
        confirm_password: confirmPassword,
      }),
    });

  const data = await response.json();
  if (response.ok){
      setAuthMessage(data.message || "Success");
    }
    else{
      setAuthMessage(data.detail || "Something went wrong");
    }
  console.log(data);
}
    if (authMode === "login") {
         return(
        <section className="auth-card">

            <button className="close-button" onClick={onXClick}>×</button>
            
            <h2>Login</h2>
            

            <label>Email</label>
            <input type="email"
              placeholder="Please enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              />
            
            <label>Password</label>
            <input type="password"
              placeholder="Please enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              />
            <p className="forgot-password" /*onClick={handleForgotPassword}*/ >Forgot password?</p>

            {authMessage && <p className="auth-message">{authMessage}</p>}
            <button type="button" onClick={handleLogin}>Login</button>
            <p className="signup-link">Don't have an account? <span onClick={onRegisterClick}>Sign up</span></p>
            

        </section>
    );
}
      if (authMode === "register") {
    return (
      <section className="auth-card">
        <button className="close-button" onClick={onXClick}>×</button>

        <h2>Sign Up</h2>

        <label>Display Name</label>
        <input type="text"
          placeholder="Please enter a username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          />

        <label>Email</label>
        <input type="email"
          placeholder="Please enter your email" 
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          />

        <label>Password</label>
        <input type="password"
          placeholder="Please enter your password" 
          value={password}
          onChange={(event) => setPassword(event.target.value)}
         />

        <label>Confirm Password</label>
        <input type="password"
          placeholder="Please confirm your password" 
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
           />
        
        {authMessage && <p className="auth-message">{authMessage}</p>}
        <button type="button" onClick={handleRegister}>Sign Up</button>

        <p className="signup-link">
          Already have an account? <span onClick={onLoginClick}>Log in</span>
        </p>
      </section>
    );
  }

  return null;
}

export default Authform;