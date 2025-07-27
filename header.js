  function redirectNotAuth() {
    const restrictedPages = ['app']; // all pages started from app should redirect to main page
    const currentPath = window.location.pathname.split('/').filter(Boolean)[0];
    if (restrictedPages.includes(currentPath)) {
      window.location.assign("/");
    }
  }

  function redirectAuth() {
    const currentPath = window.location.pathname.split('/').filter(Boolean)[0];
    if (window.location.pathname === '/') {
    //   do nothing
    } else if ( currentPath === 'login' ||  currentPath === 'sign-up' ) {
      window.location.assign("/")
    }
  }

  function renderAuthUsersEls() {
    const banners = document.querySelectorAll('.banner[data-auth="true"]');
    if (banners){
      banners.forEach(banner => {
        banner.style.display = 'none';
      });
    }

    const profile = document.querySelector('.b-profile[data-auth="true"]');
    if (profile) profile.style.display = 'inline-flex';
  }

  // Wait until Outseta is initialized
  Outseta.on("nocode.initialized", async () => {
    // Check if access token exists
    if (!Outseta.getAccessToken()) {
      // console.log('No access token found');
      // Redirect unauthenticated user to login page
      redirectNotAuth();
    } else {
      // redirectUser()
      redirectAuth();
      renderAuthUsersEls(); // rename
    }
    // here we should show dashboard
    Outseta.on("accessToken.set", (decodedToken) => {
      // Add your custom logic here for auth users
      // console.log('User authenticated 2');
    });
  });