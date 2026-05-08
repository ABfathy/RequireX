# Current Plan

This document is intended for hackathon coaches and mentors. It explains the current product plan, the expected workflow, and the parts we want to validate early before full implementation.

## What We Are Building

We are building a web app that helps teams turn messy client input into a clean, structured project brief.

The problem we are targeting is the one described in the hackathon PDF:

- clients send scattered information
- information may come in different formats
- the real requirement is buried across those inputs
- teams waste time manually piecing everything together before work even starts

## Main User Flow

### 1. Internal User Starts a Project

The internal user, such as a project manager or developer, creates a project and opens an intake session for a new client request.

The project can represent:

- one client with one ongoing briefing flow
- one project with multiple intake sessions over time

There is always one client and one source of truth per project. If more context arrives later, it should come through additional chats or intake sessions inside that same project.

### 2. The User Adds Raw Client Context

The user can provide the scattered material they received from the client.

Planned supported inputs:

- pasted text or copied messages
- uploaded screenshots or images through `UploadThing`
- uploaded audio or voice notes through `UploadThing`
- uploaded PDFs through `UploadThing`
- mixed-source folder upload for batches that contain several file types together

The user can submit one input type or combine multiple inputs in the same intake session.

### 3. The App Processes the Material

The app reads the uploaded or pasted material and extracts the useful context needed to understand what the client is asking for.

File inputs are stored through `UploadThing`, while pasted text is stored directly in the relational model as a first-class source item.

Instead of forcing the user to rewrite everything manually, the app should prepare a first structured interpretation of the request.

The user should also see that the app is processing the material, rather than waiting on a blank screen.

### 4. The App Produces a Structured Brief

The generated brief will always follow the same structure required by the hackathon brief:

- a plain-language summary of what the client actually wants
- goals and success criteria inferred from the input
- a list of unclear or missing items that need clarification
- suggested follow-up questions to send back to the client

This structure is important because we want the output to feel reliable and reviewable rather than like a loose AI chat response.

### 5. The Internal User Reviews and Refines

The internal user then reviews the generated brief.

They should be able to:

- inspect the output section by section
- see where important claims came from
- refine a section if they know extra context the client did not state clearly
- regenerate the brief after clarifications or edits

The goal here is not to remove human judgment, but to remove the repetitive manual structuring work.

### 6. The Client Receives a Shareable Link

Once the internal user is satisfied with the first draft, they can generate a shareable link for the client.

The base flow keeps client access low-friction and does not require a full account system.

This follows the hackathon requirement of keeping the client experience frictionless.

If time allows, we may add a lightweight access gate before the brief opens, such as a simple access code, as a bonus hardening step.

### 7. The Client Reviews and Responds

On the public brief page, the client should be able to:

- read the generated brief
- add inline comments to highlighted sections or targeted brief areas
- answer follow-up questions through structured inputs
- confirm the brief when it is correct

This creates a cleaner feedback loop than long email or messaging chains.

### 8. The Internal User Regenerates if Needed

If the client adds clarifications or corrections, the internal user can use that feedback to generate a better next version of the brief.

This creates a structured revision cycle while still keeping the app focused on intake and briefing only.

## Why We Think This Fits the Hackathon Brief

We believe the plan matches the PDF closely because it preserves the core requested flow:

- unstructured client input goes in
- a structured brief comes out
- the brief can be shared through a unique link
- the client can review it without needing an account
- the product stays focused on intake and structuring

We are also intentionally avoiding turning the product into:

- a task manager
- a project board
- a full CRM
- a general-purpose AI workspace

## What We Think Makes the Plan Strong

### Evidence and Traceability

We want important points in the brief to be traceable back to the source material in a simple way.

For example:

- a summary point may reference a pasted message
- a requirement may reference a screenshot
- a clarification question may reference a PDF excerpt

We believe this improves trust and makes the output feel less like a black-box summary.

### Better Client Review

Instead of only sending a read-only brief, we want clients to be able to respond directly to the areas that still need clarification.

This should improve quality without adding much friction.

### Stronger Internal Workflow

We are designing the internal experience so the brief is the main artifact, not a generic chat window.

This keeps the product aligned with the problem statement instead of drifting toward a chatbot product.

### Clear Revision Review

We also want regenerated versions of the brief to be easy to compare.

If the client adds comments or answers follow-up questions, the internal user should be able to review what changed between versions instead of manually rereading the entire brief.

We think this can be a meaningful differentiator because it makes the briefing loop feel deliberate and trackable.

## Possible Additions If We Finish Early

If core features are stable early, we may explore one or more of these additions:

### 1. Optional Access Hardening

Add a lightweight access code before the public brief view opens.

This would be treated as bonus protection, not a replacement for the low-friction share-link model.

### 2. Better Batch Intake

If time allows, we may improve how the app handles mixed context by making source grouping even smoother across multiple uploads in the same intake session.

### 3. Better Feedback Visibility

If time allows, we may add clearer version comparison or feedback summaries between brief revisions.

## Questions We Want Coaches to Confirm

We would especially like feedback on these points:

1. Does this implementation still clearly fit the hackathon PDF’s requirement of staying focused on intake and structuring?
2. Is allowing clients to add inline comments to highlighted parts of the brief and answer follow-up questions still comfortably within scope, or does that risk going too far beyond the requested share-link review flow?
3. Does adding simple source references improve the product in a way that supports the brief, or does it risk adding unnecessary complexity?
4. If the core workflow is completed early, is a lightweight access gate before brief viewing an acceptable bonus enhancement?

---

If this plan is approved, we will treat the following as the locked core flow:

- collect messy client inputs
- generate the required structured brief
- let the internal user refine it
- share it publicly without client auth
- collect client feedback and clarifications
- regenerate improved brief versions

If any part of that is considered too broad for the hackathon brief, we want to know early so we can narrow the scope before implementation gets too deep.
