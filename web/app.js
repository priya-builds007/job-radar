"use strict";

// ==========================================
// JOB RADAR — PART 1/10
// CORE SETUP + STATE + DATA LOADING
// ==========================================


// ==========================================
// SHORT DOM HELPER
// ==========================================

function $(id) {
    return document.getElementById(id);
}


// ==========================================
// GLOBAL STATE
// ==========================================

const state = {

    jobs: [],

    filteredJobs: [],

    savedJobs: [],

    avoidedJobs: [],

    currentJob: null,

    resumeFile: null,

    showSavedOnly: false,

    resume: {
        name: "",
        email: "",
        role: "",
        location: "",
        skills: ""
    },

    filters: {
        search: "",
        location: "",
        jobType: "",
        workMode: "",
        posted: "",
        skill: "",
        appStatus: "",
        minimum: 0,
        sort: "score"
    }

};


// ==========================================
// LOCAL STORAGE KEYS
// ==========================================

const STORAGE_KEYS = {

    saved: "jobRadarSavedJobs",

    avoided: "jobRadarAvoidedJobs",

    resume: "jobRadarResume",

    status: "jobRadarApplicationStatus"

};


// ==========================================
// LOAD DATA FROM LOCAL STORAGE
// ==========================================

function loadStorage(key, fallback) {

    try {

        const value =
            localStorage.getItem(key);

        if (!value) {

            return fallback;

        }

        return JSON.parse(value);

    } catch (error) {

        console.error(
            "Storage read error:",
            error
        );

        return fallback;

    }

}


// ==========================================
// SAVE DATA TO LOCAL STORAGE
// ==========================================

function saveStorage(key, value) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

    } catch (error) {

        console.error(
            "Storage save error:",
            error
        );

    }

}


// ==========================================
// CLEAN TEXT
// ==========================================

function cleanText(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)
        .replace(/\s+/g, " ")
        .trim();

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value) {

    return String(value ?? "")

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


// ==========================================
// GET UNIQUE JOB ID
// ==========================================

function getJobId(job) {

    if (!job) {

        return "";

    }

    return String(

        job.id ||

        job.job_id ||

        job.job_url ||

        `${job.company || "company"}-${job.title || "job"}`

    );

}


// ==========================================
// NORMALIZE JOB DATA
// ==========================================

function normalizeJob(job) {

    return {

        ...job,

        id: getJobId(job),

        title: cleanText(
            job.title
        ),

        company: cleanText(
            job.company
        ),

        location: cleanText(
            job.location
        ),

        description: cleanText(
            job.description
        ),

        source: cleanText(
            job.source
        ),

        job_type: cleanText(
            job.job_type
        ),

        job_url: cleanText(
            job.job_url
        ),

        date_posted: cleanText(
            job.date_posted
        ),

        score: Number(
            job.score || 0
        ),

        is_remote:
            Boolean(
                job.is_remote
            ),

        matched_skills:
            Array.isArray(
                job.matched_skills
            )
                ? job.matched_skills
                : []

    };

}


// ==========================================
// TOAST MESSAGE
// ==========================================

function showToast(message) {

    const toast = $("toast");

    if (!toast) {

        return;

    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(
        showToast.timer
    );

    showToast.timer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}


// ==========================================
// LIVE STATUS
// ==========================================

function setLiveStatus(
    message,
    type = "online"
) {

    const status =
        $("liveStatus");

    if (!status) {

        return;

    }

    status.textContent =
        message;

    const dot =
        status.parentElement?.querySelector(
            ".status-dot"
        );

    if (dot) {

        dot.classList.remove(
            "online",
            "loading",
            "error"
        );

        dot.classList.add(
            type
        );

    }

}


// ==========================================
// LOAD SAVED DATA
// ==========================================

function initializeState() {

    state.savedJobs =
        loadStorage(
            STORAGE_KEYS.saved,
            []
        );

    state.avoidedJobs =
        loadStorage(
            STORAGE_KEYS.avoided,
            []
        );

    state.resume =
        loadStorage(
            STORAGE_KEYS.resume,
            {
                name: "",
                email: "",
                role: "",
                location: "",
                skills: ""
            }
        );

    state.jobs = [];

    state.filteredJobs = [];

    state.currentJob = null;

    state.resumeFile = null;

}


// ==========================================
// LOAD JOBS FROM PROCESSED JSON
// ==========================================

async function loadJobs() {

    setLiveStatus(
        "Loading jobs...",
        "loading"
    );

    try {

        const response =
            await fetch(
                "/data/processed_jobs.json",
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const data =
            await response.json();

        let jobs = [];

        if (Array.isArray(data)) {

            jobs = data;

        }

        else if (
            Array.isArray(data.jobs)
        ) {

            jobs = data.jobs;

        }

        else {

            throw new Error(
                "Invalid job data format"
            );

        }

        state.jobs =
            jobs

                .map(
                    normalizeJob
                )

                .filter(
                    job => job.id
                );

        state.filteredJobs =
            [...state.jobs];

        setLiveStatus(
            `${state.jobs.length} jobs live`,
            "online"
        );

        updateAll();

    }

    catch (error) {

        console.error(
            "Job loading failed:",
            error
        );

        state.jobs = [];

        state.filteredJobs = [];

        setLiveStatus(
            "Job data unavailable",
            "error"
        );

        showToast(
            "Could not load job data"
        );

        updateAll();

    }

}


// ==========================================
// UPDATE EVERYTHING
// ==========================================

function updateAll() {

    if (
        typeof applyFilters ===
        "function"
    ) {

        applyFilters();

    }

    if (
        typeof updateDashboard ===
        "function"
    ) {

        updateDashboard();

    }

    if (
        typeof updateTracker ===
        "function"
    ) {

        updateTracker();

    }

    if (
        typeof updateResumeInsights ===
        "function"
    ) {

        updateResumeInsights();

    }

    if (
        typeof updateAvoidList ===
        "function"
    ) {

        updateAvoidList();

    }

}


// ==========================================
// PART 1 END
// ========================================== 
//// ==========================================
// PART 2 — FILTERS + SEARCH
// ==========================================

function getFilterValue(id) {
    const element = $(id);

    if (!element) {
        return "";
    }

    return String(element.value || "").trim();
}

function isSaved(job) {
    const id = getJobId(job);
    return state.savedJobs.includes(id);
}

function isAvoided(job) {
    const id = getJobId(job);
    return state.avoidedJobs.includes(id);
}

function getApplicationStatus(jobId) {
    const statuses = loadStorage(
        STORAGE_KEYS.status,
        {}
    );

    return statuses[jobId] || "saved";
}

function setApplicationStatus(jobId, status) {

    const statuses = loadStorage(
        STORAGE_KEYS.status,
        {}
    );

    if (!status || status === "saved") {
        delete statuses[jobId];
    } else {
        statuses[jobId] = status;
    }

    saveStorage(
        STORAGE_KEYS.status,
        statuses
    );
}


// ==========================================
// JOB SEARCH TEXT
// ==========================================

function getJobSearchText(job) {

    const skills = [
        ...(Array.isArray(job.matched_skills)
            ? job.matched_skills
            : []),

        ...(Array.isArray(job.skills)
            ? job.skills
            : [])
    ];

    return [
        job.title,
        job.company,
        job.location,
        job.description,
        job.job_type,
        job.source,
        ...skills
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}


// ==========================================
// SKILL MATCH
// ==========================================

function matchesSkill(job, skillInput) {

    const skill = String(skillInput || "")
        .trim()
        .toLowerCase();

    if (!skill) {
        return true;
    }

    const text = getJobSearchText(job);

    const skillGroups = {

        iot: [
            "iot",
            "internet of things",
            "embedded",
            "embedded systems",
            "esp32",
            "arduino",
            "raspberry pi",
            "firmware",
            "microcontroller",
            "sensors"
        ],

        python: [
            "python"
        ],

        java: [
            "java"
        ],

        sql: [
            "sql",
            "mysql",
            "postgresql"
        ],

        javascript: [
            "javascript",
            "typescript",
            "node.js",
            "node"
        ],

        embedded: [
            "embedded",
            "embedded systems",
            "firmware",
            "microcontroller",
            "esp32",
            "arduino",
            "raspberry pi"
        ],

        electronics: [
            "electronics",
            "embedded",
            "microcontroller",
            "circuit",
            "pcb",
            "hardware"
        ]
    };

    const keywords =
        skillGroups[skill] || [skill];

    return keywords.some(keyword =>
        text.includes(keyword)
    );
}


// ==========================================
// APPLY FILTERS
// ==========================================

function applyFilters() {

    let jobs = [...state.jobs];

    const search =
        getFilterValue("search").toLowerCase();

    const location =
        getFilterValue("location").toLowerCase();

    const jobType =
        getFilterValue("jobType").toLowerCase();

    const workMode =
        getFilterValue("workMode").toLowerCase();

    const posted =
        getFilterValue("posted");

    const skill =
        getFilterValue("skill").toLowerCase();

    const appStatus =
        getFilterValue("appStatus").toLowerCase();

    const minimum =
        Number(getFilterValue("minimum") || 0);


    // Remove avoided jobs
    jobs = jobs.filter(
        job => !isAvoided(job)
    );


    // Saved only
    if (state.showSavedOnly) {

        jobs = jobs.filter(
            job => isSaved(job)
        );
    }


    // ======================================
    // SEARCH
    // ======================================

    if (search) {

        const words =
            search
                .split(/\s+/)
                .filter(Boolean);

        jobs = jobs.filter(job => {

            const text =
                getJobSearchText(job);

            return words.every(word =>
                text.includes(word)
            );
        });
    }


    // ======================================
    // LOCATION
    // ======================================

    if (location) {

        jobs = jobs.filter(job => {

            const jobLocation =
                String(job.location || "")
                    .toLowerCase();

            return jobLocation.includes(
                location
            );
        });
    }


    // ======================================
    // JOB TYPE
    // ======================================

    if (jobType) {

        jobs = jobs.filter(job => {

            const text =
                getJobSearchText(job);

            return text.includes(jobType);
        });
    }


    // ======================================
    // WORK MODE
    // ======================================

    if (workMode) {

        jobs = jobs.filter(job => {

            const text =
                getJobSearchText(job);

            if (workMode === "remote") {
                return Boolean(job.is_remote);
            }

            if (workMode === "hybrid") {
                return text.includes("hybrid");
            }

            if (workMode === "onsite") {
                return (
                    !Boolean(job.is_remote) &&
                    !text.includes("hybrid")
                );
            }

            return true;
        });
    }


    // ======================================
    // SKILL
    // ======================================

    if (skill) {

        jobs = jobs.filter(job =>
            matchesSkill(job, skill)
        );
    }


    // ======================================
    // MINIMUM SCORE
    // ======================================

    if (minimum > 0) {

        jobs = jobs.filter(job =>
            Number(job.score || 0) >= minimum
        );
    }


    // ======================================
    // APPLICATION STATUS
    // ======================================

    if (appStatus) {

        jobs = jobs.filter(job => {

            const status =
                getApplicationStatus(
                    getJobId(job)
                ).toLowerCase();

            return status === appStatus;
        });
    }


    // ======================================
    // POSTED DATE
    // ======================================

    if (posted) {

        const days = Number(posted);

        if (days > 0) {

            const cutoff =
                Date.now() -
                days *
                24 *
                60 *
                60 *
                1000;

            jobs = jobs.filter(job => {

                const date =
                    new Date(
                        job.date_posted
                    ).getTime();

                if (Number.isNaN(date)) {
                    return true;
                }

                return date >= cutoff;
            });
        }
    }


    // ======================================
    // SORT
    // ======================================

    const sort =
        getFilterValue("sort") || "score";


    if (sort === "score") {

        jobs.sort((a, b) =>
            Number(b.score || 0) -
            Number(a.score || 0)
        );

    } else if (sort === "newest") {

        jobs.sort((a, b) =>
            new Date(b.date_posted || 0) -
            new Date(a.date_posted || 0)
        );

    } else if (sort === "company") {

        jobs.sort((a, b) =>
            String(a.company || "")
                .localeCompare(
                    String(b.company || "")
                )
        );

    } else if (sort === "title") {

        jobs.sort((a, b) =>
            String(a.title || "")
                .localeCompare(
                    String(b.title || "")
                )
        );
    }


    state.filteredJobs = jobs;

    renderJobs();
}


// ==========================================
// CLEAR FILTERS
// ==========================================

function clearFilters() {

    const ids = [
        "search",
        "location",
        "jobType",
        "workMode",
        "posted",
        "skill",
        "appStatus",
        "minimum"
    ];

    ids.forEach(id => {

        const element = $(id);

        if (element) {
            element.value = "";
        }
    });


    const sort = $("sort");

    if (sort) {
        sort.value = "score";
    }


    state.showSavedOnly = false;


    const savedButton =
        $("showSaved");

    if (savedButton) {
        savedButton.classList.remove(
            "active"
        );
    }


    applyFilters();

    showToast("Filters cleared");
}


// ==========================================
// FILTER EVENTS
// ==========================================

function bindFilterEvents() {

    const filterIds = [
        "search",
        "location",
        "jobType",
        "workMode",
        "posted",
        "skill",
        "appStatus",
        "minimum",
        "sort"
    ];


    filterIds.forEach(id => {

        const element = $(id);

        if (!element) {
            return;
        }

        element.addEventListener(
            "input",
            applyFilters
        );

        element.addEventListener(
            "change",
            applyFilters
        );
    });


    const clearButton =
        $("clearFilters");

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            clearFilters
        );
    }


    const savedButton =
        $("showSaved");

    if (savedButton) {

        savedButton.addEventListener(
            "click",
            () => {

                state.showSavedOnly =
                    !state.showSavedOnly;

                savedButton.classList.toggle(
                    "active",
                    state.showSavedOnly
                );

                applyFilters();
            }
        );
    }
}


       
    
                    
       
    



// ==========================================
// PART 2 END
// ==========================================// ==========================================
// PART 3 — JOB LIST + JOB CARDS
// ==========================================

function renderJobs() {

    const results = $("results");
    const resultCount = $("resultCount");
    const emptyState = $("emptyState");

    if (!results) {
        return;
    }

    const jobs = state.filteredJobs || [];

    if (resultCount) {
        resultCount.textContent =
            `${jobs.length} job${jobs.length === 1 ? "" : "s"} found`;
    }

    if (!jobs.length) {

        results.innerHTML = "";

        if (emptyState) {
            emptyState.hidden = false;
        }

        return;
    }

    if (emptyState) {
        emptyState.hidden = true;
    }

    results.innerHTML =
        jobs.map(renderJobCard).join("");
}


function renderJobCard(job) {

    const id = getJobId(job);

    const saved = isSaved(job);

    const status =
        getApplicationStatus(id);

    const score =
        Number(job.score || 0);

    const skills =
        Array.isArray(job.matched_skills)
            ? job.matched_skills
            : [];

    const description =
        cleanText(job.description);


    return `
        <article
            class="job-card"
            data-job-id="${escapeHTML(id)}">

            <div class="job-card-top">

                <div>
                    <div class="job-company">
                        ${escapeHTML(
                            job.company || "Unknown Company"
                        )}
                    </div>

                    <h3 class="job-title">
                        ${escapeHTML(
                            job.title || "Untitled Job"
                        )}
                    </h3>
                </div>

                <div class="job-score">
                    ${score}
                </div>

            </div>


            <div class="job-meta">

                <span>
                    ${escapeHTML(
                        job.location || "India"
                    )}
                </span>

                <span>
                    ${escapeHTML(
                        job.source || "Job Board"
                    )}
                </span>

                <span>
                    ${job.is_remote
                        ? "Remote"
                        : "On-site"}
                </span>

            </div>


            <div class="job-score-track">

                <div
                    class="job-score-fill"
                    style="width:${Math.min(
                        Math.max(score, 0),
                        100
                    )}%">
                </div>

            </div>


            <div class="job-card-body">

                <p class="job-description-preview">
                    ${escapeHTML(
                        description.length > 220
                            ? description.slice(0, 220) + "..."
                            : description
                    )}
                </p>


                <div class="job-tags">

                    ${skills
                        .slice(0, 6)
                        .map(skill => `
                            <span class="job-tag">
                                ${escapeHTML(skill)}
                            </span>
                        `)
                        .join("")}

                </div>

            </div>


            <div class="job-card-footer">

                <select
                    class="job-status"
                    data-action="status"
                    data-job-id="${escapeHTML(id)}">

                    <option
                        value="saved"
                        ${status === "saved" ? "selected" : ""}>
                        Saved
                    </option>

                    <option
                        value="applied"
                        ${status === "applied" ? "selected" : ""}>
                        Applied
                    </option>

                    <option
                        value="interview"
                        ${status === "interview" ? "selected" : ""}>
                        Interview
                    </option>

                    <option
                        value="closed"
                        ${status === "closed" ? "selected" : ""}>
                        Closed
                    </option>

                </select>


                <div class="job-actions">

                    <button
                        class="job-action"
                        data-action="save"
                        data-job-id="${escapeHTML(id)}">

                        ${saved ? "Saved" : "Save"}

                    </button>

                    <button
                        class="job-action"
                        data-action="view"
                        data-job-id="${escapeHTML(id)}">

                        View

                    </button>

                </div>

            </div>

        </article>
    `;
}


function handleJobAction(action, jobId) {

    const job =
        state.jobs.find(item => {
            return getJobId(item) === jobId;
        });

    if (!job) {
        return;
    }


    if (action === "view") {

        openJobModal(job);

        return;
    }


    if (action === "save") {

        toggleSaved(job);

        return;
    }
}


// ------------------------------------------
// Job list events
// ------------------------------------------

function bindJobResultEvents() {

    const results = $("results");

    if (!results) {
        return;
    }


    results.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );

            if (!button) {
                return;
            }

            const action =
                button.dataset.action;

            const jobId =
                button.dataset.jobId;

            if (action === "status") {
                return;
            }

            handleJobAction(
                action,
                jobId
            );
        }
    );


    results.addEventListener(
        "change",
        event => {

            const select =
                event.target.closest(
                    '[data-action="status"]'
                );

            if (!select) {
                return;
            }

            const jobId =
                select.dataset.jobId;

            const status =
                select.value;

            setApplicationStatus(
                jobId,
                status
            );

            updateTracker();

            updateDashboard();

            showToast(
                `Status updated to ${status}`
            );
        }
    );
}

// ==========================================
// PART 3 END
// ==========================================// ==========================================
// JOB RADAR — PART 4/10
// JOB DETAILS MODAL
// ==========================================

function openJobModal(job) {

    const modal = $("modal");

    if (!modal || !job) {
        return;
    }

    state.currentJob = job;


    // --------------------------------------
    // Company
    // --------------------------------------

    if ($("mCompany")) {
        $("mCompany").textContent =
            job.company || "Unknown Company";
    }


    // --------------------------------------
    // Title
    // --------------------------------------

    if ($("mTitle")) {
        $("mTitle").textContent =
            job.title || "Untitled Job";
    }


    // --------------------------------------
    // Meta
    // --------------------------------------

    if ($("mMeta")) {

        const meta = [
            job.location || "India",
            job.source || "Job Board",
            job.is_remote
                ? "Remote"
                : "On-site",
            job.date_posted || ""
        ].filter(Boolean);

        $("mMeta").textContent =
            meta.join(" • ");
    }


    // --------------------------------------
    // Score
    // --------------------------------------

    const score =
        Number(job.score || 0);

    if ($("mScore")) {
        $("mScore").textContent =
            score;
    }

    if ($("mBar")) {

        $("mBar").style.width =
            `${Math.min(
                Math.max(score, 0),
                100
            )}%`;
    }


    // --------------------------------------
    // Match reasons
    // --------------------------------------

    if ($("mReasons")) {

        const reasons = [];

        if (job.relevant) {
            reasons.push(
                "Relevant to your selected job search."
            );
        }

        if (score >= 80) {
            reasons.push(
                "Strong match score."
            );
        }

        if (job.is_remote) {
            reasons.push(
                "Remote opportunity."
            );
        }

        if (!reasons.length) {
            reasons.push(
                "Review the job details before applying."
            );
        }

        $("mReasons").innerHTML =
            reasons
                .map(reason => `
                    <li>
                        ${escapeHTML(reason)}
                    </li>
                `)
                .join("");
    }


    // --------------------------------------
    // Skills
    // --------------------------------------

    if ($("mSkills")) {

        const skills =
            Array.isArray(job.matched_skills)
                ? job.matched_skills
                : [];

        $("mSkills").innerHTML =
            skills.length
                ? skills.map(skill => `
                    <span class="job-tag">
                        ${escapeHTML(skill)}
                    </span>
                `).join("")
                : `<span class="job-tag">
                    Skills not specified
                   </span>`;
    }


    // --------------------------------------
    // Description
    // --------------------------------------

    if ($("mDescription")) {

        $("mDescription").textContent =
            job.description ||
            "No description available.";
    }


    // --------------------------------------
    // Status
    // --------------------------------------

    if ($("mStatus")) {

        $("mStatus").value =
            getApplicationStatus(
                getJobId(job)
            );
    }


    // --------------------------------------
    // Save button
    // --------------------------------------

    if ($("mSave")) {

        $("mSave").textContent =
            isSaved(job)
                ? "Saved"
                : "Save Job";
    }


    // --------------------------------------
    // Open job button
    // --------------------------------------

    if ($("mOpen")) {

        $("mOpen").onclick = () => {

            if (job.job_url) {

                window.open(
                    job.job_url,
                    "_blank",
                    "noopener,noreferrer"
                );

            } else {

                showToast(
                    "Job link unavailable"
                );
            }
        };
    }


    // --------------------------------------
    // Show modal
    // --------------------------------------

    modal.classList.add("show");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );
}


function closeJobModal() {

    const modal = $("modal");

    if (!modal) {
        return;
    }

    modal.classList.remove("show");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    state.currentJob = null;
}


// ------------------------------------------
// Modal events
// ------------------------------------------

function bindModalEvents() {

    const modal =
        $("modal");

    if (!modal) {
        return;
    }


    const closeButton =
        $("closeModal");

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeJobModal
        );
    }


    // Close when clicking outside modal card
    modal.addEventListener(
        "click",
        event => {

            if (event.target === modal) {
                closeJobModal();
            }

        }
    );


    // Save job
    const saveButton =
        $("mSave");

    if (saveButton) {

        saveButton.addEventListener(
            "click",
            () => {

                if (!state.currentJob) {
                    return;
                }

                toggleSaved(
                    state.currentJob
                );

                saveButton.textContent =
                    isSaved(
                        state.currentJob
                    )
                        ? "Saved"
                        : "Save Job";
            }
        );
    }


    // Avoid job
    const avoidButton =
        $("mAvoid");

    if (avoidButton) {

        avoidButton.addEventListener(
            "click",
            () => {

                if (!state.currentJob) {
                    return;
                }

                avoidJob(
                    state.currentJob
                );

                closeJobModal();
            }
        );
    }


    // Application status
    const status =
        $("mStatus");

    if (status) {

        status.addEventListener(
            "change",
            () => {

                if (!state.currentJob) {
                    return;
                }

                const jobId =
                    getJobId(
                        state.currentJob
                    );

                setApplicationStatus(
                    jobId,
                    status.value
                );

                updateTracker();

                updateDashboard();

                renderJobs();

                showToast(
                    "Application status updated"
                );
            }
        );
    }


    // Escape key
    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {
                closeJobModal();
            }

        }
    );
}


// ==========================================
// PART 4 END
// ==========================================// ==========================================
// PART 5 — SAVE / AVOID JOBS
// ==========================================

function toggleSaved(job) {

    if (!job) {
        return;
    }

    const id = getJobId(job);

    if (!id) {
        return;
    }

    const index =
        state.savedJobs.indexOf(id);

    if (index === -1) {
        state.savedJobs.push(id);
        showToast("Job saved");
    } else {
        state.savedJobs.splice(index, 1);
        showToast("Job removed from saved");
    }

    saveStorage(
        STORAGE_KEYS.saved,
        state.savedJobs
    );

    renderJobs();
    updateDashboard();
    updateTracker();
}

function avoidJob(job) {
    if (!job) {
        return;
    }

    const id = getJobId(job);

    if (!id) {
        return;
    }

    if (!state.avoidedJobs.includes(id)) {
        state.avoidedJobs.push(id);
    }

    saveStorage(
        STORAGE_KEYS.avoided,
        state.avoidedJobs
    );

    state.filteredJobs =
        state.filteredJobs.filter(item =>
            getJobId(item) !== id
        );

    renderJobs();
    updateAvoidList();
    updateDashboard();

    showToast("Job moved to avoid list");
}

function restoreAvoidedJob(jobId) {
    const index =
        state.avoidedJobs.indexOf(jobId);

    if (index === -1) {
        return;
    }

    state.avoidedJobs.splice(
        index,
        1
    );

    saveStorage(
        STORAGE_KEYS.avoided,
        state.avoidedJobs
    );

    applyFilters();
    updateAvoidList();

    showToast("Job restored");
}

function updateAvoidList() {
    const list = $("avoidList");
    const count = $("avoidCount");

    if (!list) {
        return;
    }

    if (count) {
        count.textContent =
            state.avoidedJobs.length;
    }

    if (!state.avoidedJobs.length) {
        list.innerHTML = `
            <div class="empty-mini">
                No avoided jobs yet.
            </div>
        `;
        return;
    }

    list.innerHTML =
        state.avoidedJobs.map(jobId => {

            const job =
                state.jobs.find(item =>
                    getJobId(item) === jobId
                );

            if (!job) {
                return `
                    <div class="avoid-item">
                        <span>
                            Job ${escapeHTML(jobId)}
                        </span>

                        <button
                            type="button"
                            data-restore-job="${escapeHTML(jobId)}">
                            Restore
                        </button>
                    </div>
                `;
            }

            return `
                <div class="avoid-item">

                    <div>
                        <strong>
                            ${escapeHTML(
                                job.title ||
                                "Untitled Job"
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                job.company ||
                                "Unknown Company"
                            )}
                        </span>
                    </div>

                    <button
                        type="button"
                        data-restore-job="${escapeHTML(jobId)}">
                        Restore
                    </button>

                </div>
            `;
        }).join("");
}

function bindAvoidListEvents() {
    const list = $("avoidList");

    if (!list) {
        return;
    }

    list.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-restore-job]"
                );

            if (!button) {
                return;
            }

            restoreAvoidedJob(
                button.dataset.restoreJob
            );
        }
    );
}

// ==========================================
// PART 5 END
// ==========================================// ==========================================
// PART 6 — APPLICATION TRACKER
// ==========================================

function createTrackerJobCard(job) {

    const id =
        getJobId(job);

    const status =
        getApplicationStatus(id);

    return `
        <div class="tracker-job-card">

            <div class="tracker-job-company">
                ${escapeHTML(
                    job.company ||
                    "Unknown Company"
                )}
            </div>

            <div class="tracker-job-title">
                ${escapeHTML(
                    job.title ||
                    "Untitled Job"
                )}
            </div>

            <div class="tracker-job-meta">
                ${escapeHTML(
                    job.location ||
                    "India"
                )}
            </div>

            <div class="tracker-job-score">
                Match Score:
                <strong>
                    ${Number(job.score || 0)}
                </strong>
            </div>

            <div class="tracker-job-status">
                ${escapeHTML(status)}
            </div>

            <button
                class="secondary-btn tracker-view-btn"
                data-tracker-id="${escapeHTML(id)}">
                View Job
            </button>

        </div>
    `;
}

function updateTracker() {

    const savedContainer =
        $("trackerSaved");

    const appliedContainer =
        $("trackerApplied");

    const interviewContainer =
        $("trackerInterview");

    const closedContainer =
        $("trackerClosed");

    if (
        !savedContainer ||
        !appliedContainer ||
        !interviewContainer ||
        !closedContainer
    ) {
        return;
    }

    const savedJobs = [];
    const appliedJobs = [];
    const interviewJobs = [];
    const closedJobs = [];

    state.jobs.forEach(job => {

        if (isAvoided(job)) {
            return;
        }

        const id =
            getJobId(job);

        const status =
            getApplicationStatus(id);

        if (status === "applied") {

            appliedJobs.push(job);

        } else if (status === "interview") {

            interviewJobs.push(job);

        } else if (status === "closed") {

            closedJobs.push(job);

        } else if (isSaved(job)) {

            savedJobs.push(job);
        }
    });

    // --------------------------------------
    // Summary counters
    // --------------------------------------

    if ($("cSaved")) {
        $("cSaved").textContent =
            savedJobs.length;
    }

    if ($("cApplied")) {
        $("cApplied").textContent =
            appliedJobs.length;
    }

    if ($("cInterview")) {
        $("cInterview").textContent =
            interviewJobs.length;
    }

    if ($("cClosed")) {
        $("cClosed").textContent =
            closedJobs.length;
    }

    // --------------------------------------
    // Column counters
    // --------------------------------------

    if ($("colSaved")) {
        $("colSaved").textContent =
            savedJobs.length;
    }

    if ($("colApplied")) {
        $("colApplied").textContent =
            appliedJobs.length;
    }

    if ($("colInterview")) {
        $("colInterview").textContent =
            interviewJobs.length;
    }

    if ($("colClosed")) {
        $("colClosed").textContent =
            closedJobs.length;
    }

    // --------------------------------------
    // Saved column
    // --------------------------------------

    savedContainer.innerHTML =
        savedJobs.length

            ? savedJobs
                .map(createTrackerJobCard)
                .join("")

            : `
                <div class="tracker-empty">
                    No saved jobs yet.
                </div>
            `;

    // --------------------------------------
    // Applied column
    // --------------------------------------

    appliedContainer.innerHTML =
        appliedJobs.length

            ? appliedJobs
                .map(createTrackerJobCard)
                .join("")

            : `
                <div class="tracker-empty">
                    No applied jobs yet.
                </div>
            `;

    // --------------------------------------
    // Interview column
    // --------------------------------------

    interviewContainer.innerHTML =
        interviewJobs.length

            ? interviewJobs
                .map(createTrackerJobCard)
                .join("")

            : `
                <div class="tracker-empty">
                    No interview jobs yet.
                </div>
            `;

    // --------------------------------------
    // Closed column
    // --------------------------------------

    closedContainer.innerHTML =
        closedJobs.length

            ? closedJobs
                .map(createTrackerJobCard)
                .join("")

            : `
                <div class="tracker-empty">
                    No closed jobs yet.
                </div>
            `;
}

function bindTrackerEvents() {

    const trackerBoard =
        $("trackerBoard");

    if (!trackerBoard) {
        return;
    }

    trackerBoard.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".tracker-view-btn"
                );

            if (!button) {
                return;
            }

            const jobId =
                button.dataset.trackerId;

            const job =
                state.jobs.find(item => {

                    return (
                        getJobId(item) ===
                        jobId
                    );

                });

            if (job) {
                openJobModal(job);
            }

        }
    );
}

// ==========================================
// PART 6 END
// ==========================================// ==========================================
// PART 7 — RESUME PROFILE + RESUME MATCH
// ==========================================

function fillResumeForm() {
    const resume = state.resume || {};

    if ($("resumeName")) $("resumeName").value = resume.name || "";
    if ($("resumeEmail")) $("resumeEmail").value = resume.email || "";
    if ($("resumeRole")) $("resumeRole").value = resume.role || "";
    if ($("resumeLocation")) $("resumeLocation").value = resume.location || "";
    if ($("resumeSkills")) $("resumeSkills").value = resume.skills || "";

    updateResumeStatus();
}

function saveResumeProfile() {
    state.resume = {
        name: cleanText($("resumeName")?.value),
        email: cleanText($("resumeEmail")?.value),
        role: cleanText($("resumeRole")?.value),
        location: cleanText($("resumeLocation")?.value),
        skills: cleanText($("resumeSkills")?.value)
    };

    saveStorage(STORAGE_KEYS.resume, state.resume);

    updateResumeStatus();
    updateResumeInsights();
    updateCareerInsights();

    showToast("Resume profile saved");
}

function clearResumeProfile() {
    state.resume = {
        name: "",
        email: "",
        role: "",
        location: "",
        skills: ""
    };

    saveStorage(STORAGE_KEYS.resume, state.resume);

    fillResumeForm();
    updateResumeInsights();
    updateCareerInsights();

    showToast("Resume profile cleared");
}

function updateResumeStatus() {
    const status = $("resumeStatus");
    if (!status) return;

    const hasProfile =
        state.resume.name ||
        state.resume.email ||
        state.resume.role ||
        state.resume.location ||
        state.resume.skills;

    if (state.resumeFile) {
        status.textContent = `Resume selected: ${state.resumeFile.name}`;
    } else if (hasProfile) {
        status.textContent = "Resume profile saved";
    } else {
        status.textContent = "No resume added yet";
    }
}

function getResumeSkills() {
    const text = cleanText(state.resume.skills).toLowerCase();

    if (!text) return [];

    return text
        .split(/[,;\n|]+/)
        .map(skill => skill.trim())
        .filter(Boolean);
}

function getJobSkills(job) {
    const skills = [];

    if (Array.isArray(job.matched_skills)) {
        skills.push(...job.matched_skills);
    }

    const description = cleanText(job.description).toLowerCase();

    const knownSkills = [
        "python",
        "java",
        "javascript",
        "typescript",
        "c",
        "c++",
        "c#",
        "sql",
        "html",
        "css",
        "react",
        "node.js",
        "node",
        "git",
        "github",
        "firebase",
        "mongodb",
        "mysql",
        "postgresql",
        "aws",
        "azure",
        "docker",
        "linux",
        "embedded",
        "iot",
        "arduino",
        "esp32",
        "raspberry pi",
        "machine learning",
        "data analysis",
        "pandas",
        "numpy"
    ];

    knownSkills.forEach(skill => {
        if (description.includes(skill.toLowerCase())) {
            skills.push(skill);
        }
    });

    return [...new Set(
        skills
            .map(skill => cleanText(skill))
            .filter(Boolean)
    )];
}

function calculateResumeMatch(job) {
    const resumeSkills = getResumeSkills();

    if (!resumeSkills.length) {
        return {
            percent: 0,
            matched: [],
            missing: getJobSkills(job).slice(0, 8)
        };
    }

    const jobSkills = getJobSkills(job);

    if (!jobSkills.length) {
        return {
            percent: 0,
            matched: [],
            missing: []
        };
    }

    const matched = [];

    resumeSkills.forEach(resumeSkill => {
        const resumeSkillLower = resumeSkill.toLowerCase();

        const found = jobSkills.some(jobSkill => {
            const jobSkillLower = jobSkill.toLowerCase();

            return (
                jobSkillLower === resumeSkillLower ||
                jobSkillLower.includes(resumeSkillLower) ||
                resumeSkillLower.includes(jobSkillLower)
            );
        });

        if (found) {
            matched.push(resumeSkill);
        }
    });

    const missing = jobSkills.filter(jobSkill => {
        return !matched.some(
            skill => skill.toLowerCase() === jobSkill.toLowerCase()
        );
    });

    const percent = Math.round(
        (matched.length / jobSkills.length) * 100
    );

    return {
        percent: Math.min(100, percent),
        matched,
        missing
    };
}

function updateResumeInsights() {
    const resultBox = $("resumeMatch");
    const strengthBox = $("profileStrength");
    const suggestedSkill = $("suggestedSkill");
    const matchingJobs = $("matchingJobs");

    const resumeSkills = getResumeSkills();

    if (strengthBox) {
        let strength = 0;

        if (state.resume.name) strength += 20;
        if (state.resume.email) strength += 20;
        if (state.resume.role) strength += 20;
        if (state.resume.location) strength += 10;
        if (resumeSkills.length >= 3) strength += 15;
        if (resumeSkills.length >= 6) strength += 15;

        strengthBox.textContent = `${strength}%`;
    }

    if (suggestedSkill) {
        const skillCounts = {};

        state.jobs.forEach(job => {
            getJobSkills(job).forEach(skill => {
                const key = skill.toLowerCase();

                if (!resumeSkills.some(
                    resumeSkill =>
                        resumeSkill.toLowerCase() === key
                )) {
                    skillCounts[skill] =
                        (skillCounts[skill] || 0) + 1;
                }
            });
        });

        const topMissing = Object.entries(skillCounts)
            .sort((a, b) => b[1] - a[1])[0];

        suggestedSkill.textContent = topMissing
            ? topMissing[0]
            : "Build your core skills";
    }

    const jobsWithMatch = state.jobs
        .filter(job => !isAvoided(job))
        .map(job => ({
            job,
            match: calculateResumeMatch(job)
        }))
        .filter(item => item.match.percent > 0)
        .sort((a, b) => {
            return b.match.percent - a.match.percent;
        })
        .slice(0, 5);

    if (matchingJobs) {
        if (!jobsWithMatch.length) {
            matchingJobs.innerHTML = `
                <div class="match-placeholder">
                    Add your skills to see matching jobs.
                </div>
            `;
        } else {
            matchingJobs.innerHTML = jobsWithMatch.map(item => `
                <div class="resume-match-result">
                    <div class="resume-match-header">
                        <div>
                            <strong>${escapeHTML(item.job.title)}</strong>
                            <span>${escapeHTML(item.job.company)}</span>
                        </div>

                        <div class="resume-match-percent">
                            ${item.match.percent}%
                        </div>
                    </div>

                    <div class="resume-match-details">
                        ${item.match.matched.length
                            ? `Matched: ${escapeHTML(
                                item.match.matched.join(", ")
                            )}`
                            : "No direct skill match"}
                    </div>

                    <button
                        class="secondary-btn resume-view-job"
                        data-job-id="${escapeHTML(getJobId(item.job))}"
                    >
                        View Job
                    </button>
                </div>
            `).join("");
        }
    }

    if (resultBox) {
        const best = jobsWithMatch[0];

        if (!best) {
            resultBox.innerHTML = `
                <div class="match-placeholder">
                    Add your resume skills to calculate job matches.
                </div>
            `;
            return;
        }

        resultBox.innerHTML = `
            <div class="resume-match-result">
                <div class="resume-match-header">
                    <div>
                        <span>Best resume match</span>
                        <strong>
                            ${escapeHTML(best.job.title)}
                        </strong>
                    </div>

                    <div class="resume-match-percent">
                        ${best.match.percent}%
                    </div>
                </div>

                <div class="resume-match-details">
                    ${best.match.matched.length
                        ? `Matched skills: ${escapeHTML(
                            best.match.matched.join(", ")
                        )}`
                        : "Add more skills to improve your match."}
                </div>
            </div>
        `;
    }
}

function bindResumeInsightEvents() {
    const matchingJobs = $("matchingJobs");

    if (matchingJobs) {
        matchingJobs.addEventListener("click", event => {
            const button = event.target.closest(".resume-view-job");

            if (!button) return;

            const jobId = button.dataset.jobId;

            const job = state.jobs.find(
                item => getJobId(item) === jobId
            );

            if (job) {
                openJobModal(job);
            }
        });
    }
}// ==========================================
// PART 8 — AI CAREER AGENT + SKILL GAP
// ==========================================

function getSkillGapData() {
    const resumeSkills = getResumeSkills();

    const frequency = {};

    state.jobs
        .filter(job => !isAvoided(job))
        .forEach(job => {
            getJobSkills(job).forEach(skill => {
                const key = skill.toLowerCase();

                if (!resumeSkills.some(
                    resumeSkill =>
                        resumeSkill.toLowerCase() === key
                )) {
                    frequency[skill] =
                        (frequency[skill] || 0) + 1;
                }
            });
        });

    return Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([skill, count]) => ({
            skill,
            count
        }));
}

function renderSkillGap() {
    const box = $("skillGap");

    if (!box) return;

    const gaps = getSkillGapData();

    if (!gaps.length) {
        box.innerHTML = `
            <div class="match-placeholder">
                Add resume skills to generate your skill gap.
            </div>
        `;
        return;
    }

    box.innerHTML = gaps.map(item => `
        <div class="skill-row">
            <div>
                <strong>${escapeHTML(item.skill)}</strong>
                <span>${item.count} matching jobs</span>
            </div>

            <div class="skill-row-bar">
                <div
                    class="skill-row-fill"
                    style="width:${Math.min(
                        100,
                        item.count * 10
                    )}%"
                ></div>
            </div>
        </div>
    `).join("");
}

function generateCareerAdvice() {
    const output = $("agentOutput");

    if (!output) return;

    const resumeSkills = getResumeSkills();
    const gaps = getSkillGapData();

    const role = cleanText(state.resume.role);

    let advice = "";

    if (!resumeSkills.length) {
        advice = `
            <strong>Start with your career profile.</strong>
            <p>
                Add your role and technical skills first.
                Then Job Radar can identify matching jobs,
                skill gaps and learning priorities.
            </p>
        `;
    } else if (gaps.length) {
        const topSkills = gaps
            .slice(0, 3)
            .map(item => item.skill)
            .join(", ");

        advice = `
            <strong>Your next skill focus</strong>
            <p>
                ${role
                    ? `For ${escapeHTML(role)},`
                    : "Based on current job data,"}
                focus on
                <b>${escapeHTML(topSkills)}</b>.
                These skills appear frequently in the jobs
                currently available in your dataset.
            </p>
        `;
    } else {
        advice = `
            <strong>Your profile is matching well.</strong>
            <p>
                Keep your skills updated and continue tracking
                new opportunities.
            </p>
        `;
    }

    output.innerHTML = advice;
}

function generateInterviewPrep() {
    const output = $("agentOutput");

    if (!output) return;

    const role =
        cleanText(state.resume.role) ||
        "your target role";

    const skills = getResumeSkills();

    const skillText = skills.length
        ? skills.slice(0, 5).join(", ")
        : "your core technical skills";

    output.innerHTML = `
        <strong>Interview preparation</strong>

        <p>
            Prepare examples around:
            <b>${escapeHTML(skillText)}</b>.
        </p>

        <ul>
            <li>Explain one project from problem to result.</li>
            <li>Revise the fundamentals required for ${escapeHTML(role)}.</li>
            <li>Be ready to explain your technical decisions.</li>
            <li>Practice short, clear answers with examples.</li>
        </ul>
    `;
}

function updateCareerInsights() {
    const careerBox = $("careerInsights");

    if (careerBox) {
        const jobs =
            state.jobs.filter(job => !isAvoided(job));

        const strongMatches =
            jobs.filter(
                job => Number(job.score) >= 80
            ).length;

        const gaps =
            getSkillGapData();

        careerBox.innerHTML = `
            <div class="insight-card">
                <span class="insight-label">Strong matches</span>
                <strong>${strongMatches}</strong>
                <p>Jobs scoring 80 or above.</p>
            </div>

            <div class="insight-card">
                <span class="insight-label">Skill gaps</span>
                <strong>${gaps.length}</strong>
                <p>Skills frequently requested by jobs.</p>
            </div>
        `;
    }

    renderSkillGap();
}// ==========================================
// PART 9 — RESUME UPLOAD + RESUME MODAL
// ==========================================

function openResumeModal() {
    const modal = $("resumeModal");

    if (!modal) return;

    modal.classList.add("show");
    document.body.classList.add("modal-open");

    updateResumeStatus();
}

function closeResumeModal() {
    const modal = $("resumeModal");

    if (!modal) return;

    modal.classList.remove("show");
    document.body.classList.remove("modal-open");
}

function handleResumeFileSelection(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    state.resumeFile = file;

    const mainFileName = $("resumeFileName");
    const modalFileName = $("resumeModalFileName");

    if (mainFileName) {
        mainFileName.textContent = file.name;
    }

    if (modalFileName) {
        modalFileName.textContent = file.name;
    }

    updateResumeStatus();

    showToast("Resume selected");
}

function uploadResumeFile() {
    const fileInput = $("resumeFile");

    if (!fileInput || !fileInput.files?.length) {
        showToast("Please choose a resume first");
        return;
    }

    const file = fileInput.files[0];

    state.resumeFile = file;

    const mainFileName = $("resumeFileName");
    const modalFileName = $("resumeModalFileName");

    if (mainFileName) {
        mainFileName.textContent = file.name;
    }

    if (modalFileName) {
        modalFileName.textContent = file.name;
    }

    updateResumeStatus();

    closeResumeModal();

    showToast("Resume added successfully");
}

function removeResumeFile() {
    state.resumeFile = null;

    const fileInput = $("resumeFile");

    if (fileInput) {
        fileInput.value = "";
    }

    const mainFileName = $("resumeFileName");
    const modalFileName = $("resumeModalFileName");

    if (mainFileName) {
        mainFileName.textContent = "No resume selected";
    }

    if (modalFileName) {
        modalFileName.textContent = "No file selected";
    }

    updateResumeStatus();

    showToast("Resume removed");
}

function bindResumeUploadEvents() {
    const openButton = $("openResumeUpload");
    const fileInput = $("resumeFile");
    const uploadButton = $("uploadResume");
    const closeButton = $("closeResumeModal");
    const modal = $("resumeModal");

    if (openButton) {
        openButton.addEventListener("click", openResumeModal);
    }

    if (fileInput) {
        fileInput.addEventListener(
            "change",
            handleResumeFileSelection
        );
    }

    if (uploadButton) {
        uploadButton.addEventListener(
            "click",
            uploadResumeFile
        );
    }

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeResumeModal
        );
    }

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeResumeModal();
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            modal?.classList.contains("show")
        ) {
            closeResumeModal();
        }
    });
}// ==========================================
// PART 10 — DASHBOARD
// ==========================================

function updateDashboard() {
    const totalJobs = $("totalJobs");
    const savedJobs = $("savedJobs");
    const strongMatches = $("strongMatches");
    const recentJobs = $("recentJobs");
    const nextJob = $("nextJob");
    const topSkills = $("topSkills");

    const activeJobs = state.jobs.filter(
        job => !isAvoided(job)
    );

    const saved = activeJobs.filter(
        job => isSaved(job)
    );

    const strong = activeJobs.filter(
        job => Number(job.score) >= 80
    );

    if (totalJobs) {
        totalJobs.textContent = activeJobs.length;
    }

    if (savedJobs) {
        savedJobs.textContent = saved.length;
    }

    if (strongMatches) {
        strongMatches.textContent = strong.length;
    }

    if (recentJobs) {
        const recent = [...activeJobs]
            .sort((a, b) => {
                return String(b.date_posted || "")
                    .localeCompare(
                        String(a.date_posted || "")
                    );
            })
            .slice(0, 5);

        if (!recent.length) {
            recentJobs.innerHTML = `
                <div class="match-placeholder">
                    No recent jobs available.
                </div>
            `;
        } else {
            recentJobs.innerHTML = recent.map(job => `
                <div class="dashboard-job">
                    <div>
                        <strong>
                            ${escapeHTML(job.title)}
                        </strong>

                        <span>
                            ${escapeHTML(job.company)}
                        </span>
                    </div>

                    <div class="dashboard-job-score">
                        ${Number(job.score)}%
                    </div>
                </div>
            `).join("");
        }
    }

    if (nextJob) {
        const bestJob = [...activeJobs]
            .sort((a, b) => {
                return Number(b.score) - Number(a.score);
            })[0];

        if (!bestJob) {
            nextJob.innerHTML = `
                <div class="match-placeholder">
                    No matching jobs available.
                </div>
            `;
        } else {
            nextJob.innerHTML = `
                <div class="next-job-card">
                    <div>
                        <span class="insight-label">
                            Recommended opportunity
                        </span>

                        <h3>
                            ${escapeHTML(bestJob.title)}
                        </h3>

                        <p>
                            ${escapeHTML(bestJob.company)}
                            ·
                            ${escapeHTML(bestJob.location)}
                        </p>
                    </div>

                    <div class="job-score">
                        ${Number(bestJob.score)}
                    </div>

                    <button
                        class="primary-btn"
                        id="dashboard-view-job"
                        data-job-id="${escapeHTML(
                            getJobId(bestJob)
                        )}"
                    >
                        View Job
                    </button>
                </div>
            `;
        }
    }

    if (topSkills) {
        const skillCounts = {};

        activeJobs.forEach(job => {
            getJobSkills(job).forEach(skill => {
                skillCounts[skill] =
                    (skillCounts[skill] || 0) + 1;
            });
        });

        const skills = Object.entries(skillCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        if (!skills.length) {
            topSkills.innerHTML = `
                <div class="match-placeholder">
                    No skill data available.
                </div>
            `;
        } else {
            topSkills.innerHTML = skills.map(
                ([skill, count]) => `
                    <div class="skill-row">
                        <div>
                            <strong>
                                ${escapeHTML(skill)}
                            </strong>

                            <span>
                                ${count} jobs
                            </span>
                        </div>
                    </div>
                `
            ).join("");
        }
    }

    updateCareerInsights();
}

function bindDashboardEvents() {
    const nextJobBox = $("nextJob");

    if (!nextJobBox) return;

    nextJobBox.addEventListener("click", event => {
        const button = event.target.closest(
            "#dashboard-view-job"
        );

        if (!button) return;

        const jobId = button.dataset.jobId;

        const job = state.jobs.find(
            item => getJobId(item) === jobId
        );

        if (job) {
            openJobModal(job);
        }
    });
}// ==========================================
// PART 11 — NAVIGATION + CSV EXPORT
// ==========================================

function showPage(pageName) {
    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {
        page.classList.remove("active");
    });

    const targetPage = $(`page-${pageName}`);

    if (targetPage) {
        targetPage.classList.add("active");
    }

    const navButtons = document.querySelectorAll(".nav-btn");

    navButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function bindNavigationEvents() {
    const navButtons = document.querySelectorAll(".nav-btn");

    navButtons.forEach(button => {
        button.addEventListener("click", () => {
            const pageName = button.dataset.page;

            if (pageName) {
                showPage(pageName);
            }
        });
    });
}

function exportJobsCSV() {
    const jobs = state.filteredJobs.length
        ? state.filteredJobs
        : state.jobs;

    if (!jobs.length) {
        showToast("No jobs available to export");
        return;
    }

    const headers = [
        "Title",
        "Company",
        "Location",
        "Score",
        "Source",
        "Job Type",
        "Work Mode",
        "Date Posted",
        "Job URL"
    ];

    const rows = jobs.map(job => [
        job.title,
        job.company,
        job.location,
        Number(job.score || 0),
        job.source,
        job.job_type,
        job.is_remote ? "Remote" : "On-site",
        job.date_posted,
        job.job_url
    ]);

    const csv = [
        headers,
        ...rows
    ]
        .map(row =>
            row.map(value => {
                const text = String(value ?? "")
                    .replace(/"/g, '""');

                return `"${text}"`;
            }).join(",")
        )
        .join("\n");

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "job-radar-jobs.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("Jobs exported successfully");
}

function bindExportEvents() {
    const exportButton = $("exportCSV");

    if (exportButton) {
        exportButton.addEventListener(
            "click",
            exportJobsCSV
        );
    }
}// ==========================================
// PART 12 — EVENT BINDING
// ==========================================

function bindResumeProfileEvents() {
    const saveButton = $("saveResume");

    const clearButton = $("clearResume");

    if (saveButton) {
        saveButton.addEventListener(
            "click",
            saveResumeProfile
        );
    }

    if (clearButton) {
        clearButton.addEventListener(
            "click",
            clearResumeProfile
        );
    }
}

function bindPageButtons() {

    const skillGapButton = $("skillGapButton");

    if (
        skillGapButton &&
        !skillGapButton.dataset.bound
    ) {
        skillGapButton.dataset.bound = "true";

        skillGapButton.addEventListener(
            "click",
            () => {
                renderSkillGap();
                showToast("Skill gap updated");
            }
        );
    }

    const agentCareer = $("agentCareer");

    if (
        agentCareer &&
        !agentCareer.dataset.bound
    ) {
        agentCareer.dataset.bound = "true";

        agentCareer.addEventListener(
            "click",
            generateCareerAdvice
        );
    }

    const agentInterview = $("agentInterview");

    if (
        agentInterview &&
        !agentInterview.dataset.bound
    ) {
        agentInterview.dataset.bound = "true";

        agentInterview.addEventListener(
            "click",
            generateInterviewPrep
        );
    }
}

function bindAllEvents() {

    bindNavigationEvents();

    bindFilterEvents();

    bindJobResultEvents();

    bindModalEvents();

    bindTrackerEvents();

    bindResumeProfileEvents();

    bindResumeUploadEvents();

    bindResumeInsightEvents();

    bindDashboardEvents();

    bindExportEvents();

    bindPageButtons();
}// ==========================================
// PART 13 — FINAL INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    initializeState();

    bindAllEvents();

    fillResumeForm();

    showPage("home");

    updateDashboard();

    updateTracker();

    updateResumeInsights();

    updateAvoidList();

    await loadJobs();

});