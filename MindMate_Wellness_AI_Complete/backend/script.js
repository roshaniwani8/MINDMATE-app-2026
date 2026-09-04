/* =========================================================
   MINDMATE AI V9001
   FRONTEND CONTROLLER

   Features:
   - Local Ollama / Cloud AI backend
   - Streaming responses
   - Conversations
   - Search conversations
   - Voice output
   - Speech recognition
   - Mood tracker
   - Dashboard
   - Mood history
   - Mood reset
   - Wellness Toolkit
   - Journal
   - Delete journal entries
   - LocalStorage persistence
========================================================= */


/* =========================================================
   DOM ELEMENTS
========================================================= */

const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

const newChatBtn = document.getElementById("newChatBtn");
const clearBtn = document.getElementById("clearBtn");

const moodBtn = document.getElementById("moodBtn");
const moodModal = document.getElementById("moodModal");
const closeMood = document.getElementById("closeMood");

const currentMood = document.getElementById("currentMood");

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

const chatList = document.getElementById("chatList");
const searchChats = document.getElementById("searchChats");
const chatTitle = document.getElementById("pageTitle");

const voiceBtn = document.getElementById("voiceBtn");

const dashMood = document.getElementById("dashMood");
const dashMoodEmoji = document.getElementById("dashMoodEmoji");

const moodCount = document.getElementById("moodCount");
const chatCount = document.getElementById("chatCount");
const streak = document.getElementById("streak");

const moodHistory = document.getElementById("moodHistory");
const insightText = document.getElementById("insightText");

const clearMoodBtn = document.getElementById("clearMoodBtn");

const journalInput = document.getElementById("journalInput");
const journalEntries = document.getElementById("journalEntries");

const saveJournalBtn = document.getElementById("saveJournal");
const clearJournalBtn = document.getElementById("clearJournal");

const toolResult = document.getElementById("toolResult");

const breathingTool = document.getElementById("breathingTool");
const focusTool = document.getElementById("focusTool");
const gratitudeTool = document.getElementById("gratitudeTool");
const windDownTool = document.getElementById("windDownTool");


/* =========================================================
   LOCAL DATA
========================================================= */

let conversationId = null;

let chats = JSON.parse(
    localStorage.getItem("mindmate_chats") || "[]"
);

let moods = JSON.parse(
    localStorage.getItem("mindmate_moods") || "[]"
);

let journals = JSON.parse(
    localStorage.getItem("mindmate_journals") || "[]"
);


/* =========================================================
   MOOD EMOJIS
========================================================= */

const moodEmojiMap = {
    Happy: "😄",
    Calm: "😌",
    Okay: "🙂",
    Sad: "😔",
    Stressed: "😣",
    Angry: "😠"
};


/* =========================================================
   STATUS / BACKEND HEALTH
========================================================= */

async function checkStatus() {

    try {

        const response = await fetch(
            "/api/health",
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Health endpoint returned ${response.status}`
            );
        }

        const data = await response.json();

        statusDot?.classList.remove("online");

        /*
         * Backend can report either:
         * - ollama: true
         * - cloud: true
         * - ai_available: true
         */

        if (data.ollama) {

            statusDot?.classList.add("online");

            if (statusText) {
                statusText.textContent =
                    `${data.model || "Ollama"} • Local AI`;
            }

        } else if (
            data.cloud ||
            data.openai ||
            data.ai_available
        ) {

            statusDot?.classList.add("online");

            if (statusText) {
                statusText.textContent =
                    "Cloud AI • Online";
            }

        } else {

            if (statusText) {
                statusText.textContent =
                    "AI service ready";
            }
        }

    } catch (error) {

        console.warn(
            "MindMate health check:",
            error
        );

        statusDot?.classList.remove("online");

        if (statusText) {
            statusText.textContent =
                "AI status unavailable";
        }
    }
}


/* Check backend when page loads */

checkStatus();


/* =========================================================
   SPEECH SYNTHESIS
========================================================= */

let selectedVoice = null;
let voiceEnabled = true;


function loadVoices() {

    if (!("speechSynthesis" in window)) {
        return;
    }

    const voices = speechSynthesis.getVoices();

    selectedVoice =
        voices.find(
            voice =>
                voice.lang?.startsWith("en-IN")
        ) ||

        voices.find(
            voice =>
                voice.lang?.startsWith("en-US")
        ) ||

        voices[0] ||

        null;
}


if ("speechSynthesis" in window) {

    speechSynthesis.onvoiceschanged =
        loadVoices;

    loadVoices();
}


function speak(text) {

    if (!("speechSynthesis" in window)) {
        return;
    }

    if (!text || !text.trim()) {
        return;
    }

    speechSynthesis.cancel();

    const clean = text
        .replace(/[*#_`]/g, "")
        .replace(/\n+/g, ". ");

    const utterance =
        new SpeechSynthesisUtterance(clean);

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    speechSynthesis.speak(utterance);
}


if (voiceBtn) {

    voiceBtn.addEventListener(
        "click",
        () => {

            voiceEnabled =
                !voiceEnabled;

            voiceBtn.textContent =
                voiceEnabled
                    ? "🔊 Voice"
                    : "🔇 Voice";

            if (!voiceEnabled) {

                if (
                    "speechSynthesis"
                    in window
                ) {

                    speechSynthesis.cancel();
                }
            }
        }
    );
}


/* =========================================================
   WELCOME SCREEN
========================================================= */

function welcomeHTML() {

    return `
        <div class="welcome">

            <div class="welcome-icon">
                🧠
            </div>

            <h2>
                Your space to talk, reflect and grow.
            </h2>

            <p>
                MindMate combines AI,
                mood tracking and simple wellness tools.
            </p>

            <div class="suggestions">

                <button
                    data-message="I'm feeling stressed today."
                >
                    😟 I'm feeling stressed
                </button>

                <button
                    data-message="Help me organize my thoughts."
                >
                    🧩 Organize my thoughts
                </button>

                <button
                    data-message="Give me a short breathing exercise."
                >
                    🫁 Breathing exercise
                </button>

                <button
                    data-message="Help me plan my day."
                >
                    🎯 Plan my day
                </button>

            </div>

        </div>
    `;
}


/* =========================================================
   WELCOME BUTTON EVENTS
========================================================= */

function setupSuggestionButtons() {

    document
        .querySelectorAll("[data-message]")
        .forEach(button => {

            button.onclick = () => {

                if (!input) {
                    return;
                }

                input.value =
                    button.dataset.message || "";

                input.dispatchEvent(
                    new Event("input")
                );

                sendMessage();
            };
        });
}


/* =========================================================
   NEW CONVERSATION
========================================================= */

function createConversation() {

    conversationId =
        crypto.randomUUID();

    if (messages) {
        messages.innerHTML =
            welcomeHTML();
    }

    if (chatTitle) {
        chatTitle.textContent =
            "MindMate";
    }

    setupSuggestionButtons();
    renderChatList();
}


if (newChatBtn) {

    newChatBtn.addEventListener(
        "click",
        () => {

            showView("chat");

            createConversation();
        }
    );
}


/* =========================================================
   ADD MESSAGE
========================================================= */

function addMessage(text, role) {

    const welcome =
        document.querySelector(".welcome");

    if (welcome) {
        welcome.remove();
    }

    if (!messages) {
        return null;
    }

    const wrapper =
        document.createElement("div");

    wrapper.className =
        `message ${role}`;

    wrapper.innerHTML = `

        <div class="avatar">
            ${role === "user" ? "👤" : "🧠"}
        </div>

        <div class="message-content">

            <div class="bubble"></div>

            <div class="time">
                ${new Date().toLocaleTimeString(
                    [],
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )}
            </div>

        </div>
    `;

    const bubble =
        wrapper.querySelector(".bubble");

    bubble.textContent =
        text || "";

    messages.appendChild(wrapper);

    messages.scrollTop =
        messages.scrollHeight;

    return bubble;
}


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {

    if (!input) {
        return;
    }

    const text =
        input.value.trim();

    if (!text) {
        return;
    }

    /*
     * Create conversation automatically
     * if the user sends the first message.
     */

    if (!conversationId) {

        conversationId =
            crypto.randomUUID();
    }

    input.value = "";

    input.style.height =
        "auto";

    addMessage(
        text,
        "user"
    );

    typing?.classList.remove(
        "hidden"
    );

    let reply = "";
    let assistantBubble = null;

    try {

        /*
         * IMPORTANT:
         * This is the same endpoint expected
         * by the Flask backend.
         */

        const response =
            await fetch(
                "/api/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                        "Accept":
                            "text/event-stream"
                    },

                    body:
                        JSON.stringify({
                            message: text,
                            conversation_id:
                                conversationId
                        })
                }
            );


        /* -----------------------------------------
           HTTP ERROR
        ----------------------------------------- */

        if (!response.ok) {

            let errorMessage =
                `Server error: ${response.status}`;

            try {

                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";

                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {

                    const errorData =
                        await response.json();

                    if (
                        errorData.error
                    ) {

                        errorMessage =
                            errorData.error;
                    }
                }

            } catch {
                // Ignore JSON parsing errors
            }

            throw new Error(
                errorMessage
            );
        }


        /* -----------------------------------------
           STREAM CHECK
        ----------------------------------------- */

        if (!response.body) {

            throw new Error(
                "The server returned no streaming response."
            );
        }


        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder("utf-8");

        let buffer = "";


        /* -----------------------------------------
           READ STREAM
        ----------------------------------------- */

        while (true) {

            const {
                value,
                done
            } =
                await reader.read();

            if (done) {
                break;
            }

            buffer +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            /*
             * SSE events are separated by
             * a blank line.
             */

            const events =
                buffer.split("\n\n");

            buffer =
                events.pop() || "";


            for (
                const event of events
            ) {

                if (!event.trim()) {
                    continue;
                }


                const lines =
                    event
                        .split(/\r?\n/)
                        .filter(
                            line =>
                                line.startsWith(
                                    "data:"
                                )
                        );


                for (
                    const line of lines
                ) {

                    const raw =
                        line
                            .replace(
                                /^data:\s*/,
                                ""
                            )
                            .trim();


                    if (!raw) {
                        continue;
                    }


                    let data;

                    try {

                        data =
                            JSON.parse(raw);

                    } catch (parseError) {

                        console.warn(
                            "Invalid SSE JSON:",
                            raw
                        );

                        continue;
                    }


                    /* -------------------------------
                       BACKEND ERROR
                    -------------------------------- */

                    if (data.error) {

                        throw new Error(
                            data.error
                        );
                    }


                    /* -------------------------------
                       CONVERSATION ID
                    -------------------------------- */

                    if (
                        data.conversation_id
                    ) {

                        conversationId =
                            data.conversation_id;
                    }


                    /* -------------------------------
                       TOKEN
                    -------------------------------- */

                    if (
                        typeof data.token ===
                        "string"
                    ) {

                        typing?.classList.add(
                            "hidden"
                        );


                        if (!assistantBubble) {

                            assistantBubble =
                                addMessage(
                                    "",
                                    "assistant"
                                );
                        }


                        reply +=
                            data.token;


                        if (
                            assistantBubble
                        ) {

                            assistantBubble
                                .textContent =
                                reply;
                        }


                        if (messages) {

                            messages.scrollTop =
                                messages.scrollHeight;
                        }
                    }


                    /* -------------------------------
                       COMPLETE
                    -------------------------------- */

                    if (data.done) {

                        typing?.classList.add(
                            "hidden"
                        );

                        if (reply.trim()) {

                            saveChat(text);

                            if (
                                voiceEnabled
                            ) {

                                speak(reply);
                            }
                        }
                    }
                }
            }
        }


        /*
         * Sometimes the final event can remain
         * in the buffer without another chunk.
         */

        if (buffer.trim()) {

            const lines =
                buffer
                    .split(/\r?\n/)
                    .filter(
                        line =>
                            line.startsWith("data:")
                    );

            for (
                const line of lines
            ) {

                const raw =
                    line
                        .replace(
                            /^data:\s*/,
                            ""
                        )
                        .trim();

                if (!raw) {
                    continue;
                }

                try {

                    const data =
                        JSON.parse(raw);

                    if (
                        data.conversation_id
                    ) {

                        conversationId =
                            data.conversation_id;
                    }

                    if (
                        typeof data.token ===
                        "string"
                    ) {

                        if (!assistantBubble) {

                            assistantBubble =
                                addMessage(
                                    "",
                                    "assistant"
                                );
                        }

                        reply +=
                            data.token;

                        assistantBubble.textContent =
                            reply;
                    }

                } catch {
                    // Ignore incomplete final event
                }
            }
        }


        /* -----------------------------------------
           NO RESPONSE SAFETY CHECK
        ----------------------------------------- */

        if (!reply.trim()) {

            throw new Error(
                "The AI service returned an empty response."
            );
        }

    } catch (error) {

        console.error(
            "MindMate chat error:",
            error
        );

        typing?.classList.add(
            "hidden"
        );


        /*
         * Remove empty assistant bubble
         * if one was created.
         */

        if (
            assistantBubble &&
            !reply.trim()
        ) {

            assistantBubble
                .closest(".message")
                ?.remove();
        }


        let friendlyMessage =
            "MindMate couldn't connect to the AI service right now. Please try again.";


        /*
         * Helpful messages for common errors.
         */

        if (
            error.message?.includes("404")
        ) {

            friendlyMessage =
                "MindMate's AI endpoint could not be found. Please check the backend deployment.";
        }

        else if (
            error.message?.includes("Failed to fetch")
        ) {

            friendlyMessage =
                "MindMate couldn't reach the server. Please check that the app is online and try again.";
        }

        else if (
            error.message
        ) {

            /*
             * Don't expose unnecessary server
             * internals to the user.
             */

            if (
                error.message.length < 180 &&
                !error.message.includes("Traceback")
            ) {

                friendlyMessage =
                    error.message;
            }
        }


        addMessage(
            friendlyMessage,
            "assistant"
        );

    } finally {

        typing?.classList.add(
            "hidden"
        );
    }
}


/* =========================================================
   SEND BUTTON
========================================================= */

if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        sendMessage
    );
}


/* =========================================================
   INPUT
========================================================= */

if (input) {

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );


    input.addEventListener(
        "input",
        () => {

            input.style.height =
                "auto";

            input.style.height =
                Math.min(
                    input.scrollHeight,
                    130
                ) + "px";
        }
    );
}


/* =========================================================
   CHAT HISTORY
========================================================= */

function saveChat(text) {

    if (!conversationId) {
        return;
    }

    const existing =
        chats.find(
            chat =>
                chat.id ===
                conversationId
        );


    if (!existing) {

        chats.unshift({

            id:
                conversationId,

            title:
                text.substring(
                    0,
                    35
                ),

            updated:
                Date.now()
        });

    } else {

        existing.updated =
            Date.now();
    }


    localStorage.setItem(
        "mindmate_chats",
        JSON.stringify(chats)
    );

    renderChatList();
}


function renderChatList(filter = "") {

    if (!chatList) {
        return;
    }

    chatList.innerHTML =
        "";


    chats
        .filter(
            chat =>
                chat.title
                    .toLowerCase()
                    .includes(
                        filter.toLowerCase()
                    )
        )
        .sort(
            (a, b) =>
                b.updated -
                a.updated
        )
        .forEach(
            chat => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "chat-item";


                if (
                    chat.id ===
                    conversationId
                ) {

                    item.classList.add(
                        "active"
                    );
                }


                item.textContent =
                    "💬 " +
                    chat.title;


                item.onclick =
                    () =>
                        loadConversation(
                            chat.id
                        );


                chatList.appendChild(
                    item
                );
            }
        );
}


async function loadConversation(id) {

    try {

        const response =
            await fetch(
                `/api/conversation/${encodeURIComponent(id)}`
            );


        if (!response.ok) {

            throw new Error(
                `Conversation error: ${response.status}`
            );
        }


        const data =
            await response.json();


        conversationId =
            id;


        if (messages) {
            messages.innerHTML = "";
        }


        if (
            data.messages &&
            Array.isArray(data.messages)
        ) {

            data.messages.forEach(
                message => {

                    if (
                        message.role === "user" ||
                        message.role === "assistant"
                    ) {

                        addMessage(
                            message.content,
                            message.role
                        );
                    }
                }
            );

        } else {

            if (messages) {
                messages.innerHTML =
                    welcomeHTML();

                setupSuggestionButtons();
            }
        }


        showView("chat");

        renderChatList();

    } catch (error) {

        console.error(
            "Load conversation:",
            error
        );

        /*
         * The conversation history is also
         * stored locally, so don't break the UI
         * if the server doesn't have the old chat.
         */

        conversationId =
            id;

        showView("chat");
    }
}


/* =========================================================
   SEARCH CONVERSATIONS
========================================================= */

if (searchChats) {

    searchChats.addEventListener(
        "input",
        () =>
            renderChatList(
                searchChats.value
            )
    );
}


/* =========================================================
   CLEAR CHAT
========================================================= */

if (clearBtn) {

    clearBtn.addEventListener(
        "click",
        async () => {

            if (!conversationId) {
                createConversation();
                return;
            }


            try {

                await fetch(
                    `/api/conversation/${encodeURIComponent(conversationId)}`,
                    {
                        method: "DELETE"
                    }
                );

            } catch (error) {

                console.warn(
                    "Could not delete server conversation:",
                    error
                );
            }


            chats =
                chats.filter(
                    chat =>
                        chat.id !==
                        conversationId
                );


            localStorage.setItem(
                "mindmate_chats",
                JSON.stringify(chats)
            );


            if (
                "speechSynthesis"
                in window
            ) {

                speechSynthesis.cancel();
            }


            createConversation();
        }
    );
}


/* =========================================================
   MOOD MODAL
========================================================= */

if (moodBtn) {

    moodBtn.onclick =
        () =>
            moodModal?.classList.remove(
                "hidden"
            );
}


if (closeMood) {

    closeMood.onclick =
        () =>
            moodModal?.classList.add(
                "hidden"
            );
}


/* =========================================================
   UPDATE MOOD UI
========================================================= */

function updateMoodUI(mood) {

    const emoji =
        moodEmojiMap[mood] ||
        "😊";


    if (currentMood) {

        currentMood.textContent =
            mood ||
            "Not selected";
    }


    if (dashMood) {

        dashMood.textContent =
            mood ||
            "—";
    }


    if (dashMoodEmoji) {

        dashMoodEmoji.textContent =
            emoji;
    }
}


/* =========================================================
   MOOD SELECTION
========================================================= */

document
    .querySelectorAll("[data-mood]")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const mood =
                        button.dataset.mood;


                    moods.push({

                        mood:
                            mood,

                        date:
                            new Date()
                                .toISOString()
                    });


                    localStorage.setItem(
                        "mindmate_moods",
                        JSON.stringify(
                            moods
                        )
                    );


                    updateMoodUI(
                        mood
                    );


                    moodModal?.classList.add(
                        "hidden"
                    );


                    updateDashboard();
                }
            );
        }
    );


/* =========================================================
   RESET MOOD
========================================================= */

if (clearMoodBtn) {

    clearMoodBtn.addEventListener(
        "click",
        () => {

            const confirmed =
                confirm(
                    "Reset your mood history?"
                );


            if (!confirmed) {
                return;
            }


            moods = [];


            localStorage.removeItem(
                "mindmate_moods"
            );


            updateMoodUI(
                null
            );


            updateDashboard();
        }
    );
}


/* =========================================================
   SPEECH RECOGNITION
========================================================= */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


let recognition = null;
let isListening = false;


if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();


    recognition.lang =
        "en-IN";


    recognition.continuous =
        false;


    recognition.interimResults =
        true;


    recognition.onstart =
        () => {

            isListening =
                true;

            if (micBtn) {
                micBtn.textContent =
                    "🔴";
            }
        };


    recognition.onresult =
        event => {

            let transcript =
                "";


            for (
                let i =
                    event.resultIndex;

                i <
                event.results.length;

                i++
            ) {

                transcript +=
                    event.results[i][0]
                        .transcript;
            }


            if (input) {

                input.value =
                    transcript;

                input.dispatchEvent(
                    new Event("input")
                );
            }
        };


    recognition.onerror =
        event => {

            console.log(
                "Microphone:",
                event.error
            );


            isListening =
                false;


            if (micBtn) {
                micBtn.textContent =
                    "🎙️";
            }
        };


    recognition.onend =
        () => {

            isListening =
                false;


            if (micBtn) {
                micBtn.textContent =
                    "🎙️";
            }
        };

} else {

    if (micBtn) {

        micBtn.disabled =
            true;

        micBtn.title =
            "Speech recognition is not supported in this browser.";
    }
}


if (micBtn) {

    micBtn.onclick =
        () => {

            if (!recognition) {

                alert(
                    "Speech recognition is not supported in this browser. Try Chrome or Edge."
                );

                return;
            }


            if (isListening) {

                recognition.stop();

                return;
            }


            try {

                recognition.start();

            } catch (error) {

                console.log(
                    "Recognition start:",
                    error
                );
            }
        };
}


/* =========================================================
   NAVIGATION
========================================================= */

const views = {

    chat:
        document.getElementById(
            "chatView"
        ),

    dashboard:
        document.getElementById(
            "dashboardView"
        ),

    toolkit:
        document.getElementById(
            "toolkitView"
        ),

    journal:
        document.getElementById(
            "journalView"
        )
};


function showView(name) {

    Object.entries(
        views
    ).forEach(
        ([key, view]) => {

            if (!view) {
                return;
            }


            view.classList.toggle(
                "hidden",
                key !== name
            );
        }
    );


    document
        .querySelectorAll(".nav-btn")
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.view ===
                        name
                );
            }
        );


    const titles = {

        chat:
            "MindMate",

        dashboard:
            "Wellness Dashboard",

        toolkit:
            "Wellness Toolkit",

        journal:
            "Journal",

        tracker:
            "Wellness Tracker",

        suite:
            "Wellness Suite"
    };


    if (chatTitle) {

        chatTitle.textContent =
            titles[name] ||
            "MindMate";
    }


    if (
        name ===
        "dashboard"
    ) {

        updateDashboard();
    }


    if (
        name ===
        "journal"
    ) {

        renderJournals();
    }
}


document
    .querySelectorAll(".nav-btn")
    .forEach(
        button => {

            button.onclick =
                () =>
                    showView(
                        button.dataset.view
                    );
        }
    );


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {

    const latest =
        moods.length
            ? moods[moods.length - 1]
            : null;


    updateMoodUI(
        latest
            ? latest.mood
            : null
    );


    if (moodCount) {

        moodCount.textContent =
            moods.length;
    }


    if (chatCount) {

        chatCount.textContent =
            chats.length;
    }


    if (streak) {

        streak.textContent =
            calculateStreak() +
            " days";
    }


    renderMoodHistory();

    updateInsight();
}


/* =========================================================
   MOOD VALUE
========================================================= */

function moodValue(mood) {

    const values = {

        Happy: 5,

        Calm: 4,

        Okay: 3,

        Sad: 2,

        Stressed: 2,

        Angry: 1
    };


    return values[mood] || 3;
}


/* =========================================================
   MOOD HISTORY
========================================================= */

function renderMoodHistory() {

    if (!moodHistory) {
        return;
    }


    moodHistory.innerHTML =
        "";


    const recent =
        moods.slice(-7);


    if (!recent.length) {

        moodHistory.innerHTML =
            `
            <span
                style="
                    color:#9299ad;
                    font-size:11px
                "
            >
                No mood check-ins yet.
            </span>
            `;

        return;
    }


    recent.forEach(
        entry => {

            const bar =
                document.createElement(
                    "div"
                );


            bar.className =
                "mood-bar";


            const height =
                moodValue(
                    entry.mood
                ) * 17;


            const emoji =
                moodEmojiMap[
                    entry.mood
                ] || "😊";


            bar.innerHTML = `

                <div
                    class="bar"
                    style="
                        height:${height}px
                    "
                    title="${entry.mood}"
                ></div>

                <span>
                    ${emoji}
                    ${entry.mood}
                </span>
            `;


            moodHistory.appendChild(
                bar
            );
        }
    );
}


/* =========================================================
   INSIGHT
========================================================= */

function updateInsight() {

    if (!insightText) {
        return;
    }


    if (
        moods.length <
        2
    ) {

        insightText.textContent =
            "Add a few mood check-ins to see your personal reflection.";

        return;
    }


    const recent =
        moods.slice(-3);


    const average =
        recent.reduce(
            (
                sum,
                entry
            ) =>
                sum +
                moodValue(
                    entry.mood
                ),
            0
        ) /
        recent.length;


    if (average >= 4) {

        insightText.textContent =
            "Your recent check-ins have generally been positive or calm. Keep noticing the routines that help you feel this way.";

    } else if (
        average >= 3
    ) {

        insightText.textContent =
            "Your recent check-ins look fairly mixed. Regular reflection can help you notice what affects your days.";

    } else {

        insightText.textContent =
            "Your recent check-ins suggest you've had some difficult moments. Consider giving yourself extra space for rest, support and healthy routines.";
    }
}


/* =========================================================
   STREAK
========================================================= */

function calculateStreak() {

    if (!moods.length) {
        return 0;
    }


    const days =
        new Set();


    moods.forEach(
        entry => {

            days.add(
                new Date(
                    entry.date
                ).toDateString()
            );
        }
    );


    let streakCount =
        0;


    const date =
        new Date();


    while (
        days.has(
            date.toDateString()
        )
    ) {

        streakCount++;


        date.setDate(
            date.getDate() -
                1
        );
    }


    return streakCount;
}


/* =========================================================
   WELLNESS TOOLKIT
========================================================= */

if (breathingTool) {

    breathingTool.onclick =
        () => {

            if (!toolResult) {
                return;
            }


            let count =
                0;


            const phases = [

                "🫁 Breathe in slowly...",

                "⏸️ Pause comfortably...",

                "🌬️ Breathe out slowly...",

                "🌱 Nice. Take a moment before continuing."
            ];


            toolResult.innerHTML =
                phases[0];


            const timer =
                setInterval(
                    () => {

                        count++;


                        if (
                            count <
                            phases.length
                        ) {

                            toolResult.innerHTML =
                                phases[count];

                        } else {

                            clearInterval(
                                timer
                            );
                        }

                    },
                    4000
                );
        };
}


if (focusTool) {

    focusTool.onclick =
        () => {

            if (!toolResult) {
                return;
            }


            toolResult.innerHTML = `
                🎯 <strong>
                Focus prompt
                </strong>

                <br><br>

                Choose one small task.

                Put distractions aside.

                Work on it for the next few minutes.
            `;
        };
}


if (gratitudeTool) {

    gratitudeTool.onclick =
        () => {

            if (!toolResult) {
                return;
            }


            const prompts = [

                "What is one small thing that went well today?",

                "Who is someone you appreciate?",

                "What is something you learned recently?",

                "What is one moment you would like to remember?"
            ];


            const random =
                prompts[
                    Math.floor(
                        Math.random() *
                        prompts.length
                    )
                ];


            toolResult.innerHTML = `

                🌻 <strong>
                Reflection prompt
                </strong>

                <br><br>

                ${random}
            `;
        };
}


if (windDownTool) {

    windDownTool.onclick =
        () => {

            if (!toolResult) {
                return;
            }


            toolResult.innerHTML = `

                🌙 <strong>
                Wind-down mode
                </strong>

                <br><br>

                Lower your screen brightness,
                put away unnecessary notifications,
                and give yourself a few quiet minutes.
            `;
        };
}


/* =========================================================
   JOURNAL
========================================================= */

if (saveJournalBtn) {

    saveJournalBtn.onclick =
        () => {

            if (!journalInput) {
                return;
            }


            const text =
                journalInput.value.trim();


            if (!text) {
                return;
            }


            journals.unshift({

                text:
                    text,

                date:
                    new Date()
                        .toLocaleString()
            });


            localStorage.setItem(
                "mindmate_journals",
                JSON.stringify(
                    journals
                )
            );


            journalInput.value =
                "";


            renderJournals();
        };
}


/* =========================================================
   RENDER JOURNALS
========================================================= */

function renderJournals() {

    if (!journalEntries) {
        return;
    }


    journalEntries.innerHTML =
        "";


    if (!journals.length) {

        journalEntries.innerHTML = `
            <div
                style="
                    color:#9299ad;
                    padding:15px;
                    text-align:center;
                "
            >
                No journal entries yet.
            </div>
        `;

        return;
    }


    journals.forEach(
        (entry, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "journal-entry";


            item.innerHTML = `

                <div class="journal-content">

                    <p></p>

                    <small>
                        ${entry.date}
                    </small>

                </div>

                <button
                    type="button"
                    class="delete-journal"
                    data-index="${index}"
                    title="Delete journal entry"
                >
                    🗑️
                </button>
            `;


            const paragraph =
                item.querySelector("p");


            paragraph.textContent =
                entry.text;


            const deleteBtn =
                item.querySelector(
                    ".delete-journal"
                );


            deleteBtn.onclick =
                () => {

                    journals.splice(
                        index,
                        1
                    );


                    localStorage.setItem(
                        "mindmate_journals",
                        JSON.stringify(
                            journals
                        )
                    );


                    renderJournals();
                };


            journalEntries.appendChild(
                item
            );
        }
    );
}


/* =========================================================
   CLEAR ALL JOURNAL ENTRIES
========================================================= */

if (clearJournalBtn) {

    clearJournalBtn.onclick =
        () => {

            if (!journals.length) {
                return;
            }


            const confirmed =
                confirm(
                    "Delete all journal entries?"
                );


            if (!confirmed) {
                return;
            }


            journals = [];


            localStorage.removeItem(
                "mindmate_journals"
            );


            renderJournals();
        };
}


/* =========================================================
   INITIALIZE
========================================================= */

function initializeMindMate() {

    /*
     * Start a fresh conversation only if
     * no active conversation exists.
     */

    if (!conversationId) {

        conversationId =
            crypto.randomUUID();
    }


    if (messages) {

        messages.innerHTML =
            welcomeHTML();
    }


    setupSuggestionButtons();

    renderChatList();

    renderJournals();

    updateDashboard();

    loadVoices();

    checkStatus();
}


/* =========================================================
   START APP
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeMindMate
    );

} else {

    initializeMindMate();
}


