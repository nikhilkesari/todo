import fs from 'node:fs';
import path from 'node:path';

/**
 * Cursor-Style Automated Bugbot Code Reviewer
 *
 * Evaluates git diffs using Google Gemini for:
 * 1. Logic Flaws (race conditions, async promise bugs, state desync)
 * 2. IndexedDB Data Integrity (transactions, schema, key collisions, migrations)
 * 3. Security (untrusted inputs, exposed keys, XSS risks)
 * 4. Regressions (breaking API contracts, broken state flow)
 * 5. Edge Cases (null/undefined safety, empty arrays, date boundaries)
 *
 * Posts idempotent sticky PR comment using <!-- BUGBOT_REVIEW_ANCHOR -->
 * and writes structured diagnostics to $GITHUB_STEP_SUMMARY.
 */

const ANCHOR = '<!-- BUGBOT_REVIEW_ANCHOR -->';
const MAX_DIFF_BYTES = 50 * 1024; // 50KB limit for token safety

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const prNumber = process.env.PR_NUMBER;
  const eventName = process.env.EVENT_NAME || 'push';
  const repoName = process.env.REPO_NAME || 'nikhilkesari/todo';
  const diffFilePath = process.env.DIFF_FILE || '.github/temp/changes.diff';
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;

  const appendSummary = (markdown) => {
    if (summaryFile && fs.existsSync(path.dirname(summaryFile))) {
      try {
        fs.appendFileSync(summaryFile, `\n${markdown}\n`);
      } catch (err) {
        console.warn('Could not write to GITHUB_STEP_SUMMARY:', err);
      }
    }
    console.info(markdown);
  };

  // 1. Secret Guard
  if (!apiKey) {
    const notice =
      `### ⚠️ Bugbot Skipped\n\n` +
      `The \`GEMINI_API_KEY\` secret is not configured in this environment. ` +
      `Bugbot automated code review was gracefully bypassed without failing CI.`;
    appendSummary(notice);
    process.exit(0);
  }

  // 2. Read and Truncate Diff
  let diffContent = '';
  if (fs.existsSync(diffFilePath)) {
    diffContent = fs.readFileSync(diffFilePath, 'utf8');
  }

  if (!diffContent || diffContent.trim().length === 0) {
    const notice = `### ℹ️ Bugbot Code Review\n\nNo significant source code modifications detected in this change.`;
    appendSummary(notice);
    process.exit(0);
  }

  let isTruncated = false;
  if (Buffer.byteLength(diffContent, 'utf8') > MAX_DIFF_BYTES) {
    diffContent = diffContent.slice(0, MAX_DIFF_BYTES);
    isTruncated = true;
  }

  // 3. Prompt Construction
  const prompt = `You are Bugbot, an elite automated code review agent inspired by Cursor Bug Finder.
Analyze the following git diff for repository "${repoName}".

Review Criteria:
1. LOGIC FLAWS: race conditions, unhandled async promises, off-by-one errors, state desynchronization.
2. INDEXEDDB DATA INTEGRITY: transaction abort handling, missing object store indexes, schema mismatches, serialization failures.
3. SECURITY: exposed secrets/API keys, cross-site scripting (XSS), prototype pollution, unsafe inputs.
4. REGRESSIONS: broken API contracts between frontend and backend proxy, missing prop types, broken event bindings.
5. EDGE CASES: null/undefined safety, empty arrays, leap years, timezone offsets, network disconnects.

Respond strictly in valid JSON matching this schema:
{
  "verdict": "APPROVE" | "CHANGES_REQUESTED" | "COMMENT",
  "riskScore": number (1 to 10),
  "summary": "Concise high-level assessment of the changes",
  "findings": [
    {
      "category": "logic_flaw" | "indexeddb_integrity" | "security" | "regression" | "edge_case",
      "severity": "critical" | "warning" | "suggestion",
      "file": "path/to/file",
      "line": number or null,
      "title": "Short title",
      "explanation": "Detailed rationale",
      "suggestedFix": "Code snippet or concrete action (optional)"
    }
  ]
}

If the code looks safe, robust, and clean, set verdict to "APPROVE", riskScore between 1 and 3, and empty or minimal suggestions in findings.

Git Diff:
${diffContent}
${isTruncated ? '\n\n[Diff truncated to 50KB for token safety]' : ''}
`;

  // 4. Call Gemini API
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let reviewResult = null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned HTTP ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Empty response from Gemini API');
    }

    // Clean potential markdown fencing
    const cleanedText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    reviewResult = JSON.parse(cleanedText);
  } catch (apiError) {
    console.error('Gemini Bugbot review error:', apiError);
    appendSummary(
      `### ⚠️ Bugbot Review Incomplete\n\nCould not complete Gemini analysis: ${apiError.message}`
    );
    process.exit(0);
  }

  // 5. Format Review Markdown
  const verdictEmoji =
    reviewResult.verdict === 'APPROVE'
      ? '✅'
      : reviewResult.verdict === 'CHANGES_REQUESTED'
        ? '❌'
        : '💬';
  const findings = Array.isArray(reviewResult.findings) ? reviewResult.findings : [];

  let markdownBody =
    `${ANCHOR}\n` +
    `## 🤖 Gemini Bugbot Code Review\n\n` +
    `**Verdict**: ${verdictEmoji} \`${reviewResult.verdict || 'COMMENT'}\` &nbsp;|&nbsp; ` +
    `**Risk Score**: \`${reviewResult.riskScore ?? 'N/A'} / 10\`\n\n` +
    `> ${reviewResult.summary || 'Review completed.'}\n\n`;

  if (findings.length > 0) {
    markdownBody += `### 🔍 Detailed Findings (${findings.length})\n\n`;
    for (const f of findings) {
      const severityBadge =
        f.severity === 'critical'
          ? '🔴 Critical'
          : f.severity === 'warning'
            ? '🟡 Warning'
            : '💡 Suggestion';
      const fileLoc = f.file ? (f.line ? `\`${f.file}:${f.line}\`` : `\`${f.file}\``) : '';
      markdownBody +=
        `<details open>\n` +
        `<summary><b>[${severityBadge}]</b> ${fileLoc ? fileLoc + ' — ' : ''}${f.title || 'Finding'}</summary>\n\n` +
        `${f.explanation || ''}\n\n`;
      if (f.suggestedFix) {
        markdownBody += `**Suggested Fix:**\n\`\`\`typescript\n${f.suggestedFix}\n\`\`\`\n\n`;
      }
      markdownBody += `</details>\n\n`;
    }
  } else {
    markdownBody += `### 🔍 Detailed Findings\n\n✨ No critical bugs, security vulnerabilities, or regression risks detected.\n\n`;
  }

  markdownBody += `---\n*Automated review powered by Google Gemini • [Bugbot CI Reviewer](https://github.com/nikhilkesari/todo)*\n`;

  // 6. Output to GitHub Step Summary
  appendSummary(markdownBody);

  // 7. Post Idempotent Sticky PR Comment if PR context is available
  if (prNumber && githubToken && eventName === 'pull_request') {
    try {
      const commentsUrl = `https://api.github.com/repos/${repoName}/issues/${prNumber}/comments`;
      const listRes = await fetch(commentsUrl, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Bugbot-Reviewer',
        },
      });

      if (listRes.ok) {
        const comments = await listRes.json();
        const existingComment = Array.isArray(comments)
          ? comments.find((c) => typeof c.body === 'string' && c.body.includes(ANCHOR))
          : null;

        if (existingComment) {
          const updateUrl = `https://api.github.com/repos/${repoName}/issues/comments/${existingComment.id}`;
          await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'Bugbot-Reviewer',
            },
            body: JSON.stringify({ body: markdownBody }),
          });
          console.info(`Updated existing Bugbot PR comment #${existingComment.id}`);
        } else {
          await fetch(commentsUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'Bugbot-Reviewer',
            },
            body: JSON.stringify({ body: markdownBody }),
          });
          console.info(`Posted new Bugbot PR comment on PR #${prNumber}`);
        }
      } else {
        console.warn(`Could not fetch PR comments: HTTP ${listRes.status}`);
      }
    } catch (prError) {
      console.warn('Failed to publish sticky PR comment (continuing gracefully):', prError);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected Bugbot runtime error:', err);
  process.exit(0); // Exit 0 to prevent breaking CI builds unexpectedly
});
