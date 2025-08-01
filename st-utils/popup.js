const storageKey = 'savedUrls';
const tabsEl = document.getElementById('tabs');
const urlContainer = document.getElementById('url-container');
let activeDomain = null;

// Load saved URLs from storage
function loadUrls() {
    chrome.storage.local.get([storageKey], (data) => {
        const urls = data[storageKey] || [];
        const domainGroups = groupByDomain(urls);
        renderTabs(Object.keys(domainGroups));
        renderUrls(domainGroups);
    });
}

function groupByDomain(urls) {
    const grouped = {};
    urls.forEach((url) => {
        try {
            const domain = new URL(url).hostname;
            if (!grouped[domain]) grouped[domain] = [];
            grouped[domain].push(url);
        } catch (e) {
            console.warn(`Invalid URL skipped: ${url}`);
        }
    });
    return grouped;
}

function renderTabs(domains) {
    tabsEl.innerHTML = '';
    domains.forEach((domain) => {
        const btn = document.createElement('button');
        btn.textContent = domain;
        btn.className = 'tab-btn';
        if (domain === activeDomain || !activeDomain) {
            btn.classList.add('active');
            activeDomain = domain;
        }
        btn.onclick = () => {
            activeDomain = domain;
            loadUrls(); // re-render
        };
        tabsEl.appendChild(btn);
    });
}

function renderUrls(grouped) {
    urlContainer.innerHTML = '';
    const urls = grouped[activeDomain] || [];
    urls.forEach((urlTemplate) => {
        const div = document.createElement('div');
        div.className = 'url-form';

        let html = urlTemplate;
        const paramMatches = [...urlTemplate.matchAll(/\{(.*?)\}/g)];
        paramMatches.forEach((match) => {
            const name = match[1];
            html = html.replace(
                `{${name}}`,
                `<input type="text"
                         style="width: 40px;"
                         placeholder="${name}"
                         maxlength="5"
                         data-param="${name}">`
            );
        });

        const contentSpan = document.createElement('span');
        contentSpan.innerHTML = html;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.dataset.url = encodeURIComponent(urlTemplate);
        removeBtn.textContent = '❌';
        removeBtn.style.cssText = `
            font-size: 12px;
            padding: 2px 6px;
            background-color: transparent;
            color: #c00;
            border: none;
            cursor: pointer;
        `;

        removeBtn.addEventListener('click', (e) => {
            const encoded = e.target.dataset.url;
            const decodedUrl = decodeURIComponent(encoded);
            chrome.storage.local.get([storageKey], (data) => {
                const urls = (data[storageKey] || []).filter(
                    (url) => url !== decodedUrl
                );
                chrome.storage.local.set({ [storageKey]: urls }, loadUrls);
            });
        });

        div.appendChild(contentSpan);
        div.appendChild(removeBtn);
        urlContainer.appendChild(div);

        // Now add event listeners to inputs **after** adding to DOM
        const inputs = contentSpan.querySelectorAll('input[data-param]');
        inputs.forEach((input) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    let finalUrl = urlTemplate;
                    inputs.forEach((inputEl) => {
                        finalUrl = finalUrl.replace(
                            `{${inputEl.dataset.param}}`,
                            encodeURIComponent(inputEl.value.trim())
                        );
                    });
                    chrome.tabs.create({ url: finalUrl });
                }
            });
        });
    });
}


// Handle adding new URL
document.getElementById('add-url-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('new-url');
    const newUrl = input.value.trim();
    if (!newUrl.includes('{') || !newUrl.includes('}')) {
        alert('Please include at least one {param} in the URL.');
        return;
    }

    chrome.storage.local.get([storageKey], (data) => {
        const urls = data[storageKey] || [];
        if (!urls.includes(newUrl)) {
            urls.push(newUrl);
            chrome.storage.local.set({ [storageKey]: urls }, loadUrls);
        }
    });
    input.value = '';
});

// Initial load
loadUrls();


// Set modifier key label based on OS
document.addEventListener('DOMContentLoaded', () => {
    const modifierKeyEl = document.getElementById('modifier-key');
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    modifierKeyEl.textContent = isMac ? 'Cmd' : 'Ctrl';
});