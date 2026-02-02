// DRAFT MANAGEMENT SYSTEM - Using File System Access API

// Save current draft as a file
async function saveDraft() {
  const projectTitle =
    document.querySelector(".h1-input").value || "Untitled Draft";
  const draftData = captureDraftData();

  const draft = {
    title: projectTitle,
    timestamp: new Date().toISOString(),
    data: draftData,
  };

  try {
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `draft_${timestamp}_${projectTitle.replace(/[^a-z0-9]/gi, "_")}.json`;

    // Show file save dialog
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: "JSON Files",
          accept: { "application/json": [".json"] },
        },
      ],
    });

    // Write file
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(draft, null, 2));
    await writable.close();

    alert(`✅ Draft "${projectTitle}" saved successfully!\nFile: ${filename}`);
    loadDraftsList();
  } catch (err) {
    if (err.name !== "AbortError") {
      alert(`❌ Error saving draft: ${err.message}`);
    }
  }
}

// Download PDF and auto-save draft
async function downloadAndSave() {
  await saveDraft();
  window.print();
}

// Capture all form data
function captureDraftData() {
  const proposal = document.getElementById("printableProposal");
  const data = {};

  // Capture all inputs, textareas, and selects
  proposal
    .querySelectorAll('input:not([type="file"]), textarea, select')
    .forEach((el, index) => {
      data[`field_${index}`] = {
        type: el.tagName.toLowerCase(),
        value: el.value,
        className: el.className,
        placeholder: el.placeholder || "",
      };
    });

  return data;
}

// Load draft data into editor
function loadDraftData(draftData) {
  const proposal = document.getElementById("printableProposal");
  const fields = proposal.querySelectorAll(
    'input:not([type="file"]), textarea, select',
  );

  fields.forEach((el, index) => {
    const saved = draftData[`field_${index}`];
    if (saved && saved.value !== undefined) {
      el.value = saved.value;
    }
  });

  // Trigger any necessary updates
  calculateTotals();
}

// Load and display drafts list from user-selected files
async function loadDraftsList() {
  const draftsList = document.getElementById("draftsList");

  draftsList.innerHTML = `
    <div class="no-drafts">
      <p>📋 Load your saved drafts</p>
      <button class="draft-btn edit-btn" onclick="loadDraftsFromFiles()" style="margin-top: 15px; padding: 12px 20px; font-size: 16px;">
        📂 Open Saved Drafts Folder
      </button>
      <p class="no-drafts-subtitle" style="margin-top: 15px; font-size: 13px;">Click above to select draft files from your computer</p>
    </div>
  `;
}

// Load multiple draft files
async function loadDraftsFromFiles() {
  try {
    const handles = await window.showOpenFilePicker({
      types: [
        {
          description: "JSON Draft Files",
          accept: { "application/json": [".json"] },
        },
      ],
      multiple: true,
    });

    const draftsList = document.getElementById("draftsList");
    const drafts = [];

    // Read all selected files
    for (const handle of handles) {
      const file = await handle.getFile();
      const content = await file.text();
      try {
        const draft = JSON.parse(content);
        drafts.push({
          handle,
          filename: file.name,
          ...draft,
        });
      } catch (e) {
        console.error(`Failed to parse ${file.name}:`, e);
      }
    }

    if (drafts.length === 0) {
      draftsList.innerHTML = `
        <div class="no-drafts">
          <p>❌ No valid draft files found</p>
        </div>
      `;
      return;
    }

    // Display loaded drafts
    draftsList.innerHTML = drafts
      .map((draft, index) => {
        const date = new Date(draft.timestamp);
        const formattedDate =
          date.toLocaleDateString() + " " + date.toLocaleTimeString();

        return `
        <div class="draft-card">
          <div class="draft-header">
            <h3 class="draft-title">${draft.title}</h3>
            <span class="draft-date">${formattedDate}</span>
          </div>
          <div class="draft-actions">
            <button class="draft-btn edit-btn" onclick="editDraftFromFile(${index})">
              ✏️ Edit
            </button>
            <button class="draft-btn download-btn-small" onclick="downloadDraftFromFile(${index})">
              📥 Download
            </button>
          </div>
          <div class="draft-filename" style="font-size: 12px; color: #888; margin-top: 8px;">File: ${draft.filename}</div>
        </div>
      `;
      })
      .join("");

    // Store loaded drafts temporarily
    window.loadedDrafts = drafts;
  } catch (err) {
    if (err.name !== "AbortError") {
      alert(`❌ Error loading drafts: ${err.message}`);
    }
  }
}

// Edit a draft file
function editDraftFromFile(index) {
  if (!window.loadedDrafts || !window.loadedDrafts[index]) {
    alert("Draft not found");
    return;
  }

  const draft = window.loadedDrafts[index];

  // Load draft data into editor
  loadDraftData(draft.data);

  // Switch to editor tab
  const editorBtn = document.querySelector(".tab-btn");
  openTab({ currentTarget: editorBtn }, "editor");

  alert(
    `📝 Draft "${draft.title}" loaded into editor. Make your changes and save again.`,
  );
}

// Download a draft file
function downloadDraftFromFile(index) {
  if (!window.loadedDrafts || !window.loadedDrafts[index]) {
    alert("Draft not found");
    return;
  }

  const draft = window.loadedDrafts[index];

  // Load draft temporarily
  const currentData = captureDraftData();
  loadDraftData(draft.data);

  // Trigger print
  setTimeout(() => {
    window.print();
    // Restore original data after print dialog
    setTimeout(() => {
      loadDraftData(currentData);
    }, 500);
  }, 100);
}

// Initialize drafts list when tab is opened
document.addEventListener("DOMContentLoaded", function () {
  const originalOpenTab = window.openTab;
  window.openTab = function (evt, tabName) {
    originalOpenTab(evt, tabName);

    if (tabName === "drafts") {
      loadDraftsList();
    }
  };
});
