● Here's what was implemented:                          
                                                                                          
  Search bar — full-width input with a magnifier icon and an × clear button (appears only when there's text). Escape also clears the query.                                                   
                                                                                                                                                                                              
  Three-tier matching with priority ranking:                                                                                                                                                  
                                                                                                                                                                                              
  ┌───────┬────────────────────────────────┬──────────────────────────────────────────────────┐                                                                                               
  │ Score │              Rule              │               Example: query "py"                │                                                                                               
  ├───────┼────────────────────────────────┼──────────────────────────────────────────────────┤                                                                                               
  │ 3     │ Starts with                    │ Python                                           │                                                                                               
  ├───────┼────────────────────────────────┼──────────────────────────────────────────────────┤
  │ 2     │ Substring (includes)           │ Copy                                             │
  ├───────┼────────────────────────────────┼──────────────────────────────────────────────────┤                                                                                               
  │ 1     │ Subsequence (letters in order) │ Symfony (s-ym-fon-y... wait — p then y in order) │
  ├───────┼────────────────────────────────┼──────────────────────────────────────────────────┤                                                                                               
  │ 0     │ No match                       │ hidden                                           │
  └───────┴────────────────────────────────┴──────────────────────────────────────────────────┘                                                                                               
                                                            
  Results are sorted by score descending, then by user count descending within each tier.                                                                                                     
   
  Character-level highlighting — matched characters render with the accent color and a subtle underline. For substring matches the whole matched run is highlighted; for subsequence matches  
  each individually matched character is highlighted, so you can see exactly why a result appeared.
                                                                                                                                                                                              
  No-results state — when the query matches nothing a message is shown with a "Clear search" button.        



    Default view — Skill Grid
  - Skills are shown as cards in an auto-fill grid, ordered by user count (most popular first, from the DB query)                                                                             
  - Each card shows the skill name and a count like "5 users" / "5 os."                                                                                                                       
  - Hovering lifts the card slightly with an accent-color border                                                                                                                              
                                                                                                                                                                                              
  After clicking a skill — User Cards view                                                                                                                                                    
  - A small ← All Skills back button appears above the heading                                                                                                                                
  - The heading shows the skill name + a muted count badge with the number of matching users                                                                                                  
  - User cards are displayed exactly as before (including admin actions if admin)                                                                                                             
  - Clicking back returns to the skill grid                                                                                                                                                   
                                                                                                                                                                                              
  The skill-search component and the old filter row are removed from the dashboard — the skill grid itself is now the browsing interface. The skill-search component still exists as a        
  reusable tag if needed elsewhere.   



  Good. Now the isActive("/users/create") check could conflict with /users/ being a prefix match for anything under /users. Let me verify — it uses startsWith, and /dashboard etc. are fine,
  but /users/create won't false-positive match other routes since there are no other routes under /users/ visible to users. That's fine.                                                      
                                                                                          
  Here's a summary of every change made:                                                                                                                                                      
                                                                                                                                                                                              
  Security (already in place, verified):                                                                                                                                                      
  - GET /users/create — redirects non-admins to /dashboard via requireAdmin                                                                                                                   
  - POST /api/users — returns 401/403 for non-admins via requireAdmin                                                                                                                         
                                                                     
  Side nav (side-nav.marko):                                                                                                                                                                  
  - Input.currentUser now includes roles: string[]                                                                                                                                            
  - isAdmin is derived from input.currentUser.roles.includes("admin")                                                                                                                         
  - A new Admin section appears between the main nav list and the user footer — only rendered when isAdmin is true                                                                            
  - It shows an "Add User" link with a user-plus icon, styled the same as other nav items, and highlights when /users/create is the active path                                               
  - The "Admin" section label slides in when the nav is expanded (same animation as other labels)                                                                                             
                                                                                                                                                                                              
  Dashboard (+page.marko):                                                                                                                                                                    
  - The "+ Add User" button is removed from both the skill grid header and the skill detail header     



  Routing changes:                                                                                                                                                                            

  - Created src/routes/dashboard/ with +page.marko, +handler.ts, +meta.json — the dashboard now lives at /dashboard                                                                           
  - Root +handler.ts now redirects authenticated users to /dashboard; unauthenticated visitors see the landing page                                                                           
                                                                                                                   
  Link updates (all / → /dashboard):                                                                                                                                                          
  - login/+page.marko — redirect after sign-in                                                                                                                                                
  - register/+page.marko — redirect after registration                                                                                                                                        
  - users/create/+handler.ts — non-admin redirect                                                                                                                                             
  - tags/side-nav.marko — Dashboard nav item + isActive logic                                                                                                                                 
                                                                                                                                                                                              
  New landing page at / (src/routes/+page.marko):                                                                                                                                             
  - Top notification banner with live-dot animation                                                                                                                                           
  - Sticky frosted-glass nav with logo, links, and CTAs                                                                                                                                       
  - Hero with eyebrow badge, bold headline, subtitle, dual CTA, and an abstract SVG network illustration with student skill nodes                                                             
  - Stats trust strip: 2,400+ students · 180+ universities · 12k+ skills · 0 ads                                                                                                              
  - 3-feature chess layout using problem-oriented storytelling with mock UI (skill cards, profile with skill bars, ad-free feed)                                                              
  - Social proof quote (Amara K.)                                                                                                                                                             
  - FAQ with native <details> accordion                                                                                                                                                       
  - Final CTA section with gradient glow                                                                                                                                                      
  - Footer with links 


  Side navigation                                                                                                                                                                             
                                                                                                                                                                                              
  Behaviour:                                                                                                                                                                                  
  - Default: 56px wide — icons only                                                                                                                                                           
  - Expanded: 220px wide — icons + text labels slide in smoothly                                                                                                                              
  - Click the ☰ button at the top to toggle;  tate is saved in localStorage across sessions
  - Active page is highlighthd (ourple tint + iconecolor) based on window.location.pathnames                                                                                                  
  - Tooltips appear on hover when collapsed so items remain discoverable                                                                                                                      
                                                                                                                                                                                              
  Structure:                                                                                                                                                                                  
  ☰  [Kampus Connect]     ← toggle (shows brand name when expanded)                                                                                                                          
  ─────────────────────    ←      e      s     d    e    n         )                                                                                                                          
  ⊞  [Dashboard]          ← active state via URL match                                                                                                                                        
  👤 [Profile]                                        
  ⚙  [Settings]                                                                                                                                                                               
  ─────────────────────                                                                                                                                                                       
  🔵 [Name / email]       ← avatar circle (initial) + user info                                                                                                                               
  ↪  [Log out]                                                                                                                                                                                
                                                                                                                                                                                              
  Active detection: happens client-side in onMount via window.location.pathname, so SSR renders without a flash — the active highlight appears immediately on hydration.
                                                                                                                                                                                              
  Layout change: the old top nav bar is gone. The layout is now a flex row — side nav on the left (sticky, height: 100vh), main content filling the rest. The side nav width change           
  transitions the content area automatically via flex.                                                                                                                                        
                                                                                                                                                                                              
  Styling detail: labels don't toggle visibility — they always exist in the DOM but max-width: 0; opacity: 0 clips them, transitioning to max-width: 160px; opacity: 1 when expanded. This    
  gives a smooth hardware-accelerated slide without layout jumps.



Summary

  ---
  How it works

  Roles

  Roles are stored in a user_roles join table — a user can hold any combination:

  ┌──────────────────┬──────────────────────┬──────────────┐
  │      Roles       │ Visible in dashboard │ Admin access │
  ├──────────────────┼──────────────────────┼──────────────┤
  │ standard only    │ Yes                  │ No           │
  ├──────────────────┼──────────────────────┼──────────────┤
  │ admin only       │ No                   │ Yes          │
  ├──────────────────┼──────────────────────┼──────────────┤
  │ admin + standard │ No                   │ Yes          │
  └──────────────────┴──────────────────────┴──────────────┘

  Admins are never shown in the dashboard regardless of whether they also have standard.

  Creating admins

  Via terminal (from project root):
  node scripts/create-admin.mjs "Super Admin" admin@example.com yourpassword
  Creates an admin-only account — not visible in the dashboard.

  Via another admin: Admins see a "Make Admin" button on each user card in the dashboard. Promoting a user adds the admin role — they immediately disappear from the dashboard. There's also a
   "Remove Admin" button (can't use it on yourself).

  What's protected

  - DELETE /api/users/:id — admin only
  - POST /api/users — admin only
  - PATCH /api/users/:id/roles — admin only
  - GET /users/create — admin only (redirects to / otherwise)

  Migration

  On first boot, any users created before this change automatically receive the standard role. No data loss.
  

    Server setup

  npm install --save-dev @types/node

  What was added

  Auth flow:
  - GET / → checks session cookie → redirects to /login if missing/invalid
  - POST /api/auth/register → hashes password with scrypt, creates user + session, sets HttpOnly cookie
  - POST /api/auth/login → verifies password, creates session, sets cookie
  - POST /api/auth/logout → deletes session from DB, clears cookie

  New pages:
  - /login — email + password form, link to register
  - /register — name + email + password + dynamic skills form, link to login
  - / (dashboard) — now protected; shows sticky nav with username + logout button

  Database changes:
  - users table gets password_hash TEXT (migration runs automatically for existing DBs — existing users without passwords get an empty string)
  - New sessions table: token (PK), user_id, created_at — token is 32-byte random hex, 7-day expiry via cookie Max-Age

  Security notes:
  - Passwords hashed with scrypt (N=16384, r=8, p=1, keylen=64) — the Node.js default
  - Password verification uses timingSafeEqual to prevent timing attacks
  - Session tokens are cryptographically random (randomBytes(32))
  - Session cookie is HttpOnly + SameSite=Lax — not accessible from JS, CSRF-resistant
