// Groq API Configuration (loaded from config.js)
const GROQ_API_KEY = CONFIG.GROQ_API_KEY;
const GROQ_API_URL = CONFIG.GROQ_API_URL;
const MODEL_NAME = CONFIG.MODEL_NAME;

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
    // Store in localStorage to transfer to main editor
    localStorage.setItem(
      "aiGeneratedProposal",
      JSON.stringify(generatedProposalData)
    );
    alert(
      "✓ Proposal data saved! Open the main editor to apply it to your document."
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
  // Get project description
  const projectDescription = document.getElementById("projectDescription").value.trim();
  
  if (!projectDescription) {
    alert("Please describe your project in the text box.");
    return;
  }

  // Show loading state
  showLoadingState();

  try {
    // Simulate progress updates
    animateProgress();

    // Call Groq API
    const response = await callGroqAPI(projectDescription);

    // Parse and validate response
    const proposalData = parseAIResponse(response);

    // Store generated data
    generatedProposalData = proposalData;

    // Display preview
    displayProposal(proposalData);

    // Show action buttons
    previewActions.style.display = "flex";
  } catch (error) {
    console.error("Generation error:", error);
    showErrorState(error.message);
  }
}

// Call Groq API
async function callGroqAPI(projectDescription) {
  const prompt = buildPrompt(projectDescription);

  const requestBody = {
    model: MODEL_NAME,
    messages: [
      {
        role: "system",
        content:
          "You are a professional business proposal generator. Analyze the user's project description and extract all relevant information to generate a detailed, realistic project proposal in valid JSON format. CRITICAL: Use the EXACT data provided by the user - do not modify project names, budgets, timelines, features, or any other specific details mentioned. Only infer missing details that were not explicitly provided. Always respond with proper JSON structure.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  };

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error?.message || `API Error: ${response.status}`
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Build Prompt for AI
function buildPrompt(projectDescription) {
  return `Analyze the following project description and generate a complete professional project proposal.

PROJECT DESCRIPTION:
${projectDescription}

INSTRUCTIONS:
1. Carefully read the project description and extract all relevant information
2. Use EXACT data provided by the user - preserve project titles, budgets, timelines, feature names, and all specific details as written
3. Only infer or generate content for fields that are NOT explicitly mentioned in the description
4. If the user provides a budget amount, use it exactly - do not adjust or "optimize" it
5. If the user provides specific feature names or deliverables, use them verbatim
6. If the user provides a timeline, use it exactly as stated
7. For any missing information, generate realistic and appropriate content based on the project context

Generate a JSON response with this EXACT structure:
{
  "documentId": "PROP-2026-XXXX",
  "projectTitle": "Professional project title based on the description",
  "executiveSummary": "2-3 paragraph summary of the project vision, goals, and expected outcomes",
  "background": "Context and history relevant to this project based on the industry and problem described",
  "businessProblem": "Clear description of the problem or opportunity that this project addresses",
  "solution": "How this project solves the problem with specific technical approach",
  "visionAndGoal": "Long-term vision and specific measurable goals for the project",
  "deliverables": [
    {"feature": "Feature/Module name", "description": "Detailed feature description"}
  ],
  "timeframe": [
    {"task": "Development phase or task name", "duration": "X Days/Weeks"}
  ],
  "infrastructureCosts": [
    {"item": "Infrastructure item (hosting, domains, APIs, etc.)", "qty": 1, "cost": 10000, "currency": "BDT"}
  ],
  "developmentCosts": [
    {"task": "Development task or phase", "cost": 500000, "currency": "BDT"}
  ],
  "maintenanceCosts": [
    {"service": "Maintenance service (optional)", "cost": 50000, "currency": "BDT"}
  ],
  "riskControl": [
    {"risk": "Risk description (optional)", "mitigation": 100000, "currency": "BDT"}
  ],
  "ownership": "Standard description of ownership and IP rights transfer upon full payment",
  "totalBudget": 50000
}

IMPORTANT:
- Use EXACT data from the description - do not modify project titles, budgets, features, or timelines
- Generate 5-10 detailed deliverables (use mentioned features verbatim if provided)
- Create 6-12 timeframe tasks covering all development phases (preserve mentioned timeline)
- Provide realistic infrastructure and development cost breakdowns (honor mentioned budget)
- Total budget should EXACTLY match the mentioned budget, or be appropriate for scope if not mentioned
- Use BDT (Bangladeshi Taka) currency for all costs
- Make all content professional, detailed, and business-ready`;
}

// Parse AI Response
function parseAIResponse(response) {
  try {
    const data = JSON.parse(response);

    // Validate required fields
    if (!data.projectTitle || !data.executiveSummary) {
      throw new Error("Invalid response structure from AI");
    }

    return data;
  } catch (error) {
    console.error("Parse error:", error);
    throw new Error("Failed to parse AI response. Please try again.");
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
        <h3>🎯 Business Problem & Solution</h3>
        <p><strong>Problem:</strong> ${data.businessProblem}</p>
        <p><strong>Solution:</strong> ${data.solution}</p>
      </div>

      <div class="content-section">
        <h3>🚀 Vision and Goals</h3>
        <p>${data.visionAndGoal}</p>
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
            `
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
            `
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
            `
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
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      `
          : ""
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
      // Hide loading after generation completes
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
