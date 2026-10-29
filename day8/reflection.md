# Day 8 Reflection

The most difficult concept in this course was understanding how to design a system that remains correct when many users make requests at the same time. At first, I found it challenging to understand why checking whether a seat was available was not enough to prevent double-booking. I overcame this by breaking the problem into steps and learning how database transactions, row-level locks, and unique constraints work together. Designing TicketHub helped me understand that a system must protect its data even when multiple application servers handle requests simultaneously.

Based on the feedback from my capstone, I would improve how I demonstrate the communication between the frontend and backend. In particular, I would show more clearly what happens when a user submits a request, how the API responds, and how the database changes. This would make the project easier to understand and would help me demonstrate that the features work correctly rather than only showing the final interface.

Next, I want to learn how to build a real backend using Node.js, Express, and PostgreSQL. I would like to turn my API designs into working endpoints, implement authentication, and use database transactions in a practical project. I also want to improve my testing skills, especially testing error cases and simultaneous requests. These skills will help me move from designing systems on paper to building reliable applications that can handle real users and real-world problems.

