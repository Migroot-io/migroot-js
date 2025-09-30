function captureGAIdentifiers() {

    var GAIdentifiers = JSON.parse(localStorage.getItem("o-snippet.ga"));

    if (!GAIdentifiers || !GAIdentifiers.clientId || !GAIdentifiers.sessionId) {

        // Get Client ID from _ga cookie
        var gaCookie = document.cookie.split('; ')
            .find(row => row.startsWith('_ga='));

        var clientId = null;
        if (gaCookie) {
            var parts = gaCookie.split('=')[1].split('.');
            clientId = parts.slice(-2).join('.');
        }

        // Get ALL _ga_XXXXXXXXXX cookies
        var gaSessionCookies = document.cookie.split('; ')
            .filter(row => row.startsWith('_ga_'));

        var sessionId = null;

        // Try each cookie until we find a valid session ID
        for (var i = 0; i < gaSessionCookies.length; i++) {
            var cookieValue = gaSessionCookies[i].split('=')[1];
            var parts = cookieValue.split('.');

            if (parts.length >= 3) {
                var sessionData = parts[2];
                var match = sessionData.match(/^s(\d+)/);

                if (match) {
                    sessionId = match[1];
                    break; // Stop at first valid session ID
                }
            }
        }

        if (clientId || sessionId) {
            GAIdentifiers = {
                ClientId: clientId || (GAIdentifiers && GAIdentifiers.clientId) || null,
                SessionId: sessionId || (GAIdentifiers && GAIdentifiers.sessionId) || null,
            };
            localStorage.setItem("o-snippet.ga", JSON.stringify(GAIdentifiers));
        }
    }
}

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
    } else if (currentPath === 'login' || currentPath === 'sign-up') {
        window.location.assign("/")
    }
}

function renderAuthUsersEls() {
    const banners = document.querySelectorAll('.banner[data-auth="true"]');
    if (banners) {
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