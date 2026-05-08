# Softworks x AISprint Hackathon Brief

Source: [hackathon-softworks.pdf](/Users/abdallah/repos/EUI-hackathon-2026/hackathon-softworks.pdf)

This is a clean extraction of the full 7-slide deck, with the actual build requirements pulled out so implementation can start immediately.

## What You Need to Build

Build a web app that takes messy, unstructured client input and uses AI to turn it into a clean, structured project brief.

The app should handle client input such as:

- Free text or pasted messages
- Voice notes or audio uploads
- Screenshots or image uploads
- Potentially a mix of those inputs together
- (Aiming for all possible ways)
- (Add possible n8n automation after the basic workflow is implemented)

The goal is to remove manual brief-writing work:

- No manual stitching together of scattered client messages
- No guessing what the client meant
- No repeated back-and-forth just to form the initial brief

## Hard Requirements

### 1. Core product scope

- It must be a web app.
- It must use AI to transform messy client input into a structured project brief.
- The focus is only the intake and structuring layer.
- This is explicitly **not** a project management tool.

### 2. Minimum supported input

The deck says the user should be able to pick at least one of these inputs:

- Free text or pasted messages
- Voice note or audio upload that gets transcribed automatically
- Screenshot or image upload that the AI reads and interprets

### 3. AI-generated brief contents

The AI output needs to include:

- A plain-language summary of what the client actually wants
- Goals and success criteria inferred from the client input
- A list of unclear, missing, or ambiguous items that need clarification before work starts
- Suggested follow-up questions to send back to the client

### 4. Final output requirements

The result must be:

- A clean, readable, formatted brief
- Shareable through a unique link
- Accessible to the client without needing an account
- Confirmable by the client through that link
- (Later after core work is done - client can add comments and one liners that if present in the workflow the process for extraction should be redone with the new comments)

### 5. Persistence requirements

- Briefs must be saved to a real database
- The internal user should be able to come back and access past briefs later

### 6. Submission requirements

- The submission must be a live, deployed web app
- It must have a real backend
- It must not be just a prototype
- It should actually run end to end

### 7. Stack constraints

- No required stack
- Use any stack you can confidently ship in a week

## Non-Goals and Boundaries

- Do not turn this into a bloated all-in-one platform
- Do not build a project management tool
- Stay focused on the core intake-to-brief workflow

The deck is explicit that a focused tool doing a few things well is better than a broad tool doing many things poorly.

## What They Will Judge

They say they will look at:

- Whether the AI output actually makes sense for the given input
- Whether the ambiguity detection is genuinely useful instead of noisy
- Whether the shareable-link flow works properly from start to finish
- Whether a non-technical client can open and use it without help
- Whether the app is live

## Practical Build Checklist

If you want the shortest interpretation of the brief, this is the minimum product:

1. Accept at least one input mode: text, audio, or image.
2. Process the input with AI.
3. Generate a structured brief containing:
   - Summary
   - Goals / success criteria
   - Missing or unclear items
   - Suggested follow-up questions
4. Save the brief in a real database.
5. Generate a unique share link for the brief.
6. Let the client open that link without an account.
7. Let the client read and confirm the brief.
8. Deploy the app with a real backend.

## What Is Explicitly Unspecified

The deck does **not** lock you into:

- A specific tech stack
- A specific AI model or provider
- A specific database
- A specific authentication system for the internal user
- Any project management, task tracking, or post-brief workflow

Those are implementation choices you can make yourself, as long as the core flow works.




