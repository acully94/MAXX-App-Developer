// ======================================================
// ASHTEAD MATCH CENTRE — ADMIN
// admin.js
// ======================================================

// ------------------------------------------------------
// Password gate. This is a static site with no backend server code of
// its own, so this is only a soft deterrent (anyone with browser dev
// tools could bypass it) — not real security. It's enough to stop
// casual club members from wandering into settings, which is all it's
// meant to do. The entered password doubles as the credential sent to
// the Match Centre server when saving, so it's cached here (not just a
// "true" flag) — that's why it's worth keeping this password separate
// from anything sensitive elsewhere.
// ------------------------------------------------------

const AUTH_KEY = "matchCentreAdminAuth";
const AUTH_PASSWORD_HASH = "02e4d51f4d1aab4011c4b2cdd427f04f4fda4a6fd6272dc584bce158062879ed";

async function sha256Hex(text) {

    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

}

function unlockAdmin() {
    document.getElementById("authGate").style.display = "none";
    document.getElementById("adminPage").style.display = "block";
}

function cachedAdminPassword() {
    return localStorage.getItem(AUTH_KEY) || "";
}

async function checkStoredAuth() {

    const stored = cachedAdminPassword();

    if (!stored) return false;

    const hash = await sha256Hex(stored);

    return hash === AUTH_PASSWORD_HASH;

}

checkStoredAuth().then((ok) => {

    if (ok) {

        unlockAdmin();

    } else {

        document.getElementById("authForm").addEventListener("submit", async (event) => {

            event.preventDefault();

            const entered = document.getElementById("authPassword").value;
            const hash = await sha256Hex(entered);

            if (hash === AUTH_PASSWORD_HASH) {

                localStorage.setItem(AUTH_KEY, entered);
                unlockAdmin();

            } else {

                document.getElementById("authError").textContent = "Incorrect password.";
                document.getElementById("authPassword").value = "";
                document.getElementById("authPassword").focus();

            }

        });

    }

});

document.getElementById("lockButton").addEventListener("click", () => {
    localStorage.removeItem(AUTH_KEY);
    location.reload();
});

// ------------------------------------------------------
// Shared config lives on the Match Centre server (a Cloudflare Worker)
// so this page and tv.html — on different devices — see the same
// thing. CONFIG_KEY is only used as a local fallback cache in case the
// server is briefly unreachable.
// ------------------------------------------------------

const CONFIG_KEY = "matchCentreConfig";
const PROXY_OVERRIDE_KEY = "matchCentreProxyUrlOverride";
const DEFAULT_PROXY_URL = "https://ashtead-scorecard-proxy.aculhane94.workers.dev";

const SLOT_IDS = ["slot1", "slot2", "slot3", "slot4"];
const SLOT_FIELDS = ["teamName", "opponent", "matchId", "fixtureType"];

const SPONSOR_DEFAULT_DURATION_SEC = 6;

let sponsors = [];

function normalizeProxyUrl(url) {

    let trimmed = (url || "").trim();

    if (!trimmed) return trimmed;

    if (!/^https?:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`;

    return trimmed.replace(/\/+$/, "");

}

function resolveProxyUrl() {
    const override = normalizeProxyUrl(localStorage.getItem(PROXY_OVERRIDE_KEY));
    return override || DEFAULT_PROXY_URL;
}

async function loadConfig() {

    try {

        const response = await fetch(`${resolveProxyUrl()}/config`);

        if (!response.ok) throw new Error(`Config endpoint returned ${response.status}`);

        const config = await response.json();

        if (config) {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
            return config;
        }

    } catch (err) {

        console.warn("Match Centre Admin: could not reach shared config, using last-known copy:", err.message);

    }

    try {

        const cached = localStorage.getItem(CONFIG_KEY);

        return cached ? JSON.parse(cached) : null;

    } catch (err) {

        return null;

    }

}

function linesToList(text) {

    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

}

function fillForm(config) {

    document.getElementById("scorecardProxyUrl").value = localStorage.getItem(PROXY_OVERRIDE_KEY) || "";

    if (!config) return;

    document.getElementById("featuredSlotSelect").value = config.featuredSlotId || "slot1";
    document.getElementById("featuredIsLiveStream").checked = !!config.featuredIsLiveStream;
    document.getElementById("youtubeUrl").value = config.featuredYoutubeUrl || "";

    SLOT_IDS.forEach((slotId) => {

        const slot = (config.slots && config.slots[slotId]) || {};

        SLOT_FIELDS.forEach((field) => {

            const fieldId = slotId + field.charAt(0).toUpperCase() + field.slice(1);
            const el = document.getElementById(fieldId);

            if (el) el.value = slot[field] || "";

        });

    });

    document.getElementById("clubAnnouncements").value = (config.announcements || []).join("\n");

    sponsors = (config.sponsors || []).map((sponsor) => ({ ...sponsor }));

    renderSponsorList();

}

// ------------------------------------------------------
// Sponsor list (upload, per-image duration, remove)
// ------------------------------------------------------

function renderSponsorList() {

    const list = document.getElementById("sponsorList");

    list.textContent = "";

    sponsors.forEach((sponsor, index) => {

        const row = document.createElement("div");
        row.className = "sponsor-row";

        const thumb = document.createElement("img");
        thumb.className = "sponsor-thumb";
        thumb.src = sponsor.image;
        row.appendChild(thumb);

        const durationLabel = document.createElement("label");
        durationLabel.className = "sponsor-duration-label";
        durationLabel.appendChild(document.createTextNode("Seconds"));

        const durationInput = document.createElement("input");
        durationInput.type = "number";
        durationInput.min = "1";
        durationInput.max = "60";
        durationInput.value = sponsor.durationSeconds || SPONSOR_DEFAULT_DURATION_SEC;

        durationInput.addEventListener("input", () => {
            sponsors[index].durationSeconds = Number(durationInput.value) || SPONSOR_DEFAULT_DURATION_SEC;
        });

        durationLabel.appendChild(durationInput);
        row.appendChild(durationLabel);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "sponsor-remove-btn";
        removeBtn.textContent = "Remove";

        removeBtn.addEventListener("click", () => {
            sponsors.splice(index, 1);
            renderSponsorList();
        });

        row.appendChild(removeBtn);

        list.appendChild(row);

    });

}

function handleSponsorFiles(fileList) {

    Array.from(fileList).forEach((file) => {

        const reader = new FileReader();

        reader.onload = () => {
            sponsors.push({ image: reader.result, durationSeconds: SPONSOR_DEFAULT_DURATION_SEC });
            renderSponsorList();
        };

        reader.readAsDataURL(file);

    });

}

document.getElementById("sponsorFileInput").addEventListener("change", (event) => {

    handleSponsorFiles(event.target.files);

    event.target.value = "";

});

function readForm() {

    const config = {

        featuredSlotId: document.getElementById("featuredSlotSelect").value,
        featuredIsLiveStream: document.getElementById("featuredIsLiveStream").checked,
        featuredYoutubeUrl: document.getElementById("youtubeUrl").value.trim(),

        slots: {},

        announcements: linesToList(document.getElementById("clubAnnouncements").value),

        sponsors: sponsors

    };

    SLOT_IDS.forEach((slotId) => {

        const slot = {};

        SLOT_FIELDS.forEach((field) => {

            const fieldId = slotId + field.charAt(0).toUpperCase() + field.slice(1);
            const el = document.getElementById(fieldId);

            slot[field] = el ? el.value.trim() : "";

        });

        config.slots[slotId] = slot;

    });

    return config;

}

async function saveConfig() {

    // The Match Centre server URL override is local to this browser only
    // — it never goes to the server, it's what tells this browser (and
    // tv.js) which server to talk to.
    localStorage.setItem(PROXY_OVERRIDE_KEY, document.getElementById("scorecardProxyUrl").value.trim());

    const config = readForm();
    const statusMessage = document.getElementById("statusMessage");

    statusMessage.classList.remove("admin-status--ok", "admin-status--error");
    statusMessage.textContent = "Saving…";
    statusMessage.classList.add("admin-status--ok");

    try {

        const response = await fetch(`${resolveProxyUrl()}/config`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-admin-password": cachedAdminPassword()
            },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || `Server returned ${response.status}`);
        }

        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));

        statusMessage.textContent = "Saved " + new Date().toLocaleTimeString("en-GB");

    } catch (err) {

        console.warn("Match Centre Admin: save failed:", err.message);

        statusMessage.classList.remove("admin-status--ok");
        statusMessage.classList.add("admin-status--error");
        statusMessage.textContent = "Save failed — " + err.message;

    }

    setTimeout(() => {
        statusMessage.classList.remove("admin-status--ok", "admin-status--error");
    }, 4000);

}

document.getElementById("saveButton").addEventListener("click", saveConfig);

loadConfig().then(fillForm);
