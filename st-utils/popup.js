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

        const paramMatches = [...urlTemplate.matchAll(/\{(.*?)\}/g)];
        let html = urlTemplate;
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

        div.innerHTML = html;

        // event listeners to each input for Enter key submission
        const inputs = div.querySelectorAll('input[data-param]');
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

        urlContainer.appendChild(div);
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

loadUrls();


  const trigger = document.getElementById('tooltip-trigger');
  const tooltip = document.getElementById('tooltip');

  trigger.addEventListener('mouseenter', () => {
      tooltip.style.visibility = 'visible';
      tooltip.style.opacity = '1';
  });

  trigger.addEventListener('mouseleave', () => {
      tooltip.style.visibility = 'hidden';
      tooltip.style.opacity = '0';
  });