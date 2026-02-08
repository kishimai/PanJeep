A transportation web application for digitalizing jeepney routes.

The software structure is: Communication is lead by Supabase (The database) that handles communication of 4 profile types
being region administration, region operator (that also handles support), client and pilot

The core functions are as follow:

Region Administrator Functions and Capabilities:
* Network Planning, Standardization, Modernization (Actual Route Paths verified by GPS, Route Coverage and gaps, Route Adherance,  Terminals, Stops, and Operating Hours)
* Capacity Planning, Route Optimization, Service Scheduling (Passenger Per Route, Peak Hours and Off-peak Demand, Passenger Load per trip, most used routes and stops)
* Traffic Management, Infrastructure Planning (Average Travel Time per Route, Delay and Congestation Hotspots, Average Vehicle Speeds, Trip Duration Trends)
* Auditing, Financial Transparency, Policy Evaluation (Total Fares Collected, Revenue Per Route/Day, Cashless vs Cash Usage, Fare Compliance and Leakage Indictation)
* Operational Efficiency, Enforcement, Fleet Planning (Trips per Vehicle, Active vs Idle Vehicles, Driver punctuality and Compliance, Vehicle Usage Patterns)
* Public Safety, Regulatory Enforcement, Risk Reduction (Incident and Accident Reports, Overspeeding or Unsafe Behaviour Alerts, Route Deviation Incidents, Complaints per route or Driver)
* Public Service Improvement, Accountability, Trust Building (Passenger Complaints and Reports, Service Quality Ratings, Route and Service Suggestions)
* Medium and Long Term transport Planning (Ridership Growth Trends, Tourist Ridership, Seasonal Demand Changes, Route Expansion Simulations, Impact analysis for policy changes)

All of which don't depend on hardware.

Client-Side:
* Know the ETA of Jeepneys (Live or near-real-time jeepney location, estimated arrival time nearest to them)
* Clear Routes & Directions (Visual Route Maps, Where to ride & Where to transfer, where to get off)
* Cashless, Hassle-Free Payments (Pay with the App, No Coins, No stress, Faster Boarding & Disembarking)
* Transparent Fees (Fare is shown, No confusion about how much to pay, Automatic Discounts of Students, Senior, PWD)
* Trip History & Personal Insights (View Past trips, Total Communicating Cost per day or month, Total Commuting Time)
* Service Alerts & Updates (Route Changes, Delays or Disruptions, Road Closure Effecting Trips)
* Safety & Voice (Report Unsafe Driving or Issues, Rate Service Quality, Emergency Features)

Riders want planning, transparency and comfortability

Pilot-Side:
* More Predictable Income (Cashless Payments Reduce Missed Fares, Faster Boarding)
* Less Cash Handling (No end-of-day manual counting, Reduce risk of loss and Theft)
* Clear Route & Boundary Guidance (Visual-Route Guidance, Avoids Accidental Route Violations, Clear Terminal Points)
* Faster & Simpler Operations (Riders know where their going, less communication needed)
* Proof Of Work (Trip Counts, Daily Summaries, Earnings Records, Incentivized Work)

If drivers dont change, everything will break, everything needs to be for them, "This Helps you, not control you", a gradual change must occur not a immediate one.

System-Staff:
* **Region Configuration Control**: Operators must be able to create a new Region Config, Define Region Boundary, Timezon & Local Rules, Naming Conventions, Fare Logic Type(Flat, Distance-based, zonal), Active Vehicle Types.
* **Route Lifecycle Management**: Create Routes manually or From Template, Edit Routes visually, Version Routes(v1, v2, v3), Enable / Disable routes instantly, Assign Routes to Operators or cooperatives
* **Data Validation & Quality Control**: Flag the system for: (Conflicting Routes, Overlapping stops, Unrealistic Paths), Validation Tools: Distance Consistency, Time Feasibility Checks
* **Crowd & Driver Data Review**: Staff Reviews: (Rider-Submitted corrections, Driver-Submitted route changes), Approve / Reject with Logs, See Confidence Scores per Data Source.
* **Rider Issue Management**: Operators need ticketing system for: (Wrong Routes, Missing Jeep, Fare-mismatch, App Errors), Heatmap of complaints, SLA Tracking (response time)
* **Public Data Transparency Tools**: Operators should manage: (Public dashboards, Data Release Toggles, Anonymization Rules)
* **Driver & Fleet Oversight**: Operators manage: Driver Profiles, Vehicle Registration, Route Assignment, Compliance Status
* **Behaviour & Performance Tracking**: Operators see: On-Time Frequency (aggregated), Route Adherance (not micromanaged), Downtime Patterns, Used For: Incentivized Programs, Route Optimization, Policy Decisions
* **Government & Policy Support**: Operators must generate: Monthly region reports, Route Utilization Summaries, Peak Congestion Windows, Converage Gaps, **One Click Export Format to CSV, PDF or Dashboard Link**
* **Audit & Compliance Logs**: Operators manage: Change History(who edited what), Payment Logs, System uptime records, data access trails
* **Payment & Financial Oversight**: Operators must see payment success/failure rates, Fare discrepencies, subsidy utilization, Revenue vs Usage trends. Early Focus on: Stability, Reconciliation accuracy, Simple Rules not complex pricing
* **Scalability & Automation Tools**: Operators should rely on: Region Templates, Routes Archetypes, Policy Presets
* **Automation Dashboard**: Data Ingestion Pipelines, GPS Health, API runtime, Mapbox Quota USage
* **Internal Health Metrics**: Operators track: Regions onboarded per month, Time-to-deploy per region, Active Routes per Staff Memeber, Support Load Trends

**public.users**
Canonical user identity synced from Supabase Auth. One row per person, no passwords stored. Base for all roles and access.

**public.user_roles**
Explicit role assignments (admin, operator, field_operator, driver, passenger). Roles are granted, tracked, and revocable.

**public.drivers**
Driver-specific operational profile. Separates “being a user” from “being a driver,” with privacy-safe licensing and status.

**public.passengers**
Passenger abstraction focused on demand generation, with anonymization controls.

**public.routes**
Core table holding all route data in one atomic record. Single bidirectional routes, optimized for frequent movement and multi-actor access. Routes are credited, not approved.

**public.route_history**
Append-only audit log of every route change. Enables rollback, conflict resolution, and forensic analysis.

**public.route_conflicts**
Tracks disagreements or competing geometries. Conflicts are treated as first-class data until resolved by operators.

**public.points_of_interest**
Stops, terminals, and landmarks stored separately for reuse and independent validation.

**public.driver_traces**
High-volume, partitioned GPS evidence from drivers showing real-world route usage.

**public.passenger_events**
Partitioned, privacy-safe demand and validation signals from passengers (boarding, waiting, drop-offs, etc.).

**public.route_confidence_scores**
Computed trust metrics for routes, derived from driver GPS, passenger data, field operator input, and conflict outcomes.

**public.audit_logs**
System-wide accountability layer for governance, abuse detection, and regulatory audits.

name: lAKBAY
822920260206 / coreoperator@etranspo.com : yvX)ZT!^

