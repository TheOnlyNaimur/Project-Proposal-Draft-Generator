// 1. NAVIGATION & LOGO LOGIC
function openTab(evt, tabName) {
  let contents = document.getElementsByClassName("tab-content");
  for (let i = 0; i < contents.length; i++) contents[i].style.display = "none";

  let buttons = document.getElementsByClassName("tab-btn");
  for (let i = 0; i < buttons.length; i++)
    buttons[i].classList.remove("active");

  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.classList.add("active");

  // --- NEW PREVIEW LOGIC ---
  if (tabName === "preview") {
    const editorContent = document
      .getElementById("printableProposal")
      .cloneNode(true);
    const previewContainer = document.getElementById("preview");

    // 1. Remove all no-print elements and buttons from the clone
    editorContent
      .querySelectorAll(".no-print, .add-row-btn")
      .forEach((el) => el.remove());

    // 2. Convert all inputs/textareas/selects to plain text
    editorContent
      .querySelectorAll('input:not([type="file"]), textarea, select')
      .forEach((input) => {
        const span = document.createElement("span");

        // Preserve classes for styling (like h1-input)
        if (input.className) {
          span.className = input.className;
        } else {
          span.className = "preview-text";
        }

        // Get the actual value or placeholder
        if (input.tagName === "SELECT") {
          span.innerText = input.options[input.selectedIndex]?.text || "";
        } else if (input.type === "date") {
          span.innerText = input.value || "";
        } else {
          span.innerText = input.value || "";
        }

        // Replace the input with the span
        input.parentNode.replaceChild(span, input);
      });

    // 3. Remove file inputs completely
    editorContent
      .querySelectorAll('input[type="file"]')
      .forEach((el) => el.remove());

    // 4. Add timestamp to preview
    const timestamp = new Date().toLocaleString();

    // 5. Display the preview with timestamp in top right
    previewContainer.innerHTML = `
            <div style="text-align: right; margin-bottom: 10px;">
                <small style="color: #666; font-size: 12px;">Generated on: ${timestamp}</small>
            </div>
        `;
    previewContainer.appendChild(editorContent);

    // 6. Show download button in sidebar
    document.getElementById("downloadBtn").style.display = "block";
  } else {
    // Hide download button when not in preview
    const downloadBtn = document.getElementById("downloadBtn");
    if (downloadBtn) downloadBtn.style.display = "none";
  }
}

function updateLogoLayout() {
  const layout = document.getElementById("logoLayout").value;
  const header = document.getElementById("mainHeader");
  const clientLabel = document.getElementById("clientLogoLabel");

  if (layout === "center") {
    header.className = "layout-center";
    clientLabel.style.display = "none";
  } else {
    header.className = "layout-split";
    clientLabel.style.display = "inline-block";
  }
}

// 2. SIGNATURE PREVIEW LOGIC
function previewSignature(input, imgId, containerId) {
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = document.getElementById(imgId);
    const container = document.getElementById(containerId);
    const placeholder = container.querySelector(".placeholder-text");
    img.src = e.target.result;
    img.style.display = "block";
    if (placeholder) placeholder.style.display = "none";
  };
  if (file) reader.readAsDataURL(file);
}

// 3. TABLE ROW MANAGEMENT
function addRow(tableId) {
  const table = document
    .getElementById(tableId)
    .getElementsByTagName("tbody")[0];
  const newRow = table.insertRow();
  const colCount = table.rows[0].cells.length;

  // Tables that should NOT have auto-generated IDs
  const noIdTables = [
    "historyTable",
    "approvalTable",
    "deliverablesTable",
    "ownershipTable",
  ];
  const hasIds = !noIdTables.includes(tableId);

  // Get the current number of rows to determine the next ID
  const nextId = table.rows.length;

  for (let i = 0; i < colCount; i++) {
    const newCell = newRow.insertCell(i);

    if (i === 0 && hasIds) {
      // ID column - only for tables that need IDs
      newCell.innerText = nextId;
    } else if (i === colCount - 1) {
      // Action column with delete button
      newCell.className = "no-print";
      newCell.innerHTML =
        "<button onclick=\"this.parentElement.parentElement.remove(); reindexTable('" +
        tableId +
        '\'); calculateTotals();" style="color:red; border:none; background:none; cursor:pointer;">&times;</button>';
    } else {
      // Template from the first row
      newCell.innerHTML = table.rows[0].cells[i].innerHTML;
      const input = newCell.querySelector("input");
      const select = newCell.querySelector("select");
      if (input) {
        input.value = input.type === "number" ? 0 : "";
        input.addEventListener("input", calculateTotals);
      }
      if (select) select.addEventListener("change", calculateTotals);
    }
  }
  calculateTotals();
}

/** * This helper function fixes the ID numbers if you delete a row
 * in the middle (e.g., if you delete row 2, row 3 becomes row 2).
 */
function reindexTable(tableId) {
  // Only reindex if this table should have IDs
  const noIdTables = [
    "historyTable",
    "approvalTable",
    "deliverablesTable",
    "ownershipTable",
  ];
  if (noIdTables.includes(tableId)) return;

  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  rows.forEach((row, index) => {
    row.cells[0].innerText = index + 1;
  });
}

// 4. CALCULATION ENGINE (Supports all 4 budget areas)
function toggleSection(id, value) {
  const el = document.getElementById(id);
  const noTextId =
    id === "maintContent"
      ? "maintNoText"
      : id === "riskContent"
        ? "riskNoText"
        : id === "deliverablesContent"
          ? "deliverablesNoText"
          : null;
  const noTextEl = noTextId ? document.getElementById(noTextId) : null;

  if (value === "yes") {
    el.classList.add("show");
    if (noTextEl) noTextEl.style.display = "none";
  } else {
    el.classList.remove("show");
    if (noTextEl) noTextEl.style.display = "block";
  }
  calculateTotals();
}

function calculateTotals() {
  let infraTotal = 0;
  let devTotal = 0;
  let maintTotal = 0;
  let riskTotal = 0;

  // Infrastructure (Qty * Cost)
  document.querySelectorAll("#infraTable tbody tr").forEach((row) => {
    const qty = row.cells[2].querySelector("input")?.value || 0;
    const cost = row.cells[3].querySelector("input")?.value || 0;
    infraTotal += parseFloat(qty) * parseFloat(cost);
  });

  // Development Cost
  document.querySelectorAll("#devCostTable tbody tr").forEach((row) => {
    const cost = row.cells[2].querySelector("input")?.value || 0;
    devTotal += parseFloat(cost);
  });

  // Maintenance (Only if enabled)
  const maintContent = document.getElementById("maintContent");
  if (maintContent && maintContent.classList.contains("show")) {
    document.querySelectorAll("#maintTable tbody tr").forEach((row) => {
      const cost = row.cells[2].querySelector("input")?.value || 0;
      maintTotal += parseFloat(cost);
    });
  }

  // Risk Control (Only if enabled)
  const riskContent = document.getElementById("riskContent");
  if (riskContent && riskContent.classList.contains("show")) {
    document.querySelectorAll("#riskTable tbody tr").forEach((row) => {
      const cost = row.cells[2].querySelector("input")?.value || 0;
      riskTotal += parseFloat(cost);
    });
  }

  // Update Section-Specific Displays
  if (document.getElementById("totalInfra"))
    document.getElementById("totalInfra").innerText =
      infraTotal.toLocaleString();
  if (document.getElementById("totalDev"))
    document.getElementById("totalDev").innerText = devTotal.toLocaleString();

  // Update Overall Budget Table (Section 10)
  document.getElementById("sumInfra").innerText = infraTotal.toLocaleString();
  document.getElementById("sumDev").innerText = devTotal.toLocaleString();
  document.getElementById("sumMaint").innerText = maintTotal.toLocaleString();
  document.getElementById("sumRisk").innerText = riskTotal.toLocaleString();

  const grandTotal = infraTotal + devTotal + maintTotal + riskTotal;
  document.getElementById("grandTotal").innerText = grandTotal.toLocaleString();
}

// 5. INITIALIZATION
window.onload = () => {
  // Auto-set dates
  if (document.getElementById("currentDate"))
    document.getElementById("currentDate").valueAsDate = new Date();

  // Logo Upload Handlers
  const ourLogoInput = document.getElementById("ourLogoInput");
  const clientLogoInput = document.getElementById("clientLogoInput");

  if (ourLogoInput) {
    ourLogoInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          document.getElementById("ourLogoImg").src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (clientLogoInput) {
    clientLogoInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          document.getElementById("clientLogoImg").src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Policy Source Logic
  const policyInput = document.getElementById("policyText");
  const policyDisplay = document.getElementById("displayPolicy");
  const policyMode = document.getElementById("policyMode");
  const policyFileRow = document.getElementById("policyFileRow");
  const policyFile = document.getElementById("policyFile");

  const setPolicyText = (text) => {
    if (policyInput) policyInput.value = text;
    if (policyDisplay) policyDisplay.innerText = text;
  };

  const loadPolicyFromFile = async (fileName) => {
    try {
      const response = await fetch(fileName, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load policy file");
      const text = await response.text();
      setPolicyText(text);
    } catch (err) {
      setPolicyText("Unable to load policy file. Please try again.");
    }
  };

  if (policyInput && policyDisplay) {
    // Default: create policy
    if (policyMode) policyMode.value = "create";
    if (policyFileRow) policyFileRow.style.display = "none";
    policyInput.readOnly = false;

    policyInput.addEventListener("input", () => {
      policyDisplay.innerText = policyInput.value;
    });

    if (policyMode) {
      policyMode.addEventListener("change", () => {
        if (policyMode.value === "file") {
          if (policyFileRow) policyFileRow.style.display = "block";
          policyInput.readOnly = true;
          if (policyFile) loadPolicyFromFile(policyFile.value);
        } else {
          if (policyFileRow) policyFileRow.style.display = "none";
          policyInput.readOnly = false;
          setPolicyText(policyInput.value || "");
        }
      });
    }

    if (policyFile) {
      policyFile.addEventListener("change", () => {
        loadPolicyFromFile(policyFile.value);
      });
    }
  }

  // Auto-expand textareas
  document.querySelectorAll("textarea.auto-expand").forEach((el) => {
    el.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = this.scrollHeight + "px";
    });
  });

  calculateTotals(); // Run once on load
  checkAndApplyAIProposal(); // Check for AI-generated data
};

// Check for AI-generated proposal data on page load
function checkAndApplyAIProposal() {
  const aiData = localStorage.getItem("aiGeneratedProposal");
  if (aiData) {
    try {
      const proposalData = JSON.parse(aiData);
      if (confirm("Apply AI-generated proposal data to this document?")) {
        applyProposalData(proposalData);
        localStorage.removeItem("aiGeneratedProposal");
      } else {
        localStorage.removeItem("aiGeneratedProposal");
      }
    } catch (error) {
      console.error("Error applying AI data:", error);
      localStorage.removeItem("aiGeneratedProposal");
    }
  }
}

// Apply AI-generated data to form fields
function applyProposalData(data) {
  // Document Control
  if (data.documentId) {
    const docIdInput = document.querySelector('input[placeholder*="PROP-"]');
    if (docIdInput) docIdInput.value = data.documentId;
  }

  if (data.documentOwner) {
    const ownerInput = document.querySelector('input[placeholder*="Your Name/Company"]');
    if (ownerInput) ownerInput.value = data.documentOwner;
  }

  if (data.issueDate) {
    const dateInput = document.getElementById('currentDate');
    if (dateInput) dateInput.value = data.issueDate;
  }

  // Project Title
  if (data.projectTitle) {
    const titleInputs = document.querySelectorAll('input[placeholder*="PROJECT TITLE"], input[placeholder*="Project Name"]');
    titleInputs.forEach(input => input.value = data.projectTitle);
  }

  // Dates
  if (data.startingDate) {
    const startInputs = document.querySelectorAll('input[type="date"]');
    if (startInputs[1]) startInputs[1].value = data.startingDate;
  }

  if (data.handoverDate) {
    const handoverInputs = document.querySelectorAll('input[type="date"]');
    if (handoverInputs[2]) handoverInputs[2].value = data.handoverDate;
  }

  // Document History
  if (data.documentHistory && data.documentHistory.length > 0) {
    const historyTable = document.querySelector('#historyTable tbody');
    if (historyTable) {
      historyTable.innerHTML = '';
      data.documentHistory.forEach(item => {
        const row = historyTable.insertRow();
        row.innerHTML = `
          <td><input type="text" value="${escapeHtml(item.version || '1.0')}" /></td>
          <td><input type="date" value="${item.date || ''}" /></td>
          <td><input type="text" value="${escapeHtml(item.changes || '')}" /></td>
          <td class="no-print"></td>
        `;
      });
    }
  }

  // Document Approval
  if (data.documentApproval && data.documentApproval.length > 0) {
    const approvalTable = document.querySelector('#approvalTable tbody');
    if (approvalTable) {
      approvalTable.innerHTML = '';
      data.documentApproval.forEach(item => {
        const row = approvalTable.insertRow();
        row.innerHTML = `
          <td><input type="text" value="${escapeHtml(item.role || '')}" /></td>
          <td><input type="text" value="${escapeHtml(item.name || '')}" /></td>
          <td><div class="sig-line"></div></td>
          <td><input type="date" value="${item.date || ''}" /></td>
          <td class="no-print"></td>
        `;
      });
    }
  }

  // Executive Summary
  if (data.executiveSummary) {
    const summaryTextarea = document.querySelector('textarea[placeholder*="vision, goal"]');
    if (summaryTextarea) {
      summaryTextarea.value = data.executiveSummary;
      autoExpandTextarea(summaryTextarea);
    }
  }

  // Background
  if (data.background) {
    const backgroundTextarea = document.querySelector('textarea[placeholder*="Previous context"]');
    if (backgroundTextarea) {
      backgroundTextarea.value = data.background;
      autoExpandTextarea(backgroundTextarea);
    }
  }

  // Requirements - Business Problem and Solution
  if (data.requirements) {
    // Find Requirements section by title
    const sectionTitles = document.querySelectorAll('.section-title');
    for (let i = 0; i < sectionTitles.length; i++) {
      if (sectionTitles[i].textContent.trim().includes('3. Requirements')) {
        const section = sectionTitles[i].closest('.printable-section');
        if (section) {
          const allTextareas = section.querySelectorAll('textarea.auto-expand');
          // The Requirements section has 3 textareas total: Background, Business Problem, Solution
          // Background is before Requirements title, so we need textareas after it
          const subTitles = section.querySelectorAll('.sub-title');
          
          // Find Business Problem textarea (after 3.1 subtitle)
          if (subTitles[0] && data.requirements.businessProblem) {
            const businessProblemTextarea = subTitles[0].nextElementSibling;
            if (businessProblemTextarea && businessProblemTextarea.tagName === 'TEXTAREA') {
              businessProblemTextarea.value = data.requirements.businessProblem;
              autoExpandTextarea(businessProblemTextarea);
            }
          }
          
          // Find Solution textarea (after 3.2 subtitle)
          if (subTitles[1] && data.requirements.solution) {
            const solutionTextarea = subTitles[1].nextElementSibling;
            if (solutionTextarea && solutionTextarea.tagName === 'TEXTAREA') {
              solutionTextarea.value = data.requirements.solution;
              autoExpandTextarea(solutionTextarea);
            }
          }
        }
        break;
      }
    }
  }

  // Proposal - Vision and Goals
  if (data.proposal && data.proposal.visionAndGoal) {
    const visionTextarea = document.querySelector('textarea[placeholder*="long-term vision"]');
    if (visionTextarea) {
      visionTextarea.value = data.proposal.visionAndGoal;
      autoExpandTextarea(visionTextarea);
    }
  }

  // Deliverables
  if (data.deliverables && data.deliverables.length > 0) {
    // Enable deliverables section
    const deliverablesToggle = document.querySelector('#deliverablesToggle');
    if (deliverablesToggle) deliverablesToggle.value = 'yes';
    const deliverablesContent = document.querySelector('#deliverablesContent');
    if (deliverablesContent) deliverablesContent.classList.remove('hidden-section');
    const deliverablesNoText = document.querySelector('#deliverablesNoText');
    if (deliverablesNoText) deliverablesNoText.style.display = 'none';

    const deliverablesTable = document.querySelector('#deliverablesTable tbody');
    if (deliverablesTable) {
      deliverablesTable.innerHTML = '';
      data.deliverables.forEach(item => {
        const row = deliverablesTable.insertRow();
        row.innerHTML = `
          <td><input type="text" value="${escapeHtml(item.feature || '')}" /></td>
          <td><input type="text" value="${escapeHtml(item.description || '')}" /></td>
          <td class="no-print"></td>
        `;
      });
    }
  }

  // Timeframe
  if (data.timeframe && data.timeframe.length > 0) {
    const timeframeTable = document.querySelector('#timeframeTable tbody');
    if (timeframeTable) {
      timeframeTable.innerHTML = '';
      data.timeframe.forEach((item, index) => {
        const row = timeframeTable.insertRow();
        row.innerHTML = `
          <td>${index + 1}</td>
          <td><input type="text" value="${escapeHtml(item.task || '')}" /></td>
          <td><input type="text" value="${escapeHtml(item.duration || '')}" /></td>
          <td class="no-print"></td>
        `;
      });
    }
  }

  // Infrastructure Costs
  if (data.infrastructureCosts && data.infrastructureCosts.length > 0) {
    const infraTable = document.querySelector('#infraTable tbody');
    if (infraTable) {
      infraTable.innerHTML = '';
      data.infrastructureCosts.forEach((item, index) => {
        const row = infraTable.insertRow();
        row.innerHTML = `
          <td>${index + 1}</td>
          <td><input type="text" value="${escapeHtml(item.item || '')}" /></td>
          <td><input type="number" value="${item.qty || 1}" oninput="calculateTotals()" /></td>
          <td><input type="number" class="cost-input" value="${item.cost || 0}" oninput="calculateTotals()" /></td>
          <td>
            <select onchange="calculateTotals()">
              <option value="BDT" ${item.currency === 'BDT' ? 'selected' : ''}>BDT (৳)</option>
              <option value="USD" ${item.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
              <option value="EUR" ${item.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
            </select>
          </td>
          <td class="no-print"></td>
        `;
      });
    }
  }

  // Development Costs
  if (data.developmentCosts && data.developmentCosts.length > 0) {
    const devTable = document.querySelector('#devCostTable tbody');
    if (devTable) {
      devTable.innerHTML = '';
      data.developmentCosts.forEach((item, index) => {
        const row = devTable.insertRow();
        row.innerHTML = `
          <td>${index + 1}</td>
          <td><input type="text" value="${escapeHtml(item.task || '')}" /></td>
          <td><input type="number" class="cost-input" value="${item.cost || 0}" oninput="calculateTotals()" /></td>
          <td>
            <select onchange="calculateTotals()">
              <option ${item.currency === 'BDT' || !item.currency ? 'selected' : ''}>BDT</option>
              <option ${item.currency === 'USD' ? 'selected' : ''}>USD</option>
              <option ${item.currency === 'EUR' ? 'selected' : ''}>EUR</option>
            </select>
          </td>
          <td class="no-print"></td>
        `;
      });
    }
  }

  // Maintenance Costs
  if (data.maintenanceCosts && data.maintenanceCosts.include && data.maintenanceCosts.costs && data.maintenanceCosts.costs.length > 0) {
    // Enable maintenance section
    const maintToggle = document.querySelector('#maintToggle');
    if (maintToggle) maintToggle.value = 'yes';
    const maintContent = document.querySelector('#maintContent');
    if (maintContent) {
      maintContent.classList.remove('hidden-section');
      maintContent.classList.add('show');
    }
    const maintNoText = document.querySelector('#maintNoText');
    if (maintNoText) maintNoText.style.display = 'none';

    const maintTable = document.querySelector('#maintTable tbody');
    if (maintTable) {
      maintTable.innerHTML = '';
      data.maintenanceCosts.costs.forEach((item, index) => {
        const row = maintTable.insertRow();
        row.innerHTML = `
          <td>${index + 1}</td>
          <td><input type="text" value="${escapeHtml(item.service || '')}" /></td>
          <td><input type="number" class="cost-input" value="${item.cost || 0}" oninput="calculateTotals()" /></td>
          <td>
            <select onchange="calculateTotals()">
              <option ${item.currency === 'BDT' || !item.currency ? 'selected' : ''}>BDT</option>
              <option ${item.currency === 'USD' ? 'selected' : ''}>USD</option>
            </select>
          </td>
          <td class="no-print"></td>
        `;
      });
    }
  }

  // Risk Control
  if (data.riskControl && data.riskControl.include && data.riskControl.budget && data.riskControl.budget.length > 0) {
    // Enable risk control section
    const riskToggle = document.querySelector('#riskToggle');
    if (riskToggle) riskToggle.value = 'yes';
    const riskContent = document.querySelector('#riskContent');
    if (riskContent) {
      riskContent.classList.remove('hidden-section');
      riskContent.classList.add('show');
    }
    const riskNoText = document.querySelector('#riskNoText');
    if (riskNoText) riskNoText.style.display = 'none';

    const riskTable = document.querySelector('#riskTable tbody');
    if (riskTable) {
      riskTable.innerHTML = '';
      data.riskControl.budget.forEach((item, index) => {
        const row = riskTable.insertRow();
        row.innerHTML = `
          <td>${index + 1}</td>
          <td><input type="text" value="${escapeHtml(item.risk || '')}" /></td>
          <td><input type="number" class="cost-input" value="${item.mitigation || 0}" oninput="calculateTotals()" /></td>
          <td>
            <select onchange="calculateTotals()">
              <option ${item.currency === 'BDT' || !item.currency ? 'selected' : ''}>BDT</option>
              <option ${item.currency === 'USD' ? 'selected' : ''}>USD</option>
            </select>
          </td>
          <td class="no-print"></td>
        `;
      });
    }
  }

  // Ownership
  if (data.ownership) {
    // Find the ownership section textarea
    document.querySelectorAll('.section-title').forEach((title) => {
      if (title.textContent.includes('11. Ownership')) {
        const section = title.closest('.printable-section');
        const textarea = section.querySelector('textarea.auto-expand');
        if (textarea) {
          textarea.value = data.ownership;
          autoExpandTextarea(textarea);
        }
      }
    });
  }

  // Ownership Table
  if (data.ownershipTable && data.ownershipTable.length > 0) {
    const ownershipTable = document.querySelector('#ownershipTable tbody');
    if (ownershipTable) {
      ownershipTable.innerHTML = '';
      data.ownershipTable.forEach(item => {
        const row = ownershipTable.insertRow();
        row.innerHTML = `
          <td><input type="text" value="${escapeHtml(item.role || '')}" /></td>
          <td><input type="text" value="${escapeHtml(item.name || '')}" /></td>
          <td><input type="text" value="${escapeHtml(item.contact || '')}" /></td>
          <td class="no-print"></td>
        `;
      });
    }
  }

  // Recalculate totals
  calculateTotals();
  
  alert("✓ AI-generated proposal data applied successfully!");
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to auto-expand textareas
function autoExpandTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
}
