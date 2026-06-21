---
title: Coding Guidelines
slug: coding-guidelines
---

# Coding Guidelines

Include Short Coding Guidelines (and also ask AI to read coding guidelines, Boolean, language-specific guidelines, Enum, error manage):

1. Keep functions under 8 lines
2. No nested ifs
3. Keep ifs simple — no negatives
4. Follow the Boolean guidelines
5. Use proper types — never use any, unknown or interface{} or any type that takes a wide range of types except for Generic
6. No error should be swallowed — every catch must be logged properly per the other coding and logging guidelines
7. No class or files can be more than 80 - 100 lines max.
8. No magic string or number, use Enum or Constants
9. Don't define the definition in place, but in a separate file and separately.
10. Booleans should always have is or has as a prefix, and don't use negative conditions in ifs (try to learn the positive condition and simple condition terms).
11. Always write code in a way so that it is reusable in most cases; keeping the code DRY is our highest-level priority.
12. For React, TypeScript or any other language, try to make components as small as possible so that reusable. Try to create a plan first, and create Mermaid diagrams for components if there are too many components.
13. If the error-manage folder is available in the spec folder, then every error handle must follow those guidelines properly, clear?
14. Make sure or try to assign all the variables at once, like RUST, unless we are running a loop index, try not to mutate any variables. (update coding guidelines)
15. If any designs or assets given, put those to /assets/xx-folder-name/xx-file-name.jpg or png or mp3 or anything else, keep the xx for sequence

Write these coding guidelines in the lovable memory (.lovable/coding-guidelines.md or update if exist properly for AI blind follow). If it does not exist, create it; if it exists, enhance it; and also mention the files to read explicitly from paths and the spec folder.
