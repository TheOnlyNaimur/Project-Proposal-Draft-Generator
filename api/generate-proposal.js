export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method Not Allowed" } });
    return;
  }

  try {
    const { projectDescription } = req.body || {};
    if (!projectDescription || !projectDescription.trim()) {
      res
        .status(400)
        .json({ error: { message: "Missing projectDescription" } });
      return;
    }

    const prompt = buildPrompt(projectDescription.trim());

    const requestBody = {
      model: process.env.MODEL_NAME || "openai/gpt-oss-120b",
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

    const response = await fetch(
      process.env.GROQ_API_URL ||
        "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      res
        .status(response.status)
        .json({ error: { message: errorData.error?.message || "API Error" } });
      return;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      res.status(500).json({ error: { message: "Invalid API response" } });
      return;
    }

    res.status(200).json({ content });
  } catch (error) {
    res
      .status(500)
      .json({ error: { message: error.message || "Server error" } });
  }
}

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
  "issueDate": "${new Date().toISOString().split("T")[0]}",
  "projectTitle": "EXACT project title from description (DO NOT REPHRASE)",
  "startingDate": "Start date from description or calculate from issue date",
  "handoverDate": "End date based on EXACT timeline mentioned or calculated",
  
  "documentHistory": [
    {"version": "1.0", "date": "${new Date().toISOString().split("T")[0]}", "changes": "Initial Draft"}
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
