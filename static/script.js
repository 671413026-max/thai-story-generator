// Set keywords into input field from chip buttons
function setKeywords(text) {
  const input = document.getElementById("promptInput");
  if (input) {
    input.value = text;
    input.focus();
  }
}

// Dismiss error alert
function dismissError() {
  const banner = document.getElementById("errorBanner");
  if (banner) {
    banner.classList.add("hidden");
  }
}

// Show error alert
function showError(message, title = "เกิดข้อผิดพลาด") {
  const banner = document.getElementById("errorBanner");
  const titleEl = document.getElementById("errorTitle");
  const msgEl = document.getElementById("errorMessage");

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (banner) {
    banner.classList.remove("hidden");
    banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// Separate story body and "ข้อคิดจากนิทาน"
function formatStory(rawText) {
  const regex = /(ข้อคิดจากนิทาน[\s\S]*)/i;
  const match = rawText.match(regex);

  let storyBody = rawText;
  let moral = "";

  if (match) {
    storyBody = rawText.substring(0, match.index).trim();
    moral = match[1].trim();
  }

  return { storyBody, moral };
}

// Append a message to the chat box
function appendMessage(sender, content, meta = {}) {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${sender}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = sender === "user" ? "🧒" : "🦄";

  const bubble = document.createElement("div");
  bubble.className = "bubble-content";

  if (sender === "user") {
    bubble.innerHTML = `<strong>คำที่เลือก:</strong> ${escapeHtml(content)}`;
  } else {
    // Bot story message
    const { storyBody, moral } = formatStory(content);

    let html = `<span class="story-badge">✨ นิทานจากปทุมมา AI</span>`;
    html += `<div class="story-body">${escapeHtml(storyBody).replace(/\n/g, "<br>")}</div>`;

    if (moral) {
      html += `
        <div class="moral-box">
          <div class="moral-title">🌟 ข้อคิดจากนิทาน</div>
          <div class="moral-text">${escapeHtml(moral).replace(/^(ข้อคิดจากนิทาน[:\s]*)/i, "").replace(/\n/g, "<br>")}</div>
        </div>
      `;
    }

    bubble.innerHTML = html;
  }

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  chatBox.appendChild(msgDiv);

  // Auto-scroll chat box to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Handle Form Submission
async function handleFormSubmit(event) {
  event.preventDefault();

  const promptInput = document.getElementById("promptInput");
  const generateBtn = document.getElementById("generateBtn");
  const loadingStatus = document.getElementById("loadingStatus");

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  // Clear previous errors
  dismissError();

  // Append user's prompt to chat
  appendMessage("user", prompt);
  promptInput.value = "";

  // Set loading state
  generateBtn.disabled = true;
  loadingStatus.classList.remove("hidden");

  try {
    const response = await fetch("/api/generate-story", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: prompt })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "ไม่สามารถแต่งนิทานได้ โปรดลองอีกครั้ง");
    }

    // Append AI story response
    appendMessage("bot", data.story, { prompt: data.prompt });
  } catch (err) {
    console.error("Story generation error:", err);
    showError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์", "ขออภัยจ้า");
  } finally {
    // Reset loading state
    generateBtn.disabled = false;
    loadingStatus.classList.add("hidden");
    promptInput.focus();
  }
}
