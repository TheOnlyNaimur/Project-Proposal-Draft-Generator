// Global variable to store generated data
let generatedProposalData = null;

// DOM Elements
const form = document.getElementById("aiInputForm");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const previewContent = document.getElementById("previewContent");
const loadingState = document.getElementById("loadingState");
const previewActions = document.getElementById("previewActions");
const applyBtn = document.getElementById("applyBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
const exportBtn = document.getElementById("exportBtn");
const loadingMessage = document.getElementById("loadingMessage");
const progressFill = document.getElementById("progressFill");

// Loading Messages
const loadingMessages = [
  "Analyzing project requirements...",
  "Structuring proposal sections...",
  "Generating budget estimates...",
  "Creating timeline breakdown...",
  "Finalizing proposal draft...",
];

// Generate Button Handler
generateBtn.addEventListener("click", async () => {
  await generateProposal();
});

// Form Submit Handler (prevent default)
form.addEventListener("submit", (e) => {
  e.preventDefault();
});

// Clear Form Handler
clearBtn.addEventListener("click", () => {
  form.reset();
  showEmptyState();
});

// Regenerate Handler
regenerateBtn.addEventListener("click", async () => {
  await generateProposal();
});

// Apply to Main Editor Handler
applyBtn.addEventListener("click", () => {
  if (generatedProposalData) {
    localStorage.setItem(
      "aiGeneratedProposal",
      JSON.stringify(generatedProposalData),
    );
    alert(
      "✓ Proposal data saved! Open the main editor to apply it to your document.",
    );
    window.location.href = "index.html";
  }
});

// Export JSON Handler
exportBtn.addEventListener("click", () => {
  if (generatedProposalData) {
    const dataStr = JSON.stringify(generatedProposalData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposal-draft-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
});

// Main Generate Proposal Function
async function generateProposal() {
  const projectDescription = document
    .getElementById("projectDescription")
    .value.trim();

  if (!projectDescription) {
    alert("Please describe your project in the text box.");
    return;
  }

  showLoadingState();

  try {
    animateProgress();

    const response = await callGroqAPI(projectDescription);

    const proposalData = parseAIResponse(response);

    generatedProposalData = proposalData;

    displayProposal(proposalData);

    previewActions.style.display = "flex";
  } catch (error) {
    console.error("Generation error:", error);
    showErrorState(error.message);
  }
}

// Call AI API (server-side)
async function callGroqAPI(projectDescription) {
  const response = await fetch("/api/generate-proposal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectDescription }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("API Error Response:", errorData);
    throw new Error(
      errorData.error?.message ||
        `API Error: ${response.status} - ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (!data.content) {
    throw new Error("Invalid API response structure");
  }

  return data.content;
}

// Parse AI Response
function parseAIResponse(response) {
  try {
    const data = JSON.parse(response);

    if (!data.projectTitle || !data.executiveSummary) {
      throw new Error(
        "Invalid response structure from AI - missing projectTitle or executiveSummary",
      );
    }

    return data;
  } catch (error) {
    console.error("Parse error:", error);
    console.error("Response received:", response);
    throw new Error(
      "Failed to generate JSON. Please adjust your prompt. See 'failed_generation' for more details.",
    );
  }
}

// Display Proposal Preview
function displayProposal(data) {
  const html = `
    <div class="generated-content">
      <div class="content-section">
        <h3>📋 Project Title</h3>
        <p><strong>${data.projectTitle}</strong></p>
        <p><small>Document ID: ${data.documentId}</small></p>
      </div>

      <div class="content-section">
        <h3>📝 Executive Summary</h3>
        <p>${data.executiveSummary}</p>
      </div>

      <div class="content-section">
        <h3>📖 Background</h3>
        <p>${data.background}</p>
      </div>

      <div class="content-section">
        <h3>🎯 Requirements</h3>
        <p><strong>Business Problem:</strong> ${data.requirements?.businessProblem || "N/A"}</p>
        <p><strong>Solution:</strong> ${data.requirements?.solution || "N/A"}</p>
      </div>

      <div class="content-section">
        <h3>🚀 Proposal - Vision and Goals</h3>
        <p>${data.proposal?.visionAndGoal || "N/A"}</p>
      </div>

      ${
        data.deliverables && data.deliverables.length > 0
          ? `
      <div class="content-section">
        <h3>✅ Deliverables (${data.deliverables.length})</h3>
        <table class="content-table">
          <thead>
            <tr>
              <th>Feature/Module</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${data.deliverables
              .map(
                (d) => `
              <tr>
                <td>${d.feature}</td>
                <td>${d.description}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      ${
        data.timeframe && data.timeframe.length > 0
          ? `
      <div class="content-section">
        <h3>⏱️ Timeframe (${data.timeframe.length} Tasks)</h3>
        <table class="content-table">
          <thead>
            <tr>
              <th>Task Name</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${data.timeframe
              .map(
                (t) => `
              <tr>
                <td>${t.task}</td>
                <td>${t.duration}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      ${
        data.infrastructureCosts && data.infrastructureCosts.length > 0
          ? `
      <div class="content-section">
        <h3>💻 Infrastructure Costs</h3>
        <table class="content-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Cost</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            ${data.infrastructureCosts
              .map(
                (i) => `
              <tr>
                <td>${i.item}</td>
                <td>${i.qty}</td>
                <td>${i.cost}</td>
                <td>${i.currency}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      ${
        data.developmentCosts && data.developmentCosts.length > 0
          ? `
      <div class="content-section">
        <h3>👨‍💻 Development Costs</h3>
        <table class="content-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Cost</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            ${data.developmentCosts
              .map(
                (d) => `
              <tr>
                <td>${d.task}</td>
                <td>${d.cost}</td>
                <td>${d.currency}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      ${
        data.maintenanceCosts &&
        data.maintenanceCosts.include &&
        data.maintenanceCosts.costs &&
        data.maintenanceCosts.costs.length > 0
          ? `
      <div class="content-section">
        <h3>🔧 Maintenance</h3>
        <table class="content-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Cost</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            ${data.maintenanceCosts.costs
              .map(
                (m) => `
              <tr>
                <td>${m.service}</td>
                <td>${m.cost}</td>
                <td>${m.currency}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : `
      <div class="content-section">
        <h3>🔧 Maintenance</h3>
        <p>Maintenance is not included in this proposal.</p>
      </div>
      `
      }

      ${
        data.riskControl &&
        data.riskControl.include &&
        data.riskControl.budget &&
        data.riskControl.budget.length > 0
          ? `
      <div class="content-section">
        <h3>⚠️ Risk Control</h3>
        <table class="content-table">
          <thead>
            <tr>
              <th>Risk</th>
              <th>Mitigation Cost</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            ${data.riskControl.budget
              .map(
                (r) => `
              <tr>
                <td>${r.risk}</td>
                <td>${r.mitigation}</td>
                <td>${r.currency}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : `
      <div class="content-section">
        <h3>⚠️ Risk Control</h3>
        <p>Risk control measures are not included in this proposal.</p>
      </div>
      `
      }

      <div class="content-section" style="border-left-color: #27ae60;">
        <h3>💰 Total Budget Estimate</h3>
        <p style="font-size: 24px; font-weight: bold; color: #27ae60;">
          ৳${data.totalBudget?.toLocaleString() || "N/A"}
        </p>
      </div>

      <div class="content-section">
        <h3>📜 Ownership</h3>
        <p>${data.ownership}</p>
      </div>
    </div>
  `;

  previewContent.innerHTML = html;
}

// Show Empty State
function showEmptyState() {
  previewContent.innerHTML = `
    <p style="text-align: center; color: #7f8c8d; padding: 40px; font-style: italic;">
      🤖 Describe your project in the text box and click "Generate Proposal Draft" to see AI-generated content here.
    </p>
  `;
  previewActions.style.display = "none";
  generatedProposalData = null;
}

// Show Loading State
function showLoadingState() {
  previewContent.style.display = "none";
  loadingState.style.display = "block";
  previewActions.style.display = "none";
  generateBtn.disabled = true;
  progressFill.style.width = "0%";
}

// Show Error State
function showErrorState(errorMessage) {
  previewContent.style.display = "block";
  loadingState.style.display = "none";
  previewContent.innerHTML = `
    <div class="error-state">
      <h3>⚠️ Generation Failed</h3>
      <p>${errorMessage}</p>
      <p style="margin-top: 10px;">Please check your inputs and try again.</p>
    </div>
  `;
  generateBtn.disabled = false;
}

// Animate Progress Bar
function animateProgress() {
  let progress = 0;
  let messageIndex = 0;

  const interval = setInterval(() => {
    progress += 20;
    progressFill.style.width = `${progress}%`;

    if (messageIndex < loadingMessages.length) {
      loadingMessage.textContent = loadingMessages[messageIndex];
      messageIndex++;
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        loadingState.style.display = "none";
        previewContent.style.display = "block";
        generateBtn.disabled = false;
      }, 500);
    }
  }, 800);
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  showEmptyState();
});
