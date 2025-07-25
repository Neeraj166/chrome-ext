chrome.action.onClicked.addListener((tab) => {
    if (!tab || !tab.id || !tab.url) return;

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const url = location.href;

            // voxships domain case
            if (url.includes('warehouse.voxships.com')) {
                try {
                    const obj = JSON.parse(
                        localStorage.getItem('vue-session-key')
                    );
                    const token = obj?.apiToken;
                    if (token) {
                        navigator.clipboard
                            .writeText(token)
                            .then(() => console.log('voxships ApiToken copied'))
                            .catch((err) =>
                                console.error('Clipboard error:', err)
                            );
                    } else {
                        alert('voxships apiToken not found in localStorage');
                    }
                } catch (e) {
                    console.error('Failed to read voxships token:', e);
                }
                return;
            }

            // voxmg / demodev domains
            const adminDomains = [
                'https://demo.voxmg.com/#/admin',
                'https://demodev.voxmg.com/#/admin',
                'https://demodev.shikhartech.com/#/admin',
            ];
            const memberDomains = [
                'https://demo.voxmg.com/#/',
                'https://demodev.voxmg.com/#/',
                'https://demodev.shikhartech.com/#/',
            ];

            let tokenKey = null;

            if (adminDomains.some((prefix) => url.startsWith(prefix))) {
                tokenKey = 'apiToken';
            } else if (memberDomains.some((prefix) => url.startsWith(prefix))) {
                tokenKey = 'memberToken';
            }

            if (!tokenKey) {
                alert('Unsupported URL: No token to copy.');
                return;
            }

            try {
                const token = localStorage.getItem(tokenKey);
                if (token) {
                    navigator.clipboard
                        .writeText(token)
                        .then(() =>
                            console.log(`${tokenKey} copied to clipboard.`)
                        )
                        .catch((err) =>
                            console.error('Clipboard write failed:', err)
                        );
                } else {
                    alert(`${tokenKey} not found in localStorage.`);
                }
            } catch (e) {
                console.error('Error accessing localStorage:', e);
            }
        },
    });
});
