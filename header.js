function captureGAIdentifiers() {

    var GAIdentifiers = JSON.parse(localStorage.getItem("o-snippet.ga"));
    var UtmValues = JSON.parse(localStorage.getItem("o-snippet.utm"));
    var ReferringDomain = localStorage.getItem("o-snippet.referring-domain");
    var PromoCode = localStorage.getItem("o-snippet.promo-code");
    if (!UtmValues) {
        var params = new URL(window.location).searchParams;
        var UtmSource = params.get("utm_source");
        var UtmCampaign = params.get("utm_campaign");
        var UtmMedium = params.get("utm_medium");
        if (UtmSource || UtmCampaign || UtmMedium) {
            // Sets first touch UTM values if one is present
            UtmValues = {UtmSource, UtmCampaign, UtmMedium};
            localStorage.setItem("o-snippet.utm", JSON.stringify(UtmValues));
        }
    }
    if (!PromoCode) {
        var params = new URL(window.location).searchParams;
        PromoCode = params.get('ref');
        if (PromoCode) {
            localStorage.setItem("o-snippet.promo-code", PromoCode);
        }
    }

    // Auto-fill promo code input if it exists
    if (PromoCode) {
        var promoInput = document.querySelector('input[name="Account.PromoCode"]');
        if (promoInput && !promoInput.value) {
            promoInput.value = PromoCode;
        }
    }
    if (!ReferringDomain && document.referrer) {
        const ReferrerURL = new URL(document.referrer);
        // Sets first touch Referrer value if one is present
        ReferringDomain = ReferrerURL.hostname;
        localStorage.setItem("o-snippet.referring-domain", ReferringDomain);
    }
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