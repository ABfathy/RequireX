# Q&A to questions answered in a meeting


Q1 - Can we create a landing page for the project?
- you can but it is not required. 
Action: add it to the end of the roadmap as an extra point

Q2 - can we add n8n implementation in the project to get from different sources?
- preferably no as we want to upload our own sources and not have any 3rd party sources if you want to add it later as a small incremental update do that, but the most important thing is to add the. 
Action: bench it right now - maybe add it at the end for little additions -- expand on upload feature add complete folder upload that has multiple sources (audio - text - pdf) and automatically parse each - while still have the file by file upload.

Q3 - can we have multiple client support for a single chat?
- No you should remove that as that isn't how actual swe is done just add one project with multiple chats in a list but always only one client and one source of truth.
Action: remove multiple client support and mention from docs just use one client - has project and each project has multiple chats.  

Q4 - when client receives doc in the brief view should we have authentication or a simple password at least?
- What was said in the pdf was the bare minimum according to the team for the hackathon but if you are able to add the ability to add authentication for that view that would be a bonus 
Action: Add an authentication way before you view the document the best thing i can think of is a small access token oor adding allowed mails to the db when you create a brief so if a client enters an email they can access the doc. (choose the better option)

Q5 - when client receives brief view should the client be allowed to respond in a chat view add notes regarding a single part or something else or should it be an inline chat each time like vscode and code editors?
- better use inline chat like highlighting and then editing it.
Action: Remove chat from the client view in brief make it a complete brief view with the possibility of highlighting lines and sections with comments and drop downs for questions. explore the idea of adding a small branch view on the right that shows something like a git tree history of previous updates but bench it for now.



