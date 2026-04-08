/**
 * AI Pipeline Smoke Test Runner
 *
 * Runs a fixed set of prompts through the real AI pipeline and validates results.
 * Used in CI (deploy-staging.yml) to catch model regressions, system prompt issues,
 * and Validator test regressions.
 *
 * Usage:
 *   API_URL=https://staging.vibe.app API_TOKEN=xxx node runner.js
 */

const fs = require("fs");
const path = require("path");

const API_URL = process.env.API_URL || "http://localhost:3000";
const API_TOKEN = process.env.API_TOKEN;
const TIMEOUT_MS = 180_000; // 3 minutes per prompt
const POLL_INTERVAL_MS = 3_000;

const prompts = require("./prompts.json");

async function apiRequest(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (API_TOKEN) headers["Authorization"] = `Bearer ${API_TOKEN}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return { status: res.status, data: await res.json().catch(() => null) };
}

async function waitForCompletion(sessionId) {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    const { data } = await apiRequest("GET", `/api/v1/create/sessions/${sessionId}`);
    const status = data?.data?.status;

    if (status === "completed" || status === "under_review") {
      return { success: true, status, session: data.data };
    }
    if (status === "failed") {
      return { success: false, status, session: data.data };
    }
    if (status === "awaiting_approval") {
      // Auto-approve the plan
      await apiRequest("POST", `/api/v1/create/sessions/${sessionId}/approve`);
    }

    await sleep(POLL_INTERVAL_MS);
  }
  return { success: false, status: "timeout", session: null };
}

async function runPrompt(prompt) {
  const startTime = Date.now();
  console.log(`  [${prompt.id}] "${prompt.prompt}" (${prompt.complexity})`);

  try {
    // Create session with prompt
    const { status, data } = await apiRequest("POST", "/api/v1/create/sessions", {
      prompt: prompt.prompt,
    });

    if (status !== 201) {
      return { id: prompt.id, success: false, error: `Session creation failed: ${status}`, duration: 0 };
    }

    const sessionId = data.data.id;
    const result = await waitForCompletion(sessionId);
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`    -> ${result.status} (${duration}s)`);

    return {
      id: prompt.id,
      prompt: prompt.prompt,
      category: prompt.category,
      complexity: prompt.complexity,
      success: result.success,
      status: result.status,
      duration,
      fix_passes: result.session?.fix_passes || 0,
    };
  } catch (err) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`    -> ERROR: ${err.message} (${duration}s)`);
    return { id: prompt.id, success: false, error: err.message, duration };
  }
}

async function main() {
  console.log(`AI Pipeline Smoke Test`);
  console.log(`API: ${API_URL}`);
  console.log(`Prompts: ${prompts.length}`);
  console.log(`---`);

  const results = [];
  for (const prompt of prompts) {
    const result = await runPrompt(prompt);
    results.push(result);
  }

  console.log(`\n--- Results ---`);
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const avgDuration = Math.round(results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length);

  console.log(`Passed: ${succeeded}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  console.log(`Avg duration: ${avgDuration}s`);

  // Check pass/fail criteria
  const successRate = succeeded / results.length;
  const maxDuration = Math.max(...results.map((r) => r.duration || 0));

  console.log(`\n--- Criteria ---`);
  console.log(`Success rate: ${(successRate * 100).toFixed(0)}% (threshold: 75%): ${successRate >= 0.75 ? "PASS" : "FAIL"}`);
  console.log(`Max duration: ${maxDuration}s (threshold: 120s): ${maxDuration <= 120 ? "PASS" : "WARN"}`);

  // Write results file for CI artifact upload
  const output = {
    timestamp: new Date().toISOString(),
    api_url: API_URL,
    total: results.length,
    succeeded,
    failed,
    avg_duration: avgDuration,
    success_rate: successRate,
    results,
  };

  fs.writeFileSync(
    path.join(__dirname, "results.json"),
    JSON.stringify(output, null, 2)
  );
  console.log(`\nResults written to results.json`);

  // Exit with failure if below threshold
  if (successRate < 0.75) {
    console.error(`\nFAILED: Success rate ${(successRate * 100).toFixed(0)}% is below 75% threshold`);
    process.exit(1);
  }

  console.log(`\nPASSED`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Runner crashed:", err);
  process.exit(1);
});
