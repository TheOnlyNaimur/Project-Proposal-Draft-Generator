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
          "You are a professional business proposal generator. CRITICAL RULE: You MUST use the EXACT data provided by the user WITHOUT ANY MODIFICATIONS. If the user mentions specific project names, budgets, timelines, features, costs, or any other details - use them VERBATIM. Do NOT change numbers, do NOT optimize budgets, do NOT rephrase project names, do NOT adjust timelines. Your job is to structure the provided information into JSON format and ONLY generate content for fields that the user did NOT explicitly mention. Always respond with valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 8000,
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
    const errorData = await response.json().catch(() => ({}));
    console.error("API Error Response:", errorData);
    throw new Error(
      errorData.error?.message || `API Error: ${response.status} - ${response.statusText}`
    );
  }

  const data = await response.json();
  console.log("API Response:", data);
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("Invalid API response structure");
  }
  
  return data.choices[0].message.content;
}

// Build Prompt for AI
function buildPrompt(projectDescription) {
  return `You are a professional business proposal generator. Analyze the project description and generate a complete, detailed proposal that follows the EXACT structure below.

PROJECT DESCRIPTION:
${projectDescription}

ABSOLUTE CRITICAL RULES - VIOLATION WILL RESULT IN REJECTION:
1. 🚫 NEVER CHANGE USER-PROVIDED DATA: If user writes "500000 BDT budget" - use EXACTLY 500000, not 499000 or 501000
2. 🚫 NEVER REPHRASE PROJECT NAMES: If user writes "Tour Guide Website" - use EXACTLY that, not "Tourism Platform" or "Travel Website"
3. 🚫 NEVER MODIFY TIMELINES: If user writes "2 months" - use EXACTLY that, not "8 weeks" or "60 days"
4. 🚫 NEVER ALTER FEATURE NAMES: If user lists "Payment Gateway" - use EXACTLY that wording
5. ✅ ONLY GENERATE content for fields NOT mentioned by the user
6. ✅ ALL costs MUST be in BDT (Bangladeshi Taka)
7. ✅ If budget is provided, break it down realistically but TOTAL must match EXACTLY

Generate a JSON response with this EXACT structure matching the template:

{
  "documentId": "PROP-2026-XXXX (generate unique ID like PROP-2026-001)",
  "documentOwner": "EXACT company/owner name from description or 'SequenceIT' as default",
  "issueDate": "${new Date().toISOString().split('T')[0]}",
  "projectTitle": "EXACT project title from description (DO NOT REPHRASE)",
  "startingDate": "Start date from description or calculate from issue date",
  "handoverDate": "End date based on EXACT timeline mentioned or calculated",
  
  "documentHistory": [
    {"version": "1.0", "date": "${new Date().toISOString().split('T')[0]}", "changes": "Initial Draft"}
  ],
  
  "documentApproval": [
    {"role": "Project Manager", "name": "To be assigned", "date": ""}
  ],
  
  "executiveSummary": "2-3 detailed paragraphs covering: project vision, main goals, expected outcomes, and high-level timeline. Write professionally as if presenting to executives.",
  
  "background": "2-3 paragraphs providing: industry context, why this project is needed, relevant market conditions. If user provides background info, use it EXACTLY.",
  
  "requirements": {
    "businessProblem": "Detailed description of the problem/opportunity this project addresses. Include pain points, current situation, and business impact.",
    "solution": "Comprehensive explanation of the proposed solution. Include technical approach, key technologies, architecture, and how it solves the problem."
  },
  
  "proposal": {
    "visionAndGoal": "Detailed long-term vision (2-3 paragraphs): specific project objectives, measurable goals, success criteria, and expected business impact.",
    "includeDeliverables": true
  },
  
  "deliverables": [
    {"feature": "EXACT feature/module name from description", "description": "Detailed description of functionality and what will be delivered"}
  ],
  
  "timeframe": [
    {"task": "Task/Phase name (e.g., UI/UX Design, Backend Development, Testing)", "duration": "EXACT duration if provided (e.g., 20 Days, 3 Weeks)"}
  ],
  
  "infrastructureCosts": [
    {"item": "Infrastructure item (AWS/Azure hosting, domain, SSL, CDN, APIs, database, etc.)", "qty": 1, "cost": 5000, "currency": "BDT"}
  ],
  
  "developmentCosts": [
    {"task": "Development phase (Frontend Dev, Backend API, Database Design, Testing, Deployment, etc.)", "cost": 100000, "currency": "BDT"}
  ],
  
  "maintenanceCosts": {
    "include": true,
    "costs": [
      {"service": "Maintenance service (Monthly Support, Bug Fixes, Updates, Monitoring, etc.)", "cost": 10000, "currency": "BDT"}
    ]
  },
  
  "riskControl": {
    "include": true,
    "budget": [
      {"risk": "Risk issue name (Server Downtime Insurance, Security Breach Coverage, Scope Change Buffer, etc.)", "mitigation": 20000, "currency": "BDT"}
    ]
  },
  
  "totalBudget": 0,
  
  "ownership": "The Client shall own all rights, title, and interest in the deliverables upon full payment of the project fee. All source code, documentation, and assets will be transferred. The Company retains the right to use the project for portfolio purposes unless otherwise agreed.",
  
  "ownershipTable": [
    {"role": "Developer/Owner", "name": "Company/Team Name", "contact": "Email or Phone"}
  ]
}

IMPORTANT REQUIREMENTS:
1. Generate 8-15 detailed deliverables with specific features mentioned by user VERBATIM
2. Create 8-15 timeframe tasks with realistic durations:
   - Include: Requirements Gathering, UI/UX Design, Frontend Development, Backend Development, Database Design, API Integration, Testing, Deployment, Documentation
   - Use EXACT timeline if user provides it (e.g., if user says "2 months", distribute tasks across ~60 days)
3. Break down costs realistically:
   - Infrastructure: 3-8% of total (hosting, domain, SSL, CDN, APIs, database, storage)
   - Development: 75-85% of total (break down by: Frontend, Backend, Database, API, Testing, Deployment)
   - Maintenance: 5-10% of total (ALWAYS INCLUDE with realistic costs - monthly support, bug fixes, updates, monitoring, server maintenance)
   - Risk Control: 5-10% of total (ALWAYS INCLUDE with realistic costs - contingency buffer, security breach coverage, scope change buffer, downtime insurance)
4. MANDATORY: Always set "include": true for maintenanceCosts and riskControl with actual cost values (never 0)
5. If user provides EXACT budget, ensure totalBudget matches PRECISELY - adjust cost breakdown to sum to that exact amount
6. All currency MUST be "BDT" (Bangladeshi Taka)
7. Calculate totalBudget = sum of (all infrastructure costs × qty) + (all development costs) + (all maintenance costs) + (all risk costs)
8. Use professional, business-ready language suitable for formal client proposals
9. Generate at least 1-3 maintenance service items with realistic monthly/yearly costs
10. Generate at least 1-3 risk control items with appropriate mitigation budgets`;
}

// Parse AI Response
function parseAIResponse(response) {
  try {
    const data = JSON.parse(response);

    // Validate required fields
    if (!data.projectTitle || !data.executiveSummary) {
      throw new Error("Invalid response structure from AI - missing projectTitle or executiveSummary");
    }

    return data;
  } catch (error) {
    console.error("Parse error:", error);
    console.error("Response received:", response);
    throw new Error(`Failed to generate JSON. Please adjust your prompt. See 'failed_generation' for more details.`);
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
        <p><strong>Business Problem:</strong> ${data.requirements?.businessProblem || 'N/A'}</p>
        <p><strong>Solution:</strong> ${data.requirements?.solution || 'N/A'}</p>
      </div>

      <div class="content-section">
        <h3>🚀 Proposal - Vision and Goals</h3>
        <p>${data.proposal?.visionAndGoal || 'N/A'}</p>
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

      ${
        data.maintenanceCosts && data.maintenanceCosts.include && data.maintenanceCosts.costs && data.maintenanceCosts.costs.length > 0
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
            `
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
        data.riskControl && data.riskControl.include && data.riskControl.budget && data.riskControl.budget.length > 0
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
            `
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
