// DRAFT MANAGEMENT SYSTEM - Using Supabase

// Get Supabase instance
function getSupabase() {
  return window.supabase_instance || supabaseClient;
}

// Generate unique document ID
async function generateDocumentId() {
  try {
    const sb = getSupabase();
    const currentYear = new Date().getFullYear();

    // Try up to 5 times to generate a unique ID
    for (let attempt = 0; attempt < 5; attempt++) {
      // Get all document IDs for current year, ordered by number descending
      const { data: drafts, error } = await sb
        .from("drafts")
        .select("document_id")
        .like("document_id", `PROP-${currentYear}-%`)
        .order("document_id", { ascending: false })
        .limit(1);

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        console.error("Error fetching document IDs:", error);
      }

      let nextNumber = 1;

      if (drafts && drafts.length > 0 && drafts[0].document_id) {
        // Extract number from last document ID (e.g., "PROP-2026-005" -> 5)
        const lastId = drafts[0].document_id;
        const matches = lastId.match(/PROP-(\d{4})-(\d{3})/);
        if (matches) {
          nextNumber = parseInt(matches[2]) + 1;
        }
      }

      // Format: PROP-YYYY-NNN (e.g., PROP-2026-001)
      const docId = `PROP-${currentYear}-${String(nextNumber).padStart(3, "0")}`;

      // Verify this ID doesn't already exist
      const { data: existing, error: checkError } = await sb
        .from("drafts")
        .select("id")
        .eq("document_id", docId)
        .single();

      // If no existing draft with this ID, we're good!
      if (checkError && checkError.code === "PGRST116") {
        console.log(`✅ Generated unique Document ID: ${docId}`);
        return docId;
      }

      // If ID exists, wait a tiny bit and retry
      console.warn(`Document ID ${docId} already exists, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }

    // If all retries failed, use timestamp-based fallback
    throw new Error("Could not generate sequential ID after 5 attempts");
  } catch (error) {
    console.error("Error generating document ID:", error);
    // Fallback to timestamp-based ID (guaranteed unique)
    const timestamp = Date.now().toString().slice(-6);
    const fallbackId = `PROP-${new Date().getFullYear()}-T${timestamp}`;
    console.log(`⚠️ Using fallback Document ID: ${fallbackId}`);
    return fallbackId;
  }
}

// Initialize document ID on page load
async function initializeDocumentId() {
  const docIdField = document.getElementById("documentIdField");
  if (docIdField && !docIdField.value) {
    const newDocId = await generateDocumentId();
    docIdField.value = newDocId;
    docIdField.placeholder = newDocId;
  }
}

// Start a new draft (reset form and generate new ID)
async function startNewDraft() {
  if (confirm("Start a new draft? Any unsaved changes will be lost.")) {
    // Reset all form fields
    const proposal = document.getElementById("printableProposal");
    const fields = proposal.querySelectorAll(
      'input:not([type="file"]), textarea, select',
    );
    fields.forEach((el) => {
      if (el.id !== "documentIdField") {
        el.value = "";
      }
    });

    // Generate new document ID
    const docIdField = document.getElementById("documentIdField");
    if (docIdField) {
      docIdField.value = ""; // Clear it first
      const newDocId = await generateDocumentId();
      docIdField.value = newDocId;
    }

    // Set current date
    const currentDateField = document.getElementById("currentDate");
    if (currentDateField) {
      currentDateField.value = new Date().toISOString().split("T")[0];
    }

    // Switch to editor tab
    const editorBtn = document.querySelector(".tab-btn");
    if (editorBtn) {
      openTab({ currentTarget: editorBtn }, "editor");
    }

    alert("✅ New draft started with Document ID: " + docIdField.value);
  }
}

// Save current draft to Supabase
async function saveDraft() {
  try {
    const user = verifyUserLoggedIn();
    if (!user) return;

    const sb = getSupabase();
    const projectTitle =
      document.querySelector(".h1-input").value || "Untitled Draft";
    const draftData = captureDraftData();

    // Extract metadata from form
    const documentIdField = document.getElementById("documentIdField");
    const documentId = documentIdField
      ? documentIdField.value
      : await generateDocumentId();

    let documentOwner = "";
    let issueDate = "";
    let startingDate = "";
    let handoverDate = "";

    // Get values from the form fields in Document Control section
    const allInputs = Array.from(document.querySelectorAll("input, textarea"));

    allInputs.forEach((input) => {
      if (input.placeholder === "Your Name/Company") {
        documentOwner = input.value;
      }
    });

    // Get dates from the date inputs
    const dateInputs = document.querySelectorAll("input[type='date']");
    if (dateInputs.length >= 3) {
      issueDate = dateInputs[0].value || new Date().toISOString().split("T")[0];
      startingDate = dateInputs[1].value || "";
      handoverDate = dateInputs[2].value || "";
    }

    const { data: existingDraft, error: checkError } = await sb
      .from("drafts")
      .select("id")
      .eq("user_id", user.id)
      .eq("project_title", projectTitle)
      .single();

    let result;
    if (existingDraft) {
      // Update existing draft
      result = await sb
        .from("drafts")
        .update({
          project_title: projectTitle,
          document_id: documentId,
          document_owner: documentOwner,
          issue_date: issueDate,
          starting_date: startingDate,
          handover_date: handoverDate,
          content: draftData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDraft.id);

      if (result.error) throw result.error;
      alert(`✅ Draft "${projectTitle}" (${documentId}) updated successfully!`);
    } else {
      // Insert new draft
      result = await sb.from("drafts").insert([
        {
          user_id: user.id,
          project_title: projectTitle,
          document_id: documentId,
          document_owner: documentOwner,
          issue_date: issueDate,
          starting_date: startingDate,
          handover_date: handoverDate,
          content: draftData,
        },
      ]);

      if (result.error) throw result.error;
      alert(`✅ Draft "${projectTitle}" saved with ID: ${documentId}`);
    }

    loadDraftsList();
  } catch (error) {
    console.error("Error saving draft:", error);
    alert(`❌ Error saving draft: ${error.message}`);
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

// Load and display drafts list from Supabase
async function loadDraftsList() {
  try {
    const user = verifyUserLoggedIn();
    if (!user) return;

    const sb = getSupabase();

    const { data: drafts, error } = await sb
      .from("drafts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const draftsList = document.getElementById("draftsList");

    if (!drafts || drafts.length === 0) {
      draftsList.innerHTML = `
        <div class="no-drafts">
          <p>📋 No saved drafts yet</p>
          <p class="no-drafts-subtitle">Create a proposal and click "Save Draft" to get started</p>
        </div>
      `;
      return;
    }

    draftsList.innerHTML = drafts
      .map((draft) => {
        const date = new Date(draft.created_at);
        const formattedDate =
          date.toLocaleDateString() + " " + date.toLocaleTimeString();
        const docId = draft.document_id || "N/A";
        const owner = draft.document_owner || "Unknown";

        return `
        <div class="draft-card" data-id="${draft.id}">
          <div class="draft-header">
            <div>
              <h3 class="draft-title">${draft.project_title}</h3>
              <p style="font-size: 12px; color: #64748b; margin: 4px 0;">
                <strong>Doc ID:</strong> ${docId} | <strong>Owner:</strong> ${owner}
              </p>
            </div>
            <span class="draft-date">${formattedDate}</span>
          </div>
          <div class="draft-actions">
            <button class="draft-btn edit-btn" onclick="editDraft('${draft.id}')">
              ✏️ Edit
            </button>
            <button class="draft-btn delete-btn" onclick="deleteDraft('${draft.id}')">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading drafts:", error);
    alert("❌ Error loading drafts");
  }
}

// Edit a saved draft
async function editDraft(draftId) {
  try {
    const user = verifyUserLoggedIn();
    if (!user) return;

    const sb = getSupabase();

    const { data: drafts, error } = await sb
      .from("drafts")
      .select("*")
      .eq("id", draftId)
      .eq("user_id", user.id);

    if (error) throw error;
    if (!drafts || drafts.length === 0) {
      alert("Draft not found");
      return;
    }

    const draft = drafts[0];
    loadDraftData(draft.content);

    // Restore document ID from the draft
    const docIdField = document.getElementById("documentIdField");
    if (docIdField && draft.document_id) {
      docIdField.value = draft.document_id;
    }

    const editorBtn = document.querySelector(".tab-btn");
    openTab({ currentTarget: editorBtn }, "editor");

    alert(
      `📝 Draft "${draft.project_title || draft.title}" (${draft.document_id || "No ID"}) loaded into editor.`,
    );
  } catch (error) {
    console.error("Error editing draft:", error);
    alert("❌ Error loading draft");
  }
}

// Download a saved draft
async function downloadDraft(draftId) {
  try {
    const user = verifyUserLoggedIn();
    if (!user) return;

    const sb = getSupabase();

    const { data: drafts, error } = await sb
      .from("drafts")
      .select("*")
      .eq("id", draftId)
      .eq("user_id", user.id);

    if (error) throw error;
    if (!drafts || drafts.length === 0) {
      alert("Draft not found");
      return;
    }

    const draft = drafts[0];
    const currentData = captureDraftData();
    loadDraftData(draft.content);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        loadDraftData(currentData);
      }, 500);
    }, 100);
  } catch (error) {
    console.error("Error downloading draft:", error);
    alert("❌ Error downloading draft");
  }
}

// Delete a saved draft
async function deleteDraft(draftId) {
  if (!confirm("Are you sure you want to delete this draft?")) {
    return;
  }

  try {
    const user = verifyUserLoggedIn();
    if (!user) return;

    const sb = getSupabase();

    const { error } = await sb
      .from("drafts")
      .delete()
      .eq("id", draftId)
      .eq("user_id", user.id);

    if (error) throw error;

    loadDraftsList();
    alert("✅ Draft deleted successfully!");
  } catch (error) {
    console.error("Error deleting draft:", error);
    alert("❌ Error deleting draft");
  }
}

// Logout function
function logoutUser() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
  }
}

// Initialize - Check login and load drafts
document.addEventListener("DOMContentLoaded", async function () {
  // Check if user is logged in
  const user = getCurrentUserFromStorage();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Display user info in sidebar if there's a user element
  const userNameEl = document.querySelector(".sidebar-header p");
  if (userNameEl) {
    userNameEl.textContent = user.name || "Team Member";
  }

  // Initialize document ID when page loads
  await initializeDocumentId();

  // Load drafts when tab is opened
  const originalOpenTab = window.openTab;
  window.openTab = function (evt, tabName) {
    originalOpenTab(evt, tabName);

    if (tabName === "drafts") {
      loadDraftsList();
    } else if (tabName === "editor") {
      // Generate new document ID when switching to editor
      initializeDocumentId();
    }
  };
});
