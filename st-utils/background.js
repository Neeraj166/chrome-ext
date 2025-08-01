function executeTokenCopy(tabId) {
    chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
            const url = location.href;

            // voxships domain case
            if (url.includes('warehouse.voxships.com')) {
                try {
                    const obj = JSON.parse(
                        localStorage.getItem('vue-session-key')
                    );
                    const token = obj?.apiToken;
                    if (!token) {
                        console.error(
                            'voxships apiToken not found in localStorage'
                        );
                        return;
                    }
                    navigator.clipboard
                        .writeText(token)
                        .then(() => console.log('voxships ApiToken copied'))
                        .catch((err) => console.error('Clipboard error:', err));
                } catch (e) {
                    console.error('Failed to read voxships token:', e);
                }
                return;
            }

            // voxmg / demodev domains
            const adminDomains = [
                'https://demo.voxmg.com/#/admin',
                'https://demo.shikhartech.com/#/admin',
                'https://demodev.shikhartech.com/#/admin',
            ];
            const memberDomains = [
                'https://demo.voxmg.com/#/',
                'https://demo.shikhartech.com/#/',
                'https://demodev.shikhartech.com/#/',
            ];

            let tokenKey = null;

            if (adminDomains.some((prefix) => url.startsWith(prefix))) {
                tokenKey = 'apiToken';
            } else if (memberDomains.some((prefix) => url.startsWith(prefix))) {
                tokenKey = 'memberToken';
            }

            if (!tokenKey) {
                console.error('Unsupported URL: No token to copy.');
                return;
            }

            try {
                const token = localStorage.getItem(tokenKey);
                if (!token) {
                    console.error('Token not found in localStorage');
                    return;
                }

                navigator.clipboard
                    .writeText(token)
                    .then(() => console.log(`${tokenKey} copied to clipboard.`))
                    .catch((err) =>
                        console.error('Clipboard write failed:', err)
                    );
            } catch (e) {
                console.error('Error accessing localStorage:', e);
            }
        },
    });
}


// When the keyboard shortcut is triggered
chrome.commands.onCommand.addListener((command) => {
    if (command === 'copy-token') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab?.id && tab?.url) {
                executeTokenCopy(tab.id);
            }
        });
    }
});
