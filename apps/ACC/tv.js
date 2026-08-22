// ======================================================
// ASHTEAD MATCH CENTRE V4
// tv.js
// ======================================================

/* ============================================
   AUTO SCALE 1920x1080 TV LAYOUT
============================================ */

function scaleScreen() {

    const screen = document.getElementById("screen");

    if (!screen) return;

    const scale = Math.min(
    1,
    window.innerWidth / 1920,
    window.innerHeight / 1080
);

    screen.style.transform = `scale(${scale})`;

    screen.style.transformOrigin = "top left";

    screen.style.position = "absolute";

    screen.style.left =
        ((window.innerWidth - (1920 * scale)) / 2) + "px";

    screen.style.top =
        ((window.innerHeight - (1080 * scale)) / 2) + "px";

}

window.addEventListener("resize", scaleScreen);

window.addEventListener("load", scaleScreen);
// ------------------------------------------------------
// Clock
// ------------------------------------------------------

function updateClock() {

    const now = new Date();

    document.getElementById("clock").textContent =
        now.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit"
        });

    document.getElementById("date").textContent =
        now.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });

}

setInterval(updateClock, 1000);
updateClock();

// ------------------------------------------------------
// Config (saved from admin.html)
// ------------------------------------------------------

const CONFIG_KEY = "matchCentreConfig";
const PROXY_OVERRIDE_KEY = "matchCentreProxyUrlOverride";
const DEFAULT_PROXY_URL = "https://ashtead-scorecard-proxy.aculhane94.workers.dev";
const REFRESH_INTERVAL_MS = 30000;
const SCORECARD_POLL_INTERVAL_MS = 5000;
const CLUB_NAME_MATCH = "ashtead";

const SLOT_IDS = ["slot1", "slot2", "slot3", "slot4"];

function resolveProxyUrl() {
    const override = normalizeProxyUrl(localStorage.getItem(PROXY_OVERRIDE_KEY));
    return override || DEFAULT_PROXY_URL;
}

// The admin-configured settings live on the server now (in the same
// Worker that proxies live scores) so that admin.html on one device and
// tv.html on another both see the same thing, instead of each browser
// having its own separate localStorage copy. Falls back to the last
// good copy cached in this browser if the server is briefly unreachable,
// so the TV doesn't blank out over a momentary network blip.

async function getConfig() {

    const proxyUrl = resolveProxyUrl();

    try {

        const response = await fetch(`${proxyUrl}/config`);

        if (!response.ok) throw new Error(`Config endpoint returned ${response.status}`);

        const config = await response.json();

        if (config) {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
            return config;
        }

    } catch (err) {

        console.warn("Match Centre: could not reach shared config, using last-known copy:", err.message);

    }

    try {

        const cached = localStorage.getItem(CONFIG_KEY);

        return cached ? JSON.parse(cached) : null;

    } catch (err) {

        return null;

    }

}

// ------------------------------------------------------
// Default data
// (used until admin.html config overrides it)
// ------------------------------------------------------

const sampleData = {

    featuredSlotId: "slot1",

    featuredIsLiveStream: false,

    featuredYoutubeUrl: "",

    slots: {

        slot1: {
            teamName: "1st XI",
            fixtureType: "",
            opponent: "",
            score: "",
            overs: "",
            status: "",
            batterOne: "",
            batterTwo: "",
            bowler: "",
            headline: "",
            runRate: "",
            chase: "",
            bothScores: "",
            partnership: "",
            topBatter: "",
            topBowler: "",
            opponentCrestUrl: ""
        },

        slot2: {
            teamName: "2nd XI",
            fixtureType: "",
            opponent: "",
            score: "",
            overs: "",
            status: "",
            batterOne: "",
            batterTwo: "",
            bowler: "",
            headline: "",
            runRate: "",
            chase: "",
            bothScores: "",
            partnership: "",
            topBatter: "",
            topBowler: "",
            opponentCrestUrl: ""
        },

        slot3: {
            teamName: "3rd XI",
            fixtureType: "",
            opponent: "",
            score: "",
            overs: "",
            status: "",
            batterOne: "",
            batterTwo: "",
            bowler: "",
            headline: "",
            runRate: "",
            chase: "",
            bothScores: "",
            partnership: "",
            topBatter: "",
            topBowler: "",
            opponentCrestUrl: ""
        },

        slot4: {
            teamName: "4th XI",
            fixtureType: "",
            opponent: "",
            score: "",
            overs: "",
            status: "",
            batterOne: "",
            batterTwo: "",
            bowler: "",
            headline: "",
            runRate: "",
            chase: "",
            bothScores: "",
            partnership: "",
            topBatter: "",
            topBowler: "",
            opponentCrestUrl: ""
        }

    },

    announcements: [
        "Welcome to Ashtead Cricket Club",
        "Bar open all day",
        "BBQ from 12:30",
        "Junior training Sunday 9:30"
    ],

    sponsors: []

};

// Layer the admin-entered manual fields on top of the built-in sample data.

function buildDataFromConfig(config) {

    const data = JSON.parse(JSON.stringify(sampleData));

    if (!config) return data;

    if (config.featuredSlotId) data.featuredSlotId = config.featuredSlotId;

    data.featuredIsLiveStream = !!config.featuredIsLiveStream;
    if (config.featuredYoutubeUrl) data.featuredYoutubeUrl = config.featuredYoutubeUrl;

    SLOT_IDS.forEach((slotId) => {

        const slot = config.slots && config.slots[slotId];

        if (!slot) return;

        const target = data.slots[slotId];

        if (slot.teamName) target.teamName = slot.teamName;
        if (slot.fixtureType) target.fixtureType = slot.fixtureType;
        if (slot.opponent) target.opponent = slot.opponent;

    });

    if (Array.isArray(config.announcements) && config.announcements.length > 0) {
        data.announcements = config.announcements;
    }

    if (Array.isArray(config.sponsors)) {
        data.sponsors = config.sponsors;
    }

    return data;

}

// Accepts either a bare YouTube video ID (what admin.html now asks for) or
// a pasted full URL (watch/youtu.be/embed link), and returns a ready-to-use
// embed URL with autoplay + mute set — needed for a TV with nobody there to
// press play.

function buildYoutubeEmbedUrl(input) {

    const trimmed = (input || "").trim();

    if (!trimmed) return "";

    let videoId = trimmed;

    const patterns = [
        /(?:youtube\.com\/embed\/)([\w-]{11})/,
        /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
        /(?:youtu\.be\/)([\w-]{11})/
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
            videoId = match[1];
            break;
        }
    }

    if (!/^[\w-]{11}$/.test(videoId)) return "";

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0`;

}

function buildLiveScorecardConfig(config) {

    const slots = {};

    SLOT_IDS.forEach((slotId) => {

        const slot = config && config.slots && config.slots[slotId];

        if (slot && slot.matchId) slots[slotId] = slot.matchId;

    });

    if (Object.keys(slots).length === 0) return null;

    return { proxyUrl: resolveProxyUrl(), slots };

}

// Tolerate a proxy URL pasted without "https://" (otherwise the browser
// treats it as relative to the current page and the fetch silently fails)
// and strip any trailing slash (otherwise appending "/config" produces a
// double slash that neither this code nor the Worker's routing matches).

function normalizeProxyUrl(url) {

    let trimmed = (url || "").trim();

    if (!trimmed) return trimmed;

    if (!/^https?:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`;

    return trimmed.replace(/\/+$/, "");

}

// ------------------------------------------------------
// Live scorecard polling (via the scorecard proxy — see
// scorecard-proxy-worker.js for what it does and why it's needed).
// ------------------------------------------------------

async function fetchLiveScorecard(proxyUrl, matchId) {

    const separator = proxyUrl.includes("?") ? "&" : "?";
    const url = `${proxyUrl}${separator}matchId=${encodeURIComponent(matchId)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Scorecard proxy returned ${response.status}`);
    }

    return response.json();

}

function isOurClub(name) {
    return typeof name === "string" && name.toLowerCase().includes(CLUB_NAME_MATCH);
}

function cleanPlayerName(name) {
    return (name || "").replace(/[*†]+$/g, "").trim();
}

function latestInnings(scorecard) {

    const innings = scorecard.Innings;

    if (!Array.isArray(innings) || innings.length === 0) return null;

    return innings[innings.length - 1];

}

function formatInningsScore(innings) {

    if (innings.TotalWickets >= 10) {
        return `${innings.TotalRuns} all out`;
    }

    return `${innings.TotalRuns} / ${innings.TotalWickets}`;

}

function activeBatterObjects(innings) {

    if (!innings || !Array.isArray(innings.BattingCard)) return [];

    return innings.BattingCard.filter((b) => !b.IsSummary && (b.IsFirstActive || b.IsSecondActive));

}

function activeBatters(innings) {

    return activeBatterObjects(innings).map((b) => `${cleanPlayerName(b.PlayerName)} ${b.Runs}*`);

}

// Cricket overs notation (e.g. "3.2") isn't decimal — the part after the
// dot is balls (0-5), not tenths. Convert to a true decimal for rate maths.

function oversToDecimal(oversStr) {

    const n = parseFloat(oversStr);

    if (isNaN(n)) return 0;

    const whole = Math.trunc(n);
    const balls = Math.round((n - whole) * 10);

    return whole + (balls / 6);

}

function calcRunRate(innings) {

    const decimalOvers = oversToDecimal(innings.TotalOvers);

    if (!decimalOvers) return null;

    return (innings.TotalRuns / decimalOvers).toFixed(2);

}

function currentBowlerLine(innings) {

    if (!innings || !Array.isArray(innings.BowlingCard)) return "";

    const bowler = innings.BowlingCard.find((b) => b.IsCurrentBowler);

    if (!bowler) return "";

    const figures = `${bowler.Overs}-${bowler.Maidens}-${bowler.Runs}-${bowler.Wickets}`;
    const decimalOvers = oversToDecimal(bowler.Overs);
    const economy = decimalOvers ? (bowler.Runs / decimalOvers).toFixed(2) : null;

    return economy
        ? `${cleanPlayerName(bowler.PlayerName)} ${figures} (econ ${economy})`
        : `${cleanPlayerName(bowler.PlayerName)} ${figures}`;

}

// Sum of the two not-out batters currently at the crease. Close to, but not
// exactly, the "true" partnership figure (which would also include extras
// scored during the stretch) — no fall-of-wicket data is exposed by the
// scorecard API to compute that exactly.

function currentPartnership(innings) {

    const active = activeBatterObjects(innings);

    if (active.length !== 2) return null;

    return active.reduce((sum, b) => sum + (b.Runs || 0), 0);

}

// Target/runs-needed when a second innings is under way. No ball-by-ball
// or overs-limit data is exposed by the API, so this deliberately doesn't
// attempt a "balls remaining" figure — just runs needed.

function chaseContext(scorecard) {

    const innings = scorecard.Innings;

    if (!Array.isArray(innings) || innings.length < 2) return null;

    const first = innings[0];
    const second = innings[innings.length - 1];
    const target = first.TotalRuns + 1;
    const need = target - second.TotalRuns;

    return { target, need: Math.max(need, 0) };

}

function bothInningsScoreLine(scorecard) {

    const innings = scorecard.Innings;

    if (!Array.isArray(innings) || innings.length < 2) return "";

    return innings.map((inn) => `${inn.BattingTeamName} ${formatInningsScore(inn)}`).join("   ·   ");

}

function nextMilestoneMessage(active) {

    for (const b of active) {

        const nextMilestone = (Math.floor(b.Runs / 50) + 1) * 50;
        const remaining = nextMilestone - b.Runs;

        if (remaining > 0 && remaining <= 10) {
            return `${cleanPlayerName(b.PlayerName)} ${remaining} away from ${nextMilestone}`;
        }

    }

    return null;

}

// Best individual batting/bowling performance across the whole match —
// used as a "headline stat" for in-progress and completed matches alike.

function topBatterAcross(scorecard) {

    let best = null;

    (scorecard.Innings || []).forEach((innings) => {
        (innings.BattingCard || []).forEach((b) => {
            if (b.IsSummary) return;
            if (!best || b.Runs > best.Runs) best = b;
        });
    });

    if (!best) return "";

    const notOut = best.IsFirstActive || best.IsSecondActive;

    return `Top score: ${cleanPlayerName(best.PlayerName)} ${best.Runs}${notOut ? "*" : ""}`;

}

function topBowlerAcross(scorecard) {

    let best = null;

    (scorecard.Innings || []).forEach((innings) => {
        (innings.BowlingCard || []).forEach((b) => {
            if (!b.Wickets) return;
            if (!best || b.Wickets > best.Wickets || (b.Wickets === best.Wickets && b.Runs < best.Runs)) best = b;
        });
    });

    if (!best) return "";

    return `Best bowling: ${cleanPlayerName(best.PlayerName)} ${best.Wickets}/${best.Runs}`;

}

// Builds a single dynamic, match-state-aware headline — this is what makes
// the featured panel "smart" rather than just listing static fields.

function buildHeadline(scorecard) {

    const match = scorecard.Match;
    const innings = scorecard.Innings || [];

    if (!match) return "";

    if (match.IsComplete) {
        return match.MatchSituation || match.Result || "";
    }

    if (!match.HasMatchStarted) {
        return "Starts shortly";
    }

    const current = innings[innings.length - 1];

    if (!current) return match.MatchSituation || "";

    if (innings.length >= 2) {

        const chase = chaseContext(scorecard);

        if (chase) {
            return chase.need > 0
                ? `Chasing ${chase.target} — need ${chase.need} more`
                : "Target reached";
        }

    }

    const active = activeBatterObjects(current);

    const milestone = nextMilestoneMessage(active);
    if (milestone) return milestone;

    const partnership = currentPartnership(current);
    if (partnership !== null && partnership >= 50) {
        return `${active.map((b) => cleanPlayerName(b.PlayerName)).join(" & ")} — ${partnership} run partnership`;
    }

    return match.MatchSituation || "";

}

// Applies a live scorecard to a slot. Current batters/bowler fill in for
// every slot; `detailed` additionally fills the extended "smart summary"
// fields (headline, run rate, chase, partnership, top performers) — used
// for whichever slot is currently featured, where there's room for them.

function applyLiveScorecard(slot, scorecard, detailed) {

    // Team crests come from scraping the club's own results page, and are
    // available regardless of which scoring method produced the rest of
    // the data (or even if none did) — always apply this first.
    const scraped = scorecard.Scraped;

    if (scraped && scraped.opponentCrestUrl) {
        slot.opponentCrestUrl = scraped.opponentCrestUrl;
    }

    const match = scorecard.Match;

    if (!match) {

        // No Match data at all — this match wasn't scored with Play-Cricket
        // Scorer Pro, and has no ResultsVault mapping either (the Worker
        // already tries ResultsVault first and synthesizes a Match/Innings
        // shape from it when available — see synthesizeMatchFromResultsVault
        // — so reaching here means genuinely nothing more than a results-
        // page score summary exists for this match, e.g. Frogbox-scored
        // with no ResultsVault coverage). Play-Cricket's results page still
        // gets a live score for these while the match is in progress
        // (confirmed against a real live iOS-app-scored match), just no
        // batting/bowling detail — so this fallback works for live and
        // final alike.
        if (scraped) {
            if (scraped.opponentName) slot.opponent = scraped.opponentName;
            if (scraped.ourScoreLine) slot.score = scraped.ourScoreLine;
            if (scraped.result) {
                slot.status = scraped.result;
            } else if (scraped.liveStatus) {
                slot.status = scraped.liveStatus;
            }
        }

        return;

    }

    const homeIsUs = isOurClub(match.Team1Club || match.Team1Name);
    const oppositionName = homeIsUs
        ? (match.Team2Name || match.Team2Club)
        : (match.Team1Name || match.Team1Club);

    if (oppositionName) slot.opponent = oppositionName;

    const innings = latestInnings(scorecard);

    if (innings) {

        slot.score = formatInningsScore(innings);

        // Current batters/bowler show on every slot, not just the featured
        // one — the extended "smart summary" fields below stay
        // featured-only, there just isn't room for them on the side cards.
        const batters = activeBatters(innings);
        slot.batterOne = batters[0] || "";
        slot.batterTwo = batters[1] || "";

        slot.bowler = currentBowlerLine(innings);

        if (detailed) {

            slot.overs = innings.TotalOvers ? `${innings.TotalOvers} overs` : "";

            const runRate = calcRunRate(innings);
            slot.runRate = runRate ? `RR ${runRate}` : "";

            const partnership = currentPartnership(innings);
            slot.partnership = partnership !== null ? `${partnership} run partnership` : "";

            const chase = !match.IsComplete ? chaseContext(scorecard) : null;
            slot.chase = chase ? `Target ${chase.target} · need ${chase.need}` : "";

            slot.bothScores = bothInningsScoreLine(scorecard);

            slot.headline = buildHeadline(scorecard);

            const topBatter = topBatterAcross(scorecard);
            const topBowler = topBowlerAcross(scorecard);
            slot.topBatter = topBatter;
            slot.topBowler = topBowler;

        }

    }

    if (match.MatchSituation) slot.status = match.MatchSituation;

}

async function refreshLiveScorecards() {

    if (!currentData || !liveScorecardConfig) return;

    const jobs = Object.keys(liveScorecardConfig.slots).map(async (slotId) => {

        const matchId = liveScorecardConfig.slots[slotId];

        try {

            const scorecard = await fetchLiveScorecard(liveScorecardConfig.proxyUrl, matchId);
            const isFeatured = slotId === currentData.featuredSlotId;

            applyLiveScorecard(currentData.slots[slotId], scorecard, isFeatured);

        } catch (err) {

            console.warn(`[LiveScores] ${slotId} fetch failed:`, err.message);

        }

    });

    await Promise.all(jobs);

    loadData(currentData);

}

// ------------------------------------------------------
// Populate screen
// ------------------------------------------------------

function loadData(data) {

    const featured = data.slots[data.featuredSlotId] || data.slots.slot1;

    document.getElementById("fixtureType").textContent = featured.fixtureType;

    document.getElementById("featuredTitle").textContent =
        featured.opponent ? `${featured.teamName} v ${featured.opponent}` : featured.teamName;

    document.getElementById("featuredScore").textContent = featured.score;

    document.getElementById("featuredOvers").textContent = featured.overs;

    document.getElementById("batterOne").textContent = featured.batterOne;

    document.getElementById("batterTwo").textContent = featured.batterTwo;

    document.getElementById("bowler").textContent = featured.bowler;

    document.getElementById("featuredHeadline").textContent = featured.headline || "";

    document.getElementById("featuredRunRate").textContent = featured.runRate || "";

    document.getElementById("featuredChase").textContent = featured.chase || "";

    document.getElementById("bothScoresLine").textContent = featured.bothScores || "";

    document.getElementById("partnershipLine").textContent = featured.partnership || "";

    document.getElementById("topPerformers").textContent =
        [featured.topBatter, featured.topBowler].filter(Boolean).join("   ·   ");

    // Live stream mode: the stream itself (e.g. Frogbox overlay) shows the
    // score, so hide our own score/batting overlay and just show the video.
    // Otherwise, there's no video to show at all — no placeholder ground
    // photo — the expanded scorecard detail fills that space instead.

    const featuredPanel = document.querySelector(".featured-panel");
    const featuredFooter = document.querySelector(".featured-footer");
    const iframe = document.getElementById("youtubeFrame");
    const ground = document.getElementById("groundImage");

    const embedSrc = data.featuredIsLiveStream ? buildYoutubeEmbedUrl(data.featuredYoutubeUrl) : "";
    const showStream = !!embedSrc;

    if (showStream) {

        // Only reassign iframe.src when the embed target actually changes —
        // re-setting it to the same value on every poll cycle (every 5s)
        // restarts YouTube playback, which is why the stream kept stopping.
        if (iframe.dataset.embedSrc !== embedSrc) {
            iframe.src = embedSrc;
            iframe.dataset.embedSrc = embedSrc;
        }

        iframe.style.display = "block";
        ground.style.display = "none";

    } else {

        iframe.style.display = "none";
        ground.style.display = "none";
        iframe.removeAttribute("src");
        delete iframe.dataset.embedSrc;

    }

    featuredPanel.classList.toggle("no-video", !showStream);
    featuredFooter.style.display = showStream ? "none" : "flex";

    // Sidebar: whichever slots are not currently featured, in order

    const sideSlotIds = SLOT_IDS.filter((id) => id !== data.featuredSlotId);

    sideSlotIds.forEach((slotId, index) => {

        const slot = data.slots[slotId];
        const num = index + 2; // matches existing DOM ids match2/3/4

        document.getElementById(`cardName${num}`).textContent = slot.teamName;

        document.getElementById(`match${num}Title`).textContent =
            slot.opponent ? `v ${slot.opponent}` : "";

        document.getElementById(`match${num}Score`).textContent = slot.score;

        document.getElementById(`match${num}Status`).textContent = slot.status;

        document.getElementById(`match${num}Batters`).textContent =
            [slot.batterOne, slot.batterTwo].filter(Boolean).join(", ");

        document.getElementById(`match${num}Bowler`).textContent =
            slot.bowler ? `Bowling: ${slot.bowler}` : "";

        const oppLogo = document.getElementById(`oppLogo${num}`);

        if (slot.opponentCrestUrl) {
            oppLogo.src = slot.opponentCrestUrl;
            oppLogo.alt = slot.opponent || "Opposition";
            oppLogo.style.display = "block";
        } else {
            oppLogo.style.display = "none";
        }

    });

    // Only rebuild the news marquee / sponsor slideshow when their content
    // actually changed — rebuilding on every 30s data refresh would reset
    // the scroll position / restart whichever slide is currently showing.

    const announcementsKey = JSON.stringify(data.announcements);

    if (announcementsKey !== lastAnnouncementsKey) {
        lastAnnouncementsKey = announcementsKey;
        renderAnnouncements(data.announcements);
    }

    const sponsorsKey = JSON.stringify(data.sponsors);

    if (sponsorsKey !== lastSponsorsKey) {
        lastSponsorsKey = sponsorsKey;
        renderSponsors(data.sponsors);
    }

}

// ------------------------------------------------------
// Scrolling club news ticker
// ------------------------------------------------------

let lastAnnouncementsKey = null;
let lastSponsorsKey = null;

const NEWS_FADE_MS = 400;
const NEWS_DEFAULT_DURATION_SEC = 7;

let announcementSlideIndex = 0;
let announcementSlideTimer = null;

function renderAnnouncements(announcements) {

    const text = document.getElementById("announcementSlideText");

    clearTimeout(announcementSlideTimer);

    if (!announcements || announcements.length === 0) {
        text.textContent = "";
        return;
    }

    if (announcementSlideIndex >= announcements.length) announcementSlideIndex = 0;

    const showSlide = () => {

        const message = announcements[announcementSlideIndex];

        text.style.opacity = 0;

        setTimeout(() => {
            text.textContent = message;
            text.style.opacity = 1;
        }, NEWS_FADE_MS);

        announcementSlideTimer = setTimeout(() => {
            announcementSlideIndex = (announcementSlideIndex + 1) % announcements.length;
            showSlide();
        }, NEWS_DEFAULT_DURATION_SEC * 1000);

    };

    showSlide();

}

// ------------------------------------------------------
// Sponsor slideshow (one sponsor at a time, PowerPoint-style)
// ------------------------------------------------------

const SPONSOR_FADE_MS = 400;
const SPONSOR_DEFAULT_DURATION_SEC = 6;

let sponsorSlideIndex = 0;
let sponsorSlideTimer = null;

function renderSponsors(sponsors) {

    const sponsorPanel = document.getElementById("sponsorPanel");
    const bottomPanels = document.getElementById("bottomPanels");
    const img = document.getElementById("sponsorSlideImage");

    clearTimeout(sponsorSlideTimer);

    if (!sponsors || sponsors.length === 0) {

        sponsorPanel.style.display = "none";
        bottomPanels.style.gridTemplateColumns = "1fr";

        return;

    }

    sponsorPanel.style.display = "flex";
    bottomPanels.style.gridTemplateColumns = "260px 1fr";

    if (sponsorSlideIndex >= sponsors.length) sponsorSlideIndex = 0;

    const showSlide = () => {

        const sponsor = sponsors[sponsorSlideIndex];
        const durationMs = Math.max(sponsor.durationSeconds || SPONSOR_DEFAULT_DURATION_SEC, 1) * 1000;

        img.style.opacity = 0;

        setTimeout(() => {
            img.src = sponsor.image;
            img.style.opacity = 1;
        }, SPONSOR_FADE_MS);

        sponsorSlideTimer = setTimeout(() => {
            sponsorSlideIndex = (sponsorSlideIndex + 1) % sponsors.length;
            showSlide();
        }, durationMs);

    };

    showSlide();

}

// ------------------------------------------------------
// Boot + refresh loop
// ------------------------------------------------------

let currentData = null;
let liveScorecardConfig = null;

async function refreshAndRender() {

    const config = await getConfig();

    currentData = buildDataFromConfig(config);
    liveScorecardConfig = buildLiveScorecardConfig(config);

    loadData(currentData);

    await refreshLiveScorecards();

}

refreshAndRender();

setInterval(refreshAndRender, REFRESH_INTERVAL_MS);
setInterval(refreshLiveScorecards, SCORECARD_POLL_INTERVAL_MS);

scaleScreen();
