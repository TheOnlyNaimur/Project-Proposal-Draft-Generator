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
};
