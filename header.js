function redirectNotAuth() {
  const restrictedPages = ['app']; // все страницы, начинающиеся с "app"
  const pathSegments = window.location.pathname.split('/').filter(Boolean);

  const firstSegment = pathSegments[0];
  const lastSegment = pathSegments[pathSegments.length - 1];

  const isRestricted = restrictedPages.includes(firstSegment);
  const isException = lastSegment === 'create-board';

  if (isRestricted && !isException) {
    window.location.assign('/');
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
  let hasToken = Outseta.getAccessToken();

  if (hasToken) {
    redirectAuth();
    renderAuthUsersEls();
  } else {
    let redirected = false;

    Outseta.on("accessToken.set", () => {
      if (!redirected) {
        redirected = true;
        redirectAuth();
        renderAuthUsersEls();
      }
    });

    setTimeout(() => {
      if (!Outseta.getAccessToken() && !redirected) {
        redirected = true;
        redirectNotAuth();
      }
    }, 3000); // 3 секунды ожидания токена
  }
});