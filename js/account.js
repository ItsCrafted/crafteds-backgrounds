class AccountManager {
  constructor() {
    this.db = null;
    this.auth = null;
    this.user = null;
    this.syncInterval = null;
    this.isGuest = false;
    
    this.initFirebase();
  }

  async loadFirebaseConfig() {
    try {
      const res = await fetch('../.netlify/functions/get-firebase-config');
      if (!res.ok) throw new Error('Failed to fetch Firebase config');
      const config = await res.json();
      return config;
    } catch (error) {
      console.error('Error loading Firebase config:', error);
      throw error;
    }
  }

  async initFirebase() {
    try {
      const config = await this.loadFirebaseConfig();
      
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(config);
      }
      
      this.auth = firebase.auth();
      this.db = firebase.firestore();

      this.auth.onAuthStateChanged(async (user) => {
        if (user) {
          console.log('User signed in:', user.email);
          this.user = user;
          this.isGuest = false;
          await this.loadUserData();
          this.startAutoSync();
          this.hideAuthPrompt();

          const profile = await this.getUserProfile();
          if (profile && profile.name) {
            localStorage.setItem('craftedGamzUser', profile.name);
          }
        } else {
          console.log('User signed out');
          this.user = null;
          this.stopAutoSync();
          if (!this.isGuest) {
            this.showAuthPrompt();
          }
        }
      });
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      alert('Failed to load Firebase configuration. Please check your connection.');
    }
  }

  showAuthPrompt() {
    const existing = document.getElementById('auth-prompt-overlay');
    if (existing) existing.remove();

    if (!document.getElementById('svg-filters')) {
      const svgFilters = document.createElement('div');
      svgFilters.id = 'svg-filters';
      svgFilters.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="lg-dist">
              <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="1" result="warp"/>
              <feDisplacementMap xChannelSelector="R" yChannelSelector="G" scale="3" in="SourceGraphic" in2="warp"/>
            </filter>
          </defs>
        </svg>
      `;
      svgFilters.style.cssText = 'position: absolute; width: 0; height: 0;';
      document.body.appendChild(svgFilters);
    }

    const overlay = document.createElement('div');
    overlay.id = 'auth-prompt-overlay';
    overlay.innerHTML = `
      <style>
        :root {
          --lg-bg-color: rgba(40, 40, 40, 0.3);
          --lg-highlight: rgba(255, 255, 255, 0.15);
          --lg-text: #ffffff;
        }
        
        #auth-prompt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        #auth-prompt-box {
          position: relative;
          border-radius: 2rem;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          max-width: 450px;
          width: 90%;
        }
        
        .glass-filter {
          position: absolute;
          inset: 0;
          z-index: 0;
          backdrop-filter: blur(10px);
          filter: url(#lg-dist);
          isolation: isolate;
        }
        
        .glass-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: var(--lg-bg-color);
        }
        
        .glass-specular {
          position: absolute;
          inset: 0;
          z-index: 2;
          border-radius: inherit;
          overflow: hidden;
          box-shadow: inset 1px 1px 0 var(--lg-highlight),
              inset 0 0 10px var(--lg-highlight);
        }
        
        .glass-content {
          position: relative;
          z-index: 3;
          padding: 50px 60px;
          text-align: center;
        }
        
        #auth-prompt-box h2 {
          color: var(--lg-text);
          font-size: 36px;
          margin-bottom: 15px;
          font-weight: 300;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        #auth-prompt-box p {
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 30px;
          font-size: 16px;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        
        .auth-input {
          width: 100%;
          padding: 16px 24px;
          margin-bottom: 15px;
          font-size: 16px;
          background: rgba(60, 60, 60, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 15px;
          color: white;
          outline: none;
          transition: all 0.3s ease;
          backdrop-filter: blur(5px);
          box-sizing: border-box;
        }
        
        .auth-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        
        .auth-input:focus {
          border-color: rgba(255, 255, 255, 0.4);
          background: rgba(80, 80, 80, 0.3);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
        }
        
        .auth-btn {
          width: 100%;
          padding: 14px 45px;
          margin-bottom: 12px;
          font-size: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(5px);
          font-weight: 500;
        }
        
        .auth-btn-primary {
          background: rgba(60, 60, 60, 0.3);
          color: white;
        }
        
        .auth-btn-primary:hover {
          background: rgba(80, 80, 80, 0.4);
          box-shadow: 0 0 25px rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        
        .auth-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .auth-btn-secondary {
          background: rgba(40, 40, 40, 0.2);
          color: rgba(255, 255, 255, 0.9);
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        .auth-btn-secondary:hover {
          background: rgba(60, 60, 60, 0.3);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }
        
        .auth-toggle {
          text-align: center;
          margin-top: 20px;
          color: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        
        .auth-toggle:hover {
          color: white;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }
        
        .auth-error {
          color: #ff6b6b;
          font-size: 14px;
          margin-top: -8px;
          margin-bottom: 15px;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        }
      </style>
      <div id="auth-prompt-box">
        <div class="glass-filter"></div>
        <div class="glass-overlay"></div>
        <div class="glass-specular"></div>
        <div class="glass-content">
          <h2>Welcome!</h2>
          <p>Sign in to sync your data across devices</p>
          <input type="text" id="auth-name" class="auth-input" placeholder="Your name" style="display:none;">
          <input type="email" id="auth-email" class="auth-input" placeholder="Email">
          <input type="password" id="auth-password" class="auth-input" placeholder="Password">
          <div id="auth-error" class="auth-error"></div>
          <button class="auth-btn auth-btn-primary" id="auth-submit">Sign In</button>
          <button class="auth-btn auth-btn-secondary" id="auth-guest">Continue as Guest</button>
          <div class="auth-toggle" id="auth-toggle">Don't have an account? Sign up</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let isSignUp = false;
    const nameInput = overlay.querySelector('#auth-name');
    const emailInput = overlay.querySelector('#auth-email');
    const passwordInput = overlay.querySelector('#auth-password');
    const submitBtn = overlay.querySelector('#auth-submit');
    const guestBtn = overlay.querySelector('#auth-guest');
    const toggleBtn = overlay.querySelector('#auth-toggle');
    const errorDiv = overlay.querySelector('#auth-error');

    toggleBtn.addEventListener('click', () => {
      isSignUp = !isSignUp;
      if (isSignUp) {
        nameInput.style.display = 'block';
        submitBtn.textContent = 'Sign Up';
        toggleBtn.textContent = 'Already have an account? Sign in';
      } else {
        nameInput.style.display = 'none';
        submitBtn.textContent = 'Sign In';
        toggleBtn.textContent = "Don't have an account? Sign up";
      }
      errorDiv.textContent = '';
    });

    submitBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const name = nameInput.value.trim();

      errorDiv.textContent = '';

      if (!email || !password) {
        errorDiv.textContent = 'Please enter email and password';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = isSignUp ? 'Creating account...' : 'Signing in...';

      try {
        if (isSignUp) {
          if (!name) {
            errorDiv.textContent = 'Please enter your name';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
            return;
          }
          console.log('Creating new user account...');
          const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
          console.log('User created, setting up profile...');
          await this.db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            storage: {}
          });
          console.log('Profile created successfully');
        } else {
          console.log('Signing in user...');
          await this.auth.signInWithEmailAndPassword(email, password);
          console.log('Sign in successful');
        }
      } catch (error) {
        console.error('Auth error:', error);
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';

        if (error.code === 'auth/invalid-email') {
          errorDiv.textContent = 'Invalid email address';
        } else if (error.code === 'auth/user-not-found') {
          errorDiv.textContent = 'No account found with this email';
        } else if (error.code === 'auth/wrong-password') {
          errorDiv.textContent = 'Incorrect password';
        } else if (error.code === 'auth/email-already-in-use') {
          errorDiv.textContent = 'Email already in use';
        } else if (error.code === 'auth/weak-password') {
          errorDiv.textContent = 'Password should be at least 6 characters';
        } else {
          errorDiv.textContent = error.message;
        }
      }
    });

    guestBtn.addEventListener('click', () => {
      console.log('Continuing as guest');
      this.isGuest = true;
      this.hideAuthPrompt();
    });

    const handleEnter = (e) => {
      if (e.key === 'Enter') {
        submitBtn.click();
      }
    };
    emailInput.addEventListener('keypress', handleEnter);
    passwordInput.addEventListener('keypress', handleEnter);
    nameInput.addEventListener('keypress', handleEnter);
  }

  hideAuthPrompt() {
    const overlay = document.getElementById('auth-prompt-overlay');
    if (overlay) overlay.remove();
  }

  async loadUserData() {
    if (!this.user) return;

    try {
      localStorage.clear();

      const doc = await this.db.collection('users').doc(this.user.uid).get();
      if (doc.exists) {
        const data = doc.data();
        const storage = data.storage || {};

        const keys = Object.keys(storage);
        keys.forEach(key => {
          try {
            localStorage.setItem(key, storage[key]);
          } catch (e) {
            console.warn(`Failed to set localStorage key "${key}":`, e);
          }
        });

        console.log(`User data loaded from server: ${keys.length} items restored`);
        console.log('Restored data:', storage);
      } else {
        console.log('No stored data found for user');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async syncToServer() {
    if (!this.user) return;

    try {
      const storage = {};
      const keys = Object.keys(localStorage);

      keys.forEach(key => {
        storage[key] = localStorage.getItem(key);
      });

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !storage.hasOwnProperty(key)) {
          storage[key] = localStorage.getItem(key);
        }
      }

      console.log(`Syncing ${Object.keys(storage).length} localStorage items to server`);

      await this.db.collection('users').doc(this.user.uid).update({
        storage: storage,
        lastSync: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log('Data synced to server:', storage);
    } catch (error) {
      console.error('Error syncing to server:', error);
    }
  }

  startAutoSync() {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.syncToServer();
    }, 5000);

    console.log('Auto-sync started');
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto-sync stopped');
    }
  }

  async signOut() {
    await this.auth.signOut();
    localStorage.clear();
    this.isGuest = false;
  }

  getUserName() {
    return this.user ? this.user.email : 'Guest';
  }

  async getUserProfile() {
    if (!this.user) return null;
    
    const doc = await this.db.collection('users').doc(this.user.uid).get();
    return doc.exists ? doc.data() : null;
  }
}

const accountManager = new AccountManager();

window.accountManager = accountManager;

document.addEventListener('DOMContentLoaded', () => {
  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
      accountManager.signOut();
    });
  }
});