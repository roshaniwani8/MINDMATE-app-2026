/* =========================================================
   MINDMATE AI V9000
   FRONTEND CONTROLLER

   Features:
   - Local Ollama AI
   - Streaming responses
   - Conversations
   - Search conversations
   - Voice output
   - Speech recognition
   - Mood tracker
   - Dynamic mood emoji
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

const input =
    document.getElementById("messageInput");

const sendBtn =
    document.getElementById("sendBtn");

const micBtn =
    document.getElementById("micBtn");

const messages =
    document.getElementById("messages");

const typing =
    document.getElementById("typing");

const newChatBtn =
    document.getElementById("newChatBtn");

const clearBtn =
    document.getElementById("clearBtn");

const moodBtn =
    document.getElementById("moodBtn");

const moodModal =
    document.getElementById("moodModal");

const closeMood =
    document.getElementById("closeMood");

const currentMood =
    document.getElementById("currentMood");

const statusDot =
    document.getElementById("statusDot");

const statusText =
    document.getElementById("statusText");

const chatList =
    document.getElementById("chatList");

const searchChats =
    document.getElementById("searchChats");

const chatTitle =
    document.getElementById("pageTitle");

const voiceBtn =
    document.getElementById("voiceBtn");

const dashMood =
    document.getElementById("dashMood");

const dashMoodEmoji =
    document.getElementById("dashMoodEmoji");

const moodCount =
    document.getElementById("moodCount");

const chatCount =
    document.getElementById("chatCount");

const streak =
    document.getElementById("streak");

const moodHistory =
    document.getElementById("moodHistory");

const insightText =
    document.getElementById("insightText");

const clearMoodBtn =
    document.getElementById("clearMoodBtn");

const journalInput =
    document.getElementById("journalInput");

const journalEntries =
    document.getElementById("journalEntries");


/* =========================================================
   LOCAL DATA
========================================================= */

let conversationId = null;

let chats =
    JSON.parse(
        localStorage.getItem(
            "mindmate_chats"
        ) || "[]"
    );

let moods =
    JSON.parse(
        localStorage.getItem(
            "mindmate_moods"
        ) || "[]"
    );

let journals =
    JSON.parse(
        localStorage.getItem(
            "mindmate_journals"
        ) || "[]"
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
   STATUS
========================================================= */

async function checkStatus() {

    try {

        const response =
            await fetch(
                "/api/health"
            );

        if (!response.ok) {

            throw new Error(
                "Health endpoint unavailable"
            );
        }

        const data =
            await response.json();

        if (data.ollama) {

            statusDot.classList.add(
                "online"
            );

            statusText.textContent =
                `${data.model || "Ollama"} • Local AI`;

        } else {

            statusDot.classList.remove(
                "online"
            );

            statusText.textContent =
                "Ollama offline";
        }

    } catch (error) {

        statusDot.classList.remove(
            "online"
        );

        statusText.textContent =
            "Server offline";
    }
}

checkStatus();


/* =========================================================
   SPEECH SYNTHESIS
========================================================= */

let selectedVoice = null;

function loadVoices() {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }

    const voices =
        speechSynthesis.getVoices();

    selectedVoice =
        voices.find(
            voice =>
                voice.lang
                    .startsWith("en-IN")
        ) ||

        voices.find(
            voice =>
                voice.lang
                    .startsWith("en-US")
        ) ||

        voices[0] ||

        null;
}

if (
    "speechSynthesis" in window
) {

    speechSynthesis.onvoiceschanged =
        loadVoices;

    loadVoices();
}


function speak(text) {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }

    if (!text || !text.trim()) {
        return;
    }

    speechSynthesis.cancel();

    const clean =
        text
            .replace(/[*#_`]/g, "")
            .replace(/\n+/g, ". ");

    const utterance =
        new SpeechSynthesisUtterance(
            clean
        );

    utterance.rate = 0.95;

    utterance.pitch = 1;

    utterance.volume = 1;

    if (selectedVoice) {

        utterance.voice =
            selectedVoice;
    }

    speechSynthesis.speak(
        utterance
    );
}


let voiceEnabled = true;


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
                MindMate combines local AI,
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
   NEW CONVERSATION
========================================================= */

function createConversation() {

    conversationId =
        crypto.randomUUID();

    messages.innerHTML =
        welcomeHTML();

    chatTitle.textContent =
        "MindMate";

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

function addMessage(
    text,
    role
) {

    const welcome =
        document.querySelector(
            ".welcome"
        );

    if (welcome) {
        welcome.remove();
    }

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        `message ${role}`;

    wrapper.innerHTML = `

        <div class="avatar">
            ${role === "user"
                ? "👤"
                : "🧠"}
        </div>

        <div class="message-content">

            <div class="bubble"></div>

            <div class="time">
                ${new Date()
                    .toLocaleTimeString(
                        [],
                        {
                            hour:
                                "2-digit",

                            minute:
                                "2-digit"
                        }
                    )}
            </div>

        </div>
    `;

    const bubble =
        wrapper.querySelector(
            ".bubble"
        );

    bubble.textContent =
        text || "";

    messages.appendChild(
        wrapper
    );

    messages.scrollTop =
        messages.scrollHeight;

    return bubble;
}


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {

    const text =
        input.value.trim();

    if (!text) {
        return;
    }

    input.value = "";

    input.style.height =
        "auto";

    addMessage(
        text,
        "user"
    );

    typing.classList.remove(
        "hidden"
    );

    let reply = "";

    let assistantBubble =
        null;

    try {

        const response =
            await fetch(
                "/api/chat",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            message:
                                text,

                            conversation_id:
                                conversationId
                        })
                }
            );

        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );
        }

        if (!response.body) {

            throw new Error(
                "Streaming response unavailable"
            );
        }

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        let buffer = "";

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
                        stream:
                            true
                    }
                );

            const events =
                buffer.split(
                    "\n\n"
                );

            buffer =
                events.pop();

            for (
                const event
                of events
            ) {

                if (
                    !event.trim()
                ) {
                    continue;
                }

                const lines =
                    event
                        .split("\n")
                        .filter(
                            line =>
                                line.startsWith(
                                    "data:"
                                )
                        );

                for (
                    const line
                    of lines
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
                            JSON.parse(
                                raw
                            );

                    } catch {

                        continue;
                    }

                    if (data.error) {

                        throw new Error(
                            data.error
                        );
                    }

                    if (
                        data.conversation_id
                    ) {

                        conversationId =
                            data.conversation_id;
                    }

                    if (data.token) {

                        typing.classList.add(
                            "hidden"
                        );

                        if (
                            !assistantBubble
                        ) {

                            assistantBubble =
                                addMessage(
                                    "",
                                    "assistant"
                                );
                        }

                        reply +=
                            data.token;

                        assistantBubble
                            .textContent =
                            reply;

                        messages.scrollTop =
                            messages.scrollHeight;
                    }

                    if (data.done) {

                        if (reply.trim()) {

                            saveChat(
                                text
                            );

                            if (
                                voiceEnabled
                            ) {

                                speak(
                                    reply
                                );
                            }
                        }
                    }
                }
            }
        }

    } catch (error) {

        console.error(
            "MindMate chat error:",
            error
        );

        typing.classList.add(
            "hidden"
        );

        addMessage(
            "I couldn't connect to the local AI. Please make sure the MindMate server and Ollama are running.",
            "assistant"
        );

    } finally {

        typing.classList.add(
            "hidden"
        );
    }
}


if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        sendMessage
    );
}


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
        JSON.stringify(
            chats
        )
    );

    renderChatList();
}


function renderChatList(
    filter = ""
) {

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


async function loadConversation(
    id
) {

    try {

        const response =
            await fetch(
                `/api/conversation/${id}`
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

        messages.innerHTML =
            "";

        if (
            data.messages &&
            Array.isArray(
                data.messages
            )
        ) {

            data.messages.forEach(
                message => {

                    if (
                        message.role ===
                        "user" ||
                        message.role ===
                        "assistant"
                    ) {

                        addMessage(
                            message.content,
                            message.role
                        );
                    }
                }
            );
        }

        showView(
            "chat"
        );

        renderChatList();

    } catch (error) {

        console.error(
            "Load conversation:",
            error
        );
    }
}


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
                return;
            }

            try {

                await fetch(
                    `/api/conversation/${conversationId}`,
                    {
                        method:
                            "DELETE"
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
                JSON.stringify(
                    chats
                )
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
   MOOD TRACKER
========================================================= */

if (moodBtn) {

    moodBtn.onclick =
        () =>
            moodModal.classList.remove(
                "hidden"
            );
}


if (closeMood) {

    closeMood.onclick =
        () =>
            moodModal.classList.add(
                "hidden"
            );
}


/* =========================================================
   UPDATE MOOD UI
========================================================= */

function updateMoodUI(
    mood
) {

    const emoji =
        moodEmojiMap[mood]
        || "😊";

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
    .querySelectorAll(
        "[data-mood]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const mood =
                        button.dataset
                            .mood;

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

                    moodModal.classList.add(
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

let recognition =
    null;

let isListening =
    false;


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

            micBtn.textContent =
                "🔴";
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

            input.value =
                transcript;

            input.dispatchEvent(
                new Event(
                    "input"
                )
            );
        };


    recognition.onerror =
        event => {

            console.log(
                "Microphone:",
                event.error
            );

            isListening =
                false;

            micBtn.textContent =
                "🎙️";
        };


    recognition.onend =
        () => {

            isListening =
                false;

            micBtn.textContent =
                "🎙️";
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


function showView(
    name
) {

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
        .querySelectorAll(
            ".nav-btn"
        )
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


    chatTitle.textContent =
        titles[name]
        || "MindMate";


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
    .querySelectorAll(
        ".nav-btn"
    )
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

function moodValue(
    mood
) {

    const values = {

        Happy: 5,

        Calm: 4,

        Okay: 3,

        Sad: 2,

        Stressed: 2,

        Angry: 1
    };

    return values[mood]
        || 3;
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

const toolResult =
    document.getElementById(
        "toolResult"
    );


const breathingTool =
    document.getElementById(
        "breathingTool"
    );


const focusTool =
    document.getElementById(
        "focusTool"
    );


const gratitudeTool =
    document.getElementById(
        "gratitudeTool"
    );


const windDownTool =
    document.getElementById(
        "windDownTool"
    );


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

const saveJournalBtn =
    document.getElementById(
        "saveJournal"
    );


const clearJournalBtn =
    document.getElementById(
        "clearJournal"
    );


if (saveJournalBtn) {

    saveJournalBtn.onclick =
        () => {

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


if (clearJournalBtn) {

    clearJournalBtn.onclick =
        () => {

            journalInput.value =
                "";
        };
}


/* =========================================================
   RENDER JOURNAL
========================================================= */

function renderJournals() {

    if (!journalEntries) {
        return;
    }

    journalEntries.innerHTML =
        "";


    if (!journals.length) {

        journalEntries.innerHTML = `

            <div class="journal-empty">

                📝 No journal entries yet.

            </div>
        `;

        return;
    }


    journals.forEach(
        (
            entry,
            index
        ) => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "journal-entry";


            div.innerHTML = `

                <small>
                    ${escapeHTML(
                        entry.date
                    )}
                </small>

                <p>
                    ${escapeHTML(
                        entry.text
                    )}
                </p>

                <button
                    class="delete-journal"
                    data-index="${index}"
                    type="button"
                >
                    🗑 Delete Entry
                </button>
            `;


            const deleteButton =
                div.querySelector(
                    ".delete-journal"
                );


            deleteButton.onclick =
                () =>
                    deleteJournal(
                        index
                    );


            journalEntries.appendChild(
                div
            );
        }
    );
}


/* =========================================================
   DELETE JOURNAL
========================================================= */

function deleteJournal(
    index
) {

    if (
        index < 0 ||
        index >= journals.length
    ) {
        return;
    }


    const confirmed =
        confirm(
            "Delete this journal entry?"
        );


    if (!confirmed) {
        return;
    }


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
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    text
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}


/* =========================================================
   SUGGESTION BUTTONS
========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-message]"
            );

        if (!button) {
            return;
        }

        showView(
            "chat"
        );

        input.value =
            button.dataset.message;

        input.dispatchEvent(
            new Event(
                "input"
            )
        );

        sendMessage();
    }
);


/* =========================================================
   MODAL CLOSE ON BACKDROP
========================================================= */

if (moodModal) {

    moodModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                moodModal
            ) {

                moodModal.classList.add(
                    "hidden"
                );
            }
        }
    );
}


/* =========================================================
   INITIALIZE
========================================================= */

renderChatList();

createConversation();

updateDashboard();

renderJournals();

/* =========================================================
   WELLNESS TRACKER
   Local-only daily tracking + browser reminders
========================================================= */
const trackerViews = views;
trackerViews.tracker = document.getElementById("trackerView");
trackerViews.suite = document.getElementById("suiteView");

const trackerData = JSON.parse(localStorage.getItem("mindmate_wellness") || "{}");
const tasks = JSON.parse(localStorage.getItem("mindmate_tasks") || "[]");

function todayKey(){
    const d=new Date();
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,"0");
    const day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
}
function todayData(){
    const key=todayKey();
    if(!trackerData[key]) trackerData[key]={};
    return trackerData[key];
}
function saveTracker(){ localStorage.setItem("mindmate_wellness", JSON.stringify(trackerData)); }
function setTrackerValue(key,inputId,valueId,formatter){
    const el=document.getElementById(inputId); if(!el) return;
    const value=el.value.trim(); if(!value) return;
    todayData()[key]=value; saveTracker();
    const out=document.getElementById(valueId); if(out) out.textContent=formatter(value);
    el.value="";
}
function renderTracker(){
    const d=todayData();
    const map=[
        ["sleep","sleepValue",v=>`${v} hour${Number(v)===1?"":"s"} logged today`],
        ["study","studyValue",v=>`${v} minutes logged today`],
        ["activity","activityValue",v=>`${v} minutes logged today`],
        ["water","waterValue",v=>`${v} glass${Number(v)===1?"":"es"} logged today`],
        ["meals","mealValue",v=>`Today: ${v}`],
        ["energy","energyValue",v=>`Energy: ${v}`]
    ];
    map.forEach(([k,id,fmt])=>{ const el=document.getElementById(id); if(el) el.textContent=d[k]?fmt(d[k]):"Not logged today"; });
}

const saveSleep=document.getElementById("saveSleep"); if(saveSleep) saveSleep.onclick=()=>setTrackerValue("sleep","sleepHours","sleepValue",v=>`${v} hour${Number(v)===1?"":"s"} logged today`);
const saveStudy=document.getElementById("saveStudy"); if(saveStudy) saveStudy.onclick=()=>setTrackerValue("study","studyMinutes","studyValue",v=>`${v} minutes logged today`);
const saveActivity=document.getElementById("saveActivity"); if(saveActivity) saveActivity.onclick=()=>setTrackerValue("activity","activityMinutes","activityValue",v=>`${v} minutes logged today`);
const saveWater=document.getElementById("saveWater"); if(saveWater) saveWater.onclick=()=>setTrackerValue("water","waterGlasses","waterValue",v=>`${v} glass${Number(v)===1?"":"es"} logged today`);
const saveMeals=document.getElementById("saveMeals"); if(saveMeals) saveMeals.onclick=()=>setTrackerValue("meals","mealStatus","mealValue",v=>`Today: ${v}`);
const saveEnergy=document.getElementById("saveEnergy"); if(saveEnergy) saveEnergy.onclick=()=>setTrackerValue("energy","energyStatus","energyValue",v=>`Energy: ${v}`);

const goalPlans={
    energy:"Keep meals reasonably regular, drink water across the day, include breaks, and notice whether sleep or screen habits affect your energy.",
    routine:"Pick 2–3 repeatable anchors such as a consistent wake/sleep routine, study breaks, hydration, and a little movement.",
    strength:"Include enjoyable movement or exercise, recovery time, regular meals, hydration, and enough rest. Focus on feeling capable rather than changing your body size.",
    balance:"Aim for a mix of sleep, learning, movement, hydration, regular meals, enjoyable time, and emotional check-ins. Small consistent steps are enough."
};
document.querySelectorAll("[data-goal]").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll("[data-goal]").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
    document.getElementById("goalPlan").textContent=goalPlans[btn.dataset.goal] || "Choose a small healthy routine to focus on.";
    localStorage.setItem("mindmate_balance_goal",btn.dataset.goal);
}));

function saveTasks(){ localStorage.setItem("mindmate_tasks",JSON.stringify(tasks)); }
function taskDueToday(task){ const [h,m]=task.time.split(":").map(Number); const due=new Date(); due.setHours(h,m,0,0); if(task.snoozeUntil){ const snooze=new Date(task.snoozeUntil); if(snooze>due) return snooze; } return due; }
function renderTasks(){
    const list=document.getElementById("taskList"); if(!list) return; list.innerHTML="";
    if(!tasks.length){ list.innerHTML='<div class="tracker-value">No reminders yet.</div>'; return; }
    tasks.sort((a,b)=>a.time.localeCompare(b.time));
    const now=new Date();
    tasks.forEach(task=>{
        const overdue=!task.completed && taskDueToday(task)<now;
        const item=document.createElement("div"); item.className="task-item"+(overdue?" overdue":"");
        item.innerHTML=`<div class="task-main"><strong>${escapeHTML(task.name)}</strong><small>⏰ ${escapeHTML(task.time)} · ${task.completed?"Completed":"Scheduled"}${overdue?" · Due":""}${task.snoozeUntil && new Date(task.snoozeUntil)>now?" · Snoozed":""}</small></div><div class="task-actions"><button class="complete">${task.completed?"↩ Undo":"✓ Done"}</button>${!task.completed?'<button class="snooze">10m</button>':''}<button class="delete">Delete</button></div>`;
        item.querySelector(".complete").onclick=()=>{task.completed=!task.completed; task.lastAlertDate=null; task.snoozeUntil=null; saveTasks(); renderTasks();};
        const snooze=item.querySelector(".snooze");
        if(snooze) snooze.onclick=()=>{task.snoozeUntil=new Date(Date.now()+10*60*1000).toISOString(); task.lastAlertDate=null; saveTasks(); renderTasks();};
        item.querySelector(".delete").onclick=()=>{const i=tasks.indexOf(task); if(i>-1) tasks.splice(i,1); saveTasks(); renderTasks();};
        list.appendChild(item);
    });
}
function notifyTask(task){
    const message=`Reminder: ${task.name}`;
    if("Notification" in window && Notification.permission==="granted") new Notification("MindMate Reminder",{body:message});
    try{ const Ctx=window.AudioContext||window.webkitAudioContext; if(Ctx){const ctx=new Ctx(); const osc=ctx.createOscillator(); const gain=ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value=880; gain.gain.value=.05; osc.start(); osc.stop(ctx.currentTime+.5); } }catch(e){}
}
function checkTaskReminders(){
    const now=new Date(), date=todayKey();
    tasks.forEach(task=>{
        if(task.daily !== false && task.lastResetDate !== date){
            task.completed=false;
            task.lastAlertDate=null;
            task.snoozeUntil=null;
            task.lastResetDate=date;
        }
        if(task.completed || task.lastAlertDate===date) return;
        const due=taskDueToday(task);
        if(now>=due){ task.lastAlertDate=date; notifyTask(task); }
    });
    saveTasks(); renderTasks();
}
const addTask=document.getElementById("addTask");
if(addTask) addTask.onclick=()=>{
    const name=document.getElementById("taskName").value.trim(); const time=document.getElementById("taskTime").value;
    if(!name||!time) return;
    tasks.push({id:crypto.randomUUID(),name,time,completed:false,lastAlertDate:null,snoozeUntil:null,daily:true,lastResetDate:todayKey()}); saveTasks();
    document.getElementById("taskName").value=""; document.getElementById("taskTime").value=""; renderTasks();
};
const enableNotifications=document.getElementById("enableNotifications");
if(enableNotifications) enableNotifications.onclick=async()=>{
    const status=document.getElementById("notificationStatus");
    if(!("Notification" in window)){status.textContent="Browser notifications are not supported.";return;}
    const p=await Notification.requestPermission(); status.textContent=p==="granted"?"Notifications enabled ✓":"Notifications not enabled";
};
function updateNotificationStatus(){ const s=document.getElementById("notificationStatus"); if(!s)return; s.textContent=("Notification" in window&&Notification.permission==="granted")?"Notifications enabled ✓":"Notifications not enabled"; }
const originalShowView=showView;
showView=function(name){
    originalShowView(name);
    if(name==="tracker"){renderTracker();renderTasks();updateNotificationStatus();}
};
const savedGoal=localStorage.getItem("mindmate_balance_goal"); if(savedGoal){const b=document.querySelector(`[data-goal="${savedGoal}"]`);if(b)b.click();}
renderTracker(); renderTasks(); updateNotificationStatus(); setInterval(checkTaskReminders,15000); checkTaskReminders();


/* =========================================================
   SMART WELLNESS UPGRADE
   - Daily balance snapshot
   - 7-day rhythm
   - Small daily missions
   - AI reflection hand-off
========================================================= */
function latestMoodForToday(){
    const key=todayKey();
    for(let i=moods.length-1;i>=0;i--){
        const d=new Date(moods[i].date);
        const y=d.getFullYear();
        const m=String(d.getMonth()+1).padStart(2,"0");
        const day=String(d.getDate()).padStart(2,"0");
        if(`${y}-${m}-${day}`===key) return moods[i].mood;
    }
    return null;
}

function wellnessScoreFor(dateKey){
    const d=trackerData[dateKey] || {};
    const parts=[];
    if(d.sleep!==undefined){ const n=Number(d.sleep); parts.push(Math.max(0,Math.min(1,n/8))); }
    if(d.study!==undefined){ const n=Number(d.study); parts.push(Math.max(0,1-Math.max(0,n-360)/720)); }
    if(d.activity!==undefined){ const n=Number(d.activity); parts.push(Math.max(0,Math.min(1,n/45))); }
    if(d.water!==undefined){ const n=Number(d.water); parts.push(Math.max(0,Math.min(1,n/8))); }
    if(d.meals!==undefined){ parts.push(d.meals==="Regular"?1:d.meals==="Mostly regular"?.75:d.meals==="Irregular"?.45:.2); }
    if(dateKey===todayKey()){
        const mood=latestMoodForToday();
        if(mood) parts.push(moodValue(mood)/5);
    } else {
        const moodEntry=moods.slice().reverse().find(e=>{const x=new Date(e.date); const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,"0"),day=String(x.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`===dateKey;});
        if(moodEntry) parts.push(moodValue(moodEntry.mood)/5);
    }
    if(d.energy!==undefined){ parts.push(d.energy==="High"?1:d.energy==="Good"?.8:d.energy==="Okay"?.6:.35); }
    if(!parts.length) return null;
    return Math.round(parts.reduce((a,b)=>a+b,0)/parts.length*100);
}

function refreshSmartDashboard(){
    const scoreEl=document.getElementById("wellnessScore");
    const ring=document.getElementById("wellnessScoreRing");
    const title=document.getElementById("wellnessScoreTitle");
    const text=document.getElementById("wellnessScoreText");
    const score=wellnessScoreFor(todayKey());
    if(scoreEl) scoreEl.textContent=score===null?"—":score;
    if(ring && score!==null){ ring.style.setProperty("--score", `${score}%`); ring.style.borderColor="transparent"; }
    if(title){
        title.textContent=score===null?"Log a few habits to see your snapshot":score>=80?"Your day looks nicely balanced":score>=60?"You're building a balanced day":"A few gentle habits could support your day";
    }
    if(text && score!==null){
        const d=todayData();
        const missing=[];
        if(d.sleep===undefined) missing.push("sleep");
        if(d.water===undefined) missing.push("hydration");
        if(d.activity===undefined) missing.push("movement");
        text.textContent=missing.length?`You have a snapshot from ${Object.keys(d).length} logged habits. Add ${missing.slice(0,2).join(" and ")} when you can.`:"Nice — you've logged the main routine areas for today. Keep focusing on consistency, not perfection.";
    }
    renderWellnessWeek();
    renderDailyMissions();
}

function dateKeyOffset(offset){
    const d=new Date(); d.setDate(d.getDate()+offset);
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
}

function renderWellnessWeek(){
    const el=document.getElementById("wellnessWeek"); if(!el) return; el.innerHTML="";
    for(let offset=-6;offset<=0;offset++){
        const key=dateKeyOffset(offset), score=wellnessScoreFor(key);
        const d=new Date(); d.setDate(d.getDate()+offset);
        const label=offset===0?"Today":d.toLocaleDateString([], {weekday:"short"});
        const item=document.createElement("div"); item.className="week-day";
        item.innerHTML=`<div class="week-bar-wrap"><div class="week-bar" style="height:${score===null?5:Math.max(7,score*.9)}%;background:linear-gradient(180deg,var(--accent),var(--accent2))"></div></div><strong>${score===null?"—":score}</strong><small>${label}</small>`;
        el.appendChild(item);
    }
}

function missionState(id){ return Boolean(todayData().missions && todayData().missions[id]); }
function toggleMission(id){
    const d=todayData(); d.missions=d.missions||{}; d.missions[id]=!d.missions[id]; saveTracker(); refreshSmartDashboard();
}
function renderDailyMissions(){
    const el=document.getElementById("dailyMissions"); if(!el) return;
    const d=todayData();
    const missions=[
        {id:"checkin",icon:"😊",title:"Complete your check-in",sub:latestMoodForToday()?"Mood logged today":"Tap the Mood button above"},
        {id:"hydrate",icon:"💧",title:"Log your hydration",sub:d.water!==undefined?`${d.water} glasses logged`:`Add today's water when you can`},
        {id:"move",icon:"🚶",title:"Add a movement break",sub:d.activity!==undefined?`${d.activity} minutes logged`:`A short walk or stretch counts`}
    ];
    el.innerHTML="";
    missions.forEach(m=>{
        const done=missionState(m.id) || (m.id==="checkin"&&!!latestMoodForToday()) || (m.id==="hydrate"&&d.water!==undefined) || (m.id==="move"&&d.activity!==undefined);
        const item=document.createElement("div"); item.className="mission"+(done?" done":"");
        item.innerHTML=`<span class="mission-icon">${m.icon}</span><div class="mission-copy"><strong>${m.title}</strong><small>${m.sub}</small></div><button class="mission-check" aria-label="Complete mission">${done?"✓":"○"}</button>`;
        item.querySelector(".mission-check").onclick=()=>toggleMission(m.id);
        el.appendChild(item);
    });
}

const askInsightBtn=document.getElementById("askInsightBtn");
if(askInsightBtn) askInsightBtn.onclick=()=>{
    const d=todayData(), mood=latestMoodForToday()||"not logged";
    const summary=`Give me a short, supportive reflection on my wellness data today. Sleep: ${d.sleep??"not logged"} hours; study/screen time: ${d.study??"not logged"} minutes; activity: ${d.activity??"not logged"} minutes; water: ${d.water??"not logged"} glasses; meals: ${d.meals??"not logged"}; mood: ${mood}; energy: ${d.energy??"not logged"}. Do not diagnose or give weight/calorie advice. Focus on simple habits and patterns.`;
    showView("chat");
    if(input){ input.value=summary; sendMessage(); }
};

/* Keep the original tracker behavior, but refresh the smart layer after saves. */
const oldSetTrackerValue=setTrackerValue;
setTrackerValue=function(key,inputId,valueId,formatter){ oldSetTrackerValue(key,inputId,valueId,formatter); refreshSmartDashboard(); };
const oldRenderTracker=renderTracker;
renderTracker=function(){ oldRenderTracker(); refreshSmartDashboard(); };
const oldUpdateDashboard=updateDashboard;
updateDashboard=function(){ oldUpdateDashboard(); refreshSmartDashboard(); };
refreshSmartDashboard();


/* =========================================================
   POLISH LAYER — QUICK ACTIONS, PATTERN SPOTLIGHT, EXPORT
========================================================= */
function showQuickFeedback(message){
    const el=document.getElementById("quickFeedback");
    if(!el) return;
    el.textContent=message;
    clearTimeout(window.__mindmateFeedbackTimer);
    window.__mindmateFeedbackTimer=setTimeout(()=>{el.textContent="";},2200);
}
function updateTodayLabel(){
    const el=document.getElementById("todayLabel");
    if(el) el.textContent=new Date().toLocaleDateString([], {weekday:"short", month:"short", day:"numeric"});
}
function addQuickValue(key, amount){
    const d=todayData();
    const current=Number(d[key]||0);
    d[key]=current+amount;
    saveTracker();
    renderTracker();
    refreshSmartDashboard();
    const labels={water:"water glasses",activity:"minutes of movement",study:"minutes of study"};
    showQuickFeedback(`Saved ✓ ${d[key]} ${labels[key]} today`);
}
function addQuickReminder(name){
    const now=new Date();
    now.setMinutes(now.getMinutes()+15);
    const time=now.toTimeString().slice(0,5);
    tasks.push({id:String(Date.now()),name,time,done:false,created:new Date().toISOString(),date:todayKey(),quick:true});
    saveTasks();
    renderTasks();
    showQuickFeedback(`Reminder added ✓ ${time}`);
}
document.querySelectorAll("[data-quick-water]").forEach(btn=>btn.addEventListener("click",()=>addQuickValue("water",Number(btn.dataset.quickWater))));
document.querySelectorAll("[data-quick-activity]").forEach(btn=>btn.addEventListener("click",()=>addQuickValue("activity",Number(btn.dataset.quickActivity))));
document.querySelectorAll("[data-quick-study]").forEach(btn=>btn.addEventListener("click",()=>addQuickValue("study",Number(btn.dataset.quickStudy))));
document.querySelectorAll("[data-quick-task]").forEach(btn=>btn.addEventListener("click",()=>addQuickReminder(btn.dataset.quickTask)));

function renderPatternSpotlight(){
    const el=document.getElementById("patternSpotlight");
    if(!el) return;
    const keys=[];
    for(let i=-6;i<=0;i++) keys.push(dateKeyOffset(i));
    const days=keys.map(k=>trackerData[k]||{});
    const avg=(key)=>{const vals=days.map(d=>Number(d[key])).filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;};
    const sleep=avg("sleep"), water=avg("water"), activity=avg("activity"), study=avg("study");
    const moodEntries=moods.filter(e=>keys.includes((()=>{const x=new Date(e.date);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`})()));
    if(!sleep && !water && !activity && !study && !moodEntries.length){
        el.textContent="Keep logging a few days and MindMate will surface a gentle pattern here.";
        return;
    }
    const notes=[];
    if(sleep!==null) notes.push(`about ${sleep.toFixed(1)}h sleep`);
    if(water!==null) notes.push(`about ${water.toFixed(1)} glasses of water`);
    if(activity!==null) notes.push(`about ${Math.round(activity)} min movement`);
    if(study!==null) notes.push(`about ${Math.round(study)} min study time`);
    if(moodEntries.length>=2){
        const latest=moodEntries[moodEntries.length-1].mood;
        notes.push(`your latest mood check-in was ${latest.toLowerCase()}`);
    }
    el.textContent=`Over the last 7 days, you've logged ${notes.join(", ")}. Treat this as a reflection—not a diagnosis—and look for routines that feel sustainable for you.`;
}

function exportWellnessData(){
    const payload={
        exportedAt:new Date().toISOString(),
        wellness:trackerData,
        moodCheckIns:moods,
        journalEntries:journals,
        reminders:tasks,
        selectedGoal:localStorage.getItem("mindmate_balance_goal")||null
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`mindmate-wellness-${todayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
    showQuickFeedback("Your wellness data was exported ✓");
}
const exportWellness=document.getElementById("exportWellness");
if(exportWellness) exportWellness.addEventListener("click",exportWellnessData);

const oldRefreshSmartDashboard=refreshSmartDashboard;
refreshSmartDashboard=function(){
    oldRefreshSmartDashboard();
    updateTodayLabel();
    renderPatternSpotlight();
};
refreshSmartDashboard();
